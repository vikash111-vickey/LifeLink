import { Router } from 'express';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { getSupabase } from '../services/supabase.js';
import {
  sendPushNotification,
  sendSMS,
  sendWhatsApp,
  sendEmail,
  makeRobocall,
  scheduleSmsFallback,
} from '../services/notifications.js';

export default function createHospitalRouter(io) {
  const router = Router();

  router.post(
    '/urgent-request',
    authMiddleware,
    requireRole('hospital_admin', 'admin'),
    async (req, res) => {
      const {
        bloodType,
        unitsNeeded,
        patientCondition,
        hospitalName,
        lat,
        lng,
        contactPhone,
        channels = ['push', 'sms'],
      } = req.body;

      const patientLat = lat ?? req.user.lat;
      const patientLng = lng ?? req.user.lng;
      const radiusKm = 15;

      const message = `URGENT: ${unitsNeeded} units of ${bloodType} needed at ${hospitalName}. ${patientCondition || ''} Contact: ${contactPhone || 'hospital'}`;

      try {
        const db = getSupabase();
        const { data: recipients } = await db.rpc('nearby_donors', {
          patient_lat: patientLat,
          patient_lng: patientLng,
          radius_km: radiusKm,
          required_blood_type: bloodType,
        });

        const list = recipients || [];

        const { data: broadcast } = await db
          .from('broadcasts')
          .insert({
            sender_id: req.user.id,
            alert_type: 'urgent_blood',
            blood_type: bloodType,
            priority: 'critical',
            message,
            channels,
            radius_km: radiusKm,
            reach_count: list.length,
          })
          .select()
          .single();

        await Promise.allSettled(
          list.map(async (recipient) => {
            if (channels.includes('push') && recipient.fcm_token) {
              await sendPushNotification(recipient.fcm_token, message, 'critical');
            }
            if (channels.includes('sms') && recipient.phone) {
              await sendSMS(recipient.phone, message);
            }
            if (channels.includes('whatsapp') && recipient.whatsapp_opt_in) {
              await sendWhatsApp(recipient.phone, message);
            }
            if (channels.includes('email') && recipient.email) {
              await sendEmail(recipient.email, message, 'urgent_blood');
            }
            if (channels.includes('robocall') && recipient.phone) {
              await makeRobocall(recipient.phone, message);
            }
            await db.from('notifications').insert({
              broadcast_id: broadcast.id,
              user_id: recipient.id,
              channel: channels.join(','),
              status: 'sent',
            });
          })
        );

        scheduleSmsFallback(db, broadcast.id, message);

        io.emit('broadcast:new', { message, alertType: 'urgent_blood', bloodType, priority: 'critical' });
        io.emit('hospital:urgent', { hospitalName, bloodType, unitsNeeded, responders: list.length });

        res.json({
          success: true,
          reached: list.length,
          broadcast,
          donors: list.slice(0, 20),
        });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    }
  );

  return router;
}
