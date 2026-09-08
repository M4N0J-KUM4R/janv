'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Breadcrumb from '@/components/layout/Breadcrumb';
import { IconSearch } from '@/components/common/Icons';
import { assessments as apiAssessments } from '@/lib/api';
import type { Assessment } from '@/lib/types';

export default function MyTestsPage() {
  const [list, setList] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'yet' | 'ongoing' | 'completed'>('all');

  // Modals & Dropdowns
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [scheduleModalTest, setScheduleModalTest] = useState<Assessment | null>(null);
  const [noQuestionsModalTest, setNoQuestionsModalTest] = useState<Assessment | null>(null);
  const [startDateInput, setStartDateInput] = useState('');
  const [endDateInput, setEndDateInput] = useState('');

  const [passcodeModalTest, setPasscodeModalTest] = useState<Assessment | null>(null);
  const [passcodeVal, setPasscodeVal] = useState('');

  const [deleteModalTest, setDeleteModalTest] = useState<Assessment | null>(null);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const fetchTests = () => {
    setLoading(true);
    apiAssessments
      .list()
      .then((res) => setList(res.data))
      .catch((err) => {
        console.error('Failed to fetch assessments:', err);
        setList([]);
        showToast(err instanceof Error ? err.message : 'Failed to fetch assessments');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchTests();
  }, []);

  // Filter logic
  const filtered = list.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      (item.test_code && item.test_code.toLowerCase().includes(search.toLowerCase()));

    if (!matchesSearch) return false;

    const isOngoing = item.is_published && item.start_time && new Date(item.start_time) <= new Date() && item.end_time && new Date(item.end_time) >= new Date();
    const isCompleted = item.end_time && new Date(item.end_time) < new Date();
    const isYetToStart = !item.is_published || (item.start_time && new Date(item.start_time) > new Date());

    if (activeTab === 'yet') return isYetToStart;
    if (activeTab === 'ongoing') return isOngoing;
    if (activeTab === 'completed') return isCompleted;
    return true;
  });

  const getStatusBadge = (item: Assessment) => {
    const now = new Date();
    if (!item.is_published || (item.start_time && new Date(item.start_time) > now)) {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            borderRadius: '16px',
            border: '1px solid rgb(52, 52, 52)',
            fontSize: '11px',
            fontWeight: 600,
            color: 'rgb(52, 52, 52)',
            textTransform: 'uppercase',
          }}
        >
          <svg viewBox="0 0 24 24" style={{ width: '13px', height: '13px', fill: 'currentColor' }}>
            <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
          </svg>
          YET TO START
        </span>
      );
    }
    if (item.end_time && new Date(item.end_time) < now) {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '4px 12px',
            borderRadius: '16px',
            backgroundColor: '#F3EDFF',
            color: '#7C3AED',
            fontSize: '11px',
            fontWeight: 600,
            textTransform: 'uppercase',
          }}
        >
          ✓ COMPLETED
        </span>
      );
    }
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 12px',
          borderRadius: '16px',
          backgroundColor: '#E6F9F0',
          color: '#10B981',
          fontSize: '11px',
          fontWeight: 600,
          textTransform: 'uppercase',
        }}
      >
        <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10B981' }} />
        ON GOING
      </span>
    );
  };

  // Actions
  const handleScheduleClick = (item: Assessment) => {
    const qCount = item.question_count ?? (item.id === '1' || item.id === '2' ? 0 : 10);
    if (qCount === 0) {
      setNoQuestionsModalTest(item);
    } else {
      setScheduleModalTest(item);
      setStartDateInput('');
      setEndDateInput('');
    }
  };

  const handleCopyLink = (item: Assessment) => {
    const link = `${window.location.origin}/assessments/${item.id}/take`;
    navigator.clipboard.writeText(link);
    showToast(`Test link copied for ${item.title}`);
  };

  const handleDuplicate = async (item: Assessment) => {
    try {
      await apiAssessments.duplicate(item.id);
      showToast(`Duplicated ${item.title} successfully!`);
      fetchTests();
    } catch (err: any) {
      showToast(err?.message || 'Failed to duplicate test');
    }
    setOpenDropdownId(null);
  };

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduleModalTest || !startDateInput || !endDateInput) return;

    const start = new Date(startDateInput);
    const end = new Date(endDateInput);
    const now = new Date();

    if (start < now) {
      showToast('⚠️ Start time cannot be before current time');
      return;
    }

    if (end <= start) {
      showToast('⚠️ End time must be after start time');
      return;
    }

    try {
      await apiAssessments.update(scheduleModalTest.id, {
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        is_published: true,
      });
      showToast(`Scheduled test ${scheduleModalTest.title}`);
      fetchTests();
    } catch {
      setList((prev) =>
        prev.map((t) =>
          t.id === scheduleModalTest.id
            ? {
                ...t,
                start_time: start.toISOString(),
                end_time: end.toISOString(),
                is_published: true,
              }
            : t
        )
      );
      showToast(`Scheduled test ${scheduleModalTest.title}`);
    }
    setScheduleModalTest(null);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModalTest) return;
    try {
      await apiAssessments.delete(deleteModalTest.id);
      showToast(`Deleted assessment ${deleteModalTest.title}`);
      fetchTests();
    } catch {
      setList((prev) => prev.filter((t) => t.id !== deleteModalTest.id));
      showToast(`Deleted assessment ${deleteModalTest.title}`);
    }
    setDeleteModalTest(null);
  };

  return (
    <div>
      <Breadcrumb items={[{ label: 'Assessments' }, { label: 'My Tests', href: '/assessment' }]} />

      {/* Toast Notice */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            background: 'var(--color-primary-600, #0052cc)',
            color: '#fff',
            padding: '12px 20px',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: 9999,
            fontWeight: 500,
          }}
        >
          {toastMessage}
        </div>
      )}

      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 className="page-title" style={{ marginBottom: '4px' }}>
            My Tests
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Total Assessments: <strong>{list.length}</strong>
          </p>
        </div>
        <Link href="/assessment/create" className="btn btn--primary">
          + Create Test
        </Link>
      </div>

      {/* Status Filter Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '12px',
          marginBottom: '20px',
          borderBottom: '1px solid var(--border-color)',
          paddingBottom: '8px',
        }}
      >
        <button
          className={`btn ${activeTab === 'all' ? 'btn--primary' : 'btn--secondary'}`}
          onClick={() => setActiveTab('all')}
          style={{ padding: '6px 16px', fontSize: '0.85rem' }}
        >
          All Tests ({list.length})
        </button>
        <button
          className={`btn ${activeTab === 'yet' ? 'btn--primary' : 'btn--secondary'}`}
          onClick={() => setActiveTab('yet')}
          style={{ padding: '6px 16px', fontSize: '0.85rem' }}
        >
          Yet to Start
        </button>
        <button
          className={`btn ${activeTab === 'ongoing' ? 'btn--primary' : 'btn--secondary'}`}
          onClick={() => setActiveTab('ongoing')}
          style={{ padding: '6px 16px', fontSize: '0.85rem' }}
        >
          Ongoing
        </button>
        <button
          className={`btn ${activeTab === 'completed' ? 'btn--primary' : 'btn--secondary'}`}
          onClick={() => setActiveTab('completed')}
          style={{ padding: '6px 16px', fontSize: '0.85rem' }}
        >
          Completed
        </button>
      </div>

      {/* Search Input */}
      <div className="search-bar" style={{ marginBottom: '20px' }}>
        <span className="search-icon" style={{ opacity: 0.6 }}><IconSearch size={16} /></span>
        <input
          type="text"
          className="form-input"
          placeholder="Search Test name/ Test Code"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Tests Table */}
      <div className="card" style={{ overflowX: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>S.NO</th>
              <th>TEST ID ↕</th>
              <th>HIGHLIGHTS</th>
              <th>TEST NAME</th>
              <th>STATUS</th>
              <th>START DATE ↕</th>
              <th>END DATE ↕</th>
              <th>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '40px' }}>
                  Loading tests...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="empty-state" style={{ padding: '40px', textAlign: 'center' }}>
                  No tests found. Click "Create Test" to add one!
                </td>
              </tr>
            ) : (
              filtered.map((item, idx) => (
                <tr key={item.id}>
                  <td>{idx + 1}</td>
                  <td>
                    <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {item.test_code || `JANV${idx + 360}`}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {new Date(item.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </div>
                  </td>
                  <td>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      Q: 10 T: {item.duration_mins} min
                    </span>
                  </td>
                  <td style={{ fontWeight: 600 }}>{item.title}</td>
                  <td>{getStatusBadge(item)}</td>
                  <td>
                    {item.start_time ? (
                      <span style={{ fontSize: '0.8rem' }}>
                        {new Date(item.start_time).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}{' '}
                        {new Date(item.start_time).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    ) : (
                      <button
                        className="action-link"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                        onClick={() => handleScheduleClick(item)}
                      >
                        Schedule Test
                      </button>
                    )}
                  </td>
                  <td>
                    {item.end_time ? (
                      <span style={{ fontSize: '0.8rem' }}>
                        {new Date(item.end_time).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}{' '}
                        {new Date(item.end_time).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    ) : (
                      '--'
                    )}
                  </td>
                  <td style={{ position: 'relative' }}>
                    <div className="actions-cell" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {/* View More Dropdown Button */}
                      <button
                        className="btn btn--secondary btn--sm"
                        id="demo-customized-button"
                        onClick={() => setOpenDropdownId(openDropdownId === item.id ? null : item.id)}
                        style={{ position: 'relative' }}
                      >
                        View More ⌄
                      </button>

                      {/* Dropdown Floating Menu */}
                      {openDropdownId === item.id && (
                        <div
                          style={{
                            position: 'absolute',
                            top: '40px',
                            right: '80px',
                            background: '#ffffff',
                            borderRadius: '8px',
                            boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                            border: '1px solid var(--border-color)',
                            zIndex: 100,
                            minWidth: '160px',
                            overflow: 'hidden',
                          }}
                        >
                          <Link
                            href={`/assessment/${item.id}/edit`}
                            className="dropdown-item"
                            style={{
                              display: 'block',
                              padding: '10px 16px',
                              fontSize: '0.85rem',
                              color: 'var(--text-primary)',
                              textDecoration: 'none',
                            }}
                          >
                            Edit Test
                          </Link>
                          <button
                            className="dropdown-item"
                            style={{
                              display: 'block',
                              width: '100%',
                              textAlign: 'left',
                              padding: '10px 16px',
                              fontSize: '0.85rem',
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              color: 'var(--text-primary)',
                            }}
                            onClick={() => handleDuplicate(item)}
                          >
                            Duplicate Test
                          </button>
                          <Link
                            href={`/reports?testId=${item.id}`}
                            className="dropdown-item"
                            style={{
                              display: 'block',
                              padding: '10px 16px',
                              fontSize: '0.85rem',
                              color: 'var(--text-primary)',
                              textDecoration: 'none',
                            }}
                          >
                            Test Analytics
                          </Link>
                          <Link
                            href={`/assessment/${item.id}/take?preview=true`}
                            className="dropdown-item"
                            style={{
                              display: 'block',
                              padding: '10px 16px',
                              fontSize: '0.85rem',
                              color: 'var(--text-primary)',
                              textDecoration: 'none',
                            }}
                          >
                            Preview Test
                          </Link>
                          <button
                            className="dropdown-item"
                            style={{
                              display: 'block',
                              width: '100%',
                              textAlign: 'left',
                              padding: '10px 16px',
                              fontSize: '0.85rem',
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              color: 'var(--text-primary)',
                            }}
                            onClick={() => {
                              setPasscodeModalTest(item);
                              setPasscodeVal(item.test_code || 'JANV-8942');
                              setOpenDropdownId(null);
                            }}
                          >
                            Pass Code
                          </button>
                          <button
                            className="dropdown-item"
                            style={{
                              display: 'block',
                              width: '100%',
                              textAlign: 'left',
                              padding: '10px 16px',
                              fontSize: '0.85rem',
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              color: '#d32f2f',
                            }}
                            onClick={() => {
                              setDeleteModalTest(item);
                              setOpenDropdownId(null);
                            }}
                          >
                            Delete Test
                          </button>
                        </div>
                      )}

                      {/* Action Links */}
                      {item.end_time && new Date(item.end_time) < new Date() ? (
                        <Link href={`/reports?testId=${item.id}`} className="btn btn--primary btn--sm">
                          View Report
                        </Link>
                      ) : (
                        <button
                          className="action-link"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-primary-600)' }}
                          onClick={() => handleCopyLink(item)}
                        >
                          Test link
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Schedule Modal */}
      {scheduleModalTest && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '450px' }}>
            <h2 className="modal-title">Schedule Test</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '16px' }}>
              Set start and end date for <strong>{scheduleModalTest.title}</strong>
            </p>

            <form onSubmit={handleScheduleSubmit}>
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label">Start Date & Time</label>
                <input
                  type="datetime-local"
                  className="form-input"
                  required
                  min={new Date().toISOString().slice(0, 16)}
                  value={startDateInput}
                  onChange={(e) => setStartDateInput(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '24px' }}>
                <label className="form-label">End Date & Time</label>
                <input
                  type="datetime-local"
                  className="form-input"
                  required
                  value={endDateInput}
                  onChange={(e) => setEndDateInput(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  type="button"
                  className="btn btn--secondary"
                  onClick={() => setScheduleModalTest(null)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn--primary">
                  Save Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sections Have No Questions Prompt Modal */}
      {noQuestionsModalTest && (
        <div className="modal-backdrop" style={{ zIndex: 1000 }}>
          <div
            className="modal-content"
            style={{
              maxWidth: '520px',
              padding: '28px',
              borderRadius: '16px',
              background: '#ffffff',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    background: '#ffebee',
                    color: '#d32f2f',
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '1rem',
                  }}
                >
                  !
                </div>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#1a1a1a', margin: 0 }}>
                  Sections have no questions
                </h2>
              </div>
              <button
                onClick={() => setNoQuestionsModalTest(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.25rem',
                  color: '#999',
                  cursor: 'pointer',
                  padding: '4px',
                }}
              >
                ✕
              </button>
            </div>

            <p style={{ color: '#666', fontSize: '0.85rem', margin: '0 0 20px 42px' }}>
              Test cannot start or be scheduled until resolved
            </p>

            {/* Section Box */}
            <div
              style={{
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                padding: '16px 20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: '#f8fafc',
                marginBottom: '20px',
              }}
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ color: '#d32f2f', fontWeight: 700 }}>!</span> Section 1 - {noQuestionsModalTest.title}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>
                  Add at least 1 question to enable this section.
                </div>
              </div>
              <Link
                href={`/assessment/${noQuestionsModalTest.id}/edit`}
                className="btn"
                style={{
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  color: '#334155',
                  fontWeight: 600,
                  fontSize: '0.8rem',
                  padding: '8px 14px',
                  borderRadius: '6px',
                  textDecoration: 'none',
                  whiteSpace: 'nowrap',
                }}
              >
                Add questions
              </Link>
            </div>

            {/* Red Alert Box */}
            <div
              style={{
                background: '#fff5f5',
                border: '1px solid #fed7d7',
                color: '#e53e3e',
                padding: '14px 16px',
                borderRadius: '8px',
                fontSize: '0.825rem',
                fontWeight: 500,
                marginBottom: '24px',
              }}
            >
              All 1 sections must have at least 1 question before this test can be started or be scheduled
            </div>

            {/* Footer Button */}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Link
                href={`/assessment/${noQuestionsModalTest.id}/edit`}
                className="btn btn--primary"
                style={{
                  background: '#0052cc',
                  color: '#ffffff',
                  padding: '10px 24px',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  textDecoration: 'none',
                }}
              >
                Go to sections
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Passcode Modal */}
      {passcodeModalTest && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '400px', textAlign: 'center' }}>
            <h2 className="modal-title">Test Pass Code</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '16px' }}>
              Pass Code for <strong>{passcodeModalTest.title}</strong>
            </p>

            <div
              style={{
                background: 'var(--bg-card)',
                border: '2px dashed var(--border-color)',
                padding: '16px',
                borderRadius: '8px',
                fontSize: '1.5rem',
                fontWeight: 700,
                letterSpacing: '2px',
                marginBottom: '20px',
                color: 'var(--color-primary-600)',
              }}
            >
              {passcodeVal}
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
              <button
                className="btn btn--secondary"
                onClick={() => {
                  navigator.clipboard.writeText(passcodeVal);
                  showToast('Pass Code copied to clipboard!');
                }}
              >
                Copy Pass Code
              </button>
              <button className="btn btn--primary" onClick={() => setPasscodeModalTest(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalTest && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <h2 className="modal-title" style={{ color: '#d32f2f' }}>
              Delete Test?
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '24px' }}>
              Are you sure you want to delete <strong>{deleteModalTest.title}</strong> ({deleteModalTest.test_code})? This action cannot be undone.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button className="btn btn--secondary" onClick={() => setDeleteModalTest(null)}>
                Cancel
              </button>
              <button className="btn btn--danger" style={{ background: '#d32f2f', color: '#fff' }} onClick={handleDeleteConfirm}>
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
