'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { assessments } from '@/lib/api';
import type { LiveTestDetails } from '@/lib/types';

export default function DemoTestPage() {
  const params = useParams() as { testCode: string };
  const router = useRouter();
  const testCode = params.testCode;

  const [testData, setTestData] = useState<LiveTestDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    assessments
      .getLiveTest(testCode)
      .then((res) => {
        if (!ignore) {
          setTestData(res);
        }
      })
      .catch((err) => {
        if (!ignore) {
          setError(err instanceof Error ? err.message : 'Invalid or expired test code');
        }
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [testCode]);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F9FAFB', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div
        style={{
          backgroundColor: '#fff',
          borderRadius: '16px',
          padding: '40px',
          maxWidth: '560px',
          width: '100%',
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)',
          border: '1px solid #E5E7EB',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>📝</div>

        {loading ? (
          <div>
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
            <p style={{ color: '#6B7280', fontSize: '14px' }}>Verifying test code {testCode}...</p>
          </div>
        ) : error ? (
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: '700', color: '#DC2626', marginBottom: '8px' }}>
              Test Unavailable
            </h1>
            <p style={{ fontSize: '14px', color: '#6B7280', marginBottom: '24px' }}>{error}</p>
            <button
              onClick={() => router.push('/login')}
              style={{
                padding: '10px 20px',
                backgroundColor: '#4F46E5',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              Go to Login
            </button>
          </div>
        ) : testData ? (
          <div>
            <span
              style={{
                backgroundColor: '#DEF7EC',
                color: '#03543F',
                padding: '4px 12px',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: '700',
              }}
            >
              LIVE TEST READY
            </span>

            <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#111827', margin: '16px 0 8px 0' }}>
              {testData.test_name}
            </h1>

            <p style={{ fontSize: '14px', color: '#6B7280', margin: '0 0 24px 0' }}>
              Test Code: <strong>{testCode}</strong>
            </p>

            <div
              style={{
                backgroundColor: '#F9FAFB',
                padding: '16px',
                borderRadius: '8px',
                border: '1px solid #E5E7EB',
                marginBottom: '24px',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '12px',
                textAlign: 'left',
                fontSize: '13px',
              }}
            >
              <div>⏱️ Duration: <strong>{testData.duration_mins} mins</strong></div>
              <div>👥 Total Appeared: <strong>{testData.total_appeared}</strong></div>
              <div>⏳ Yet to Start: <strong>{testData.total_yet_to_start}</strong></div>
              <div>⚡ In Progress: <strong>{testData.total_ongoing}</strong></div>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={() => router.push(`/assessment/activetest/${testCode}`)}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#4F46E5',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: '600',
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                Enter Candidate Portal
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
