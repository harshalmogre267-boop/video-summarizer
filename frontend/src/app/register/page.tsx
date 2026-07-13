'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertCircle } from 'lucide-react';
import { api, setAuthToken } from '../../services/api';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const res = await api.register({ name, email, password });
      setAuthToken(res.access_token);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-grow items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <h1 className="text-center text-3xl font-extrabold text-white">Create your account</h1>
        <p className="mt-2 text-center text-sm text-slate-400">
          Or <Link className="text-accent-cyan font-semibold" href="/login">sign in to existing account</Link>
        </p>

        <form onSubmit={handleSubmit} className="glass-panel mt-8 space-y-5 rounded-2xl border border-card-border p-8">
          {error && (
            <div className="flex gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <input required value={name} onChange={(event) => setName(event.target.value)} placeholder="Full name" className="w-full rounded-xl glass-input px-4 py-3 text-sm" />
          <input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email address" className="w-full rounded-xl glass-input px-4 py-3 text-sm" />
          <input type="password" required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Password" className="w-full rounded-xl glass-input px-4 py-3 text-sm" />
          <input type="password" required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Confirm password" className="w-full rounded-xl glass-input px-4 py-3 text-sm" />
          <button disabled={loading} className="glow-btn-purple w-full rounded-xl px-4 py-3 text-sm font-semibold text-white disabled:opacity-60">
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  );
}
