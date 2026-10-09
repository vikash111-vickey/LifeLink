import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

import { getSupabase, getOnlineCount, supabaseReady } from './services/supabase.js';
import { startCampReminderCron, startGovSyncCron } from './services/cron.js';
import usersRouter from './routes/users.js';
import createBroadcastRouter from './routes/broadcast.js';
import createHospitalRouter from './routes/hospital.js';
import createInventoryRouter from './routes/inventory.js';
import createAmbulanceRouter from './routes/ambulance.js';
import createCampsRouter from './routes/camps.js';
import createGovSyncRouter from './routes/gov-sync.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env') });
dotenv.config({ path: join(__dirname, '../.env.local') });

const PORT = process.env.PORT || 3000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: { origin: [CLIENT_ORIGIN, 'http://localhost:5173'], methods: ['GET', 'POST'] },
});

app.use(cors({ origin: [CLIENT_ORIGIN, 'http://localhost:5173'], credentials: true }));
app.use(express.json());

app.get('/', (_req, res) => {
  res.send('<h1>LifeLink Backend API Server</h1><p>Server is running. Health check: <a href="/api/health">/api/health</a></p>');
});

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'LifeLink API', supabase: supabaseReady });
});

if (!supabaseReady) {
  console.warn('[LifeLink] SUPABASE_URL / SUPABASE_SERVICE_KEY missing — DB routes will return 503.');
}

/** Auto-broadcast when inventory critically low */
async function triggerAutoBroadcast(bloodType, priority, hospitalName) {
  const message = `CRITICAL: ${bloodType} stock below 15% at ${hospitalName}. Donors needed urgently.`;
  io.emit('broadcast:new', {
    message,
    alertType: 'low_inventory',
    bloodType,
    priority,
  });
}

const broadcastRouter = createBroadcastRouter(io);
const hospitalRouter = createHospitalRouter(io);
const inventoryRouter = createInventoryRouter(io, triggerAutoBroadcast);
const ambulanceRouter = createAmbulanceRouter(io);
const campsRouter = createCampsRouter(io);
const govSyncRouter = createGovSyncRouter(io);

app.use('/api/users', usersRouter);
app.use('/api/broadcast', broadcastRouter);
app.use('/api/hospital', hospitalRouter);
app.use('/api/inventory', inventoryRouter);
app.use('/api/ambulance', ambulanceRouter);
app.use('/api/camps', campsRouter);
app.use('/api/gov', govSyncRouter);

app.post('/api/robocall/response', (_req, res) => {
  res.type('text/xml');
  res.send(
    '<Response><Say>Thank you for confirming. LifeLink appreciates your help.</Say></Response>'
  );
});

io.on('connection', (socket) => {
  socket.on('user:online', async ({ userId }) => {
    if (!userId) return;
    socket.userId = userId;
    socket.join(`user:${userId}`);
    if (supabaseReady) {
      await getSupabase()
        .from('users')
        .update({ is_online: true, last_seen: new Date().toISOString() })
        .eq('id', userId);
    }
    const count = await getOnlineCount();
    io.emit('donor:count', count);
  });

  socket.on('location:update', async ({ userId, lat, lng }) => {
    if (!userId || lat == null || lng == null) return;
    if (supabaseReady) {
      await getSupabase()
        .from('users')
        .update({ lat, lng, last_seen: new Date().toISOString() })
        .eq('id', userId);
    }
    socket.broadcast.emit('donor:location', { userId, lat, lng });
  });

  socket.on('disconnect', async () => {
    if (socket.userId) {
      if (supabaseReady) {
        await getSupabase()
          .from('users')
          .update({ is_online: false, last_seen: new Date().toISOString() })
          .eq('id', socket.userId);
      }
      const count = await getOnlineCount();
      io.emit('donor:count', count);
    }
  });
});

export function notifyUser(userId, event, data) {
  io.to(`user:${userId}`).emit(event, data);
}

startCampReminderCron(io);
startGovSyncCron(govSyncRouter.syncGovRegistry);

httpServer.listen(PORT, () => {
  console.log(`[LifeLink] API + Socket.io on http://localhost:${PORT}`);
});
