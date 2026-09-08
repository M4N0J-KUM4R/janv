'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Breadcrumb from '@/components/layout/Breadcrumb';
import { assessments } from '@/lib/api';
import type { Assessment } from '@/lib/types';

export default function SubscriberHackathonPage() {
  const [hackathons, setHackathons] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    assessments
      .listHackathons()
      .then((res) => {
        if (!ignore) {
          setHackathons(res.data || []);
          setError(null);
        }
      })
      .catch((err) => {
        if (!ignore) {
          setError(err instanceof Error ? err.message : 'Failed to load subscriber hackathons');
        }
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, []);

  return (
    <div style={{ padding: '24px 32px', maxWidth: '1440px', margin: '0 auto' }}>
      <Breadcrumb
        items={[
          { label: 'Assessment', href: '/assessment/mytests' },
          { label: 'My Hackathons', href: '/assessment/myHackathons' },
          { label: 'Subscriber Exclusive' },
        ]}
      />

      <div
        style={{
          marginTop: '16px',
          marginBottom: '24px',
          backgroundColor: '#fff',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          border: '1px solid #E5E7EB',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#111827', margin: '0 0 6px 0' }}>
              ⭐ Premium Subscriber Hackathons
            </h1>
            <span style={{ fontSize: '11px', fontWeight: '700', backgroundColor: '#FEF08A', color: '#854D0E', padding: '2px 8px', borderRadius: '4px' }}>
              PRO PASS
            </span>
          </div>
          <p style={{ margin: 0, fontSize: '14px', color: '#6B7280' }}>
            Exclusive national and inter-college hackathons enabled for subscribed institutions.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <Link
            href="/assessment/myHackathons"
            style={{
              padding: '9px 16px',
              borderRadius: '8px',
              border: '1px solid #D1D5DB',
              backgroundColor: '#fff',
              color: '#374151',
              fontSize: '14px',
              fontWeight: '500',
              textDecoration: 'none',
            }}
          >
            ← Standard Hackathons
          </Link>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '64px', textAlign: 'center', color: '#6B7280' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              border: '3px solid #E5E7EB',
              borderTopColor: '#4F46E5',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 16px auto',
            }}
          />
          Loading subscriber hackathons...
        </div>
      ) : error ? (
        <div style={{ padding: '24px', backgroundColor: '#FEF2F2', borderRadius: '8px', color: '#DC2626' }}>
          {error}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' }}>
          {hackathons.map((h) => (
            <div
              key={h.id}
              style={{
                backgroundColor: '#fff',
                borderRadius: '12px',
                padding: '24px',
                border: '1px solid #E5E7EB',
                boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <h3 style={{ fontSize: '17px', fontWeight: '700', color: '#111827', margin: 0 }}>{h.title}</h3>
                  <span style={{ fontSize: '11px', fontWeight: '700', backgroundColor: '#DEF7EC', color: '#03543F', padding: '2px 8px', borderRadius: '4px' }}>
                    UNLOCKED
                  </span>
                </div>
                <p style={{ fontSize: '13px', color: '#6B7280', margin: '0 0 16px 0', minHeight: '36px' }}>
                  {h.description || 'Subscriber-exclusive challenge.'}
                </p>
                <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: '#4B5563', marginBottom: '16px' }}>
                  <span>⏱️ {h.duration_mins || 120} mins</span>
                  <span>🎯 {h.total_marks || 100} marks</span>
                  {h.test_code && <span>🔑 {h.test_code}</span>}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid #F3F4F6', paddingTop: '14px' }}>
                <Link
                  href={`/assessment/testDetails?id=${h.id}`}
                  style={{
                    flex: 1,
                    textAlign: 'center',
                    padding: '8px',
                    backgroundColor: '#EEF2FF',
                    color: '#4F46E5',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '600',
                    textDecoration: 'none',
                  }}
                >
                  Manage Challenge
                </Link>
                <Link
                  href={`/assessment/activetest/${h.test_code || h.id}`}
                  style={{
                    padding: '8px 12px',
                    backgroundColor: '#059669',
                    color: '#fff',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '600',
                    textDecoration: 'none',
                  }}
                >
                  Live Monitor
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
