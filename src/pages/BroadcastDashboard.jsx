import { useState } from 'react';
import { Radio, Send } from 'lucide-react';
import { api } from '../lib/api';
import { BLOOD_GROUPS } from '../constants';

export default function BroadcastDashboard({ dbUser, showToast, navigate }) {
  const [alertType, setAlertType] = useState('emergency');
  const [bloodType, setBloodType] = useState('O+');
  const [priority, setPriority] = useState('critical');
  const [message, setMessage] = useState('');
  const [radiusKm, setRadiusKm] = useState(10);
  const [channels, setChannels] = useState(['push', 'sms']);
  const [loading, setLoading] = useState(false);
  const [lastReach, setLastReach] = useState(null);

  const toggleChannel = (ch) => {
    setChannels((prev) =>
      prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch]
    );
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!dbUser?.lat) {
      showToast('Enable GPS — location required for radius broadcast');
      return;
    }
    setLoading(true);
    try {
      const result = await api.sendBroadcast({
        alertType,
        bloodType,
        priority,
        message: message || `Urgent ${bloodType} blood needed nearby.`,
        channels,
        radiusKm,
        lat: dbUser.lat,
        lng: dbUser.lng,
      });
      setLastReach(result.reached);
      showToast(`Broadcast sent to ${result.reached} donors`);
    } catch (err) {
      showToast(err.message || 'Broadcast failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 animate-fadeIn">
      <button onClick={() => navigate('home')} className="text-sm text-gray-400 hover:text-white mb-4">
        ← Back
      </button>
      <h2 className="text-4xl font-heading flex items-center gap-2">
        <Radio className="text-crimson" /> Broadcast Center
      </h2>
      <p className="text-gray-400 mt-2">Send live alerts to donors within radius (real GPS).</p>

      <form onSubmit={handleSend} className="mt-8 glass-premium rounded-2xl p-6 space-y-5">
        <div className="grid sm:grid-cols-2 gap-4">
          <label className="block">
            <span className="text-xs text-gray-400 uppercase">Alert type</span>
            <select
              value={alertType}
              onChange={(e) => setAlertType(e.target.value)}
              className="w-full mt-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2"
            >
              <option value="emergency">Emergency</option>
              <option value="low_stock">Low stock</option>
              <option value="camp">Camp</option>
            </select>
          </label>
          <label className="block">
            <span className="text-xs text-gray-400 uppercase">Blood type</span>
            <select
              value={bloodType}
              onChange={(e) => setBloodType(e.target.value)}
              className="w-full mt-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2"
            >
              {BLOOD_GROUPS.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
              <option value="any">Any</option>
            </select>
          </label>
        </div>

        <label className="block">
          <span className="text-xs text-gray-400 uppercase">Message</span>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            className="w-full mt-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2"
            placeholder="Describe the emergency…"
          />
        </label>

        <div className="grid sm:grid-cols-2 gap-4">
          <label className="block">
            <span className="text-xs text-gray-400 uppercase">Priority</span>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full mt-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2"
            >
              <option value="critical">Critical</option>
              <option value="urgent">Urgent</option>
              <option value="normal">Normal</option>
            </select>
          </label>
          <label className="block">
            <span className="text-xs text-gray-400 uppercase">Radius (km)</span>
            <input
              type="number"
              min={1}
              max={50}
              value={radiusKm}
              onChange={(e) => setRadiusKm(Number(e.target.value))}
              className="w-full mt-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2"
            />
          </label>
        </div>

        <div>
          <span className="text-xs text-gray-400 uppercase">Channels</span>
          <div className="flex flex-wrap gap-2 mt-2">
            {['push', 'sms', 'whatsapp', 'email', 'robocall'].map((ch) => (
              <button
                key={ch}
                type="button"
                onClick={() => toggleChannel(ch)}
                className={`px-3 py-1 rounded-full text-xs font-bold border ${
                  channels.includes(ch)
                    ? 'bg-crimson/30 border-crimson text-white'
                    : 'bg-white/5 border-white/20 text-gray-400'
                }`}
              >
                {ch}
              </button>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn-glow w-full py-3 bg-crimson rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Send className="w-4 h-4" /> {loading ? 'Sending…' : 'Send broadcast'}
        </button>

        {lastReach != null && (
          <p className="text-emerald text-sm text-center">Last broadcast reached {lastReach} donors.</p>
        )}
      </form>
    </div>
  );
}
