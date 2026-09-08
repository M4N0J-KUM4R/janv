'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { assessments } from '@/lib/api';
import type { LiveTestDetails } from '@/lib/types';
import { IconSearch } from '@/components/common/Icons';

export default function ActiveTestDetailsPage() {
  const params = useParams() as { testCode: string };
  const router = useRouter();
  const testCode = params.testCode;

  const [data, setData] = useState<LiveTestDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    let ignore = false;
    assessments
      .getLiveTest(testCode)
      .then((res) => {
        if (!ignore) {
          setData(res);
        }
      })
      .catch((err) => {
        if (!ignore) {
          setError(err instanceof Error ? err.message : 'Failed to load live test data');
        }
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [testCode]);

  const candidates = (data?.candidates || []).filter((c) => {
    const matchesSearch =
      c.student_name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;
    if (statusFilter !== 'all' && c.status.toLowerCase() !== statusFilter.toLowerCase()) return false;
    return true;
  });

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px' }}>
        <p>Loading live candidate feed...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '60px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <button
              onClick={() => router.push('/assessment/activetest')}
              style={{ background: 'none', border: 'none', color: '#017DF9', cursor: 'pointer', fontSize: '0.875rem' }}
            >
              ← Back to Active Tests
            </button>
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-color)' }}>
            Live Monitor: {data?.title || testCode}
          </h1>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Test Code: <strong style={{ color: '#017DF9' }}>{testCode}</strong> | Duration: {data?.duration_mins} Mins
          </div>
        </div>
      </div>

      {error && (
        <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #F87171', color: '#991B1B', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', fontSize: '0.875rem' }}>
          {error}
        </div>
      )}

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div className="card" style={{ padding: '20px', textAlign: 'center' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Eligible Students</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1E293B', marginTop: '4px' }}>{data?.total_eligible || 0}</div>
        </div>

        <div className="card" style={{ padding: '20px', textAlign: 'center', borderLeft: '4px solid #F59E0B' }}>
          <div style={{ fontSize: '0.8rem', color: '#B45309', fontWeight: 600, textTransform: 'uppercase' }}>Currently Started</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#D97706', marginTop: '4px' }}>{data?.total_started || 0}</div>
        </div>

        <div className="card" style={{ padding: '20px', textAlign: 'center', borderLeft: '4px solid #10B981' }}>
          <div style={{ fontSize: '0.8rem', color: '#047857', fontWeight: 600, textTransform: 'uppercase' }}>Tests Completed</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#059669', marginTop: '4px' }}>{data?.total_completed || 0}</div>
        </div>
      </div>

      {/* Search & Filters */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <div className="search-bar" style={{ flex: 1, minWidth: '240px' }}>
          <span className="search-icon" style={{ opacity: 0.6 }}><IconSearch size={16} /></span>
          <input
            type="text"
            className="form-input"
            placeholder="Search candidate name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className={`btn ${statusFilter === 'all' ? 'btn--primary' : 'btn--secondary'}`}
            onClick={() => setStatusFilter('all')}
            style={{ padding: '6px 14px', fontSize: '0.85rem' }}
          >
            All
          </button>
          <button
            className={`btn ${statusFilter === 'started' ? 'btn--primary' : 'btn--secondary'}`}
            onClick={() => setStatusFilter('started')}
            style={{ padding: '6px 14px', fontSize: '0.85rem' }}
          >
            Started
          </button>
          <button
            className={`btn ${statusFilter === 'completed' ? 'btn--primary' : 'btn--secondary'}`}
            onClick={() => setStatusFilter('completed')}
            style={{ padding: '6px 14px', fontSize: '0.85rem' }}
          >
            Completed
          </button>
          <button
            className={`btn ${statusFilter === 'eligible' ? 'btn--primary' : 'btn--secondary'}`}
            onClick={() => setStatusFilter('eligible')}
            style={{ padding: '6px 14px', fontSize: '0.85rem' }}
          >
            Eligible
          </button>
        </div>
      </div>

      {/* Candidates Table */}
      <div className="card" style={{ overflowX: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>S.NO</th>
              <th>CANDIDATE NAME</th>
              <th>EMAIL</th>
              <th>BRANCH</th>
              <th>LIVE STATUS</th>
              <th>STARTED AT</th>
              <th>SUBMITTED AT</th>
              <th>SCORE</th>
            </tr>
          </thead>
          <tbody>
            {candidates.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  No candidates match the filter criteria.
                </td>
              </tr>
            ) : (
              candidates.map((c, idx) => (
                <tr key={c.student_id}>
                  <td>{idx + 1}</td>
                  <td style={{ fontWeight: 600 }}>{c.student_name}</td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{c.email}</td>
                  <td>{c.branch || '--'}</td>
                  <td>
                    <span
                      style={{
                        padding: '4px 10px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: 600,
                        backgroundColor:
                          c.status === 'Completed'
                            ? '#E6F9F0'
                            : c.status === 'Started'
                            ? '#FEF3C7'
                            : '#F1F5F9',
                        color:
                          c.status === 'Completed'
                            ? '#10B981'
                            : c.status === 'Started'
                            ? '#D97706'
                            : '#64748B',
                      }}
                    >
                      {c.status}
                    </span>
                  </td>
                  <td>
                    {c.started_at
                      ? new Date(c.started_at).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '--'}
                  </td>
                  <td>
                    {c.submitted_at
                      ? new Date(c.submitted_at).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '--'}
                  </td>
                  <td style={{ fontWeight: 600 }}>
                    {c.score !== undefined && c.score !== null ? c.score : '--'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
