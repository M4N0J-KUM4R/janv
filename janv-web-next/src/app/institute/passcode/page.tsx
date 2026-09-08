'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Breadcrumb from '@/components/layout/Breadcrumb';
import { assessments } from '@/lib/api';

export default function PassCodePage() {
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState('');
  const [verifying, setVerifying] = useState(false);
  const router = useRouter();

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setVerifying(true);
    try {
      const res = await assessments.verifyPasscode(passcode);
      if (res.valid) {
        router.push(`/assessment/${res.assessment_id}/take`);
      } else {
        setError('Invalid passcode. Please check and try again.');
      }
    } catch {
      setError('Verification failed. Invalid passcode.');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div>
      <Breadcrumb items={[{ label: 'Assessments' }, { label: 'Pass Code', href: '/institute/passcode' }]} />

      <h1 className="page-title">Enter Pass Code</h1>
      <p className="page-subtitle">Access your assigned test using the passcode provided by your faculty.</p>

      <div className="card" style={{ maxWidth: '480px' }}>
        <div className="card-body">
          {error && (
            <div
              style={{
                padding: '10px 14px',
                background: 'var(--error-light)',
                color: 'var(--error)',
                borderRadius: 'var(--radius-md)',
                marginBottom: '16px',
                fontSize: '0.85rem',
              }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleVerify}>
            <div className="form-group">
              <label className="form-label">
                Pass Code <span className="required">*</span>
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. PASS1234"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                required
                style={{ letterSpacing: '0.1em', fontWeight: 600 }}
              />
            </div>

            <button type="submit" className="btn btn--primary" style={{ width: '100%' }} disabled={verifying}>
              {verifying ? 'Verifying...' : 'Unlock Test →'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
