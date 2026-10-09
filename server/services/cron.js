import cron from 'node-cron';
import { getSupabase, supabaseReady } from './supabase.js';
import { sendPushNotification, sendSMS } from './notifications.js';
import { distanceKm } from './location.js';

/** Camp reminders: 24h and 2h before start */
export function startCampReminderCron(io) {
  cron.schedule('0 * * * *', async () => {
    if (!supabaseReady) return;
    try {
      const now = Date.now();
      const { data: camps } = await getSupabase()
        .from('camps')
        .select('*')
        .gte('camp_date', new Date().toISOString());

      for (const camp of camps || []) {
        const campTime = new Date(camp.camp_date).getTime();
        const hoursUntil = (campTime - now) / (1000 * 60 * 60);
        const mapsLink = `https://www.google.com/maps/dir/?api=1&destination=${camp.lat},${camp.lng}`;

        let message = null;
        if (hoursUntil <= 24 && hoursUntil > 23) {
          message = `Tomorrow! Blood camp "${camp.title}" at ${camp.address}. ${mapsLink}`;
        } else if (hoursUntil <= 2 && hoursUntil > 1) {
          message = `Starting soon! "${camp.title}" — ${camp.address} ${mapsLink}`;
        }
        if (!message) continue;

        const { data: donors } = await getSupabase()
          .from('users')
          .select('id, phone, fcm_token, lat, lng')
          .not('lat', 'is', null);

        const nearby = (donors || []).filter(
          (d) => distanceKm(camp.lat, camp.lng, d.lat, d.lng) <= 20
        );

        await Promise.allSettled(
          nearby.map(async (d) => {
            if (d.fcm_token) await sendPushNotification(d.fcm_token, message);
            if (d.phone) await sendSMS(d.phone, message);
          })
        );

        io.emit('camp:reminder', { campId: camp.id, message });
      }
    } catch (err) {
      console.error('[camp cron]', err);
    }
  });
}

/** Gov registry auto-sync every 5 minutes */
export function startGovSyncCron(syncFn) {
  if (!syncFn) return;
  cron.schedule('*/5 * * * *', () => {
    syncFn().catch((e) => console.error('[gov auto-sync]', e));
  });
}
