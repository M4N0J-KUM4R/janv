'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { assessments } from '@/lib/api';
import type { Assessment } from '@/lib/types';
import { IconSearch } from '@/components/common/Icons';

export default function ActiveTestsPage() {
  const [list, setList] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [liveUsersCount, setLiveUsersCount] = useState<number>(0);

  useEffect(() => {
    let ignore = false;
    Promise.all([
      assessments.list(),
      assessments.getLiveUsersCount().catch(() => ({ live_users_count: 0 })),
    ])
      .then(([res, liveRes]) => {
        if (!ignore) {
          const ongoing = (res.data || []).filter(
            (t) => t.is_published
          );
          setList(ongoing);
          setLiveUsersCount(liveRes.live_users_count);
        }
      })
      .catch((err) => {
        if (!ignore) {
          setError(err instanceof Error ? err.message : 'Failed to load active assessments');
        }
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, []);

  const filtered = list.filter(
    (item) =>
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      (item.test_code && item.test_code.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '60px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-color)', marginBottom: '8px' }}>
            Active Live Tests
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Monitor real-time student activity, started candidates, and live exam sessions.
          </p>
        </div>

        <div
          style={{
            backgroundColor: '#EBF5FF',
            border: '1px solid #93C5FD',
            borderRadius: '8px',
            padding: '12px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#22C55E' }} />
          <div>
            <div style={{ fontSize: '0.75rem', color: '#1E40AF', fontWeight: 600, textTransform: 'uppercase' }}>
              Live Candidates Online
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1E3A8A' }}>
              {liveUsersCount} Active
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #F87171', color: '#991B1B', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', fontSize: '0.875rem' }}>
          {error}
        </div>
      )}

      <div className="search-bar" style={{ marginBottom: '20px' }}>
        <span className="search-icon" style={{ opacity: 0.6 }}><IconSearch size={16} /></span>
        <input
          type="text"
          className="form-input"
          placeholder="Search by Test Name or Test Code..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="card" style={{ overflowX: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>S.NO</th>
              <th>TEST CODE</th>
              <th>TEST NAME</th>
              <th>DURATION</th>
              <th>STATUS</th>
              <th>START DATE</th>
              <th>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '40px' }}>
                  Loading active tests...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  No published active tests found.
                </td>
              </tr>
            ) : (
              filtered.map((item, idx) => (
                <tr key={item.id}>
                  <td>{idx + 1}</td>
                  <td style={{ fontWeight: 600 }}>{item.test_code || 'N/A'}</td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{item.title}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.total_marks} Total Marks</div>
                  </td>
                  <td>{item.duration_mins} mins</td>
                  <td>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '4px 10px',
                        borderRadius: '16px',
                        backgroundColor: '#E6F9F0',
                        color: '#10B981',
                        fontSize: '11px',
                        fontWeight: 600,
                      }}
                    >
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10B981' }} />
                      LIVE
                    </span>
                  </td>
                  <td>
                    {item.start_time
                      ? new Date(item.start_time).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })
                      : 'Immediate'}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <Link
                        href={`/assessment/activetest/${item.test_code || item.id}`}
                        className="btn btn--primary btn--sm"
                      >
                        Live Monitor
                      </Link>
                      <Link
                        href={`/assessment/testDetails?id=${item.id}`}
                        className="btn btn--secondary btn--sm"
                      >
                        Details
                      </Link>
                    </div>
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
