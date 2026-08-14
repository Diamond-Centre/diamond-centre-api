-- Seed data for frontend API testing (does NOT touch users)

BEGIN;

TRUNCATE TABLE notifications, payments, qr_codes, tickets, promotions, events RESTART IDENTITY CASCADE;

INSERT INTO events (
  title, description, price, currency, start_date, end_date,
  location, category, capacity, available_tickets, image_url, status
) VALUES
(
  'Conférence IA & Innovation',
  'Une journée dédiée à l''intelligence artificielle, aux startups et à l''innovation numérique au Cameroun.',
  5000, 'XAF', '2026-09-15', '2026-09-15',
  'Yaoundé - Palais des Congrès', 'conference', 200, 185,
  'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800',
  'published'
),
(
  'Formation Full-Stack JavaScript',
  'Bootcamp intensif Node.js, Express, React et PostgreSQL pour développeurs débutants et intermédiaires.',
  25000, 'XAF', '2026-09-20', '2026-09-27',
  'Douala - Silicon Mountain Hub', 'formation', 40, 32,
  'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800',
  'published'
),
(
  'Séminaire Leadership Digital',
  'Séminaire pour managers sur la transformation digitale et le leadership d''équipes tech.',
  15000, 'XAF', '2026-10-05', '2026-10-06',
  'Yaoundé - Hilton Hotel', 'seminaire', 80, 80,
  'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=800',
  'published'
),
(
  'Atelier Design UI/UX',
  'Atelier pratique Figma, design systems et prototypage pour produits mobiles.',
  8000, 'XAF', '2026-10-12', '2026-10-12',
  'Douala - ActivSpaces', 'atelier', 25, 20,
  'https://images.unsplash.com/photo-1586717791821-3f44a563fa4c?w=800',
  'published'
),
(
  'Conférence Mobile Money & Fintech',
  'Session sur les paiements MTN MoMo, Orange Money et les APIs fintech.',
  2000, 'XAF', '2026-10-18', '2026-10-18',
  'Yaoundé - Palais des Congrès', 'conference', 500, 478,
  'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800',
  'published'
),
(
  'Hackathon Diamond Centre 2026',
  '48h de code pour construire des solutions autour de l''événementiel et du ticketing.',
  0, 'XAF', '2026-11-01', '2026-11-02',
  'Yaoundé - Campus Numerique', 'atelier', 100, 100,
  'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800',
  'draft'
),
(
  'Conférence Cybersécurité',
  'Événement passé sur la sécurité des applications web et mobiles.',
  7000, 'XAF', '2026-06-01', '2026-06-01',
  'Douala - Sawa Hotel', 'conference', 150, 0,
  'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=800',
  'completed'
);

INSERT INTO promotions (event_id, nombre, sexe, pourcentage, duree, description) VALUES
(1, 50, 'tous', 20, 14, 'Early bird -20% sur la conférence IA'),
(2, 15, 'femme', 30, 10, 'Promo femmes en tech -30%'),
(4, 10, 'tous', 15, 7, 'Réduction atelier UI/UX'),
(5, 100, 'tous', 50, 5, 'Promo lancement conférence fintech -50%');

-- Tickets linked to published events (promo prices applied where relevant)
-- Event 1: 5000 * 0.8 = 4000
INSERT INTO tickets (
  event_id, quantity, total_price, currency, status,
  customer_name, customer_email, customer_phone, expires_at
) VALUES
(1, 2, 8000, 'XAF', 'confirme', 'Jean Dupont', 'jean.dupont@example.com', '+237670000001', '2026-09-15 23:59:59+00'),
(1, 1, 4000, 'XAF', 'confirme', 'Marie Ngono', 'marie.ngono@example.com', '+237670000002', '2026-09-15 23:59:59+00'),
(2, 1, 17500, 'XAF', 'confirme', 'Amina Fouda', 'amina.fouda@example.com', '+237670000003', '2026-09-20 23:59:59+00'),
(2, 2, 50000, 'XAF', 'confirme', 'Paul Mbarga', 'paul.mbarga@example.com', '+237670000004', '2026-09-20 23:59:59+00'),
(3, 1, 15000, 'XAF', 'scanne', 'Sarah Atangana', 'sarah.atangana@example.com', '+237670000005', '2026-10-05 23:59:59+00'),
(4, 2, 13600, 'XAF', 'scanne', 'Kevin Essomba', 'kevin.essomba@example.com', '+237670000006', '2026-10-12 23:59:59+00'),
(5, 3, 3000, 'XAF', 'confirme', 'Linda Biya', 'linda.biya@example.com', '+237670000007', '2026-10-18 23:59:59+00'),
(5, 1, 1000, 'XAF', 'expire', 'Eric Tchoumi', 'eric.tchoumi@example.com', '+237670000008', '2026-10-18 23:59:59+00');

INSERT INTO qr_codes (ticket_id, code, entry_code, validated, validated_at) VALUES
(1, 'DICE-T1-A1B2C3', '10000001', false, NULL),
(1, 'DICE-T1-D4E5F6', '10000002', false, NULL),
(2, 'DICE-T2-G7H8I9', '10000003', false, NULL),
(3, 'DICE-T3-J1K2L3', '10000004', true, '2026-07-20 10:00:00+00'),
(4, 'DICE-T4-M4N5O6', '10000005', false, NULL),
(4, 'DICE-T4-P7Q8R9', '10000006', false, NULL),
(5, 'DICE-T5-S1T2U3', '10000007', false, NULL),
(6, 'DICE-T6-V4W5X6', '10000008', false, NULL),
(6, 'DICE-T6-Y7Z8A9', '10000009', true, '2026-07-21 14:30:00+00'),
(7, 'DICE-T7-B1C2D3', '10000010', false, NULL),
(7, 'DICE-T7-E4F5G6', '10000011', false, NULL),
(7, 'DICE-T7-H7I8J9', '10000012', false, NULL),
(8, 'DICE-T8-K1L2M3', '10000013', false, NULL);

INSERT INTO payments (
  ticket_id, amount, currency, method, status, reference, provider_fee, transaction_id, paid_at
) VALUES
(1, 8000, 'XAF', 'mtn_momo', 'successful', 'PAY-MTN-001', 80, 'MTN-TX-1001', '2026-07-10 09:15:00+00'),
(2, 4000, 'XAF', 'orange_money', 'pending', 'PAY-OM-002', 40, NULL, NULL),
(3, 17500, 'XAF', 'mtn_momo', 'successful', 'PAY-MTN-003', 175, 'MTN-TX-1003', '2026-07-11 11:20:00+00'),
(4, 50000, 'XAF', 'orange_money', 'failed', 'PAY-OM-004', 0, NULL, NULL),
(5, 15000, 'XAF', 'mtn_momo', 'successful', 'PAY-MTN-005', 150, 'MTN-TX-1005', '2026-07-12 16:45:00+00'),
(6, 13600, 'XAF', 'orange_money', 'successful', 'PAY-OM-006', 136, 'OM-TX-1006', '2026-07-13 08:30:00+00'),
(7, 3000, 'XAF', 'mtn_momo', 'successful', 'PAY-MTN-007', 30, 'MTN-TX-1007', '2026-07-14 13:00:00+00'),
(8, 1000, 'XAF', 'orange_money', 'pending', 'PAY-OM-008', 10, NULL, NULL);

COMMIT;
