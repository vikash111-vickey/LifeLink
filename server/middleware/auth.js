import admin from 'firebase-admin';
import { readFileSync, existsSync } from 'fs';
import { getUserByFirebaseUid, upsertUserFromFirebase, supabaseReady } from '../services/supabase.js';

let initialized = false;

function ensureFirebase() {
  if (initialized || admin.apps.length) {
    initialized = true;
    return !!admin.apps.length;
  }
  const path = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (path && existsSync(path)) {
    admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(readFileSync(path, 'utf8'))),
    });
    initialized = true;
    return true;
  }
  return false;
}

/** Verify Firebase ID token; attach Supabase user to req.user */
export async function authMiddleware(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Missing authorization token' });
  }

  if (!supabaseReady) {
    return res.status(503).json({
      error: 'Supabase not configured. Set SUPABASE_URL and SUPABASE_SERVICE_KEY in .env.local',
    });
  }

  const hasFirebaseAdmin = ensureFirebase();
  let decoded = null;

  if (!hasFirebaseAdmin) {
    // Local Development Bypass Mode: Decode JWT payload directly without signature verification
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        const payloadStr = Buffer.from(parts[1], 'base64').toString('utf8');
        decoded = JSON.parse(payloadStr);
        // Map standard fields to Firebase schema format
        decoded.uid = decoded.user_id || decoded.sub || 'mock-dev-uid';
        decoded.email = decoded.email || 'donor.dev@example.com';
        decoded.name = decoded.name || decoded.display_name || decoded.email?.split('@')[0] || 'Local Hero';
      } else {
        // Fallback for simple custom string tokens
        decoded = {
          uid: token === 'admin' ? 'mock-admin-uid' : 'mock-donor-uid',
          email: token === 'admin' ? 'admin@lifelink.org' : 'donor@lifelink.org',
          name: token === 'admin' ? 'Admin User' : 'Donor User',
        };
      }
    } catch (err) {
      console.warn('[auth-bypass] Failed to decode development JWT:', err.message);
      return res.status(401).json({ error: 'Invalid or poorly formed JWT token' });
    }
  } else {
    try {
      decoded = await admin.auth().verifyIdToken(token);
    } catch (err) {
      console.error('[auth] Verification failed:', err.message);
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
  }

  try {
    let user = await getUserByFirebaseUid(decoded.uid);
    if (!user) {
      user = await upsertUserFromFirebase({
        uid: decoded.uid,
        email: decoded.email,
        displayName: decoded.name,
      });
    }
    req.firebaseUser = decoded;
    req.user = user;
    next();
  } catch (err) {
    console.error('[auth-db-sync]', err.message);
    return res.status(500).json({ error: 'Database authentication sync error: ' + err.message });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user?.role || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}
