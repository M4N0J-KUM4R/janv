'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Breadcrumb from '@/components/layout/Breadcrumb';
import { assessments } from '@/lib/api';
import type { Assessment, PdfReportResponse } from '@/lib/types';

function TestReportContent() {
  const searchParams = useSearchParams();
  const assessmentId = searchParams.get('id') || searchParams.get('assessmentId') || '';

  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [reportStatus, setReportStatus] = useState<PdfReportResponse | null>(null);
  const [loading, setLoading] = useState(Boolean(assessmentId));
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!assessmentId) {
      return;
    }
    let ignore = false;
    Promise.all([
      assessments.get(assessmentId),
      assessments.getPdfReport(assessmentId).catch(() => null),
    ])
      .then(([assRes, repRes]) => {
        if (!ignore) {
          setAssessment(assRes.assessment);
          if (repRes) setReportStatus(repRes);
          setError(null);
        }
      })
      .catch((err) => {
        if (!ignore) {
          setError(err instanceof Error ? err.message : 'Failed to load test report');
        }
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [assessmentId]);

  const handleGenerateReport = async () => {
    if (!assessmentId) return;
    setGenerating(true);
    try {
      const res = await assessments.createPdfReport(assessmentId);
      setReportStatus(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to trigger PDF generation');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div style={{ padding: '24px 32px', maxWidth: '1200px', margin: '0 auto' }}>
      <Breadcrumb
        items={[
          { label: 'Assessment', href: '/assessment/mytests' },
          { label: assessment?.title || 'Test Details', href: `/assessment/testDetails?id=${assessmentId}` },
          { label: 'PDF Report' },
        ]}
      />

      <div
        style={{
          marginTop: '20px',
          backgroundColor: '#fff',
          borderRadius: '12px',
          padding: '32px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          border: '1px solid #E5E7EB',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#111827', margin: '0 0 8px 0' }}>
              {assessment?.title || 'Assessment Report'}
            </h1>
            <p style={{ margin: 0, fontSize: '14px', color: '#6B7280' }}>
              Comprehensive performance report and printable PDF documentation.
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
          </div>
        </div>

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
            Loading report status...
          </div>
        ) : error ? (
          <div style={{ padding: '24px', backgroundColor: '#FEF2F2', borderRadius: '8px', color: '#DC2626' }}>
            {error}
          </div>
        ) : (
          <div>
            {/* Assessment Meta Box */}
            <div
              style={{
                backgroundColor: '#F9FAFB',
                padding: '20px',
                borderRadius: '10px',
                border: '1px solid #E5E7EB',
                marginBottom: '28px',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '16px',
              }}
            >
              <div>
                <span style={{ fontSize: '12px', color: '#6B7280', textTransform: 'uppercase', fontWeight: '600' }}>Test Code</span>
                <div style={{ fontSize: '16px', fontWeight: '700', color: '#111827', marginTop: '4px' }}>
                  {assessment?.test_code || '—'}
                </div>
              </div>

              <div>
                <span style={{ fontSize: '12px', color: '#6B7280', textTransform: 'uppercase', fontWeight: '600' }}>Duration</span>
                <div style={{ fontSize: '16px', fontWeight: '700', color: '#111827', marginTop: '4px' }}>
                  {assessment?.duration_mins ? `${assessment.duration_mins} minutes` : '—'}
                </div>
              </div>

              <div>
                <span style={{ fontSize: '12px', color: '#6B7280', textTransform: 'uppercase', fontWeight: '600' }}>Total Marks</span>
                <div style={{ fontSize: '16px', fontWeight: '700', color: '#111827', marginTop: '4px' }}>
                  {assessment?.total_marks ?? '—'}
                </div>
              </div>

              <div>
                <span style={{ fontSize: '12px', color: '#6B7280', textTransform: 'uppercase', fontWeight: '600' }}>Pass Percentage</span>
                <div style={{ fontSize: '16px', fontWeight: '700', color: '#111827', marginTop: '4px' }}>
                  {assessment?.pass_percentage ? `${assessment.pass_percentage}%` : '40%'}
                </div>
              </div>
            </div>

            {/* PDF Status Card */}
            <div
              style={{
                border: '1px solid #E5E7EB',
                borderRadius: '10px',
                padding: '24px',
                backgroundColor: '#fff',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>
                {reportStatus?.status === 'completed' ? '📄' : reportStatus?.status === 'generating' ? '⏳' : '📑'}
              </div>

              <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#111827', margin: '0 0 8px 0' }}>
                {reportStatus?.status === 'completed'
                  ? 'PDF Report Ready'
                  : reportStatus?.status === 'generating'
                  ? 'Generating PDF Report...'
                  : reportStatus?.status === 'failed'
                  ? 'Report Generation Failed'
                  : 'Generate Consolidated PDF Report'}
              </h2>

              <p style={{ fontSize: '14px', color: '#6B7280', maxWidth: '500px', margin: '0 auto 24px auto' }}>
                {reportStatus?.status === 'completed'
                  ? `Report generated successfully. You can download the full PDF report below.`
                  : reportStatus?.status === 'generating'
                  ? 'The backend is currently compiling candidate results and analytics.'
                  : 'Generate a downloadable PDF with test statistics, candidate scorecards, and ranking summaries.'}
              </p>

              <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
                {reportStatus?.status === 'completed' && reportStatus.file_url ? (
                  <a
                    href={reportStatus.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      padding: '12px 24px',
                      backgroundColor: '#059669',
                      color: '#fff',
                      borderRadius: '8px',
                      fontWeight: '600',
                      textDecoration: 'none',
                      fontSize: '14px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    ⬇️ Download PDF Report
                  </a>
                ) : null}

                <button
                  onClick={handleGenerateReport}
                  disabled={generating}
                  style={{
                    padding: '12px 24px',
                    backgroundColor: reportStatus?.status === 'completed' ? '#F3F4F6' : '#4F46E5',
                    color: reportStatus?.status === 'completed' ? '#374151' : '#fff',
                    border: reportStatus?.status === 'completed' ? '1px solid #D1D5DB' : 'none',
                    borderRadius: '8px',
                    fontWeight: '600',
                    fontSize: '14px',
                    cursor: generating ? 'not-allowed' : 'pointer',
                    opacity: generating ? 0.7 : 1,
                  }}
                >
                  {generating ? 'Processing...' : reportStatus?.status === 'completed' ? '🔄 Regenerate PDF' : '⚡ Generate Report'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function TestReportPage() {
  return (
    <Suspense fallback={<div style={{ padding: '32px', textAlign: 'center' }}>Loading Report...</div>}>
      <TestReportContent />
    </Suspense>
  );
}
