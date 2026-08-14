CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('super_admin', 'admin', 'client')),
  telephone VARCHAR(50) NOT NULL DEFAULT '',
  sexe VARCHAR(20) NOT NULL DEFAULT 'homme' CHECK (sexe IN ('homme', 'femme')),
  picture TEXT NOT NULL DEFAULT '',
  auth_provider VARCHAR(20) NOT NULL DEFAULT 'local'
    CHECK (auth_provider IN ('local', 'google', 'facebook')),
  provider_id VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS events (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  price NUMERIC(12, 2) NOT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'XAF',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  start_time TIME NOT NULL DEFAULT '09:00',
  end_time TIME NOT NULL DEFAULT '18:00',
  location VARCHAR(255) NOT NULL,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  category VARCHAR(50) NOT NULL,
  capacity INTEGER NOT NULL,
  available_tickets INTEGER NOT NULL,
  image_url TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'cancelled', 'completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT events_date_range_check CHECK (end_date >= start_date)
);

CREATE TABLE IF NOT EXISTS promotions (
  id SERIAL PRIMARY KEY,
  event_id INTEGER NOT NULL UNIQUE REFERENCES events(id) ON DELETE CASCADE,
  nombre INTEGER NOT NULL,
  sexe VARCHAR(20) NOT NULL CHECK (sexe IN ('homme', 'femme', 'tous')),
  pourcentage NUMERIC(5, 2) NOT NULL CHECK (pourcentage > 0 AND pourcentage <= 100),
  duree INTEGER NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tickets (
  id SERIAL PRIMARY KEY,
  event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  booking_id UUID,
  quantity INTEGER NOT NULL,
  total_price NUMERIC(12, 2) NOT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'XAF',
  status VARCHAR(50) NOT NULL DEFAULT 'confirme'
    CHECK (status IN ('confirme', 'scanne', 'expire', 'rembourse')),
  customer_name VARCHAR(255) NOT NULL,
  customer_email VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(50) NOT NULL,
  expires_at TIMESTAMPTZ,
  hidden_from_admin BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE tickets
  ADD COLUMN IF NOT EXISTS hidden_from_admin BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS qr_codes (
  id SERIAL PRIMARY KEY,
  ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  code VARCHAR(100) UNIQUE NOT NULL,
  entry_code VARCHAR(8) UNIQUE NOT NULL,
  validated BOOLEAN NOT NULL DEFAULT FALSE,
  validated_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  amount NUMERIC(12, 2) NOT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'XAF',
  method VARCHAR(50) NOT NULL CHECK (method IN ('mtn_momo', 'orange_money')),
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'successful', 'failed', 'refunded')),
  reference VARCHAR(100) UNIQUE NOT NULL,
  provider_fee NUMERIC(12, 2) NOT NULL DEFAULT 0,
  transaction_id VARCHAR(100),
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Migrate legacy events.date/time -> start_date/end_date (idempotent)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'events' AND column_name = 'date'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'events' AND column_name = 'start_date'
  ) THEN
    ALTER TABLE events ADD COLUMN start_date DATE;
    ALTER TABLE events ADD COLUMN end_date DATE;
    UPDATE events SET start_date = date, end_date = date WHERE start_date IS NULL;
    ALTER TABLE events ALTER COLUMN start_date SET NOT NULL;
    ALTER TABLE events ALTER COLUMN end_date SET NOT NULL;
    ALTER TABLE events DROP COLUMN IF EXISTS date;
    ALTER TABLE events DROP COLUMN IF EXISTS time;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'events_date_range_check'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'events' AND column_name = 'start_date'
  ) THEN
    ALTER TABLE events
      ADD CONSTRAINT events_date_range_check CHECK (end_date >= start_date);
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'promotions' AND column_name = 'montant'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'promotions' AND column_name = 'pourcentage'
  ) THEN
    ALTER TABLE promotions RENAME COLUMN montant TO pourcentage;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'promotions' AND column_name = 'pourcentage'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'promotions_pourcentage_check'
  ) THEN
    UPDATE promotions
    SET pourcentage = GREATEST(0.01, LEAST(pourcentage, 100))
    WHERE pourcentage <= 0 OR pourcentage > 100;
    ALTER TABLE promotions
      ADD CONSTRAINT promotions_pourcentage_check
      CHECK (pourcentage > 0 AND pourcentage <= 100);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'telephone'
  ) THEN
    ALTER TABLE users ADD COLUMN telephone VARCHAR(50);
    ALTER TABLE users ADD COLUMN sexe VARCHAR(20);
    ALTER TABLE users ADD COLUMN picture TEXT;
    UPDATE users
    SET telephone = COALESCE(telephone, ''),
        sexe = COALESCE(sexe, 'homme'),
        picture = COALESCE(picture, '')
    WHERE telephone IS NULL OR sexe IS NULL OR picture IS NULL;
    ALTER TABLE users ALTER COLUMN telephone SET NOT NULL;
    ALTER TABLE users ALTER COLUMN sexe SET NOT NULL;
    ALTER TABLE users ALTER COLUMN picture SET NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_sexe_check'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'sexe'
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT users_sexe_check CHECK (sexe IN ('homme', 'femme'));
  END IF;

  -- OAuth / social login columns
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users'
      AND column_name = 'auth_provider'
  ) THEN
    ALTER TABLE users ADD COLUMN auth_provider VARCHAR(20) NOT NULL DEFAULT 'local';
    ALTER TABLE users ADD COLUMN provider_id VARCHAR(255);
    ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
    BEGIN
      ALTER TABLE users
        ADD CONSTRAINT users_auth_provider_check
        CHECK (auth_provider IN ('local', 'google', 'facebook'));
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'idx_users_provider'
  ) THEN
    CREATE UNIQUE INDEX idx_users_provider
      ON users (auth_provider, provider_id)
      WHERE provider_id IS NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'events' AND column_name = 'start_time'
  ) THEN
    ALTER TABLE events ADD COLUMN start_time TIME NOT NULL DEFAULT '09:00';
    ALTER TABLE events ADD COLUMN end_time TIME NOT NULL DEFAULT '18:00';
  END IF;

  -- Allow super_admin role
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'users'
  ) THEN
    ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
    ALTER TABLE users
      ADD CONSTRAINT users_role_check
      CHECK (role IN ('super_admin', 'admin', 'client'));
  END IF;
