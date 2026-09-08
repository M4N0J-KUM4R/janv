'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';

export default function HomePage() {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (isAuthenticated) {
        router.replace('/learn/dashboard');
      } else {
        router.replace('/adminLogin');
      }
    }
  }, [loading, isAuthenticated, router]);

  return null;
}
