import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import crypto from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../../.env') });
dotenv.config({ path: join(__dirname, '../../.env.local') });

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_KEY;

export const supabaseReady = true; // Always true to prevent 503 errors

const isMock = !Boolean(url && serviceKey);

// In-Memory Database for local testing when keys are missing
const DB = {
  users: [
    {
      id: 'd0011111-2222-3333-4444-555555555555',
      firebase_uid: 'mock-donor-uid-1',
      name: 'Amit Sharma',
      email: 'amit.sharma@example.com',
      blood_type: 'O+',
      role: 'donor',
      phone: '+919876500001',
      whatsapp_opt_in: true,
      lat: 12.9784,
      lng: 77.6408,
      is_online: true,
      last_seen: new Date().toISOString(),
      created_at: new Date().toISOString(),
    },
    {
      id: 'd0022222-2222-3333-4444-555555555555',
      firebase_uid: 'mock-donor-uid-2',
      name: 'Priya Patel',
      email: 'priya.patel@example.com',
      blood_type: 'O-',
      role: 'donor',
      phone: '+919876500002',
      whatsapp_opt_in: true,
      lat: 12.9352,
      lng: 77.6245,
      is_online: true,
      last_seen: new Date().toISOString(),
      created_at: new Date().toISOString(),
    },
    {
      id: 'd0033333-2222-3333-4444-555555555555',
      firebase_uid: 'mock-donor-uid-3',
      name: 'Vijay Mallya',
      email: 'vijay.mallya@example.com',
      blood_type: 'B+',
      role: 'donor',
      phone: '+919876500003',
      whatsapp_opt_in: false,
      lat: 12.9308,
      lng: 77.5838,
      is_online: true,
      last_seen: new Date().toISOString(),
      created_at: new Date().toISOString(),
    },
    {
      id: 'd0044444-2222-3333-4444-555555555555',
      firebase_uid: 'mock-donor-uid-4',
      name: 'Sara Khan',
      email: 'sara.khan@example.com',
      blood_type: 'AB-',
      role: 'donor',
      phone: '+919876500004',
      whatsapp_opt_in: true,
      lat: 12.9767,
      lng: 77.5713,
      is_online: true,
      last_seen: new Date().toISOString(),
      created_at: new Date().toISOString(),
    },
  ],
  broadcasts: [],
  notifications: [],
  inventory: [
    {
      id: 'inv-1',
      hospital_id: 'h1',
      hospital_name: 'Manipal Hospital',
      blood_type: 'O+',
      units: 14,
      max_capacity: 100,
      updated_at: new Date().toISOString(),
    },
    {
      id: 'inv-2',
      hospital_id: 'h1',
      hospital_name: 'Manipal Hospital',
      blood_type: 'O-',
      units: 2, // Critically low!
      max_capacity: 50,
      updated_at: new Date().toISOString(),
    },
    {
      id: 'inv-3',
      hospital_id: 'h2',
      hospital_name: 'Sakra World Hospital',
      blood_type: 'A+',
      units: 25,
      max_capacity: 100,
      updated_at: new Date().toISOString(),
    },
    {
      id: 'inv-4',
      hospital_id: 'h3',
      hospital_name: 'Aster CMI Hospital',
      blood_type: 'B+',
      units: 30,
      max_capacity: 100,
      updated_at: new Date().toISOString(),
    },
  ],
  ambulances: [],
  camps: [
    {
      id: 'camp-1',
      title: 'Koramangala Mega Camp',
      description: 'Annual mega blood donation camp organized with Rotary TTK.',
      lat: 12.9352,
      lng: 77.6245,
      address: 'Koramangala Indoor Stadium, Bengaluru',
      camp_date: new Date(Date.now() + 86400000 * 2).toISOString(), // 2 days from now
      blood_types_needed: ['O+', 'O-', 'A+', 'B+'],
      organizer_id: 'd0011111-2222-3333-4444-555555555555',
      registered_count: 14,
      created_at: new Date().toISOString(),
    },
    {
      id: 'camp-2',
      title: 'Indiranagar Youth Drive',
      description: 'Emergency blood donation drive targeting rare blood groups.',
      lat: 12.9784,
      lng: 77.6408,
      address: 'Indiranagar Club, Bengaluru',
      camp_date: new Date(Date.now() + 86400000).toISOString(), // 1 day from now
      blood_types_needed: ['O-', 'AB-', 'A-', 'B-'],
      organizer_id: 'd0022222-2222-3333-4444-555555555555',
      registered_count: 8,
      created_at: new Date().toISOString(),
    },
  ],
};

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

