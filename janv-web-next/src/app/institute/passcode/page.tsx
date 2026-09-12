'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Breadcrumb from '@/components/layout/Breadcrumb';
import { assessments } from '@/lib/api';
import { useAuth } from '@/lib/auth';

export default function PassCodePage() {
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [facultyPasscode, setFacultyPasscode] = useState<{ passcode: string; remaining: number } | null>(null);
  const { user } = useAuth();
  const router = useRouter();

  // If faculty or admin is viewing this page, load current active passcode for reference
  useEffect(() => {
    if (user?.role === 'faculty' || user?.role === 'super_admin') {
      assessments
        .getCurrentPasscode()
        .then((res) => {
          if (res?.passcode) {
            setFacultyPasscode({ passcode: res.passcode, remaining: res.remaining_seconds });
          }
        })
        .catch(() => {});
    }
  }, [user]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setVerifying(true);
    try {
      const res = await assessments.verifyPasscode(passcode);
      if (res.valid) {
        setSuccessMsg(res.title ? `Passcode accepted for "${res.title}"! Entering test...` : 'Passcode verified! Entering examination...');
        setTimeout(() => {
          router.push(`/assessment/${res.assessment_id}/take`);
        }, 800);
      } else {
        setError(res.message || 'Invalid or expired passcode. Please ask your faculty for the current 6-hour passcode.');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Verification failed. Please check your network and try again.');
    } finally {
      setVerifying(false);
    }
  };

  const formatMins = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    return `${h}h ${m}m`;
  };

  return (
    <div style={{ maxWidth: '640px' }}>
      <Breadcrumb items={[{ label: 'Assessments' }, { label: 'Pass Code', href: '/institute/passcode' }]} />

      <h1 className="page-title">Enter Pass Code</h1>
      <p className="page-subtitle">Access your assigned test using the 6-hour passcode provided by your faculty.</p>

      {/* Faculty preview banner if faculty visits */}
      {facultyPasscode && (
        <div
          style={{
            background: '#F0FDF4',
            border: '1px solid #BBF7D0',
            borderRadius: '10px',
            padding: '16px 20px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#166534', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Faculty Active Code
            </span>
            <div style={{ fontSize: '18px', fontWeight: 700, color: '#15803D', fontFamily: 'monospace', letterSpacing: '2px', marginTop: '2px' }}>
              {facultyPasscode.passcode}
            </div>
            <span style={{ fontSize: '12px', color: '#15803D' }}>
              Valid for remaining ~{formatMins(facultyPasscode.remaining)}
            </span>
          </div>
          <button
            type="button"
            className="btn btn--secondary"
            style={{ fontSize: '12px', padding: '6px 14px' }}
            onClick={() => setPasscode(facultyPasscode.passcode)}
          >
            Use Active Code
          </button>
        </div>
      )}

      <div className="card">
        <div className="card-body" style={{ padding: '28px' }}>
          {error && (
            <div
              style={{
                padding: '12px 16px',
                background: '#FEF2F2',
                color: '#DC2626',
                borderRadius: '8px',
                marginBottom: '20px',
                fontSize: '13px',
                fontWeight: 500,
                border: '1px solid #FECACA',
              }}
            >
              {error}
            </div>
          )}

          {successMsg && (
            <div
              style={{
                padding: '12px 16px',
                background: '#ECFDF5',
                color: '#059669',
                borderRadius: '8px',
                marginBottom: '20px',
                fontSize: '13px',
                fontWeight: 600,
                border: '1px solid #A7F3D0',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              {successMsg}
            </div>
          )}

          <form onSubmit={handleVerify}>
            <div className="form-group" style={{ marginBottom: '24px' }}>
              <label className="form-label" style={{ fontSize: '13px', fontWeight: 600, color: 'rgb(35, 39, 46)', marginBottom: '8px' }}>
                Pass Code <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. DG-5529"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                required
                autoFocus
                style={{
                  letterSpacing: '0.15em',
                  fontWeight: 700,
                  fontSize: '16px',
                  fontFamily: 'monospace',
                  textTransform: 'uppercase',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: '1px solid rgb(224, 224, 224)',
                }}
              />
              <span style={{ display: 'block', fontSize: '12px', color: '#64748B', marginTop: '6px' }}>
                Ask your faculty for the active 6-hour test passcode.
              </span>
            </div>

            <button
              type="submit"
              className="btn btn--primary"
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '14px',
                fontWeight: 600,
                borderRadius: '8px',
              }}
              disabled={verifying || Boolean(successMsg)}
            >
              {verifying ? 'Verifying Code...' : 'Unlock & Enter Test →'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
