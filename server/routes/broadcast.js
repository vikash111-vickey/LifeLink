import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { getSupabase } from '../services/supabase.js';
import {
  sendPushNotification,
  sendSMS,
  sendWhatsApp,
  sendEmail,
  makeRobocall,
  scheduleSmsFallback,
} from '../services/notifications.js';

export default function createBroadcastRouter(io) {
  const router = Router();

  router.post('/send', authMiddleware, async (req, res) => {
    const {
      alertType,
      bloodType,
      priority = 'normal',
      message,
      channels = ['push'],
      radiusKm = 10,
    } = req.body;

    const senderLat = req.user.lat ?? req.body.lat;
    const senderLng = req.user.lng ?? req.body.lng;

    if (senderLat == null || senderLng == null) {
      return res.status(400).json({ error: 'Sender location required. Enable GPS.' });
    }

    try {
      const db = getSupabase();
      const { data: recipients, error: rpcError } = await db.rpc('nearby_donors', {
        patient_lat: senderLat,
        patient_lng: senderLng,
        radius_km: radiusKm,
        required_blood_type: bloodType || 'any',
      });

      if (rpcError) throw rpcError;

      const list = (recipients || []).filter((r) => r.id !== req.user.id);

      const { data: broadcast, error: insertError } = await db
        .from('broadcasts')
        .insert({
          sender_id: req.user.id,
          alert_type: alertType,
          blood_type: bloodType,
          priority,
          message,
          channels,
          radius_km: radiusKm,
          reach_count: list.length,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      await Promise.allSettled(
        list.map(async (recipient) => {
          const ch = channels || [];
          if (ch.includes('push') && recipient.fcm_token) {
            await sendPushNotification(recipient.fcm_token, message, priority);
          }
          if (ch.includes('sms') && recipient.phone) {
            await sendSMS(recipient.phone, message);
          }
          if (ch.includes('whatsapp') && recipient.whatsapp_opt_in && recipient.phone) {
            await sendWhatsApp(recipient.phone, message);
          }
          if (ch.includes('email') && recipient.email) {
            await sendEmail(recipient.email, message, alertType);
          }
          if (ch.includes('robocall') && priority === 'critical' && recipient.phone) {
            await makeRobocall(recipient.phone, message);
          }

          await db.from('notifications').insert({
            broadcast_id: broadcast.id,
            user_id: recipient.id,
            channel: ch.join(','),
            status: 'sent',
          });
        })
      );

      scheduleSmsFallback(db, broadcast.id, message);

      io.emit('broadcast:new', {
        message,
        alertType,
        bloodType,
        priority,
        broadcastId: broadcast.id,
      });

      res.json({ success: true, reached: list.length, broadcast });
    } catch (err) {
      console.error('[broadcast]', err);
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/feed', async (req, res) => {
    try {
      const { data, error } = await getSupabase()
        .from('broadcasts')
        .select('*')
        .order('sent_at', { ascending: false })
        .limit(25);
      if (error) throw error;
      res.json({ broadcasts: data || [] });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/history', authMiddleware, async (req, res) => {
    try {
      const { data, error } = await getSupabase()
        .from('broadcasts')
        .select('*')
        .eq('sender_id', req.user.id)
        .order('sent_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      res.json({ broadcasts: data });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}