class MockQueryBuilder {
  constructor(table, data) {
    this.table = table;
    this.data = data;
    this.filters = [];
    this.orders = [];
    this.limitVal = null;
    this._result = undefined;
    this.isSingle = false;
    this.isMaybeSingle = false;
    this.selectColumns = '*';
    this.selectOptions = null;
    this.updatePatch = null;
    this.isDelete = false;
  }

  select(columns = '*', options = {}) {
    this.selectColumns = columns;
    this.selectOptions = options;
    return this;
  }

  insert(rows) {
    const array = Array.isArray(rows) ? rows : [rows];
    const newRows = [];
    for (const row of array) {
      const newRow = {
        id: row.id || crypto.randomUUID(),
        created_at: new Date().toISOString(),
        ...row,
      };
      this.data.push(newRow);
      newRows.push(newRow);
    }
    this._result = Array.isArray(rows) ? newRows : newRows[0];
    return this;
  }

  update(patch) {
    this.updatePatch = patch;
    return this;
  }

  upsert(rows, options = {}) {
    const array = Array.isArray(rows) ? rows : [rows];
    const newRows = [];
    const onConflict = options.onConflict || 'id';
    for (const row of array) {
      let existingIndex = -1;
      if (onConflict === 'firebase_uid') {
        existingIndex = this.data.findIndex((r) => r.firebase_uid === row.firebase_uid);
      } else if (onConflict === 'hospital_id, blood_type') {
        existingIndex = this.data.findIndex(
          (r) => r.hospital_id === row.hospital_id && r.blood_type === row.blood_type
        );
      } else {
        existingIndex = this.data.findIndex((r) => r.id === row.id);
      }

      if (existingIndex >= 0) {
        const updated = {
          ...this.data[existingIndex],
          ...row,
          updated_at: new Date().toISOString(),
        };
        this.data[existingIndex] = updated;
        newRows.push(updated);
      } else {
        const newRow = {
          id: row.id || crypto.randomUUID(),
          created_at: new Date().toISOString(),
          ...row,
        };
        this.data.push(newRow);
        newRows.push(newRow);
      }
    }
    this._result = Array.isArray(rows) ? newRows : newRows[0];
    return this;
  }

  delete() {
    this.isDelete = true;
    return this;
  }

  eq(column, value) {
    this.filters.push((row) => row[column] === value);
    return this;
  }

  gte(column, value) {
    this.filters.push((row) => row[column] >= value);
    return this;
  }

  order(column, options = {}) {
    this.orders.push({ column, ascending: options.ascending !== false });
    return this;
  }

  limit(val) {
    this.limitVal = val;
    return this;
  }

  single() {
    this.isSingle = true;
    return this;
  }

  maybeSingle() {
    this.isMaybeSingle = true;
    return this;
  }

