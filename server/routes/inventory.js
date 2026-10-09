import { Router } from 'express';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { getSupabase } from '../services/supabase.js';

const LOW_STOCK_RATIO = 0.15;

export default function createInventoryRouter(io, triggerAutoBroadcast) {
  const router = Router();

  router.get('/:hospitalId', authMiddleware, async (req, res) => {
    try {
      const { data, error } = await getSupabase()
        .from('inventory')
        .select('*')
        .eq('hospital_id', req.params.hospitalId)
        .order('blood_type');
      if (error) throw error;
      res.json({ inventory: data || [] });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.put(
    '/update',
    authMiddleware,
    requireRole('blood_bank_manager', 'hospital_admin', 'admin'),
    async (req, res) => {
      const { hospitalId, hospitalName, bloodType, units, maxCapacity } = req.body;
      try {
        const { data, error } = await getSupabase()
          .from('inventory')
          .upsert(
            {
              hospital_id: hospitalId,
              hospital_name: hospitalName,
              blood_type: bloodType,
              units,
              max_capacity: maxCapacity ?? 100,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'hospital_id,blood_type' }
          )
          .select()
          .single();

        if (error) throw error;

        const ratio = units / (maxCapacity ?? data.max_capacity ?? 100);
        if (ratio <= LOW_STOCK_RATIO && triggerAutoBroadcast) {
          await triggerAutoBroadcast(bloodType, 'critical', data.hospital_name);
        }

        io.emit('inventory:update', data);
        res.json({ success: true, item: data });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    }
  );

  return router;
}
