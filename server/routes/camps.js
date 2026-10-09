import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { getSupabase } from '../services/supabase.js';
import { sendPushNotification, sendSMS } from '../services/notifications.js';
import { distanceKm } from '../services/location.js';

export default function createCampsRouter(io) {
  const router = Router();

  router.post('/create', authMiddleware, async (req, res) => {
    const {
      title,
      description,
      address,
      lat,
      lng,
      campDate,
      bloodTypesNeeded = [],
    } = req.body;

    try {
      const { data: camp, error } = await getSupabase()
        .from('camps')
        .insert({
          title,
          description,
          address,
          lat,
          lng,
          camp_date: campDate,
          blood_types_needed: bloodTypesNeeded,
          organizer_id: req.user.id,
        })
        .select()
        .single();

      if (error) throw error;

      const { data: donors } = await getSupabase()
        .from('users')
        .select('id, phone, fcm_token, lat, lng, name')
        .eq('is_online', true)
        .not('lat', 'is', null);

      const radiusKm = 20;
      const nearby = (donors || []).filter(
        (d) => distanceKm(lat, lng, d.lat, d.lng) <= radiusKm
      );

      const mapsLink = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
      const message = `Blood camp "${title}" on ${new Date(campDate).toLocaleString()} at ${address}. ${mapsLink}`;

      await Promise.allSettled(
        nearby.map(async (d) => {
          if (d.fcm_token) await sendPushNotification(d.fcm_token, message);
          if (d.phone) await sendSMS(d.phone, message);
        })
      );

      io.emit('camp:new', { camp, notified: nearby.length });
      res.json({ success: true, camp, notified: nearby.length });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/upcoming', async (req, res) => {
    try {
      const { data } = await getSupabase()
        .from('camps')
        .select('*')
        .gte('camp_date', new Date().toISOString())
        .order('camp_date', { ascending: true });
      res.json({ camps: data || [] });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}
