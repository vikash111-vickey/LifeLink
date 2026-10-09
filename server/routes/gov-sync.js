import { Router } from 'express';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { getSupabase } from '../services/supabase.js';

const ERAKTKOSH_URL =
  'https://eraktkosh.in/BLDAHIMS/bloodbank/bloodAvailability';

export default function createGovSyncRouter(io) {
  const router = Router();

  async function syncGovRegistry() {
    let imported = 0;
    try {
      const res = await fetch(ERAKTKOSH_URL, {
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) throw new Error(`eRaktkosh HTTP ${res.status}`);

      const data = await res.json();
      const rows = Array.isArray(data) ? data : data?.data || data?.bloodBanks || [];

      for (const row of rows) {
        const hospitalName =
          row.hospitalName || row.bloodBankName || row.name || 'Gov Registry';
        const bloodType = row.bloodGroup || row.blood_type || 'O+';
        const units = parseInt(row.units || row.availableUnits || 0, 10);

        const { error } = await getSupabase().from('inventory').upsert(
          {
            hospital_id: `gov-${String(hospitalName).slice(0, 40).replace(/\s/g, '-')}`,
            hospital_name: hospitalName,
            blood_type: bloodType,
            units,
            max_capacity: Math.max(units, 50),
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'hospital_id,blood_type' }
        );
        if (!error) imported += 1;
      }

      io.emit('gov:sync', { imported, at: new Date().toISOString() });
      return { imported };
    } catch (err) {
      console.error('[gov-sync]', err.message);
      return { imported, error: err.message };
    }
  }

  router.post('/sync', authMiddleware, requireRole('admin', 'blood_bank_manager'), async (req, res) => {
    const result = await syncGovRegistry();
    res.json({
      success: !result.error,
      message: result.error
        ? result.error
        : `${result.imported} records synced from Gov Registry`,
      ...result,
    });
  });

  router.syncGovRegistry = syncGovRegistry;
  return router;
}
