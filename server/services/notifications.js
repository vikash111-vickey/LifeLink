import twilio from 'twilio';
import sgMail from '@sendgrid/mail';
import admin from 'firebase-admin';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

let firebaseReady = false;
let twilioClient = null;

function initFirebaseAdmin() {
  if (firebaseReady || admin.apps.length) {
    firebaseReady = true;
    return;
  }
  const path = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (path && existsSync(path)) {
    const serviceAccount = JSON.parse(readFileSync(path, 'utf8'));
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    firebaseReady = true;
    return;
  }
  console.warn('[LifeLink] FIREBASE_SERVICE_ACCOUNT not set — push notifications disabled.');
}

function getTwilio() {
  if (twilioClient) return twilioClient;
  const sid = process.env.TWILIO_SID;
  const token = process.env.TWILIO_TOKEN;
  if (sid && token) {
    twilioClient = twilio(sid, token);
  }
  return twilioClient;
}

if (process.env.SENDGRID_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_KEY);
}

initFirebaseAdmin();

export async function sendPushNotification(fcmToken, message, priority = 'normal') {
  if (!fcmToken) return { ok: false, reason: 'no_token' };
  initFirebaseAdmin();
  if (!admin.apps.length) {
    console.log('[FCM stub]', message);
    return { ok: false, reason: 'firebase_not_configured' };
  }
  await admin.messaging().send({
    token: fcmToken,
    notification: { title: '🩸 LifeLink Emergency', body: message },
    android: { priority: priority === 'critical' ? 'high' : 'normal' },
  });
  return { ok: true };
}

export async function sendSMS(phone, message) {
  if (!phone) return { ok: false };
  const client = getTwilio();
  if (!client) {
    console.log('[SMS stub]', phone, message);
    return { ok: false, reason: 'twilio_not_configured' };
  }
  await client.messages.create({
    body: `🩸 LifeLink Alert: ${message}\nReply YES to confirm. STOP to opt out.`,
    from: process.env.TWILIO_PHONE,
    to: phone,
  });
  return { ok: true };
}

export async function sendWhatsApp(phone, message) {
  if (!phone) return { ok: false };
  const client = getTwilio();
  if (!client) {
    console.log('[WhatsApp stub]', phone, message);
    return { ok: false };
  }
  const from = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886';
  await client.messages.create({
    body: `🩸 *LifeLink Emergency*\n\n${message}\n\nReply *YES* to confirm availability.`,
    from,
    to: phone.startsWith('whatsapp:') ? phone : `whatsapp:${phone}`,
  });
  return { ok: true };
}

export async function sendEmail(email, message, alertType = 'alert') {
  if (!email) return { ok: false };
  if (!process.env.SENDGRID_KEY) {
    console.log('[Email stub]', email, message);
    return { ok: false };
  }
  await sgMail.send({
    to: email,
    from: process.env.SENDGRID_FROM || 'alerts@lifelink.app',
    subject: `🩸 LifeLink: ${String(alertType).replace(/_/g, ' ')}`,
    html: `<div style="font-family:sans-serif;max-width:500px">
      <h2 style="color:#E8193C">LifeLink Emergency Alert</h2>
      <p style="font-size:16px">${message}</p>
      <a href="${process.env.CLIENT_ORIGIN || 'http://localhost:5173'}"
         style="background:#E8193C;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;margin-top:16px">
        Respond Now →
      </a>
    </div>`,
  });
  return { ok: true };
}

export async function makeRobocall(phone, message) {
  if (!phone) return { ok: false };
  const client = getTwilio();
  if (!client) {
    console.log('[Robocall stub]', phone, message);
    return { ok: false };
  }
  await client.calls.create({
    twiml: `<Response>
      <Say voice="alice">This is an emergency alert from LifeLink. ${message.replace(/[<>&]/g, '')}</Say>
      <Gather numDigits="1" action="/api/robocall/response"/>
    </Response>`,
    to: phone,
    from: process.env.TWILIO_PHONE,
  });
  return { ok: true };
}

/** Offline push fallback → SMS after 60s */
export function scheduleSmsFallback(supabaseClient, broadcastId, message) {
  setTimeout(async () => {
    try {
      const { data: undelivered } = await supabaseClient
        .from('notifications')
        .select('*')
        .eq('broadcast_id', broadcastId)
        .eq('status', 'sent')
        .is('delivered_at', null);

      for (const notif of undelivered || []) {
        const { data: u } = await supabaseClient
          .from('users')
          .select('phone')
          .eq('id', notif.user_id)
          .single();
        const phone = u?.phone;
        if (!phone) continue;
        await sendSMS(phone, `${message} (Offline fallback)`);
        await supabaseClient
          .from('notifications')
          .update({ status: 'sms_fallback', delivered_at: new Date().toISOString() })
          .eq('id', notif.id);
      }
    } catch (err) {
      console.error('[SMS fallback]', err);
    }
  }, 60000);
}
