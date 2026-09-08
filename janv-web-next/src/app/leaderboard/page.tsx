'use client';

import { useEffect, useState } from 'react';
import Breadcrumb from '@/components/layout/Breadcrumb';
import { assessments } from '@/lib/api';

interface LeaderboardEntry {
  rank: number;
  student_name: string;
  avg_percentage?: number;
  score?: number;
  percentage?: number;
  total_assessments?: number;
}

export default function LeaderboardPage() {
  const [data, setData] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    assessments
      .globalLeaderboard()
      .then((res) => setData((res.leaderboard || []) as LeaderboardEntry[]))
      .catch((err) => {
        console.error('Failed to load leaderboard:', err);
        setData([]);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <Breadcrumb items={[{ label: 'Assessments' }, { label: 'Leaderboard', href: '/leaderboard' }]} />

      <h1 className="page-title">Overall Leaderboard</h1>
      <p className="page-subtitle">Top performing students ranked by overall average percentage across all assessments.</p>

      <div className="card">
        <table className="data-table">
          <thead>
            <tr>
              <th>RANK</th>
              <th>STUDENT NAME</th>
              <th>AVERAGE SCORE</th>
              <th>TESTS COMPLETED</th>
              <th>BADGE</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '40px' }}>Loading rankings...</td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  No student rankings available yet.
                </td>
              </tr>
            ) : (
              data.map((row) => (
                <tr key={row.rank}>
                  <td>
                    <span
                      style={{
                        fontWeight: 800,
                        fontSize: '1rem',
                        color: row.rank === 1 ? '#d97706' : row.rank === 2 ? '#94a3b8' : row.rank === 3 ? '#b45309' : 'inherit',
                      }}
                    >
                      {row.rank === 1 ? '#1' : row.rank === 2 ? '#2' : row.rank === 3 ? '#3' : `#${row.rank}`}
                    </span>
                  </td>
                  <td style={{ fontWeight: 600 }}>{row.student_name}</td>
                  <td>
                    <span style={{ fontWeight: 700, color: 'var(--success)' }}>
                      {(row.avg_percentage || row.percentage || 0).toFixed(1)}%
                    </span>
                  </td>
                  <td>{row.total_assessments || 1} Tests</td>
                  <td>
                    <span className={`badge ${row.rank <= 3 ? 'badge--warning' : 'badge--neutral'}`}>
                      {row.rank <= 3 ? 'Top Performer' : 'Active Student'}
                    </span>
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
