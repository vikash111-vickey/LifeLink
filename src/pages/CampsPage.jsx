import { useState } from 'react';
import { Calendar } from 'lucide-react';
import { api } from '../lib/api';
import { BLOOD_GROUPS } from '../constants';

export default function CampsPage({ dbUser, showToast, navigate }) {
  const [title, setTitle] = useState('');
  const [address, setAddress] = useState('');
  const [campDate, setCampDate] = useState('');
  const [description, setDescription] = useState('');
  const [bloodTypes, setBloodTypes] = useState(['O+', 'A+']);
  const [loading, setLoading] = useState(false);

  const toggleType = (g) => {
    setBloodTypes((prev) =>
      prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]
    );
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!dbUser?.lat) {
      showToast('Enable GPS for camp location');
      return;
    }
    setLoading(true);
    try {
      const r = await api.createCamp({
        title,
        description,
        address,
        lat: dbUser.lat,
        lng: dbUser.lng,
        campDate: new Date(campDate).toISOString(),
        bloodTypesNeeded: bloodTypes,
      });
      showToast(`Camp created — ${r.notified} donors notified within 20km`);
      navigate('home');
    } catch (err) {
      showToast(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <button onClick={() => navigate('home')} className="text-sm text-gray-400 hover:text-white mb-4">
        ← Back
      </button>
      <h2 className="text-4xl font-heading flex items-center gap-2">
        <Calendar className="text-violet" /> Blood Camp
      </h2>
      <form onSubmit={submit} className="mt-8 glass-premium rounded-2xl p-6 space-y-4">
        <input
          required
          placeholder="Camp title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2"
        />
        <input
          required
          placeholder="Address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2"
        />
        <input
          required
          type="datetime-local"
          value={campDate}
          onChange={(e) => setCampDate(e.target.value)}
          className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2"
        />
        <textarea
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2"
          rows={2}
        />
        <div className="flex flex-wrap gap-2">
          {BLOOD_GROUPS.map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => toggleType(g)}
              className={`px-2 py-1 rounded-lg text-xs font-bold ${
                bloodTypes.includes(g) ? 'bg-violet/40 border-violet' : 'bg-white/5'
              } border`}
            >
              {g}
            </button>
          ))}
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-all shadow-[0_0_15px_rgba(220,38,38,0.5)] disabled:opacity-50 mt-4"
        >
          {loading ? 'Creating…' : 'Create Camp & Notify Donors'}
        </button>
      </form>
    </div>
  );
}
