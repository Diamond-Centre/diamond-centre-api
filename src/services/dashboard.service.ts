import { pool } from "../db";
import { userRepository } from "../repositories/user.repository";

function parseIntSafe(value?: string | null): number {
  return parseInt(value ?? "0", 10) || 0;
}

function parseFloatSafe(value?: string | null): number {
  return Number(value ?? 0) || 0;
}

export class DashboardService {
  async adminStats() {
    const users = await userRepository.countByRole();
    const events = await pool.query<{
      total: string;
      published: string;
      draft: string;
      cancelled: string;
      completed: string;
    }>(
      `SELECT
         COUNT(*)::text AS total,
         COUNT(*) FILTER (WHERE status = 'published')::text AS published,
         COUNT(*) FILTER (WHERE status = 'draft')::text AS draft,
         COUNT(*) FILTER (WHERE status = 'cancelled')::text AS cancelled,
         COUNT(*) FILTER (WHERE status = 'completed')::text AS completed
       FROM events`
    );
    const tickets = await pool.query<{
      total: string;
      confirme: string;
      scanne: string;
      expire: string;
      rembourse: string;
    }>(
      `SELECT
         COUNT(*)::text AS total,
         COUNT(*) FILTER (WHERE status = 'confirme')::text AS confirme,
         COUNT(*) FILTER (WHERE status = 'scanne')::text AS scanne,
         COUNT(*) FILTER (WHERE status = 'expire')::text AS expire,
         COUNT(*) FILTER (WHERE status = 'rembourse')::text AS rembourse
       FROM tickets`
    );
    const e = events.rows[0];
    const t = tickets.rows[0];
    return {
      users,
      events: {
        total: parseIntSafe(e?.total),
        published: parseIntSafe(e?.published),
        draft: parseIntSafe(e?.draft),
        cancelled: parseIntSafe(e?.cancelled),
        completed: parseIntSafe(e?.completed),
      },
      tickets: {
        total: parseIntSafe(t?.total),
        confirme: parseIntSafe(t?.confirme),
        scanne: parseIntSafe(t?.scanne),
        expire: parseIntSafe(t?.expire),
        rembourse: parseIntSafe(t?.rembourse),
      },
    };
  }

  /** Full analytics payload for admin charts. */
  async analytics() {
    const overview = await this.adminStats();

    const eventsByCategory = await pool.query<{
      category: string;
      count: string;
    }>(
      `SELECT category, COUNT(*)::text AS count
       FROM events
       GROUP BY category
       ORDER BY COUNT(*) DESC`
    );

    const ticketsByMonth = await pool.query<{
      month: string;
      count: string;
    }>(
      `SELECT to_char(date_trunc('month', created_at), 'YYYY-MM') AS month,
              COUNT(*)::text AS count
       FROM tickets
       WHERE created_at >= date_trunc('month', NOW()) - INTERVAL '5 months'
       GROUP BY 1
       ORDER BY 1`
    );

    const revenueByMonth = await pool.query<{
      month: string;
      amount: string;
    }>(
      `SELECT to_char(date_trunc('month', COALESCE(paid_at, created_at)), 'YYYY-MM') AS month,
              COALESCE(SUM(amount), 0)::text AS amount
       FROM payments
       WHERE status = 'successful'
         AND COALESCE(paid_at, created_at) >= date_trunc('month', NOW()) - INTERVAL '5 months'
       GROUP BY 1
       ORDER BY 1`
    );

    const paymentsByStatus = await pool.query<{
      status: string;
      count: string;
      amount: string;
    }>(
      `SELECT status,
              COUNT(*)::text AS count,
              COALESCE(SUM(amount), 0)::text AS amount
       FROM payments
       GROUP BY status
       ORDER BY COUNT(*) DESC`
    );

    const paymentsByMethod = await pool.query<{
      method: string;
      count: string;
      amount: string;
    }>(
      `SELECT method,
              COUNT(*)::text AS count,
              COALESCE(SUM(amount), 0)::text AS amount
       FROM payments
       WHERE status = 'successful'
       GROUP BY method
       ORDER BY COUNT(*) DESC`
    );

    const topEvents = await pool.query<{
      id: string;
      title: string;
      category: string;
      tickets: string;
      revenue: string;
    }>(
      `SELECT e.id::text AS id,
              e.title,
              e.category,
              COUNT(t.id) FILTER (WHERE t.status IN ('confirme', 'scanne'))::text AS tickets,
              COALESCE(
                SUM(t.total_price) FILTER (WHERE t.status IN ('confirme', 'scanne')),
                0
              )::text AS revenue
       FROM events e
       LEFT JOIN tickets t ON t.event_id = e.id
       GROUP BY e.id, e.title, e.category
       ORDER BY COUNT(t.id) FILTER (WHERE t.status IN ('confirme', 'scanne')) DESC,
                e.created_at DESC
       LIMIT 8`
    );

    const usersByMonth = await pool.query<{
      month: string;
      count: string;
    }>(
      `SELECT to_char(date_trunc('month', created_at), 'YYYY-MM') AS month,
              COUNT(*)::text AS count
       FROM users
       WHERE created_at >= date_trunc('month', NOW()) - INTERVAL '5 months'
       GROUP BY 1
       ORDER BY 1`
    );

    const usersBySexe = await pool.query<{
      sexe: string;
      count: string;
    }>(
      `SELECT sexe, COUNT(*)::text AS count
       FROM users
       WHERE role = 'client'
       GROUP BY sexe
       ORDER BY sexe`
    );

    const certificates = await pool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM certificates`
    );

    const validations = await pool.query<{
      total: string;
      validated: string;
    }>(
      `SELECT
         COUNT(*)::text AS total,
         COUNT(*) FILTER (WHERE validated = TRUE)::text AS validated
       FROM qr_codes`
    );

    const promotions = await pool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM promotions`
    );

