-- LifeLink Supabase schema — run in Supabase SQL Editor

-- Extend users (create if missing)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firebase_uid TEXT UNIQUE,
  email TEXT,
  name TEXT,
  blood_type TEXT,
  role TEXT DEFAULT 'donor',
  lat FLOAT,
  lng FLOAT,
  is_online BOOLEAN DEFAULT false,
  fcm_token TEXT,
  phone TEXT,
  whatsapp_opt_in BOOLEAN DEFAULT false,
  last_seen TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS lat FLOAT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS lng FLOAT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS fcm_token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS whatsapp_opt_in BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS firebase_uid TEXT UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'donor';
ALTER TABLE users ADD COLUMN IF NOT EXISTS blood_type TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT;

CREATE TABLE IF NOT EXISTS broadcasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID REFERENCES users(id),
  alert_type TEXT,
  blood_type TEXT,
  priority TEXT,
  message TEXT,
  channels TEXT[],
  radius_km INT,
  reach_count INT DEFAULT 0,
  sent_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  broadcast_id UUID REFERENCES broadcasts(id),
  user_id UUID REFERENCES users(id),
  channel TEXT,
  status TEXT,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id TEXT,
  hospital_name TEXT,
  blood_type TEXT,
  units INT DEFAULT 0,
  max_capacity INT DEFAULT 100,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (hospital_id, blood_type)
);

CREATE TABLE IF NOT EXISTS ambulances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id TEXT,
  status TEXT DEFAULT 'dispatched',
  from_location TEXT,
  to_location TEXT,
  donor_id UUID REFERENCES users(id),
  hospital_id TEXT,
  pickup_lat FLOAT,
  pickup_lng FLOAT,
  progress_pct INT DEFAULT 0,
  eta TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS camps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT,
  description TEXT,
  lat FLOAT,
  lng FLOAT,
  address TEXT,
  camp_date TIMESTAMPTZ,
  blood_types_needed TEXT[],
  organizer_id UUID REFERENCES users(id),
  registered_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Nearby donors (Haversine, km)
CREATE OR REPLACE FUNCTION nearby_donors(
  patient_lat FLOAT,
  patient_lng FLOAT,
  radius_km INT,
  required_blood_type TEXT
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  blood_type TEXT,
  phone TEXT,
  email TEXT,
  distance_km FLOAT,
  fcm_token TEXT,
  whatsapp_opt_in BOOLEAN
) AS $$
  SELECT
    u.id,
    u.name,
    u.blood_type,
    u.phone,
    u.email,
    (
      6371 * acos(
        LEAST(1.0, GREATEST(-1.0,
          cos(radians(patient_lat)) * cos(radians(u.lat)) *
          cos(radians(u.lng) - radians(patient_lng)) +
          sin(radians(patient_lat)) * sin(radians(u.lat))
        ))
      )
    )::FLOAT AS distance_km,
    u.fcm_token,
    u.whatsapp_opt_in
  FROM users u
  WHERE u.is_online = true
    AND u.lat IS NOT NULL
    AND u.lng IS NOT NULL
    AND (
      required_blood_type = 'any'
      OR required_blood_type IS NULL
      OR u.blood_type = required_blood_type
    )
    AND (
      6371 * acos(
        LEAST(1.0, GREATEST(-1.0,
          cos(radians(patient_lat)) * cos(radians(u.lat)) *
          cos(radians(u.lng) - radians(patient_lng)) +
          sin(radians(patient_lat)) * sin(radians(u.lat))
        ))
      )
    ) <= radius_km
  ORDER BY distance_km ASC;
$$ LANGUAGE sql STABLE;

-- RLS (optional — service role bypasses on server)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE broadcasts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users read own" ON users FOR SELECT USING (true);
CREATE POLICY "users update own" ON users FOR UPDATE USING (true);