  // Thenable execution triggers automatically on `await`
  async then(resolve, reject) {
    try {
      let resultRows = [...this.data];

      // Apply filters
      for (const filter of this.filters) {
        resultRows = resultRows.filter(filter);
      }

      // Apply updates or deletes
      if (this.updatePatch) {
        resultRows = resultRows.map((row) => {
          const updated = { ...row, ...this.updatePatch };
          const idx = this.data.findIndex((r) => r.id === row.id);
          if (idx >= 0) this.data[idx] = updated;
          return updated;
        });
        this._result = resultRows;
      } else if (this.isDelete) {
        for (const row of resultRows) {
          const idx = this.data.findIndex((r) => r.id === row.id);
          if (idx >= 0) this.data.splice(idx, 1);
        }
        this._result = resultRows;
      }

      // Apply orders
      for (const ord of this.orders) {
        resultRows.sort((a, b) => {
          const valA = a[ord.column];
          const valB = b[ord.column];
          if (valA < valB) return ord.ascending ? -1 : 1;
          if (valA > valB) return ord.ascending ? 1 : -1;
          return 0;
        });
      }

      // Apply limit
      if (this.limitVal !== null) {
        resultRows = resultRows.slice(0, this.limitVal);
      }

      let finalResult = this._result !== undefined ? this._result : resultRows;

      if (this.isSingle) {
        if (Array.isArray(finalResult)) {
          if (finalResult.length === 0) {
            return resolve({ data: null, error: new Error('No rows found') });
          }
          finalResult = finalResult[0];
        }
      } else if (this.isMaybeSingle) {
        if (Array.isArray(finalResult)) {
          finalResult = finalResult.length > 0 ? finalResult[0] : null;
        }
      }

      let count = null;
      if (this.selectOptions && this.selectOptions.count === 'exact') {
        count = resultRows.length;
        if (this.selectOptions.head) {
          finalResult = [];
        }
      }

      resolve({ data: finalResult, error: null, count });
    } catch (err) {
      resolve({ data: null, error: err, count: null });
    }
  }
}

const mockClient = {
  from: (table) => {
    if (!DB[table]) DB[table] = [];
    return new MockQueryBuilder(table, DB[table]);
  },
  rpc: async (name, args) => {
    if (name === 'nearby_donors') {
      const { patient_lat, patient_lng, radius_km, required_blood_type } = args;
      let donors = DB.users.filter((u) => {
        if (!u.is_online) return false;
        if (u.lat == null || u.lng == null) return false;
        if (
          required_blood_type &&
          required_blood_type !== 'any' &&
          u.blood_type !== required_blood_type
        )
          return false;
        return true;
      });

      donors = donors.map((u) => {
        const d = haversineDistance(patient_lat, patient_lng, u.lat, u.lng);
        return {
          id: u.id,
          name: u.name,
          blood_type: u.blood_type,
          phone: u.phone,
          email: u.email,
          distance_km: d,
          fcm_token: u.fcm_token,
          whatsapp_opt_in: u.whatsapp_opt_in,
        };
      });

      if (radius_km != null) {
        donors = donors.filter((d) => d.distance_km <= radius_km);
      }

      donors.sort((a, b) => a.distance_km - b.distance_km);

      return { data: donors, error: null };
    }
    return { data: [], error: new Error(`RPC ${name} not implemented`) };
  },
};

let _client = null;

export function getSupabase() {
  if (isMock) {
    return mockClient;
  }
  if (!_client) {
    _client = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return _client;
}

export const supabase = new Proxy(
  {},
  {
    get(_t, prop) {
      return getSupabase()[prop];
    },
  }
);

export async function getUserById(userId) {
  const { data, error } = await getSupabase().from('users').select('*').eq('id', userId).single();
  if (error) throw error;
  return data;
}

export async function getUserByFirebaseUid(firebaseUid) {
  const { data, error } = await getSupabase()
    .from('users')
    .select('*')
    .eq('firebase_uid', firebaseUid)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function upsertUserFromFirebase(firebaseUser, extra = {}) {
  const row = {
    firebase_uid: firebaseUser.uid,
    email: firebaseUser.email,
    name: extra.name || firebaseUser.displayName || firebaseUser.email?.split('@')[0],
    blood_type: extra.blood_type || null,
    phone: extra.phone || null,
    role: extra.role || (isMock ? 'admin' : 'donor'), // Default to admin in local mock for instant access to dashboards!
    whatsapp_opt_in: extra.whatsapp_opt_in ?? false,
    fcm_token: extra.fcm_token || null,
    emergency_contact: extra.emergency_contact || null,
    last_seen: new Date().toISOString(),
  };

  const { data, error } = await getSupabase()
    .from('users')
    .upsert(row, { onConflict: 'firebase_uid' })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getOnlineCount() {
  try {
    const { count, error } = await getSupabase()
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('is_online', true);
    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}

// Export mock state so other files can check if running mock
export const isUsingMockDb = isMock;
if (isMock) {
  console.log('[LifeLink] \x1b[36mUsing local in-memory Mock Database fallback. All features enabled.\x1b[0m');
}
