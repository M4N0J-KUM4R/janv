'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Breadcrumb from '@/components/layout/Breadcrumb';
import { IconSearch } from '@/components/common/Icons';
import { assessments } from '@/lib/api';
import type { CandidateAttemptDetail, Assessment } from '@/lib/types';

function TestDetailsContent() {
  const searchParams = useSearchParams();
  const assessmentId = searchParams.get('id') || searchParams.get('assessmentId') || '';

  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [candidates, setCandidates] = useState<CandidateAttemptDetail[]>([]);
  const [loading, setLoading] = useState(Boolean(assessmentId));
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'in_progress' | 'evaluated'>('all');
  const [page, setPage] = useState(1);
  const [perPage] = useState(10);
  const [total, setTotal] = useState(0);

  // PDF report status
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [reloadTrigger, setReloadTrigger] = useState(0);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  useEffect(() => {
    if (!assessmentId) return;
    let ignore = false;
    assessments
      .getTestDetails(assessmentId, {
        page,
        per_page: perPage,
        search: search.trim() || undefined,
        branch: branchFilter || undefined,
      })
      .then((res) => {
        if (!ignore) {
          setAssessment(res.assessment);
          setCandidates(res.candidates || []);
          setTotal(res.total || 0);
          setError(null);
        }
      })
      .catch((err) => {
        if (!ignore) {
          setError(err instanceof Error ? err.message : 'Failed to load test details');
        }
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [assessmentId, page, perPage, search, branchFilter, reloadTrigger]);

  // Check PDF report status
  useEffect(() => {
    if (!assessmentId) return;
    let ignore = false;
    assessments
      .getPdfReport(assessmentId)
      .then((res) => {
        if (!ignore && res.status === 'completed' && res.file_url) {
          setPdfUrl(res.file_url);
        }
      })
      .catch(() => {});
    return () => {
      ignore = true;
    };
  }, [assessmentId]);

  const handleGeneratePdf = async () => {
    if (!assessmentId) return;
    setPdfGenerating(true);
    try {
      const res = await assessments.createPdfReport(assessmentId);
      if (res.status === 'completed' && res.file_url) {
        setPdfUrl(res.file_url);
        showToast('PDF report generated successfully!');
      } else {
        showToast('PDF generation queued.');
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to generate PDF report');
    } finally {
      setPdfGenerating(false);
    }
  };

  const filteredCandidates = candidates.filter((c) => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'completed') return c.status === 'completed' || c.status === 'submitted';
    if (statusFilter === 'in_progress') return c.status === 'in_progress' || c.status === 'started';
    if (statusFilter === 'evaluated') return c.status === 'evaluated';
    return true;
  });

  const totalPages = Math.ceil(total / perPage) || 1;

  return (
    <div style={{ padding: '24px 32px', maxWidth: '1440px', margin: '0 auto' }}>
      {toastMessage && (
        <div
          role="alert"
          style={{
            position: 'fixed',
            top: '24px',
            right: '24px',
            zIndex: 9999,
            backgroundColor: '#111827',
            color: '#fff',
            padding: '12px 20px',
            borderRadius: '8px',
            fontSize: '14px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          }}
        >
          {toastMessage}
        </div>
      )}

      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { label: 'Assessment', href: '/assessment/mytests' },
          { label: assessment?.title || 'Test Details' },
        ]}
      />

      {/* Header Banner */}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#111827', margin: 0 }}>
              {assessment?.title || 'Assessment Details'}
            </h1>
            {assessment?.test_code && (
              <span
                style={{
                  backgroundColor: '#EEF2FF',
                  color: '#4F46E5',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: '600',
                }}
              >
                Code: {assessment.test_code}
              </span>
            )}
            <span
              style={{
                backgroundColor: assessment?.is_published ? '#DEF7EC' : '#FEF08A',
                color: assessment?.is_published ? '#03543F' : '#713F12',
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '600',
              }}
            >
              {assessment?.is_published ? 'Published' : 'Draft'}
            </span>
          </div>

          <div style={{ display: 'flex', gap: '20px', fontSize: '14px', color: '#6B7280', flexWrap: 'wrap' }}>
            {assessment?.duration_mins && (
              <span>⏱️ Duration: <strong>{assessment.duration_mins} mins</strong></span>
            )}
            {assessment?.total_marks !== undefined && (
              <span>🎯 Total Marks: <strong>{assessment.total_marks}</strong></span>
            )}
            {assessment?.pass_percentage !== undefined && (
              <span>🏆 Pass %: <strong>{assessment.pass_percentage}%</strong></span>
            )}
            <span>👥 Total Submissions: <strong>{total}</strong></span>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <Link
            href={`/assessment/testAnalytics?id=${assessmentId}`}
            style={{
              padding: '10px 16px',
              borderRadius: '8px',
              border: '1px solid #D1D5DB',
              backgroundColor: '#fff',
              color: '#374151',
              fontSize: '14px',
              fontWeight: '500',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            📊 Analytics
          </Link>

          <button
            onClick={handleGeneratePdf}
            disabled={pdfGenerating}
            style={{
              padding: '10px 16px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: pdfUrl ? '#059669' : '#4F46E5',
              color: '#fff',
              fontSize: '14px',
              fontWeight: '500',
              cursor: pdfGenerating ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              opacity: pdfGenerating ? 0.7 : 1,
            }}
          >
            {pdfGenerating ? 'Generating PDF...' : pdfUrl ? '📄 Download PDF Report' : '📑 Generate PDF Report'}
          </button>

          <Link
            href={`/assessment/selectProctoring?id=${assessmentId}`}
            style={{
              padding: '10px 16px',
              borderRadius: '8px',
              border: '1px solid #D1D5DB',
              backgroundColor: '#F9FAFB',
              color: '#374151',
              fontSize: '14px',
              fontWeight: '500',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            🛡️ Proctoring Settings
          </Link>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div
        style={{
          backgroundColor: '#fff',
          borderRadius: '10px',
          padding: '16px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          border: '1px solid #E5E7EB',
          marginBottom: '20px',
          display: 'flex',
          gap: '16px',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', gap: '12px', flex: '1 1 300px', maxWidth: '480px', position: 'relative' }}>
          <div style={{ position: 'relative', width: '100%' }}>
            <span style={{ position: 'absolute', left: '12px', top: '10px', color: '#9CA3AF' }}>
              <IconSearch />
            </span>
            <input
              type="text"
              placeholder="Search candidate by name or email..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              style={{
                width: '100%',
                padding: '9px 12px 9px 36px',
                borderRadius: '8px',
                border: '1px solid #D1D5DB',
                fontSize: '14px',
                outline: 'none',
              }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            style={{
              padding: '9px 14px',
              borderRadius: '8px',
              border: '1px solid #D1D5DB',
              fontSize: '14px',
              backgroundColor: '#fff',
              color: '#374151',
              outline: 'none',
            }}
          >
            <option value="all">All Statuses</option>
            <option value="completed">Completed / Submitted</option>
            <option value="in_progress">In Progress</option>
            <option value="evaluated">Evaluated</option>
          </select>

          <input
            type="text"
            placeholder="Filter Branch..."
            value={branchFilter}
            onChange={(e) => {
              setBranchFilter(e.target.value);
              setPage(1);
            }}
            style={{
              padding: '9px 14px',
              borderRadius: '8px',
              border: '1px solid #D1D5DB',
              fontSize: '14px',
              outline: 'none',
              width: '160px',
            }}
          />
        </div>
      </div>

      {/* Candidates Table */}
      <div
        style={{
          backgroundColor: '#fff',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          border: '1px solid #E5E7EB',
          overflow: 'hidden',
        }}
      >
        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#6B7280' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                border: '3px solid #E5E7EB',
                borderTopColor: '#4F46E5',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                margin: '0 auto 16px auto',
              }}
            />
            Loading candidate attempts...
          </div>
        ) : error ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#DC2626' }}>
            <p style={{ fontWeight: '600', marginBottom: '8px' }}>Error Loading Details</p>
            <p style={{ fontSize: '14px' }}>{error}</p>
            <button
              onClick={() => setReloadTrigger((r) => r + 1)}
              style={{
                marginTop: '16px',
                padding: '8px 16px',
                backgroundColor: '#4F46E5',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              Retry
            </button>
          </div>
        ) : filteredCandidates.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#6B7280' }}>
            <p style={{ fontSize: '16px', fontWeight: '500', marginBottom: '8px' }}>No candidates found</p>
            <p style={{ fontSize: '14px' }}>
              {search || branchFilter
                ? 'Try adjusting your search query or filters.'
                : 'No candidates have attempted this assessment yet.'}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                  <th style={{ padding: '14px 18px', fontSize: '12px', fontWeight: '600', color: '#4B5563', textTransform: 'uppercase' }}>
                    #
                  </th>
                  <th style={{ padding: '14px 18px', fontSize: '12px', fontWeight: '600', color: '#4B5563', textTransform: 'uppercase' }}>
                    Candidate
                  </th>
                  <th style={{ padding: '14px 18px', fontSize: '12px', fontWeight: '600', color: '#4B5563', textTransform: 'uppercase' }}>
                    Branch
                  </th>
                  <th style={{ padding: '14px 18px', fontSize: '12px', fontWeight: '600', color: '#4B5563', textTransform: 'uppercase' }}>
                    Status
                  </th>
                  <th style={{ padding: '14px 18px', fontSize: '12px', fontWeight: '600', color: '#4B5563', textTransform: 'uppercase' }}>
                    Score
                  </th>
                  <th style={{ padding: '14px 18px', fontSize: '12px', fontWeight: '600', color: '#4B5563', textTransform: 'uppercase' }}>
                    Percentile
                  </th>
                  <th style={{ padding: '14px 18px', fontSize: '12px', fontWeight: '600', color: '#4B5563', textTransform: 'uppercase' }}>
                    Submitted At
                  </th>
                  <th style={{ padding: '14px 18px', fontSize: '12px', fontWeight: '600', color: '#4B5563', textTransform: 'uppercase', textAlign: 'right' }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody style={{ borderTop: '1px solid #E5E7EB' }}>
                {filteredCandidates.map((c, idx) => (
                  <tr
                    key={c.attempt_id}
                    style={{
                      borderBottom: '1px solid #F3F4F6',
                      transition: 'background-color 0.15s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F9FAFB')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <td style={{ padding: '14px 18px', fontSize: '14px', color: '#6B7280' }}>
                      {(page - 1) * perPage + idx + 1}
                    </td>
                    <td style={{ padding: '14px 18px' }}>
                      <div style={{ fontWeight: '600', color: '#111827', fontSize: '14px' }}>
                        {c.student_name || 'Anonymous Student'}
                      </div>
                      <div style={{ fontSize: '13px', color: '#6B7280' }}>{c.student_email}</div>
                    </td>
                    <td style={{ padding: '14px 18px', fontSize: '13px', color: '#4B5563' }}>
                      <div>{c.student_branch || c.batch || '—'}</div>
                    </td>
                    <td style={{ padding: '14px 18px' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '3px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: '600',
                          backgroundColor:
                            c.status === 'completed' || c.status === 'evaluated'
                              ? '#DEF7EC'
                              : c.status === 'in_progress'
                              ? '#E1EFFE'
                              : '#FEF08A',
                          color:
                            c.status === 'completed' || c.status === 'evaluated'
                              ? '#03543F'
                              : c.status === 'in_progress'
                              ? '#1E429F'
                              : '#713F12',
                        }}
                      >
                        {c.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: '14px 18px', fontSize: '14px', fontWeight: '600', color: '#111827' }}>
                      {c.score !== null && c.score !== undefined ? (
                        <span>
                          {c.score} <span style={{ fontSize: '12px', color: '#6B7280', fontWeight: 'normal' }}>/ {assessment?.total_marks || 100}</span>
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td style={{ padding: '14px 18px', fontSize: '14px', color: '#4B5563' }}>
                      {c.percentile !== null && c.percentile !== undefined ? `${c.percentile.toFixed(1)}%` : '—'}
                    </td>
                    <td style={{ padding: '14px 18px', fontSize: '13px', color: '#6B7280' }}>
                      {c.completed_at ? new Date(c.completed_at).toLocaleString() : c.started_at ? new Date(c.started_at).toLocaleString() : '—'}
                    </td>
                    <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '8px' }}>
                        <Link
                          href={`/assessment/userTestReport?assessmentId=${assessmentId}&studentId=${c.student_id}&attemptId=${c.attempt_id}`}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: '#EEF2FF',
                            color: '#4F46E5',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: '600',
                            textDecoration: 'none',
                          }}
                        >
                          View Report
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div
            style={{
              padding: '14px 18px',
              borderTop: '1px solid #E5E7EB',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span style={{ fontSize: '13px', color: '#6B7280' }}>
              Showing {(page - 1) * perPage + 1} to {Math.min(page * perPage, total)} of {total} candidates
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: '1px solid #D1D5DB',
                  backgroundColor: '#fff',
                  color: page <= 1 ? '#9CA3AF' : '#374151',
                  cursor: page <= 1 ? 'not-allowed' : 'pointer',
                  fontSize: '13px',
                }}
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: '1px solid #D1D5DB',
                  backgroundColor: '#fff',
                  color: page >= totalPages ? '#9CA3AF' : '#374151',
                  cursor: page >= totalPages ? 'not-allowed' : 'pointer',
                  fontSize: '13px',
                }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function TestDetailsPage() {
  return (
    <Suspense fallback={<div style={{ padding: '32px', textAlign: 'center' }}>Loading...</div>}>
      <TestDetailsContent />
    </Suspense>
  );
}
