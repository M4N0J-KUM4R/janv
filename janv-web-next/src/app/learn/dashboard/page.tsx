'use client';

import { useEffect, useState, useCallback } from 'react';
import Breadcrumb from '@/components/layout/Breadcrumb';
import { analytics, assessments } from '@/lib/api';
import type { FacultyDashboardStats } from '@/lib/types';

interface PasscodeData {
  passcode: string;
  institution_id: number;
  institution_name: string;
  expires_at: string;
  window_start: string;
  remaining_seconds: number;
  interval_hours: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<FacultyDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 6-hour rotating passcode state
  const [passcodeData, setPasscodeData] = useState<PasscodeData | null>(null);
  const [remainingSecs, setRemainingSecs] = useState<number>(0);
  const [copied, setCopied] = useState(false);
  const [passcodeLoading, setPasscodeLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const fetchPasscode = useCallback(async () => {
    try {
      setPasscodeLoading(true);
      const data = await assessments.getCurrentPasscode();
      setPasscodeData(data);
      setRemainingSecs(data.remaining_seconds || 0);
    } catch (err) {
      console.error('Failed to load active passcode:', err);
    } finally {
      setPasscodeLoading(false);
    }
  }, []);

  const handleRegenerate = async () => {
    try {
      setRegenerating(true);
      const data = await assessments.regeneratePasscode();
      setPasscodeData(data);
      setRemainingSecs(data.remaining_seconds || 0);
      showToast('New 6-hour exam passcode generated successfully!');
    } catch (err) {
      console.error('Failed to regenerate passcode:', err);
      showToast('Failed to regenerate passcode.');
    } finally {
      setRegenerating(false);
    }
  };

  useEffect(() => {
    analytics
      .dashboard()
      .then((data) => setStats(data))
      .catch((err) => {
        setError(err.message || 'Failed to load dashboard data');
      })
      .finally(() => setLoading(false));

    fetchPasscode();
  }, [fetchPasscode]);

  // Live countdown timer
  useEffect(() => {
    if (remainingSecs <= 0) return;
    const interval = setInterval(() => {
      setRemainingSecs((prev) => {
        if (prev <= 1) {
          fetchPasscode();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [remainingSecs, fetchPasscode]);

  const handleCopy = () => {
    if (!passcodeData?.passcode) return;
    navigator.clipboard.writeText(passcodeData.passcode);
    setCopied(true);
    showToast(`Pass Code ${passcodeData.passcode} copied to clipboard!`);
    setTimeout(() => setCopied(false), 2500);
  };

  const formatCountdown = (totalSecs: number) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    return `${hrs}h ${String(mins).padStart(2, '0')}m ${String(secs).padStart(2, '0')}s`;
  };

  if (loading) {
    return (
      <div>
        <Breadcrumb items={[{ label: 'Learning' }, { label: 'Dashboard', href: '/learn/dashboard' }]} />
        <div className="stats-grid">
          {[1, 2, 3].map((i) => (
            <div key={i} className="stat-card" style={{ minHeight: '100px' }}>
              <div style={{ width: '60%', height: '20px', background: '#f0f0f0', borderRadius: '4px', marginBottom: '8px' }} />
              <div style={{ width: '40%', height: '28px', background: '#f0f0f0', borderRadius: '4px' }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <Breadcrumb items={[{ label: 'Learning' }, { label: 'Dashboard', href: '/learn/dashboard' }]} />
        <div
          style={{
            padding: '40px',
            textAlign: 'center',
            color: '#DC2626',
            fontFamily: '"Public Sans", sans-serif',
          }}
        >
          <p style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>Failed to load dashboard</p>
          <p style={{ fontSize: '14px', color: '#727272' }}>{error}</p>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: '16px',
              padding: '8px 24px',
              borderRadius: '8px',
              border: '1px solid #E2E2E2',
              background: '#fff',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 500,
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Breadcrumb items={[{ label: 'Learning' }, { label: 'Dashboard', href: '/learn/dashboard' }]} />

      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            top: '24px',
            right: '24px',
            backgroundColor: '#0F172A',
            color: '#ffffff',
            padding: '12px 20px',
            borderRadius: '8px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
            zIndex: 9999,
            fontFamily: '"Public Sans", sans-serif',
            fontSize: '14px',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            animation: 'fadeIn 0.2s ease-out',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          {toastMessage}
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* 6-Hour Rotating Exam Pass Code Card */}
      {/* ────────────────────────────────────────────────────────── */}
      <div
        style={{
          background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
          padding: '24px',
          marginBottom: '28px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Subtle accent bar on the left */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: '5px',
            background: 'linear-gradient(180deg, #3B82F6 0%, #1D4ED8 100%)',
          }}
        />

        {/* Card Header Row */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '18px',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                backgroundColor: '#EFF6FF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#2563EB',
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '17px', fontWeight: 700, color: '#0F172A', margin: 0, fontFamily: '"Public Sans", sans-serif' }}>
                  Live Examination Pass Code
                </h2>
                {passcodeData?.institution_name && (
                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: 600,
                      color: '#475569',
                      backgroundColor: '#F1F5F9',
                      padding: '2px 8px',
                      borderRadius: '6px',
                    }}
                  >
                    {passcodeData.institution_name}
                  </span>
                )}
              </div>
              <p style={{ margin: '2px 0 0 0', fontSize: '13px', color: '#64748B' }}>
                Provide this pass code to students to enter and begin ongoing assessments.
              </p>
            </div>
          </div>

          {/* Status Badge */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#ECFDF5',
              border: '1px solid #A7F3D0',
              padding: '6px 14px',
              borderRadius: '20px',
              color: '#047857',
              fontSize: '12px',
              fontWeight: 600,
              letterSpacing: '0.04em',
            }}
          >
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: '#10B981',
                display: 'inline-block',
                boxShadow: '0 0 0 3px rgba(16, 185, 129, 0.25)',
              }}
            />
            <span>ROTATES EVERY 6 HOURS</span>
          </div>
        </div>

        {/* Card Body: Passcode Display Box & Actions */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#ffffff',
            border: '1.5px dashed #CBD5E1',
            borderRadius: '12px',
            padding: '16px 24px',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          {/* Left: Code display & Countdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
            <div>
              <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: '#94A3B8', letterSpacing: '0.06em', display: 'block', marginBottom: '4px' }}>
                Active Pass Code
              </span>
              <div
                style={{
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                  fontSize: '28px',
                  fontWeight: 800,
                  letterSpacing: '4px',
                  color: '#1E293B',
                  minWidth: '150px',
                }}
              >
                {passcodeLoading ? '••••••' : passcodeData?.passcode || '------'}
              </div>
            </div>

            <div style={{ height: '36px', width: '1px', backgroundColor: '#E2E8F0' }} />

            <div>
              <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: '#94A3B8', letterSpacing: '0.06em', display: 'block', marginBottom: '4px' }}>
                Validity Remaining
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '15px', fontWeight: 600, color: remainingSecs < 600 ? '#DC2626' : '#2563EB' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
                <span>{passcodeLoading ? 'Calculating...' : formatCountdown(remainingSecs)}</span>
              </div>
            </div>
          </div>

          {/* Right: Copy & Regenerate Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={handleCopy}
              disabled={passcodeLoading || !passcodeData?.passcode}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                borderRadius: '8px',
                backgroundColor: copied ? '#059669' : '#017DF9',
                color: '#ffffff',
                border: 'none',
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: '0 2px 8px rgba(1, 125, 249, 0.25)',
              }}
            >
              {copied ? (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                  </svg>
                  <span>Copy Pass Code</span>
                </>
              )}
            </button>

            <button
              onClick={handleRegenerate}
              disabled={regenerating || passcodeLoading}
              title="Manually rotate to a fresh 6-hour code immediately"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '10px 14px',
                borderRadius: '8px',
                backgroundColor: '#F8FAFC',
                color: '#475569',
                border: '1px solid #CBD5E1',
                fontWeight: 500,
                fontSize: '13px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: regenerating ? 'spin 1s linear infinite' : 'none' }}>
                <polyline points="23 4 23 10 17 10"></polyline>
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
              </svg>
              <span>{regenerating ? 'Rotating...' : 'Rotate Now'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Existing KPI Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div>
            <div className="stat-card__label">Total Students</div>
            <div className="stat-card__value">
              {stats?.total_students ?? '-'}
            </div>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/totalStudentsIcon.svg" alt="Total Students" style={{ width: '48px', height: '49px' }} />
        </div>

        <div className="stat-card">
          <div>
            <div className="stat-card__label">Current Student Rating</div>
            <div className="stat-card__value">
              {stats?.current_rating ?? '-'}{' '}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/icons/Star.svg" alt="Star" style={{ width: '22px', height: '22px', marginLeft: '6px', verticalAlign: 'middle' }} />
            </div>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/studentRatingIcon.svg" alt="Student Rating" style={{ width: '48px', height: '49px' }} />
        </div>

        <div className="stat-card">
          <div>
            <div className="stat-card__label">Total Videos Watched</div>
            <div className="stat-card__value">
              {stats?.total_attempts ?? '-'}
            </div>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/totalVideosWatched.svg" alt="Total Videos Watched" style={{ width: '48px', height: '49px' }} />
        </div>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: '1fr 2fr' }}>
        <div className="stat-card">
          <div>
            <div className="stat-card__label">Total watch time (mins)</div>
            <div className="stat-card__value">{stats?.avg_score ?? '-'}</div>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/watchTimeIcon.svg" alt="Watch Time" style={{ width: '48px', height: '49px' }} />
        </div>

        <div className="stat-card">
          <div>
            <div className="stat-card__label">Total Assessments</div>
            <div className="stat-card__value">{stats?.total_assessments ?? '-'}</div>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/mostWatchedIcon.svg" alt="Total Assessments" style={{ width: '48px', height: '49px' }} />
        </div>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
