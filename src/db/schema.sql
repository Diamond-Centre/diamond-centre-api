CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'client')),
  telephone VARCHAR(50) NOT NULL,
  sexe VARCHAR(20) NOT NULL CHECK (sexe IN ('homme', 'femme')),
  picture TEXT NOT NULL,
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
  location VARCHAR(255) NOT NULL,
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
  quantity INTEGER NOT NULL,
  total_price NUMERIC(12, 2) NOT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'XAF',
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'refunded')),
  customer_name VARCHAR(255) NOT NULL,
  customer_email VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(50) NOT NULL,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS qr_codes (
  id SERIAL PRIMARY KEY,
  ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  code VARCHAR(100) UNIQUE NOT NULL,
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
END $$;

CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_start_date ON events(start_date);
CREATE INDEX IF NOT EXISTS idx_promotions_event_id ON promotions(event_id);
CREATE INDEX IF NOT EXISTS idx_tickets_event_id ON tickets(event_id);
CREATE INDEX IF NOT EXISTS idx_qr_codes_code ON qr_codes(code);
CREATE INDEX IF NOT EXISTS idx_payments_reference ON payments(reference);