END $$;

-- Add 8-digit entry_code for existing qr_codes (admin manual validation)
DO $$
DECLARE
  r RECORD;
  candidate TEXT;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'qr_codes'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'qr_codes'
      AND column_name = 'entry_code'
  ) THEN
    ALTER TABLE qr_codes ADD COLUMN entry_code VARCHAR(8);
    FOR r IN SELECT id FROM qr_codes WHERE entry_code IS NULL LOOP
      LOOP
        candidate := lpad((floor(random() * 90000000) + 10000000)::int::text, 8, '0');
        EXIT WHEN NOT EXISTS (
          SELECT 1 FROM qr_codes WHERE entry_code = candidate
        );
      END LOOP;
      UPDATE qr_codes SET entry_code = candidate WHERE id = r.id;
    END LOOP;
    ALTER TABLE qr_codes ALTER COLUMN entry_code SET NOT NULL;
    BEGIN
      ALTER TABLE qr_codes ADD CONSTRAINT qr_codes_entry_code_key UNIQUE (entry_code);
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END;
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'qr_codes'
      AND column_name = 'entry_code' AND data_type = 'character'
  ) THEN
    ALTER TABLE qr_codes ALTER COLUMN entry_code TYPE VARCHAR(8);
  END IF;
END $$;

-- Booking group: one reservation can create multiple single-place tickets
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'tickets'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tickets'
      AND column_name = 'booking_id'
  ) THEN
    ALTER TABLE tickets ADD COLUMN booking_id UUID;
  END IF;
END $$;

-- Ticket statuses: confirme | scanne | expire | rembourse
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'tickets'
  ) THEN
    ALTER TABLE tickets DROP CONSTRAINT IF EXISTS tickets_status_check;

    UPDATE tickets SET status = 'confirme'
      WHERE status IN ('pending', 'confirmed');
    UPDATE tickets SET status = 'expire'
      WHERE status = 'cancelled';
    UPDATE tickets SET status = 'rembourse'
      WHERE status = 'refunded';
    -- Already-scanned QR → ticket status scanne
    UPDATE tickets t
       SET status = 'scanne'
     WHERE t.status = 'confirme'
       AND EXISTS (
         SELECT 1 FROM qr_codes q
          WHERE q.ticket_id = t.id AND q.validated = TRUE
       );

    ALTER TABLE tickets ALTER COLUMN status SET DEFAULT 'confirme';
    ALTER TABLE tickets
      ADD CONSTRAINT tickets_status_check
      CHECK (status IN ('confirme', 'scanne', 'expire', 'rembourse'));
  END IF;
END $$;

-- Event map coordinates (optional; location text remains required)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'events'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'events'
        AND column_name = 'latitude'
    ) THEN
      ALTER TABLE events ADD COLUMN latitude DOUBLE PRECISION;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'events'
        AND column_name = 'longitude'
    ) THEN
      ALTER TABLE events ADD COLUMN longitude DOUBLE PRECISION;
    END IF;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_start_date ON events(start_date);
