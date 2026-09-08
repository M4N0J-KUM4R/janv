'use client';

import { useState } from 'react';
import Breadcrumb from '@/components/layout/Breadcrumb';

interface CertDownloadHistory {
  id: string;
  dateTime: string;
  batch: string;
  branch: string;
  count: number;
  status: 'Processing' | 'Completed';
  progress: number;
}

export default function DownloadCertificatesPage() {
  const [batch, setBatch] = useState('');
  const [branch, setBranch] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);
  const [history, setHistory] = useState<CertDownloadHistory[]>([]);

  const handleDownload = () => {
    if (!batch) return;
    setIsDownloading(true);

    const newId = Date.now().toString();
    const item: CertDownloadHistory = {
      id: newId,
      dateTime: new Date().toLocaleString(),
      batch,
      branch: branch || 'All Branches',
      count: 142,
      status: 'Processing',
      progress: 0,
    };

    setHistory((prev) => [item, ...prev]);

    let current = 0;
    const timer = setInterval(() => {
      current += 25;
      setHistory((prev) =>
        prev.map((h) =>
          h.id === newId
            ? {
                ...h,
                progress: current,
                status: current >= 100 ? 'Completed' : 'Processing',
              }
            : h
        )
      );

      if (current >= 100) {
        clearInterval(timer);
        setIsDownloading(false);
      }
    }, 400);
  };

  return (
    <div>
      <Breadcrumb items={[{ label: 'Certificates' }, { label: 'Download Certificate Report', href: '/certificates/download' }]} />

      <h1 className="page-title" style={{ fontSize: '1.25rem', fontWeight: 700, margin: '32px 0 16px' }}>Download Certificate Report</h1>

      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="card-body">
          <div className="filter-row">
            <div className="form-group">
              <label className="form-label">
                <span className="required">*</span> Batch
              </label>
              <select className="form-select" value={batch} onChange={(e) => setBatch(e.target.value)}>
                <option value="">Select Batch</option>
                <option value="2026">2026 Batch</option>
                <option value="2027">2027 Batch</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Branch</label>
              <select className="form-select" value={branch} onChange={(e) => setBranch(e.target.value)}>
                <option value="">Select Branch</option>
                <option value="CSE">Computer Science</option>
                <option value="ECE">Electronics</option>
              </select>
            </div>
          </div>

          <button
            className="btn btn--secondary"
            disabled={!batch || isDownloading}
            onClick={handleDownload}
            style={{
              background: batch && !isDownloading ? '#6c757d' : '#e5e7eb',
              color: batch && !isDownloading ? 'white' : '#9ca3af',
              marginTop: '12px',
            }}
          >
            {isDownloading ? 'Generating ZIP...' : 'Download Certificates ZIP'}
          </button>
        </div>
      </div>

      <div className="card">
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>DATE & TIME</th>
                <th>BATCH</th>
                <th>BRANCH</th>
                <th>TOTAL CERTIFICATES</th>
                <th>STATUS</th>
                <th>DOWNLOAD PROGRESS</th>
                <th>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 ? (
                <tr>
                  <td colSpan={7} className="empty-state" style={{ padding: '30px', textAlign: 'center' }}>
                    No certificate exports requested yet
                  </td>
                </tr>
              ) : (
                history.map((item) => (
                  <tr key={item.id}>
                    <td>{item.dateTime}</td>
                    <td>{item.batch}</td>
                    <td>{item.branch}</td>
                    <td>{item.count} Certificates</td>
                    <td>
                      <span
                        style={{
                          color: item.status === 'Completed' ? 'var(--success)' : 'var(--warning)',
                          fontWeight: 600,
                        }}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td>
                      <div style={{ width: '100%', backgroundColor: '#e5e7eb', borderRadius: '9999px', height: '8px' }}>
                        <div
                          style={{
                            width: `${item.progress}%`,
                            backgroundColor: item.status === 'Completed' ? 'var(--success)' : 'var(--brand-accent)',
                            height: '100%',
                            borderRadius: '9999px',
                            transition: 'width 0.3s ease',
                          }}
                        />
                      </div>
                    </td>
                    <td>
                      <button
                        className="btn btn--secondary btn--sm"
                        disabled={item.status !== 'Completed'}
                      >
                        Download ZIP
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
