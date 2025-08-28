import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../stores/auth.store';
import { api } from '../../helpers/http.helper';
import { loadRecaptchaEnterprise, getRecaptchaToken } from '../../lib/recaptcha.lib';

const SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY as string | undefined;

export default function ProfileAccount(): React.ReactElement {
  const { user, me, updateProfile, loading } = useAuthStore();
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: '',
    phone: '',
    addressStreet: '',
    addressCity: '',
    addressState: '',
    addressZip: '',
    spouseName: ''
  });

  const [prayer, setPrayer] = useState({
    title: '',
    content: '',
    category: 'prayer' as 'prayer'|'long-term'|'salvation'|'pregnancy'|'birth'
  });

  useEffect(() => { void me(); }, [me]);

  useEffect(() => {
    if (user) {
      setForm(f => ({
        ...f,
        name: user.name ?? '',
        phone: (user as any).phone ?? '',
        addressStreet: (user as any).addressStreet ?? '',
        addressCity: (user as any).addressCity ?? '',
        addressState: (user as any).addressState ?? '',
        addressZip: (user as any).addressZip ?? '',
        spouseName: (user as any).spouseName ?? ''
      }));
    }
  }, [user]);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    const { success, message } = await updateProfile(form);
    setSavedMsg(success ? 'Profile saved' : (message ?? 'Save failed'));
  }

  async function postPrayer(e: React.FormEvent) {
    e.preventDefault();
    if (!SITE_KEY) return alert('Missing site key');
    await loadRecaptchaEnterprise(SITE_KEY);
    const recaptchaToken = await getRecaptchaToken(SITE_KEY, 'prayer_create');

    // Your backend picks the single existing group and uses req.user as author.
    const created = await api('/api/prayers', {
      method: 'POST',
      body: JSON.stringify({ ...prayer, recaptchaToken })
    });
    console.log('Prayer created', created);
    setPrayer({ title: '', content: '', category: 'prayer' });
    alert('Prayer posted');
  }

  if (!user) return <div className="max-w-xl mx-auto mt-8">Loading…</div>;

  return (
    <div className="max-w-3xl mx-auto mt-8 space-y-10">
      <section>
        <h2 className="text-xl font-semibold mb-3">My Profile</h2>
        <form className="grid gap-3" onSubmit={saveProfile}>
          <input className="border p-2 rounded" placeholder="Name"
                 value={form.name} onChange={e=>setForm({...form, name: e.target.value})} />
          <input className="border p-2 rounded" placeholder="Phone"
                 value={form.phone} onChange={e=>setForm({...form, phone: e.target.value})} />
          <input className="border p-2 rounded" placeholder="Street"
                 value={form.addressStreet} onChange={e=>setForm({...form, addressStreet: e.target.value})} />
          <div className="grid grid-cols-3 gap-3">
            <input className="border p-2 rounded" placeholder="City"
                   value={form.addressCity} onChange={e=>setForm({...form, addressCity: e.target.value})} />
            <input className="border p-2 rounded" placeholder="State"
                   value={form.addressState} onChange={e=>setForm({...form, addressState: e.target.value})} />
            <input className="border p-2 rounded" placeholder="ZIP"
                   value={form.addressZip} onChange={e=>setForm({...form, addressZip: e.target.value})} />
          </div>
          <input className="border p-2 rounded" placeholder="Spouse"
                 value={form.spouseName} onChange={e=>setForm({...form, spouseName: e.target.value})} />
          <button className="px-4 py-2 bg-black text-white rounded" disabled={loading} type="submit">
            {loading ? 'Saving…' : 'Save Profile'}
          </button>
          {savedMsg && <p className="text-green-700">{savedMsg}</p>}
        </form>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-3">Post a Prayer</h2>
        <form className="grid gap-3" onSubmit={postPrayer}>
          <input className="border p-2 rounded" placeholder="Title"
                 value={prayer.title} onChange={e=>setPrayer({...prayer, title: e.target.value})} required />
          <select className="border p-2 rounded"
                  value={prayer.category}
                  onChange={e=>setPrayer({...prayer, category: e.target.value as any})}>
            <option value="prayer">Prayer</option>
            <option value="long-term">Long-term</option>
            <option value="salvation">Salvation</option>
            <option value="pregnancy">Pregnancy</option>
            <option value="birth">Birth / Praise</option>
          </select>
          <textarea className="border p-2 rounded" rows={5} placeholder="Content"
                    value={prayer.content} onChange={e=>setPrayer({...prayer, content: e.target.value})} required />
          <button className="px-4 py-2 bg-black text-white rounded" type="submit">Post</button>
        </form>
      </section>
    </div>
  );
}
