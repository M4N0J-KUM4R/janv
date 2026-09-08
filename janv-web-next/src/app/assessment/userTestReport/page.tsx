'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Breadcrumb from '@/components/layout/Breadcrumb';
import { assessments } from '@/lib/api';
import type { CandidateAttemptDetail, Assessment, ProctoringReport } from '@/lib/types';

function UserTestReportContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const assessmentId = searchParams.get('assessmentId') || searchParams.get('id') || '';
  const studentId = searchParams.get('studentId') || '';
  const attemptId = searchParams.get('attemptId') || '';

  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [candidate, setCandidate] = useState<CandidateAttemptDetail | null>(null);
  const [proctoringReport, setProctoringReport] = useState<ProctoringReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!assessmentId) {
      router.replace('/assessment/userReportNotFound');
      return;
    }

    let ignore = false;
    assessments
      .getTestDetails(assessmentId, { per_page: 500 })
      .then((res) => {
        if (ignore) return;
        setAssessment(res.assessment);

        // Find candidate matching attemptId or studentId
        let found = res.candidates.find(
          (c) => (attemptId && c.attempt_id === attemptId) || (studentId && c.student_id === studentId)
        );

        if (!found && res.candidates.length > 0) {
          // fallback to first candidate if only 1 exists
          found = res.candidates[0];
        }

        if (!found) {
          router.replace('/assessment/userReportNotFound');
          return;
        }

        setCandidate(found);

        // Fetch proctoring report if attempt exists
        if (found.attempt_id) {
          assessments
            .getProctoringReport(found.attempt_id)
            .then((pRes) => {
              if (!ignore) setProctoringReport(pRes);
            })
            .catch(() => {});
        }
      })
      .catch((err) => {
        if (!ignore) {
          setError(err instanceof Error ? err.message : 'Failed to load user test report');
        }
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [assessmentId, studentId, attemptId, router]);

  const totalMarks = assessment?.total_marks || 100;
  const passMarks = assessment ? ((assessment.pass_percentage || 40) / 100) * totalMarks : 40;
  const candidateScore = candidate?.score ?? 0;
  const isPassed = candidateScore >= passMarks;

  return (
    <div style={{ padding: '24px 32px', maxWidth: '1200px', margin: '0 auto' }}>
      <Breadcrumb
        items={[
          { label: 'Assessment', href: '/assessment/mytests' },
          { label: assessment?.title || 'Test Details', href: `/assessment/testDetails?id=${assessmentId}` },
          { label: candidate?.student_name ? `${candidate.student_name} Report` : 'Student Report' },
        ]}
      />

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
          Loading candidate report...
        </div>
      ) : error ? (
        <div style={{ marginTop: '20px', padding: '24px', backgroundColor: '#FEF2F2', borderRadius: '8px', color: '#DC2626' }}>
          {error}
        </div>
      ) : candidate ? (
        <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Top Profile & Score Header */}
          <div
            style={{
              backgroundColor: '#fff',
              borderRadius: '12px',
              padding: '24px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
              border: '1px solid #E5E7EB',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '20px',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#111827', margin: 0 }}>
                  {candidate.student_name || 'Candidate Report'}
                </h1>
                <span
                  style={{
                    backgroundColor: isPassed ? '#DEF7EC' : '#FEF2F2',
                    color: isPassed ? '#03543F' : '#991B1B',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '700',
                  }}
                >
                  {isPassed ? 'PASSED' : 'FAILED'}
                </span>
              </div>

              <div style={{ display: 'flex', gap: '16px', fontSize: '14px', color: '#6B7280', flexWrap: 'wrap' }}>
                <span>📧 {candidate.student_email}</span>
                {candidate.student_branch && <span>🏫 Branch: <strong>{candidate.student_branch}</strong></span>}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '28px', fontWeight: '800', color: '#111827' }}>
                  {candidate.score ?? 0}{' '}
                  <span style={{ fontSize: '14px', color: '#6B7280', fontWeight: 'normal' }}>/ {totalMarks}</span>
                </div>
                <div style={{ fontSize: '13px', color: '#059669', fontWeight: '600' }}>
                  {candidate.percentile !== null && candidate.percentile !== undefined
                    ? `${candidate.percentile.toFixed(1)}th Percentile`
                    : ''}
                </div>
              </div>

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
                ← Back
              </Link>
            </div>
          </div>

          {/* Metrics Summary Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            <div style={{ backgroundColor: '#fff', padding: '18px', borderRadius: '10px', border: '1px solid #E5E7EB' }}>
              <span style={{ fontSize: '12px', color: '#6B7280', textTransform: 'uppercase', fontWeight: '600' }}>Test Started</span>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#111827', marginTop: '6px' }}>
                {candidate.started_at ? new Date(candidate.started_at).toLocaleString() : '—'}
              </div>
            </div>

            <div style={{ backgroundColor: '#fff', padding: '18px', borderRadius: '10px', border: '1px solid #E5E7EB' }}>
              <span style={{ fontSize: '12px', color: '#6B7280', textTransform: 'uppercase', fontWeight: '600' }}>Test Submitted</span>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#111827', marginTop: '6px' }}>
                {candidate.completed_at ? new Date(candidate.completed_at).toLocaleString() : '—'}
              </div>
            </div>

            <div style={{ backgroundColor: '#fff', padding: '18px', borderRadius: '10px', border: '1px solid #E5E7EB' }}>
              <span style={{ fontSize: '12px', color: '#6B7280', textTransform: 'uppercase', fontWeight: '600' }}>Status</span>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#111827', marginTop: '6px' }}>
                {candidate.status.toUpperCase()}
              </div>
            </div>

            <div style={{ backgroundColor: '#fff', padding: '18px', borderRadius: '10px', border: '1px solid #E5E7EB' }}>
              <span style={{ fontSize: '12px', color: '#6B7280', textTransform: 'uppercase', fontWeight: '600' }}>Proctoring Integrity</span>
              <div
                style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: (proctoringReport?.tab_switch_count || 0) > 3 ? '#DC2626' : '#059669',
                  marginTop: '6px',
                }}
              >
                {proctoringReport ? `${proctoringReport.tab_switch_count} Tab Switches` : 'Clean / Normal'}
              </div>
            </div>
          </div>

          {/* Proctoring Event Logs (if any) */}
          {proctoringReport && proctoringReport.events && proctoringReport.events.length > 0 && (
            <div
              style={{
                backgroundColor: '#fff',
                borderRadius: '12px',
                padding: '20px',
                border: '1px solid #E5E7EB',
              }}
            >
              <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#111827', margin: '0 0 12px 0' }}>
                🛡️ Proctoring Violations Log
              </h2>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #E5E7EB', color: '#6B7280', textAlign: 'left' }}>
                      <th style={{ padding: '8px' }}>Event Type</th>
                      <th style={{ padding: '8px' }}>Timestamp</th>
                      <th style={{ padding: '8px' }}>Severity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {proctoringReport.events.map((evt, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #F3F4F6' }}>
                        <td style={{ padding: '10px 8px', fontWeight: '600', color: '#DC2626' }}>
                          ⚠️ {evt.event_type}
                        </td>
                        <td style={{ padding: '10px 8px', color: '#6B7280' }}>
                          {evt.created_at || evt.timestamp ? new Date(evt.created_at || evt.timestamp || '').toLocaleString() : '—'}
                        </td>
                        <td style={{ padding: '10px 8px' }}>
                          <span
                            style={{
                              backgroundColor: '#FEF2F2',
                              color: '#991B1B',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: '600',
                            }}
                          >
                            VIOLATION
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

export default function UserTestReportPage() {
  return (
    <Suspense fallback={<div style={{ padding: '32px', textAlign: 'center' }}>Loading Candidate Report...</div>}>
      <UserTestReportContent />
    </Suspense>
  );
}
