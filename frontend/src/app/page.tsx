'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LandingPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect directly to dashboard (no auth required)
    router.push('/dashboard');
  }, [router]);

  return (
    <div className="flex flex-grow items-center justify-center bg-background">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-accent-purple border-t-transparent"></div>
    </div>
  );
}