CREATE INDEX IF NOT EXISTS idx_promotions_event_id ON promotions(event_id);
CREATE INDEX IF NOT EXISTS idx_tickets_event_id ON tickets(event_id);
CREATE INDEX IF NOT EXISTS idx_tickets_booking_id ON tickets(booking_id);
CREATE INDEX IF NOT EXISTS idx_qr_codes_code ON qr_codes(code);
CREATE INDEX IF NOT EXISTS idx_qr_codes_entry_code ON qr_codes(entry_code);
CREATE INDEX IF NOT EXISTS idx_payments_reference ON payments(reference);

CREATE TABLE IF NOT EXISTS event_schedule_changes (
  id SERIAL PRIMARY KEY,
  event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  old_start_date DATE NOT NULL,
  old_end_date DATE NOT NULL,
  old_start_time TIME NOT NULL,
  old_end_time TIME NOT NULL,
  old_location VARCHAR(255) NOT NULL,
  new_start_date DATE NOT NULL,
  new_end_date DATE NOT NULL,
  new_start_time TIME NOT NULL,
  new_end_time TIME NOT NULL,
  new_location VARCHAR(255) NOT NULL,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ticket_change_responses (
  id SERIAL PRIMARY KEY,
  change_id INTEGER NOT NULL REFERENCES event_schedule_changes(id) ON DELETE CASCADE,
  ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'swapped', 'refunded')),
  alternative_event_id INTEGER REFERENCES events(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (change_id, ticket_id)
);

CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL CHECK (type IN (
    'reservation', 'rappel', 'info', 'annulation', 'modification', 'remboursement', 'certificat'
  )),
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  ticket_id INTEGER REFERENCES tickets(id) ON DELETE SET NULL,
  event_id INTEGER REFERENCES events(id) ON DELETE SET NULL,
  change_id INTEGER REFERENCES event_schedule_changes(id) ON DELETE SET NULL,
  dedupe_key VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS certificates (
  id SERIAL PRIMARY KEY,
  code VARCHAR(40) UNIQUE NOT NULL,
  event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  recipient_name VARCHAR(255) NOT NULL,
  recipient_email VARCHAR(255) NOT NULL,
  formation_title VARCHAR(255) NOT NULL,
  issued_by INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (ticket_id)
);

CREATE INDEX IF NOT EXISTS idx_certificates_event_id ON certificates(event_id);
CREATE INDEX IF NOT EXISTS idx_certificates_recipient_email
  ON certificates(LOWER(recipient_email));
CREATE INDEX IF NOT EXISTS idx_certificates_user_id ON certificates(user_id);
CREATE INDEX IF NOT EXISTS idx_certificates_code ON certificates(code);

-- Widen notification types + add change_id for existing DBs
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'notifications'
  ) THEN
    IF EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'notifications_type_check'
    ) THEN
      ALTER TABLE notifications DROP CONSTRAINT notifications_type_check;
    END IF;
    BEGIN
      ALTER TABLE notifications
        ADD CONSTRAINT notifications_type_check
        CHECK (type IN (
          'reservation', 'rappel', 'info', 'annulation', 'modification', 'remboursement', 'certificat'
        ));
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'notifications'
        AND column_name = 'change_id'
    ) THEN
      ALTER TABLE notifications
        ADD COLUMN change_id INTEGER REFERENCES event_schedule_changes(id) ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_user_dedupe
  ON notifications(user_id, dedupe_key)
  WHERE dedupe_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON notifications(user_id, is_read);

CREATE INDEX IF NOT EXISTS idx_event_schedule_changes_event
  ON event_schedule_changes(event_id);
CREATE INDEX IF NOT EXISTS idx_ticket_change_responses_change
  ON ticket_change_responses(change_id);
CREATE INDEX IF NOT EXISTS idx_ticket_change_responses_ticket
  ON ticket_change_responses(ticket_id);

-- Server-side sessions so devices can be listed and revoked
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_agent TEXT NOT NULL DEFAULT '',
  ip VARCHAR(64),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_active
  ON user_sessions(user_id)
  WHERE revoked_at IS NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'user_sessions'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'user_sessions'
        AND column_name = 'expires_at'
    ) THEN
      ALTER TABLE user_sessions
        ADD COLUMN expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '1 day';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'user_sessions'
        AND column_name = 'revoked_at'
    ) THEN
      ALTER TABLE user_sessions ADD COLUMN revoked_at TIMESTAMPTZ;
    END IF;
  END IF;
END $$;

-- Webinaire is no longer a valid event category
UPDATE events SET category = 'conference' WHERE category = 'webinaire';

-- Events become completed only after their end date has passed
UPDATE events
   SET status = 'completed', updated_at = NOW()
 WHERE status IN ('published', 'draft')
   AND end_date < CURRENT_DATE;
