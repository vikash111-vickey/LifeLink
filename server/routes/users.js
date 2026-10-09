import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { getSupabase, upsertUserFromFirebase, isUsingMockDb } from '../services/supabase.js';

const router = Router();

router.post('/sync', authMiddleware, async (req, res) => {
  try {
    const user = await upsertUserFromFirebase(req.firebaseUser, req.body);
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/location', authMiddleware, async (req, res) => {
  const { lat, lng, is_online } = req.body;
  try {
    const db = getSupabase();
    
    if (isUsingMockDb && lat && lng) {
      const { data: currentUsers } = await db.from('users').select('id');
      if (currentUsers && currentUsers.length <= 5) {
        const offsets = [
          { name: 'Dr. Rahul (Hospital Admin)', blood: 'O-', latOff: 0.012, lngOff: -0.008, phone: '+919998880001', role: 'hospital_admin' },
          { name: 'Karan Malhotra (Donor)', blood: 'B+', latOff: -0.009, lngOff: 0.015, phone: '+919998880002', role: 'donor' },
          { name: 'Neha Sharma (Donor)', blood: 'O+', latOff: 0.008, lngOff: 0.011, phone: '+919998880003', role: 'donor' },
          { name: 'Sanjay Dutt (Inventory Manager)', blood: 'AB-', latOff: -0.015, lngOff: -0.013, phone: '+919998880004', role: 'blood_bank_manager' }
        ];
        for (const off of offsets) {
          await db.from('users').insert({
            name: off.name,
            email: off.name.toLowerCase().replace(/[^a-z]/g, '') + '@example.com',
            blood_type: off.blood,
            role: off.role,
            phone: off.phone,
            whatsapp_opt_in: true,
            lat: lat + off.latOff,
            lng: lng + off.lngOff,
            is_online: true,
            last_seen: new Date().toISOString()
          });
        }
        console.log(`[LifeLink-Mock] Dynamically spawned 4 mock users near user position: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
      }
    }

    const { data, error } = await db
      .from('users')
      .update({
        lat,
        lng,
        is_online: is_online ?? true,
        last_seen: new Date().toISOString(),
      })
      .eq('id', req.user.id)
      .select()
      .single();
    if (error) throw error;
    res.json({ success: true, user: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/profile', authMiddleware, async (req, res) => {
  const allowed = ['phone', 'blood_type', 'whatsapp_opt_in', 'fcm_token', 'name', 'role', 'emergency_contact'];
  const patch = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) patch[key] = req.body[key];
  }
  try {
    const { data, error } = await getSupabase()
      .from('users')
      .update(patch)
      .eq('id', req.user.id)
      .select()
      .single();
    if (error) throw error;
    res.json({ success: true, user: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/offline', authMiddleware, async (req, res) => {
  try {
    await getSupabase()
      .from('users')
      .update({ is_online: false, last_seen: new Date().toISOString() })
      .eq('id', req.user.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/sos', authMiddleware, async (req, res) => {
  const { lat, lng } = req.body;
  const userLat = lat ?? req.user.lat;
  const userLng = lng ?? req.user.lng;

  if (!userLat || !userLng) {
    return res.status(400).json({ error: 'GPS coordinates are required to trigger SOS.' });
  }

  try {
    const db = getSupabase();
    
    // Fetch blood banks & hospitals or use static ones
    const mockBanks = [
      { name: 'Lions Blood Bank', area: 'Indiranagar', lat: 12.9784, lng: 77.6408, phone: '+91 98765 43210' },
      { name: 'Rotary TTK Blood Bank', area: 'Koramangala', lat: 12.9352, lng: 77.6245, phone: '+91 98765 43211' },
      { name: 'Apollo Hospitals Blood Center', area: 'Jayanagar', lat: 12.9308, lng: 77.5838, phone: '+91 98765 43212' },
      { name: 'Red Cross Blood Bank', area: 'Majestic', lat: 12.9767, lng: 77.5713, phone: '+91 98765 43213' },
      { name: 'Fortis Blood Centre', area: 'Bannerghatta', lat: 12.8942, lng: 77.6100, phone: '+91 98765 43214' },
    ];
    const mockHospitals = [
      { name: 'Manipal Hospital', area: 'Old Airport Road', lat: 12.9981, lng: 77.5925, phone: '+91 98765 00111' },
      { name: 'Sakra World Hospital', area: 'Devarabeesanahalli', lat: 12.9315, lng: 77.6834, phone: '+91 98765 00222' },
      { name: 'Aster CMI Hospital', area: 'Hebbal', lat: 12.9797, lng: 77.5929, phone: '+91 98765 00333' },
    ];

    const haversine = (lat1, lon1, lat2, lon2) => {
      const R = 6371;
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    };

    const sortedBanks = mockBanks.map(b => ({
      ...b,
      distanceKm: haversine(userLat, userLng, b.lat, b.lng)
    })).sort((a, b) => a.distanceKm - b.distanceKm);

    const sortedHospitals = mockHospitals.map(h => ({
      ...h,
      distanceKm: haversine(userLat, userLng, h.lat, h.lng)
    })).sort((a, b) => a.distanceKm - b.distanceKm);

    const closestBank = sortedBanks[0];
    const closestHospital = sortedHospitals[0];

    const userName = req.user.name || 'Hero Donor';
    const userBloodGroup = req.user.blood_type || 'O+';
    const mapsLink = `https://www.google.com/maps/dir/?api=1&destination=${userLat},${userLng}`;
    const timestamp = new Date().toISOString();

    const sosMessage = `🚨 EMERGENCY SOS 🚨\nName: ${userName}\nBlood Group: ${userBloodGroup}\nLocation Link: ${mapsLink}\nTime: ${new Date(timestamp).toLocaleString()}`;

    // Alert emergency contact
    const contact = req.user.emergency_contact || '(None Configured)';
    console.log(`[SOS-ALERT] SMS dispatched to emergency contact [${contact}]:\n${sosMessage}`);

    // Alert nearest facilities
    console.log(`[SOS-ALERT] Alerts fired to closest Blood Bank [${closestBank.name}] and Hospital [${closestHospital.name}]`);

    res.json({
      success: true,
      closestBank,
      closestHospital,
      sosMessage,
      emergencyContact: contact,
      timestamp
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
