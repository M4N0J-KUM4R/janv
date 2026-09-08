'use client';

import { useEffect, useState } from 'react';
import Breadcrumb from '@/components/layout/Breadcrumb';
import { analytics } from '@/lib/api';
import type { FacultyDashboardStats } from '@/lib/types';

export default function DashboardPage() {
  const [stats, setStats] = useState<FacultyDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    analytics
      .dashboard()
      .then((data) => setStats(data))
      .catch((err) => {
        setError(err.message || 'Failed to load dashboard data');
      })
      .finally(() => setLoading(false));
  }, []);

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
    </div>
  );
}
