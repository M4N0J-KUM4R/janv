'use client';

import { useState, useEffect } from 'react';
import Breadcrumb from '@/components/layout/Breadcrumb';
import { analytics, reports } from '@/lib/api';

interface DownloadItem {
  id: string;
  dateTime: string;
  batch: string;
  branch: string;
  course: string;
  status: 'COMPLETED' | 'PROCESSING';
  progress: number;
}

export default function DownloadReportsPage() {
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
  const [isProcessing, setIsProcessing] = useState(false);
  const [downloads, setDownloads] = useState<DownloadItem[]>([]);

  useEffect(() => {
    let mounted = true;
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

  const handleDownload = () => {
    if (!batch) return;
    setIsProcessing(true);
    const newId = Date.now().toString();
    const now = new Date();
    const formattedDate = `${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}, ${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;

    const item: DownloadItem = {
      id: newId,
      dateTime: formattedDate,
      batch,
      branch: branch || 'All Branches',
      course: course || 'All Courses',
      status: 'PROCESSING',
      progress: 0,
    };

    setDownloads((prev) => [item, ...prev]);

    let p = 0;
    const interval = setInterval(() => {
      p += 25;
      setDownloads((prev) =>
        prev.map((d) =>
          d.id === newId
            ? {
                ...d,
                progress: p,
                status: p >= 100 ? 'COMPLETED' : 'PROCESSING',
              }
            : d
        )
      );

      if (p >= 100) {
        clearInterval(interval);
        setIsProcessing(false);
      }
    }, 400);
  };

  const handleFileDownload = async (item: DownloadItem) => {
    try {
      const res = await reports.overall({
        page: 1,
        per_page: 1000,
        batch: item.batch && item.batch !== 'All' && item.batch !== 'All Batches' ? item.batch : undefined,
        branch: item.branch && item.branch !== 'All Branches' ? item.branch : undefined,
        course: item.course && item.course !== 'All Courses' ? item.course : undefined,
      });

      let csvContent = 'S.NO,STUDENT NAME,EMAIL,BATCH,BRANCH,STARTED,COMPLETED,ALL COURSES PROGRESS\n';
      const data = (res?.data || []) as any[];
      if (data.length > 0) {
        data.forEach((s, idx) => {
          const name = `"${(s.student_name || s.name || s.full_name || '').replace(/"/g, '""')}"`;
          const email = `"${(s.email || '').replace(/"/g, '""')}"`;
          const batchVal = s.batch || item.batch;
          const branchVal = `"${(s.branch || item.branch).replace(/"/g, '""')}"`;
          const started = s.started ?? 0;
          const completed = s.completed ?? 0;
          const progress = `${Math.round(s.progress_percentage ?? s.progress ?? 0)}%`;
          csvContent += `${idx + 1},${name},${email},${batchVal},${branchVal},${started},${completed},${progress}\n`;
        });
      } else {
        csvContent += `\n# No students found for Batch: ${item.batch}, Branch: ${item.branch}, Course: ${item.course}\n`;
      }

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `report_${item.batch}_${item.branch.replace(/[^a-zA-Z0-9]/g, '_')}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Failed to generate full CSV:', e);
      const csvContent = `Batch,Branch,Course,Generated At,Status\n${item.batch},"${item.branch}","${item.course}","${item.dateTime}",COMPLETED\n`;
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `report_${item.batch}_${item.branch.replace(/[^a-zA-Z0-9]/g, '_')}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div>
      <Breadcrumb items={[{ label: 'Learning' }, { label: 'Download Report', href: '/learn/customReport' }]} />

      <h1 style={{ fontSize: '18px', fontWeight: 600, color: 'rgb(35, 39, 46)', margin: '0 0 24px 0', fontFamily: '"Public Sans", sans-serif' }}>
        Download Report
      </h1>

      {/* Filter Card */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '12px',
          border: '1px solid rgb(240, 240, 240)',
          padding: '24px',
          marginBottom: '24px',
        }}
      >
        <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
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
                <option value="">Select Batch</option>
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
                <option value="">Select Course</option>
                <option value="All Courses">All Courses</option>
                <option value="Python">Python</option>
                <option value="SQL">SQL</option>
              </select>
              <svg viewBox="0 0 24 24" style={{ position: 'absolute', right: '12px', top: '13px', width: '18px', height: '18px', fill: '#727272', pointerEvents: 'none' }}>
                <path d="M7.41 8.59 12 13.17l4.59-4.58L18 10l-6 6-6-6z" />
              </svg>
            </div>
          </div>
        </div>

        <button
          onClick={handleDownload}
          disabled={!batch || isProcessing}
          style={{
            backgroundColor: batch && !isProcessing ? 'rgb(238, 238, 238)' : '#f3f4f6',
            color: batch && !isProcessing ? 'rgb(114, 114, 114)' : '#9ca3af',
            border: 'none',
            borderRadius: '8px',
            height: '44px',
            padding: '0 24px',
            fontSize: '14px',
            fontWeight: 500,
            cursor: batch && !isProcessing ? 'pointer' : 'not-allowed',
          }}
        >
          {isProcessing ? 'Processing...' : 'Download Report'}
        </button>
      </div>

      {/* Reports Table */}
      <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid rgb(240, 240, 240)', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgb(240, 240, 240)', color: 'rgb(114, 114, 114)', fontWeight: 600, fontSize: '12px', letterSpacing: '0.05em' }}>
                <th style={{ padding: '16px 20px' }}>DATE & TIME</th>
                <th style={{ padding: '16px 20px' }}>BATCH</th>
                <th style={{ padding: '16px 20px' }}>BRANCH</th>
                <th style={{ padding: '16px 20px' }}>COURSE</th>
                <th style={{ padding: '16px 20px' }}>STATUS</th>
                <th style={{ padding: '16px 20px' }}>DOWNLOAD PROGRESS</th>
                <th style={{ padding: '16px 20px' }}>REPORT</th>
              </tr>
            </thead>
            <tbody>
              {downloads.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '36px', textAlign: 'center', color: 'rgb(114, 114, 114)' }}>
                    No reports generated yet. Select batch & branch, then click "Download Report" to export report.
                  </td>
                </tr>
              ) : (
                downloads.map((item) => (
                <tr key={item.id} style={{ borderBottom: '1px solid rgb(245, 245, 245)' }}>
                  <td style={{ padding: '16px 20px', color: 'rgb(35, 39, 46)' }}>{item.dateTime}</td>
                  <td style={{ padding: '16px 20px', color: 'rgb(35, 39, 46)' }}>{item.batch}</td>
                  <td style={{ padding: '16px 20px', color: 'rgb(35, 39, 46)' }}>{item.branch}</td>
                  <td style={{ padding: '16px 20px', color: 'rgb(35, 39, 46)' }}>{item.course}</td>
                  <td style={{ padding: '16px 20px' }}>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '4px 12px',
                        borderRadius: '20px',
                        fontSize: '11px',
                        fontWeight: 600,
                        border: '1px solid #007BFF',
                        color: '#007BFF',
                        backgroundColor: '#ffffff',
                      }}
                    >
                      ✓ COMPLETED
                    </span>
                  </td>
                  <td style={{ padding: '16px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ flex: 1, height: '6px', backgroundColor: 'rgb(230, 230, 230)', borderRadius: '3px', overflow: 'hidden', minWidth: '100px' }}>
                        <div
                          style={{
                            width: `${item.progress}%`,
                            height: '100%',
                            backgroundColor: '#007BFF',
                            borderRadius: '3px',
                          }}
                        />
                      </div>
                      <span style={{ fontSize: '12px', color: 'rgb(114, 114, 114)' }}>{item.progress}%</span>
                    </div>
                  </td>
                  <td style={{ padding: '16px 20px' }}>
                    <button
                      onClick={() => handleFileDownload(item)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#007BFF',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '13px',
                        fontWeight: 500,
                      }}
                    >
                      <svg viewBox="0 0 24 24" style={{ width: '16px', height: '16px', fill: '#007BFF' }}>
                        <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
                      </svg>
                      Report
                    </button>
                  </td>
                </tr>
              )))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
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
            </select>
            <span>of {downloads.length}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <button
              disabled
              style={{
                border: '1px solid rgb(224, 224, 224)',
                borderRadius: '6px',
                width: '32px',
                height: '32px',
                backgroundColor: 'white',
                color: 'rgb(180, 180, 180)',
                cursor: 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              ‹
            </button>
            <button
              style={{
                border: 'none',
                borderRadius: '6px',
                width: '32px',
                height: '32px',
                backgroundColor: '#007BFF',
                color: 'white',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              1
            </button>
            <button
              disabled
              style={{
                border: '1px solid rgb(224, 224, 224)',
                borderRadius: '6px',
                width: '32px',
                height: '32px',
                backgroundColor: 'white',
                color: 'rgb(180, 180, 180)',
                cursor: 'not-allowed',
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
    </div>
  );
}
