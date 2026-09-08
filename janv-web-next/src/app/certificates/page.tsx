'use client';

import { useState } from 'react';
import Breadcrumb from '@/components/layout/Breadcrumb';
import { reports } from '@/lib/api';

interface CertRecord {
  id: string;
  name: string;
  rollNo: string;
  batch: string;
  course: string;
  certId: string;
  issuedDate: string;
}

export default function CertificatesPage() {
  const [batch, setBatch] = useState('');
  const [branch, setBranch] = useState('');
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<CertRecord[]>([]);

  const handleSearch = async () => {
    setSearched(true);
    setLoading(true);
    try {
      const res = await reports.overall({ batch, branch });
      if (Array.isArray(res.data) && res.data.length > 0) {
        const records: CertRecord[] = res.data.map((item: any, idx: number) => ({
          id: item.student_id || String(idx + 1),
          name: item.student_name || item.name || 'Student',
          rollNo: item.roll_number || item.rollNo || `2026-${branch || 'GEN'}-${String(idx + 1).padStart(3, '0')}`,
          batch: item.batch || batch || '2026',
          course: item.course_name || 'Full Stack Development',
          certId: item.certificate_id || `CERT-${batch || '2026'}-${String(1000 + idx)}`,
          issuedDate: item.completed_at ? new Date(item.completed_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        }));
        setResults(records);
      } else {
        setResults([]);
      }
    } catch (err) {
      console.error('Failed to load certificates report:', err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Breadcrumb items={[{ label: 'Certificates' }, { label: 'View Certificates Report', href: '/certificates' }]} />

      <h1 className="page-title" style={{ fontSize: '1.25rem', fontWeight: 700, margin: '32px 0 16px' }}>View Certificates Report</h1>

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
                <option value="CSE">Computer Science & Engineering</option>
                <option value="ECE">Electronics & Communication</option>
              </select>
            </div>

            <button
              className="btn btn--secondary"
              onClick={handleSearch}
              style={{
                background: '#6c757d',
                color: 'white',
                minWidth: '100px',
                height: '42px',
              }}
            >
              Search
            </button>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>STUDENT NAME</th>
                <th>ROLL NO</th>
                <th>BATCH</th>
                <th>COURSE</th>
                <th>CERTIFICATE ID</th>
                <th>ISSUED DATE</th>
                <th>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {!searched ? (
                <tr>
                  <td colSpan={7} className="empty-state" style={{ padding: '40px', textAlign: 'center' }}>
                    Select Batch and Branch to view issued certificates report !
                  </td>
                </tr>
              ) : (
                results.map((r) => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 600 }}>{r.name}</td>
                    <td>{r.rollNo}</td>
                    <td>{r.batch}</td>
                    <td>{r.course}</td>
                    <td><code>{r.certId}</code></td>
                    <td>{r.issuedDate}</td>
                    <td>
                      <button className="btn btn--secondary btn--sm">View PDF</button>
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
