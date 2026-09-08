'use client';

import { useState, useEffect, useCallback } from 'react';
import Breadcrumb from '@/components/layout/Breadcrumb';
import { analytics, reports } from '@/lib/api';
import type { FacultyDashboardStats } from '@/lib/types';

interface StudentReportRow {
  sNo: number;
  name: string;
  email: string;
  batchBranch: string;
  started: string;
  completed: string;
  progress: number;
}

export default function ViewReportsPage() {
  const [topBatch, setTopBatch] = useState('All');
  const [batch, setBatch] = useState('2026');
  const [branch, setBranch] = useState('');
  const [course, setCourse] = useState('All Courses');
  const [availableBatches, setAvailableBatches] = useState<string[]>(['2026', '2027', '2028']);
  const [availableBranches, setAvailableBranches] = useState<string[]>([
    'B.E. CSE',
    'B.Sc. Biochem',
    'BBA',
    'M.Sc. Maths',
    'M.Tech. DS',
  ]);
  const [isSearched, setIsSearched] = useState(true);
  const [loading, setLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(true);
  const [stats, setStats] = useState<FacultyDashboardStats | null>(null);
  const [students, setStudents] = useState<StudentReportRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  // Load dashboard stats and dynamic filters
  useEffect(() => {
    let mounted = true;
    analytics
      .dashboard()
      .then((data) => {
        if (mounted && data) {
          setStats(data);
        }
      })
      .catch((err) => {
        console.error('Failed to load dashboard stats:', err);
      })
      .finally(() => {
        if (mounted) setStatsLoading(false);
      });

    // Load dynamic batches from database
    analytics
      .batches()
      .then((res) => {
        if (mounted && res?.batches?.length) {
          setAvailableBatches(res.batches.map(String));
        }
      })
      .catch(() => {
        fetch('/api/v2/batches')
          .then((r) => r.json())
          .then((res) => {
            if (mounted && res?.batches?.length) {
              setAvailableBatches(res.batches.map(String));
            }
          })
          .catch(() => {});
      });

    // Load dynamic branches from database
    analytics
      .branches()
      .then((res) => {
        if (mounted && res?.branches?.length) {
          setAvailableBranches(res.branches);
        }
      })
      .catch(() => {
        fetch('/api/v2/branches')
          .then((r) => r.json())
          .then((res) => {
            if (mounted && res?.branches?.length) {
              setAvailableBranches(res.branches);
            }
          })
          .catch(() => {});
      });

    return () => {
      mounted = false;
    };
  }, []);

  // Fetch report data
  const fetchReportData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await reports.overall({
        page,
        per_page: perPage,
        batch: batch || undefined,
        branch: branch || undefined,
        course: course !== 'All Courses' ? course : undefined,
      });

      if (res && Array.isArray(res.data)) {
        const rows: StudentReportRow[] = res.data.map((item: any, idx: number) => ({
          sNo: (page - 1) * perPage + idx + 1,
          name: item.name || item.fullName || 'Student',
          email: item.email || '-',
          batchBranch: item.batchBranch || `${item.batch || batch} | ${item.branch || branch}`,
          started: typeof item.started === 'number' ? `${item.started} Started` : (item.started || '0 Started'),
          completed: typeof item.completed === 'number' ? `${item.completed} Completed` : (item.completed || '0 Completed'),
          progress: typeof item.progress === 'number' ? item.progress : 0,
        }));
        setStudents(rows);
        setTotalCount(res.total || rows.length);
      } else {
        setStudents([]);
        setTotalCount(0);
      }
    } catch (err) {
      console.error('Failed to fetch overall report:', err);
      setStudents([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [batch, branch, course, page, perPage]);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  const handleSearch = () => {
    setPage(1);
    setIsSearched(true);
    fetchReportData();
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / perPage));

  return (
    <div>
      {/* Breadcrumb row with Batch Selector on the right */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <Breadcrumb items={[{ label: 'Learning' }, { label: 'View Report', href: '/learn/overallReport' }]} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '14px', color: 'rgb(52, 52, 52)', fontWeight: 500 }}>Batch</span>
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <select
              value={topBatch}
              onChange={(e) => {
                const val = e.target.value;
                setTopBatch(val);
                setBatch(val === 'All' ? '' : val);
                setPage(1);
              }}
              style={{
                appearance: 'none',
                backgroundColor: 'white',
                border: '1px solid rgb(224, 224, 224)',
                borderRadius: '8px',
                padding: '6px 32px 6px 14px',
                fontSize: '14px',
                color: 'rgb(52, 52, 52)',
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              <option value="All">All Batches</option>
              {availableBatches.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
            <svg
              viewBox="0 0 24 24"
              style={{
                position: 'absolute',
                right: '8px',
                top: '50%',
                transform: 'translateY(-50%)',
                width: '18px',
                height: '18px',
                pointerEvents: 'none',
                fill: 'rgb(114, 114, 114)',
              }}
            >
              <path d="M7.41 8.59 12 13.17l4.59-4.58L18 10l-6 6-6-6z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Top Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div>
            <div className="stat-card__label">Total Students</div>
            <div className="stat-card__value">
              {statsLoading ? '—' : stats?.total_students?.toLocaleString() ?? 0}
            </div>
          </div>
          <img src="/icons/totalStudentsIcon.svg" alt="Total Students" style={{ width: '48px', height: '49px' }} />
        </div>

        <div className="stat-card">
          <div>
            <div className="stat-card__label">Current Student Rating</div>
            <div className="stat-card__value">
              {statsLoading ? '—' : (stats?.current_rating ?? 5)}{' '}
              <img src="/icons/Star.svg" alt="Star" style={{ width: '22px', height: '22px', marginLeft: '6px', verticalAlign: 'middle' }} />
            </div>
          </div>
          <img src="/icons/studentRatingIcon.svg" alt="Student Rating" style={{ width: '48px', height: '49px' }} />
        </div>

        <div className="stat-card">
          <div>
            <div className="stat-card__label">Total Videos Watched</div>
            <div className="stat-card__value">
              {statsLoading ? '—' : stats?.videos_watched?.toLocaleString() ?? 0}
            </div>
          </div>
          <img src="/icons/totalVideosWatched.svg" alt="Total Videos Watched" style={{ width: '48px', height: '49px' }} />
        </div>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: '1fr 2fr' }}>
        <div className="stat-card">
          <div>
            <div className="stat-card__label">Total watch time (mins)</div>
            <div className="stat-card__value">
              {statsLoading ? '—' : stats?.watch_time_mins?.toLocaleString() ?? 0}
            </div>
          </div>
          <img src="/icons/watchTimeIcon.svg" alt="Watch Time" style={{ width: '48px', height: '49px' }} />
        </div>

        <div className="stat-card">
          <div>
            <div className="stat-card__label">Most Watched Courses</div>
            <div
              style={{
                fontSize: '1rem',
                fontWeight: 700,
                marginTop: '8px',
                lineHeight: 1.4,
                color: 'var(--text-primary)',
              }}
            >
              {statsLoading
                ? 'Loading courses...'
                : (stats?.most_watched_courses && stats.most_watched_courses.length > 0)
                ? stats.most_watched_courses.join(', ')
                : 'No course watch data available yet'}
            </div>
          </div>
          <img src="/icons/mostWatchedIcon.svg" alt="Most Watched Courses" style={{ width: '48px', height: '49px' }} />
        </div>
      </div>

      {/* View Report Section */}
      <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'rgb(35, 39, 46)', margin: '32px 0 16px', fontFamily: '"Public Sans", sans-serif' }}>
        View Report
      </h2>

      {/* Filter Card */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '12px',
          border: '1px solid rgb(240, 240, 240)',
          padding: '24px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'flex-end',
          gap: '20px',
        }}
      >
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'rgb(35, 39, 46)', marginBottom: '8px' }}>
            <span style={{ color: '#ef4444' }}>* </span>Batch
          </label>
          <div style={{ position: 'relative' }}>
            <select
              value={batch}
              onChange={(e) => setBatch(e.target.value)}
              style={{
                width: '100%',
                height: '44px',
                padding: '0 32px 0 14px',
                borderRadius: '8px',
                border: '1px solid rgb(224, 224, 224)',
                backgroundColor: 'rgb(249, 250, 251)',
                fontSize: '14px',
                color: 'rgb(35, 39, 46)',
                appearance: 'none',
                outline: 'none',
              }}
            >
              <option value="">All Batches</option>
              {availableBatches.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
            <svg viewBox="0 0 24 24" style={{ position: 'absolute', right: '12px', top: '13px', width: '18px', height: '18px', fill: '#727272', pointerEvents: 'none' }}>
              <path d="M7.41 8.59 12 13.17l4.59-4.58L18 10l-6 6-6-6z" />
            </svg>
          </div>
        </div>

        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'rgb(35, 39, 46)', marginBottom: '8px' }}>
            Branch
          </label>
          <div style={{ position: 'relative' }}>
            <select
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              style={{
                width: '100%',
                height: '44px',
                padding: '0 32px 0 14px',
                borderRadius: '8px',
                border: '1px solid rgb(224, 224, 224)',
                backgroundColor: 'rgb(249, 250, 251)',
                fontSize: '14px',
                color: 'rgb(35, 39, 46)',
                appearance: 'none',
                outline: 'none',
              }}
            >
              <option value="">All Branches</option>
              {availableBranches.map((br) => (
                <option key={br} value={br}>
                  {br}
                </option>
              ))}
            </select>
            <svg viewBox="0 0 24 24" style={{ position: 'absolute', right: '12px', top: '13px', width: '18px', height: '18px', fill: '#727272', pointerEvents: 'none' }}>
              <path d="M7.41 8.59 12 13.17l4.59-4.58L18 10l-6 6-6-6z" />
            </svg>
          </div>
        </div>

        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'rgb(35, 39, 46)', marginBottom: '8px' }}>
            Course
          </label>
          <div style={{ position: 'relative' }}>
            <select
              value={course}
              onChange={(e) => setCourse(e.target.value)}
              style={{
                width: '100%',
                height: '44px',
                padding: '0 32px 0 14px',
                borderRadius: '8px',
                border: '1px solid rgb(224, 224, 224)',
                backgroundColor: 'rgb(249, 250, 251)',
                fontSize: '14px',
                color: 'rgb(35, 39, 46)',
                appearance: 'none',
                outline: 'none',
              }}
            >
              <option value="All Courses">All Courses</option>
              <option value="Python">Python</option>
              <option value="C Programming">C Programming</option>
              <option value="Aptitude">Aptitude</option>
            </select>
            <svg viewBox="0 0 24 24" style={{ position: 'absolute', right: '12px', top: '13px', width: '18px', height: '18px', fill: '#727272', pointerEvents: 'none' }}>
              <path d="M7.41 8.59 12 13.17l4.59-4.58L18 10l-6 6-6-6z" />
            </svg>
          </div>
        </div>

        <button
          onClick={handleSearch}
          disabled={loading}
          style={{
            backgroundColor: batch ? '#007BFF' : '#737B8B',
            color: '#ffffff',
            border: 'none',
            borderRadius: '8px',
            height: '44px',
            padding: '0 32px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: loading ? 'wait' : 'pointer',
            opacity: loading ? 0.7 : 1,
            transition: 'background-color 0.2s',
          }}
        >
          {loading ? 'Searching...' : 'Search'}
        </button>
      </div>

      {/* Results Table */}
      {isSearched && (
        <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid rgb(240, 240, 240)', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgb(240, 240, 240)', color: 'rgb(114, 114, 114)', fontWeight: 600, fontSize: '12px', letterSpacing: '0.05em' }}>
                  <th style={{ padding: '16px 20px', width: '60px' }}>S.NO</th>
                  <th style={{ padding: '16px 20px' }}>STUDENT NAME</th>
                  <th style={{ padding: '16px 20px' }}>EMAIL</th>
                  <th style={{ padding: '16px 20px' }}>BATCH/BRANCH</th>
                  <th style={{ padding: '16px 20px' }}>STARTED</th>
                  <th style={{ padding: '16px 20px' }}>COMPLETED</th>
                  <th style={{ padding: '16px 20px' }}>ALL COURSES</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '40px 20px', textAlign: 'center', color: 'rgb(114, 114, 114)' }}>
                      Loading report data...
                    </td>
                  </tr>
                ) : students.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '48px 20px', textAlign: 'center', color: 'rgb(114, 114, 114)' }}>
                      No student records found for the selected criteria.
                    </td>
                  </tr>
                ) : (
                  students.map((s) => (
                    <tr key={s.sNo} style={{ borderBottom: '1px solid rgb(245, 245, 245)' }}>
                      <td style={{ padding: '16px 20px', color: 'rgb(114, 114, 114)' }}>{s.sNo}</td>
                      <td style={{ padding: '16px 20px', color: 'rgb(35, 39, 46)', fontWeight: 500 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div
                            style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '50%',
                              backgroundColor: 'rgb(224, 224, 224)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'white',
                              flexShrink: 0,
                            }}
                          >
                            <svg viewBox="0 0 24 24" style={{ width: '18px', height: '18px', fill: 'white' }}>
                              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                            </svg>
                          </div>
                          <span>{s.name}</span>
                        </div>
                      </td>
                      <td style={{ padding: '16px 20px', color: 'rgb(35, 39, 46)' }}>{s.email}</td>
                      <td style={{ padding: '16px 20px', color: 'rgb(35, 39, 46)' }}>{s.batchBranch}</td>
                      <td style={{ padding: '16px 20px', color: 'rgb(35, 39, 46)' }}>{s.started}</td>
                      <td style={{ padding: '16px 20px', color: 'rgb(35, 39, 46)' }}>{s.completed}</td>
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ flex: 1, height: '6px', backgroundColor: 'rgb(230, 230, 230)', borderRadius: '3px', overflow: 'hidden', minWidth: '80px' }}>
                            <div
                              style={{
                                width: `${Math.max(s.progress, 0)}%`,
                                height: '100%',
                                backgroundColor: '#007BFF',
                                borderRadius: '3px',
                              }}
                            />
                          </div>
                          <span style={{ fontSize: '12px', color: 'rgb(114, 114, 114)', minWidth: '40px' }}>{s.progress}%</span>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Table Pagination Footer */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 24px',
              borderTop: '1px solid rgb(240, 240, 240)',
              fontSize: '13px',
              color: 'rgb(114, 114, 114)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>Showing</span>
              <select
                value={perPage}
                onChange={(e) => {
                  setPerPage(Number(e.target.value));
                  setPage(1);
                }}
                style={{
                  border: '1px solid rgb(224, 224, 224)',
                  borderRadius: '6px',
                  padding: '4px 8px',
                  fontSize: '13px',
                  backgroundColor: 'white',
                  cursor: 'pointer',
                  outline: 'none',
                }}
              >
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
              </select>
              <span>of {totalCount}</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                style={{
                  border: '1px solid rgb(224, 224, 224)',
                  borderRadius: '6px',
                  width: '32px',
                  height: '32px',
                  backgroundColor: 'white',
                  color: page <= 1 ? 'rgb(180, 180, 180)' : 'rgb(52, 52, 52)',
                  cursor: page <= 1 ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                ‹
              </button>

              <span style={{ padding: '0 8px', fontSize: '13px', color: 'rgb(52, 52, 52)' }}>
                Page {page} of {totalPages}
              </span>

              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                style={{
                  border: '1px solid rgb(224, 224, 224)',
                  borderRadius: '6px',
                  width: '32px',
                  height: '32px',
                  backgroundColor: 'white',
                  color: page >= totalPages ? 'rgb(180, 180, 180)' : 'rgb(52, 52, 52)',
                  cursor: page >= totalPages ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                ›
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
