'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Breadcrumb from '@/components/layout/Breadcrumb';
import { assessments } from '@/lib/api';
import type { CandidateAttemptDetail, Assessment } from '@/lib/types';

function TestAnalyticsContent() {
  const searchParams = useSearchParams();
  const assessmentId = searchParams.get('id') || searchParams.get('assessmentId') || '';

  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [candidates, setCandidates] = useState<CandidateAttemptDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!assessmentId) return;
    let ignore = false;
    assessments
      .getTestDetails(assessmentId, { per_page: 500 })
      .then((res) => {
        if (!ignore) {
          setAssessment(res.assessment);
          setCandidates(res.candidates || []);
          setError(null);
        }
      })
      .catch((err) => {
        if (!ignore) {
          setError(err instanceof Error ? err.message : 'Failed to load test analytics');
        }
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [assessmentId]);

  // Compute metrics
  const completedAttempts = candidates.filter((c) => c.status === 'completed' || c.status === 'evaluated' || c.status === 'submitted');
  const totalSubmissions = completedAttempts.length;

  const scores = completedAttempts
    .map((c) => c.score)
    .filter((s): s is number => s !== null && s !== undefined);

  const highestScore = scores.length > 0 ? Math.max(...scores) : 0;
  const lowestScore = scores.length > 0 ? Math.min(...scores) : 0;
  const avgScore = scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : '0';

  const passMarks = assessment ? ((assessment.pass_percentage || 40) / 100) * (assessment.total_marks || 100) : 40;
  const passedCandidates = scores.filter((s) => s >= passMarks).length;
  const passRate = totalSubmissions > 0 ? ((passedCandidates / totalSubmissions) * 100).toFixed(1) : '0';

  // Score distribution buckets: 0-20%, 21-40%, 41-60%, 61-80%, 81-100%
  const totalMarks = assessment?.total_marks || 100;
  const buckets = [
    { label: '0% - 20%', count: 0, min: 0, max: totalMarks * 0.2 },
    { label: '21% - 40%', count: 0, min: totalMarks * 0.2, max: totalMarks * 0.4 },
    { label: '41% - 60%', count: 0, min: totalMarks * 0.4, max: totalMarks * 0.6 },
    { label: '61% - 80%', count: 0, min: totalMarks * 0.6, max: totalMarks * 0.8 },
    { label: '81% - 100%', count: 0, min: totalMarks * 0.8, max: totalMarks * 1.01 },
  ];

  scores.forEach((s) => {
    for (const b of buckets) {
      if (s >= b.min && s < b.max) {
        b.count++;
        break;
      }
    }
  });

  const maxBucketCount = Math.max(...buckets.map((b) => b.count), 1);

  // Top performers
  const topPerformers = [...completedAttempts]
    .sort((a, b) => (b.score || 0) - (a.score || 0))
    .slice(0, 10);

  return (
    <div style={{ padding: '24px 32px', maxWidth: '1440px', margin: '0 auto' }}>
      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { label: 'Assessment', href: '/assessment/mytests' },
          { label: assessment?.title || 'Test Details', href: `/assessment/testDetails?id=${assessmentId}` },
          { label: 'Analytics' },
        ]}
      />

      {/* Header */}
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
          <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#111827', margin: '0 0 6px 0' }}>
            {assessment?.title || 'Assessment Analytics'}
          </h1>
          <p style={{ margin: 0, fontSize: '14px', color: '#6B7280' }}>
            Performance breakdown, score distribution, and top performer rankings.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <Link
            href={`/assessment/testDetails?id=${assessmentId}`}
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
            ← Back to Candidates
          </Link>
          <Link
            href={`/assessment/testReport?id=${assessmentId}`}
            style={{
              padding: '9px 16px',
              borderRadius: '8px',
              backgroundColor: '#4F46E5',
              color: '#fff',
              fontSize: '14px',
              fontWeight: '500',
              textDecoration: 'none',
            }}
          >
            📑 View Test Report
          </Link>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '64px', textAlign: 'center', color: '#6B7280' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              border: '3px solid #E5E7EB',
              borderTopColor: '#4F46E5',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 16px auto',
            }}
          />
          Loading analytics data...
        </div>
      ) : error ? (
        <div style={{ padding: '32px', backgroundColor: '#FEF2F2', borderRadius: '10px', color: '#DC2626' }}>
          {error}
        </div>
      ) : (
        <>
          {/* KPI Cards Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '16px',
              marginBottom: '28px',
            }}
          >
            <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '10px', border: '1px solid #E5E7EB' }}>
              <span style={{ fontSize: '13px', color: '#6B7280', fontWeight: '500' }}>Total Submissions</span>
              <div style={{ fontSize: '28px', fontWeight: '700', color: '#111827', marginTop: '6px' }}>{totalSubmissions}</div>
            </div>

            <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '10px', border: '1px solid #E5E7EB' }}>
              <span style={{ fontSize: '13px', color: '#6B7280', fontWeight: '500' }}>Pass Rate</span>
              <div style={{ fontSize: '28px', fontWeight: '700', color: '#059669', marginTop: '6px' }}>{passRate}%</div>
              <span style={{ fontSize: '12px', color: '#9CA3AF' }}>{passedCandidates} / {totalSubmissions} passed</span>
            </div>

            <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '10px', border: '1px solid #E5E7EB' }}>
              <span style={{ fontSize: '13px', color: '#6B7280', fontWeight: '500' }}>Average Score</span>
              <div style={{ fontSize: '28px', fontWeight: '700', color: '#4F46E5', marginTop: '6px' }}>
                {avgScore} <span style={{ fontSize: '14px', color: '#9CA3AF', fontWeight: 'normal' }}>/ {totalMarks}</span>
              </div>
            </div>

            <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '10px', border: '1px solid #E5E7EB' }}>
              <span style={{ fontSize: '13px', color: '#6B7280', fontWeight: '500' }}>Highest Score</span>
              <div style={{ fontSize: '28px', fontWeight: '700', color: '#2563EB', marginTop: '6px' }}>
                {highestScore} <span style={{ fontSize: '14px', color: '#9CA3AF', fontWeight: 'normal' }}>/ {totalMarks}</span>
              </div>
            </div>

            <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '10px', border: '1px solid #E5E7EB' }}>
              <span style={{ fontSize: '13px', color: '#6B7280', fontWeight: '500' }}>Lowest Score</span>
              <div style={{ fontSize: '28px', fontWeight: '700', color: '#DC2626', marginTop: '6px' }}>
                {lowestScore} <span style={{ fontSize: '14px', color: '#9CA3AF', fontWeight: 'normal' }}>/ {totalMarks}</span>
              </div>
            </div>
          </div>

          {/* Charts & Rankings Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(440px, 1fr))', gap: '24px' }}>
            {/* Score Distribution */}
            <div
              style={{
                backgroundColor: '#fff',
                borderRadius: '12px',
                padding: '24px',
                border: '1px solid #E5E7EB',
                boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
              }}
            >
              <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#111827', margin: '0 0 16px 0' }}>
                Score Distribution
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {buckets.map((b) => {
                  const pct = totalSubmissions > 0 ? (b.count / totalSubmissions) * 100 : 0;
                  return (
                    <div key={b.label}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                        <span style={{ fontWeight: '500', color: '#374151' }}>{b.label}</span>
                        <span style={{ color: '#6B7280' }}>{b.count} candidates ({pct.toFixed(1)}%)</span>
                      </div>
                      <div
                        style={{
                          height: '10px',
                          backgroundColor: '#F3F4F6',
                          borderRadius: '5px',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            height: '100%',
                            width: `${(b.count / maxBucketCount) * 100}%`,
                            backgroundColor: '#4F46E5',
                            borderRadius: '5px',
                            transition: 'width 0.4s ease',
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Top Performers */}
            <div
              style={{
                backgroundColor: '#fff',
                borderRadius: '12px',
                padding: '24px',
                border: '1px solid #E5E7EB',
                boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
              }}
            >
              <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#111827', margin: '0 0 16px 0' }}>
                Top Performers Leaderboard
              </h2>
              {topPerformers.length === 0 ? (
                <p style={{ color: '#6B7280', fontSize: '14px' }}>No completed attempts to rank yet.</p>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #E5E7EB', color: '#6B7280', textAlign: 'left' }}>
                        <th style={{ padding: '8px' }}>Rank</th>
                        <th style={{ padding: '8px' }}>Candidate</th>
                        <th style={{ padding: '8px' }}>Score</th>
                        <th style={{ padding: '8px' }}>Percentile</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topPerformers.map((p, idx) => (
                        <tr key={p.attempt_id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                          <td style={{ padding: '10px 8px', fontWeight: '700', color: idx === 0 ? '#D97706' : '#374151' }}>
                            {idx === 0 ? '🥇 1' : idx === 1 ? '🥈 2' : idx === 2 ? '🥉 3' : `#${idx + 1}`}
                          </td>
                          <td style={{ padding: '10px 8px' }}>
                            <div style={{ fontWeight: '600', color: '#111827' }}>{p.student_name || 'Student'}</div>
                            <div style={{ fontSize: '12px', color: '#9CA3AF' }}>{p.student_email}</div>
                          </td>
                          <td style={{ padding: '10px 8px', fontWeight: '600', color: '#111827' }}>
                            {p.score ?? 0}
                          </td>
                          <td style={{ padding: '10px 8px', color: '#059669', fontWeight: '600' }}>
                            {p.percentile !== null && p.percentile !== undefined ? `${p.percentile.toFixed(1)}%` : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function TestAnalyticsPage() {
  return (
    <Suspense fallback={<div style={{ padding: '32px', textAlign: 'center' }}>Loading Analytics...</div>}>
      <TestAnalyticsContent />
    </Suspense>
  );
}
