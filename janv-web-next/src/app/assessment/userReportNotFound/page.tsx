'use client';

import Link from 'next/link';
import Breadcrumb from '@/components/layout/Breadcrumb';

export default function UserReportNotFoundPage() {
  return (
    <div style={{ padding: '32px', maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
      <Breadcrumb
        items={[
          { label: 'Assessment', href: '/assessment/mytests' },
          { label: 'Report Not Found' },
        ]}
      />

      <div
        style={{
          marginTop: '48px',
          backgroundColor: '#fff',
          borderRadius: '16px',
          padding: '48px 32px',
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
          border: '1px solid #E5E7EB',
        }}
      >
        <div style={{ fontSize: '64px', marginBottom: '16px' }}>📋❌</div>
        <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#111827', marginBottom: '12px' }}>
          Candidate Report Not Found
        </h1>
        <p style={{ fontSize: '15px', color: '#6B7280', maxWidth: '480px', margin: '0 auto 32px auto', lineHeight: '1.6' }}>
          We could not locate an evaluation report for this candidate attempt. The assessment might still be in progress, or the attempt has not been submitted yet.
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <Link
            href="/assessment/mytests"
            style={{
              padding: '10px 20px',
              backgroundColor: '#4F46E5',
              color: '#fff',
              borderRadius: '8px',
              fontWeight: '600',
              textDecoration: 'none',
              fontSize: '14px',
            }}
          >
            Go to Assessments
          </Link>

          <Link
            href="/learn/overallReport"
            style={{
              padding: '10px 20px',
              backgroundColor: '#F3F4F6',
              color: '#374151',
              borderRadius: '8px',
              fontWeight: '600',
              textDecoration: 'none',
              fontSize: '14px',
              border: '1px solid #D1D5DB',
            }}
          >
            View Overall Reports
          </Link>
        </div>
      </div>
    </div>
  );
}
