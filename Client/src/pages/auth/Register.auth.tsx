import React, { useState } from 'react';
import { useAuthStore } from '../../stores/auth.store';

export default function Register(): React.ReactElement {
  const { register, loading } = useAuthStore();
  const [form, setForm] = useState({ name: '', phone: '', email: '', password: '' });
  const [show, setShow] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    // integrate reCAPTCHA token here when ready
    await register(form, 'dev-recaptcha');
  }

  return (
    <form onSubmit={onSubmit} className="max-w-md space-y-3" aria-label="Register">
      <label className="block text-sm">
        <span>Name</span>
        <input required value={form.name} onChange={(e)=>setForm({...form, name:e.target.value})} className="w-full p-2 rounded-md text-black" />
      </label>
      <label className="block text-sm">
        <span>Phone</span>
        <input required value={form.phone} onChange={(e)=>setForm({...form, phone:e.target.value})} className="w-full p-2 rounded-md text-black" />
      </label>
      <label className="block text-sm">
        <span>Email</span>
        <input required type="email" value={form.email} onChange={(e)=>setForm({...form, email:e.target.value})} className="w-full p-2 rounded-md text-black" />
      </label>
      <label className="block text-sm">
        <span>Password</span>
        <div className="relative">
          <input
            required
            aria-describedby="password-help"
            type={show ? 'text' : 'password'}
            value={form.password}
            onChange={(e)=>setForm({...form, password:e.target.value})}
            className="w-full p-2 pr-10 rounded-md text-black"
          />
          <button type="button" aria-label={show ? 'Hide password' : 'Show password'} onClick={()=>setShow(s=>!s)} className="absolute right-2 top-1/2 -translate-y-1/2 text-sm">
            {show ? 'Hide' : 'Show'}
          </button>
        </div>
        <small id="password-help" className="opacity-70">Minimum 8 characters, include letters & numbers.</small>
      </label>
      <button disabled={loading} className="px-4 py-2 rounded-md bg-white text-black font-semibold">{loading ? '…' : 'Create account'}</button>
    </form>
  );
}