    const revenueTotal = await pool.query<{ amount: string }>(
      `SELECT COALESCE(SUM(amount), 0)::text AS amount
       FROM payments
       WHERE status = 'successful'`
    );

    return {
      overview,
      events_by_category: eventsByCategory.rows.map((r) => ({
        category: r.category,
        count: parseIntSafe(r.count),
      })),
      tickets_by_month: fillLastMonths(
        ticketsByMonth.rows.map((r) => ({
          month: r.month,
          count: parseIntSafe(r.count),
        })),
        6
      ),
      revenue_by_month: fillLastMonthsAmount(
        revenueByMonth.rows.map((r) => ({
          month: r.month,
          amount: parseFloatSafe(r.amount),
        })),
        6
      ),
      payments_by_status: paymentsByStatus.rows.map((r) => ({
        status: r.status,
        count: parseIntSafe(r.count),
        amount: parseFloatSafe(r.amount),
      })),
      payments_by_method: paymentsByMethod.rows.map((r) => ({
        method: r.method,
        count: parseIntSafe(r.count),
        amount: parseFloatSafe(r.amount),
      })),
      top_events: topEvents.rows.map((r) => ({
        id: parseIntSafe(r.id),
        title: r.title,
        category: r.category,
        tickets: parseIntSafe(r.tickets),
        revenue: parseFloatSafe(r.revenue),
      })),
      users_by_month: fillLastMonths(
        usersByMonth.rows.map((r) => ({
          month: r.month,
          count: parseIntSafe(r.count),
        })),
        6
      ),
      users_by_sexe: usersBySexe.rows.map((r) => ({
        sexe: r.sexe,
        count: parseIntSafe(r.count),
      })),
      certificates_total: parseIntSafe(certificates.rows[0]?.count),
      qr_total: parseIntSafe(validations.rows[0]?.total),
      qr_validated: parseIntSafe(validations.rows[0]?.validated),
      promotions_total: parseIntSafe(promotions.rows[0]?.count),
      revenue_total: parseFloatSafe(revenueTotal.rows[0]?.amount),
    };
  }
}

function monthKeys(count: number): string[] {
  const keys: string[] = [];
  const now = new Date();
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    keys.push(`${y}-${m}`);
  }
  return keys;
}

function fillLastMonths(
  rows: Array<{ month: string; count: number }>,
  count: number
): Array<{ month: string; count: number }> {
  const map = new Map(rows.map((r) => [r.month, r.count]));
  return monthKeys(count).map((month) => ({
    month,
    count: map.get(month) ?? 0,
  }));
}

function fillLastMonthsAmount(
  rows: Array<{ month: string; amount: number }>,
  count: number
): Array<{ month: string; amount: number }> {
  const map = new Map(rows.map((r) => [r.month, r.amount]));
  return monthKeys(count).map((month) => ({
    month,
    amount: map.get(month) ?? 0,
  }));
}

export const dashboardService = new DashboardService();
