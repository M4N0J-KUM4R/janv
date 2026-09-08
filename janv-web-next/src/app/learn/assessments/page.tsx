'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Breadcrumb from '@/components/layout/Breadcrumb';
import { assessments } from '@/lib/api';
import type { StudentAssessmentSummary, StudentAssessmentListResponse } from '@/lib/types';
import { Calendar, Clock, Filter, ChevronLeft, ChevronRight, Search, RefreshCw } from '@/components/common/Icons';

type StatusFilter = 'all' | 'upcoming' | 'active' | 'completed';

export default function StudentAssessmentsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [data, setData] = useState<StudentAssessmentListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>((searchParams.get('status') as StatusFilter) || 'all');
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1);
  const perPage = 10;

  const fetchAssessments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: { page: number; per_page: number; status?: 'upcoming' | 'active' | 'completed' } = {
        page,
        per_page: perPage,
      };
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }
      const result = await assessments.getForStudent(params);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load assessments');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    fetchAssessments();
  }, [fetchAssessments]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    if (search) params.set('search', search);
    else params.delete('search');
    params.set('page', '1');
    router.push(`/learn/assessments?${params.toString()}`);
    setPage(1);
  };

  const handleStatusChange = (status: StatusFilter) => {
    setStatusFilter(status);
    const params = new URLSearchParams(searchParams.toString());
    if (status !== 'all') params.set('status', status);
    else params.delete('status');
    params.set('page', '1');
    router.push(`/learn/assessments?${params.toString()}`);
    setPage(1);
  };

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(newPage));
    router.push(`/learn/assessments?${params.toString()}`);
    setPage(newPage);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatTime = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  const getStatusLabel = (assessment: StudentAssessmentSummary) => {
    if (assessment.status === 'active') return { label: 'Active', color: '#EF6C00', bg: '#FFF8E1' };
    if (assessment.status === 'completed') return { label: 'Completed', color: '#2E7D32', bg: '#E8F5E9' };
    return { label: 'Upcoming', color: '#1976D2', bg: '#E3F2FD' };
  };

  const getActionButton = (assessment: StudentAssessmentSummary) => {
    if (assessment.status === 'active' && assessment.attempt_id) {
      return (
        <Link
          href={`/assessment/${assessment.id}/take?attempt=${assessment.attempt_id}`}
          className="btn-primary"
        >
          Resume
        </Link>
      );
    }
    if (assessment.status === 'upcoming') {
      return (
        <Link href={`/assessment/${assessment.id}/take`} className="btn-primary">
          Start
        </Link>
      );
    }
    if (assessment.status === 'completed') {
      return (
        <Link href={`/assessment/${assessment.id}/take`} className="btn-secondary">
          View Result
        </Link>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div style={{ padding: '24px 32px', maxWidth: '1200px', margin: '0 auto' }}>
        <Breadcrumb items={[{ label: 'Learning' }, { label: 'My Assessments', href: '/learn/assessments' }]} />
        <div style={{ marginTop: '24px' }}>
          <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
            <div className="skeleton" style={{ width: '300px', height: '44px', borderRadius: '8px' }} />
            <div className="skeleton" style={{ width: '120px', height: '44px', borderRadius: '8px' }} />
            <div className="skeleton" style={{ width: '120px', height: '44px', borderRadius: '8px' }} />
            <div className="skeleton" style={{ width: '120px', height: '44px', borderRadius: '8px' }} />
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #E2E2E2' }}>
                  <th style={{ padding: '12px 16px' }}><div className="skeleton" style={{ width: '100%', height: '16px', borderRadius: '4px' }} /></th>
                  <th style={{ padding: '12px 16px' }}><div className="skeleton" style={{ width: '80%', height: '16px', borderRadius: '4px' }} /></th>
                  <th style={{ padding: '12px 16px' }}><div className="skeleton" style={{ width: '60%', height: '16px', borderRadius: '4px' }} /></th>
                  <th style={{ padding: '12px 16px' }}><div className="skeleton" style={{ width: '60%', height: '16px', borderRadius: '4px' }} /></th>
                  <th style={{ padding: '12px 16px' }}><div className="skeleton" style={{ width: '60%', height: '16px', borderRadius: '4px' }} /></th>
                </tr>
              </thead>
              <tbody>
                {[1, 2, 3, 4, 5].map((i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #F0F0F0' }}>
                    <td style={{ padding: '16px' }}><div className="skeleton" style={{ width: '60%', height: '20px', borderRadius: '4px' }} /></td>
                    <td style={{ padding: '16px' }}><div className="skeleton" style={{ width: '50%', height: '16px', borderRadius: '4px' }} /></td>
                    <td style={{ padding: '16px' }}><div className="skeleton" style={{ width: '40%', height: '20px', borderRadius: '4px' }} /></td>
                    <td style={{ padding: '16px' }}><div className="skeleton" style={{ width: '50%', height: '20px', borderRadius: '4px' }} /></td>
                    <td style={{ padding: '16px' }}><div className="skeleton" style={{ width: '80%', height: '32px', borderRadius: '20px' }} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '24px 32px', maxWidth: '1200px', margin: '0 auto' }}>
        <Breadcrumb items={[{ label: 'Learning' }, { label: 'My Assessments', href: '/learn/assessments' }]} />
        <div style={{ padding: '40px', textAlign: 'center', color: '#DC2626' }}>
          <p style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>Failed to load assessments</p>
          <p style={{ fontSize: '14px', color: '#727272', marginBottom: '16px' }}>{error}</p>
          <button onClick={fetchAssessments} style={{ padding: '8px 24px', borderRadius: '8px', border: '1px solid #E2E2E2', background: '#fff', cursor: 'pointer' }}>
            <RefreshCw size={16} color="#333" /> Retry
          </button>
        </div>
      </div>
    );
  }

  const { data: assessmentsList = [], total = 0 } = data || {};
  const totalPages = Math.ceil(total / perPage);

  return (
    <div style={{ padding: '24px 32px', maxWidth: '1200px', margin: '0 auto' }}>
      <Breadcrumb items={[{ label: 'Learning' }, { label: 'My Assessments', href: '/learn/assessments' }]} />

      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '8px' }}>My Assessments</h1>
        <p style={{ fontSize: '14px', color: '#666' }}>View and manage your assigned assessments</p>
      </div>

      {/* Search & Filter Bar */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '24px', alignItems: 'flex-end' }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '8px', flex: 1, minWidth: '280px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={18} color="#999" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="search"
              placeholder="Search assessments..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px 10px 40px',
                border: '1px solid #E2E2E2',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
              }}
            />
          </div>
        </form>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {(['all', 'upcoming', 'active', 'completed'] as StatusFilter[]).map((status) => (
            <button
              key={status}
              onClick={() => handleStatusChange(status)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '10px 16px',
                border: `1px solid ${statusFilter === status ? '#1976D2' : '#E2E2E2'}`,
                background: statusFilter === status ? '#1976D2' : '#fff',
                color: statusFilter === status ? '#fff' : '#333',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {status === 'active' && <Clock size={14} color={statusFilter === status ? '#fff' : '#EF6C00'} />}
              {status === 'completed' && <span style={{ color: statusFilter === status ? '#fff' : '#2E7D32' }}>✓</span>}
              {status === 'upcoming' && <Calendar size={14} color={statusFilter === status ? '#fff' : '#1976D2'} />}
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Assessments Table */}
      <div style={{ overflowX: 'auto' }}>
        {assessmentsList.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 24px', background: '#FAFAFA', borderRadius: '12px' }}>
            <Calendar size={64} color="#CCC" style={{ marginBottom: '16px' }} />
            <p style={{ fontSize: '18px', fontWeight: 500, color: '#666', marginBottom: '8px' }}>
              {statusFilter === 'all' ? 'No assessments found' : `No ${statusFilter} assessments`}
            </p>
            <p style={{ fontSize: '14px', color: '#999' }}>
              {search
                ? `No results for "${search}". Try adjusting your search.`
                : statusFilter !== 'all'
                ? `You have no ${statusFilter} assessments at the moment.`
                : 'You have no assigned assessments yet. Check back later!'}
            </p>
            {search && (
              <button onClick={() => setSearch('')} style={{ marginTop: '16px', padding: '8px 16px', borderRadius: '8px', border: '1px solid #E2E2E2', background: '#fff', cursor: 'pointer' }}>
                Clear search
              </button>
            )}
          </div>
        ) : (
          <>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #E2E2E2' }}>
                  <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: 600, color: '#666', fontSize: '12px', textTransform: 'uppercase' }}>Assessment</th>
                  <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: 600, color: '#666', fontSize: '12px', textTransform: 'uppercase' }}>Course</th>
                  <th style={{ textAlign: 'center', padding: '12px 16px', fontWeight: 600, color: '#666', fontSize: '12px', textTransform: 'uppercase' }}>Duration</th>
                  <th style={{ textAlign: 'center', padding: '12px 16px', fontWeight: 600, color: '#666', fontSize: '12px', textTransform: 'uppercase' }}>Schedule</th>
                  <th style={{ textAlign: 'center', padding: '12px 16px', fontWeight: 600, color: '#666', fontSize: '12px', textTransform: 'uppercase' }}>Status</th>
                  <th style={{ textAlign: 'center', padding: '12px 16px', fontWeight: 600, color: '#666', fontSize: '12px', textTransform: 'uppercase' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {assessmentsList.map((assessment) => {
                  const statusInfo = getStatusLabel(assessment);
                  return (
                    <tr key={assessment.id} style={{ borderBottom: '1px solid #F0F0F0' }}>
                      <td style={{ padding: '16px', fontWeight: 500 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span>{assessment.title}</span>
                          {assessment.test_code && (
                            <span style={{ fontSize: '11px', color: '#999', fontFamily: 'monospace' }}>{assessment.test_code}</span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '16px', color: '#666' }}>{assessment.course_title || assessment.course_id}</td>
                      <td style={{ padding: '16px', textAlign: 'center', color: '#666' }}>
                        <Clock size={14} color="#666" /> {formatTime(assessment.duration_mins)}
                      </td>
                      <td style={{ padding: '16px', textAlign: 'center', color: '#666', fontSize: '13px' }}>
                        {assessment.start_time && assessment.end_time ? (
                          <>
                            {formatDate(assessment.start_time)} - {formatDate(assessment.end_time)}
                          </>
                        ) : assessment.start_time ? (
                          <>Starts {formatDate(assessment.start_time)}</>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td style={{ padding: '16px', textAlign: 'center' }}>
                        <span style={{
                          padding: '4px 12px',
                          borderRadius: '20px',
                          fontSize: '11px',
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          background: statusInfo.bg,
                          color: statusInfo.color,
                        }}>
                          {statusInfo.label}
                        </span>
                      </td>
                      <td style={{ padding: '16px', textAlign: 'center' }}>
                        {getActionButton(assessment)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginTop: '24px' }}>
                <button
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page <= 1}
                  style={{ padding: '8px 12px', border: '1px solid #E2E2E2', borderRadius: '8px', background: '#fff', cursor: page <= 1 ? 'not-allowed' : 'pointer', opacity: page <= 1 ? 0.5 : 1 }}
                >
                  <ChevronLeft size={18} color="#333" />
                </button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (page <= 3) {
                    pageNum = i + 1;
                  } else if (page >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = page - 2 + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      style={{
                        width: '36px',
                        height: '36px',
                        border: `1px solid ${page === pageNum ? '#1976D2' : '#E2E2E2'}`,
                        background: page === pageNum ? '#1976D2' : '#fff',
                        color: page === pageNum ? '#fff' : '#333',
                        borderRadius: '8px',
                        fontWeight: page === pageNum ? 600 : 500,
                        cursor: 'pointer',
                      }}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <button
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page >= totalPages}
                  style={{ padding: '8px 12px', border: '1px solid #E2E2E2', borderRadius: '8px', background: '#fff', cursor: page >= totalPages ? 'not-allowed' : 'pointer', opacity: page >= totalPages ? 0.5 : 1 }}
                >
                  <ChevronRight size={18} color="#333" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}