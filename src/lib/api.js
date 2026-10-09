import { auth } from '../firebase';

const API_BASE = import.meta.env.VITE_API_URL || '';

async function getAuthHeaders() {
  const user = auth.currentUser;
  if (!user) return { 'Content-Type': 'application/json' };
  const token = await user.getIdToken();
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

export async function apiFetch(path, options = {}) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { ...headers, ...options.headers },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data;
}

export const api = {
  syncUser: (body) => apiFetch('/api/users/sync', { method: 'POST', body: JSON.stringify(body) }),
  updateLocation: (body) =>
    apiFetch('/api/users/location', { method: 'PATCH', body: JSON.stringify(body) }),
  updateProfile: (body) =>
    apiFetch('/api/users/profile', { method: 'PATCH', body: JSON.stringify(body) }),
  setOffline: () => apiFetch('/api/users/offline', { method: 'POST' }),
  sendBroadcast: (body) =>
    apiFetch('/api/broadcast/send', { method: 'POST', body: JSON.stringify(body) }),
  broadcastHistory: () => apiFetch('/api/broadcast/history'),
  urgentHospital: (body) =>
    apiFetch('/api/hospital/urgent-request', { method: 'POST', body: JSON.stringify(body) }),
  getInventory: (hospitalId) => apiFetch(`/api/inventory/${hospitalId}`),
  updateInventory: (body) =>
    apiFetch('/api/inventory/update', { method: 'PUT', body: JSON.stringify(body) }),
  dispatchAmbulance: (body) =>
    apiFetch('/api/ambulance/dispatch', { method: 'POST', body: JSON.stringify(body) }),
  createCamp: (body) =>
    apiFetch('/api/camps/create', { method: 'POST', body: JSON.stringify(body) }),
  upcomingCamps: () => apiFetch('/api/camps/upcoming'),
  govSync: () => apiFetch('/api/gov/sync', { method: 'POST' }),
};
