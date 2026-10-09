import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { getSupabase, getUserById } from '../services/supabase.js';
import { sendPushNotification, sendSMS } from '../services/notifications.js';
import { getDrivingEta } from '../services/location.js';

export default function createAmbulanceRouter(io) {
  const router = Router();
  const activeTracks = new Map();

  router.post('/dispatch', authMiddleware, async (req, res) => {
    const { donorId, hospitalId, pickupLat, pickupLng, hospitalName, destLat, destLng } =
      req.body;

    try {
      const donor = await getUserById(donorId);
      const unitId = `AMB-${String(Math.floor(Math.random() * 90) + 10).padStart(2, '0')}`;

      const etaInfo = await getDrivingEta(
        pickupLat ?? donor.lat,
        pickupLng ?? donor.lng,
        destLat ?? req.user.lat,
        destLng ?? req.user.lng
      );

      const { data: ambulance, error } = await getSupabase()
        .from('ambulances')
        .insert({
          unit_id: unitId,
          status: 'dispatched',
          from_location: `${pickupLat},${pickupLng}`,
          to_location: hospitalName || hospitalId,
          donor_id: donorId,
          hospital_id: hospitalId,
          pickup_lat: pickupLat,
          pickup_lng: pickupLng,
          progress_pct: 0,
          eta: etaInfo.durationText,
        })
        .select()
        .single();

      if (error) throw error;

      const trackLink = `${process.env.CLIENT_ORIGIN || 'http://localhost:5173'}/?track=${ambulance.id}`;
      const donorMsg = `Ambulance ${unitId} is on the way. ETA: ${etaInfo.durationText}. Track: ${trackLink}`;

      if (donor.fcm_token) await sendPushNotification(donor.fcm_token, donorMsg, 'high');
      if (donor.phone) await sendSMS(donor.phone, donorMsg);

      io.to(`user:${donorId}`).emit('ambulance:dispatched', { ambulance, message: donorMsg });
      io.emit('hospital:ambulance', { hospitalId, unitId, eta: etaInfo.durationText });

      startAmbulanceSimulation(io, ambulance.id, pickupLat, pickupLng, destLat, destLng);

      res.json({ success: true, ambulance, eta: etaInfo.durationText });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  function startAmbulanceSimulation(io, ambulanceId, fromLat, fromLng, toLat, toLng) {
    if (activeTracks.has(ambulanceId)) return;
    let progress = 0;
    const interval = setInterval(async () => {
      progress = Math.min(100, progress + 10);
      const lat = fromLat + (toLat - fromLat) * (progress / 100);
      const lng = fromLng + (toLng - fromLng) * (progress / 100);

      io.emit('ambulance:location', { ambulanceId, lat, lng, progress_pct: progress });

      await getSupabase()
        .from('ambulances')
        .update({ progress_pct: progress })
        .eq('id', ambulanceId);

      if (progress >= 100) {
        clearInterval(interval);
        activeTracks.delete(ambulanceId);
        await getSupabase().from('ambulances').update({ status: 'arrived' }).eq('id', ambulanceId);
      }
    }, 10000);
    activeTracks.set(ambulanceId, interval);
  }

  router.post('/robocall/response', (req, res) => {
    res.type('text/xml');
    res.send('<Response><Say>Thank you for confirming. LifeLink appreciates your help.</Say></Response>');
  });

  return router;
}
