import { sessionRepository } from "../repositories/session.repository";
import { describeDevice } from "../utils/device";
import { BadRequestError } from "../errors/AppError";

export class SessionService {
  async listMine(userId: number, currentSid?: string) {
    const rows = await sessionRepository.listActiveByUser(userId);
    return rows.map((row) => {
      const device = describeDevice(row.user_agent);
      return {
        id: row.id,
        device_label: device.label,
        device_type: device.device_type,
        ip: row.ip,
        created_at:
          row.created_at instanceof Date
            ? row.created_at.toISOString()
            : String(row.created_at),
        last_seen_at:
          row.last_seen_at instanceof Date
            ? row.last_seen_at.toISOString()
            : String(row.last_seen_at),
        current: Boolean(currentSid && row.id === currentSid),
      };
    });
  }

  async revokeOthers(userId: number, currentSid?: string) {
    if (!currentSid) {
      throw new BadRequestError("Current session is required");
    }
    const revoked = await sessionRepository.revokeOthers(userId, currentSid);
    return { message: "Other sessions revoked", revoked };
  }
}

export const sessionService = new SessionService();
