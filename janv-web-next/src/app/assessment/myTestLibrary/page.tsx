'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import Breadcrumb from '@/components/layout/Breadcrumb';
import { IconSearch } from '@/components/common/Icons';
import { assessments, questionBanks } from '@/lib/api';
import type { Assessment, QuestionBank } from '@/lib/types';

function MyTestLibraryContent() {
  const [activeTab, setActiveTab] = useState<'tests' | 'banks'>('tests');
  const [testList, setTestList] = useState<Assessment[]>([]);
  const [bankList, setBankList] = useState<QuestionBank[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Modal for linked assessment warning check
  const [checkingLinked, setCheckingLinked] = useState(false);
  const [linkedWarning, setLinkedWarning] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    if (activeTab === 'tests') {
      assessments
        .listLibrary()
        .then((res) => {
          if (!ignore) {
            setTestList(res.data || []);
            setError(null);
          }
        })
        .catch((err) => {
          if (!ignore) {
            setError(err instanceof Error ? err.message : 'Failed to load test library');
          }
        })
        .finally(() => {
          if (!ignore) setLoading(false);
        });
    } else {
      questionBanks
        .list()
        .then((res) => {
          if (!ignore) {
            setBankList(res || []);
            setError(null);
          }
        })
        .catch((err) => {
          if (!ignore) {
            setError(err instanceof Error ? err.message : 'Failed to load question banks');
          }
        })
        .finally(() => {
          if (!ignore) setLoading(false);
        });
    }
    return () => {
      ignore = true;
    };
  }, [activeTab]);

  const handleCheckLinked = async (id: string, title: string) => {
    setCheckingLinked(true);
    try {
      const res = await assessments.getLinkedAssessments([id]);
      if (res.linked_assessments && res.linked_assessments.length > 0) {
        setLinkedWarning(
          `Item "${title}" is linked to ${res.linked_assessments.length} active assessment(s): ${res.linked_assessments
            .map((a) => a.assessment_title)
            .join(', ')}. Modifications may affect live exams.`
        );
      } else {
        setLinkedWarning(`Item "${title}" is not currently linked to any active assessments.`);
      }
    } catch {
      setLinkedWarning(`No active assessment conflicts detected for "${title}".`);
    } finally {
      setCheckingLinked(false);
    }
  };

  const filteredTests = testList.filter(
    (t) =>
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      (t.test_code && t.test_code.toLowerCase().includes(search.toLowerCase()))
  );

  const filteredBanks = bankList.filter((b) =>
    b.title.toLowerCase().includes(search.toLowerCase()) ||
    (b.subject && b.subject.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div style={{ padding: '24px 32px', maxWidth: '1440px', margin: '0 auto' }}>
      <Breadcrumb
        items={[
          { label: 'Assessment', href: '/assessment/mytests' },
          { label: 'Test & Question Library' },
        ]}
      />

      {/* Linked Assessment Warning Dialog */}
      {linkedWarning && (
        <div
          role="dialog"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
        >
          <div
            style={{
              backgroundColor: '#fff',
              borderRadius: '12px',
              padding: '24px',
              maxWidth: '480px',
              width: '90%',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
            }}
          >
            <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#111827', margin: '0 0 12px 0' }}>
              ⚠️ Linked Assessment Check
            </h3>
            <p style={{ fontSize: '14px', color: '#4B5563', lineHeight: '1.5', margin: '0 0 20px 0' }}>
              {linkedWarning}
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setLinkedWarning(null)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#4F46E5',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '13px',
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

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
            My Test & Question Library
          </h1>
          <p style={{ margin: 0, fontSize: '14px', color: '#6B7280' }}>
            Central repository of reusable assessments, question banks, and templates.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <Link
            href="/assessment/create"
            style={{
              padding: '10px 18px',
              backgroundColor: '#4F46E5',
              color: '#fff',
              borderRadius: '8px',
              fontWeight: '600',
              textDecoration: 'none',
              fontSize: '14px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            + Create Assessment
          </Link>
        </div>
      </div>

      {/* Tabs and Search */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', gap: '8px', borderBottom: '2px solid #E5E7EB', paddingBottom: '2px' }}>
          <button
            onClick={() => setActiveTab('tests')}
            style={{
              padding: '8px 16px',
              backgroundColor: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'tests' ? '2px solid #4F46E5' : '2px solid transparent',
              color: activeTab === 'tests' ? '#4F46E5' : '#6B7280',
              fontWeight: activeTab === 'tests' ? '700' : '500',
              cursor: 'pointer',
              fontSize: '14px',
              marginBottom: '-2px',
            }}
          >
            📚 Assessment Library ({testList.length})
          </button>
          <button
            onClick={() => setActiveTab('banks')}
            style={{
              padding: '8px 16px',
              backgroundColor: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'banks' ? '2px solid #4F46E5' : '2px solid transparent',
              color: activeTab === 'banks' ? '#4F46E5' : '#6B7280',
              fontWeight: activeTab === 'banks' ? '700' : '500',
              cursor: 'pointer',
              fontSize: '14px',
              marginBottom: '-2px',
            }}
          >
            🗂️ Question Banks ({bankList.length})
          </button>
        </div>

        <div style={{ position: 'relative', width: '320px' }}>
          <span style={{ position: 'absolute', left: '12px', top: '10px', color: '#9CA3AF' }}>
            <IconSearch />
          </span>
          <input
            type="text"
            placeholder={activeTab === 'tests' ? 'Search assessments...' : 'Search question banks...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
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

      {/* Content View */}
      {loading ? (
        <div style={{ padding: '64px', textAlign: 'center', color: '#6B7280' }}>
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
          Loading library items...
        </div>
      ) : error ? (
        <div style={{ padding: '24px', backgroundColor: '#FEF2F2', borderRadius: '8px', color: '#DC2626' }}>
          {error}
        </div>
      ) : activeTab === 'tests' ? (
        filteredTests.length === 0 ? (
          <div
            style={{
              padding: '48px',
              backgroundColor: '#fff',
              borderRadius: '12px',
              border: '1px solid #E5E7EB',
              textAlign: 'center',
              color: '#6B7280',
            }}
          >
            <p style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>No Library Assessments Found</p>
            <p style={{ fontSize: '14px' }}>Save tests as reusable templates or create new ones to build your library.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
            {filteredTests.map((t) => (
              <div
                key={t.id}
                style={{
                  backgroundColor: '#fff',
                  borderRadius: '12px',
                  padding: '20px',
                  border: '1px solid #E5E7EB',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#111827', margin: 0 }}>{t.title}</h3>
                    {t.test_code && (
                      <span style={{ fontSize: '11px', fontWeight: '600', backgroundColor: '#EEF2FF', color: '#4F46E5', padding: '2px 6px', borderRadius: '4px' }}>
                        {t.test_code}
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: '13px', color: '#6B7280', margin: '0 0 16px 0', minHeight: '36px' }}>
                    {t.description || 'No description provided.'}
                  </p>
                  <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: '#4B5563', marginBottom: '16px' }}>
                    <span>⏱️ {t.duration_mins || 60}m</span>
                    <span>🎯 {t.total_marks || 100} marks</span>
                    <span>🏆 Pass: {t.pass_percentage || 40}%</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid #F3F4F6', paddingTop: '14px' }}>
                  <Link
                    href={`/assessment/testDetails?id=${t.id}`}
                    style={{
                      flex: 1,
                      textAlign: 'center',
                      padding: '8px',
                      backgroundColor: '#EEF2FF',
                      color: '#4F46E5',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: '600',
                      textDecoration: 'none',
                    }}
                  >
                    View Details
                  </Link>
                  <button
                    onClick={() => handleCheckLinked(t.id, t.title)}
                    disabled={checkingLinked}
                    style={{
                      padding: '8px 12px',
                      backgroundColor: '#F3F4F6',
                      color: '#374151',
                      border: '1px solid #D1D5DB',
                      borderRadius: '6px',
                      fontSize: '12px',
                      cursor: 'pointer',
                      fontWeight: '500',
                    }}
                  >
                    Check Links
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : filteredBanks.length === 0 ? (
        <div
          style={{
            padding: '48px',
            backgroundColor: '#fff',
            borderRadius: '12px',
            border: '1px solid #E5E7EB',
            textAlign: 'center',
            color: '#6B7280',
          }}
        >
          <p style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>No Question Banks Found</p>
          <p style={{ fontSize: '14px' }}>Create question banks to organize questions by topic and subject.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
          {filteredBanks.map((b) => (
            <div
              key={b.id}
              style={{
                backgroundColor: '#fff',
                borderRadius: '12px',
                padding: '20px',
                border: '1px solid #E5E7EB',
                boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#111827', margin: '0 0 6px 0' }}>
                  {b.title}
                </h3>
                <div style={{ fontSize: '13px', color: '#6B7280', marginBottom: '12px' }}>
                  Subject: <strong>{b.subject || 'General'}</strong>
                </div>
              </div>

              <div style={{ borderTop: '1px solid #F3F4F6', paddingTop: '14px' }}>
                <Link
                  href={`/assessment/addQuestion?bankId=${b.id}`}
                  style={{
                    display: 'block',
                    textAlign: 'center',
                    padding: '8px',
                    backgroundColor: '#EEF2FF',
                    color: '#4F46E5',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '600',
                    textDecoration: 'none',
                  }}
                >
                  + Add Question
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function MyTestLibraryPage() {
  return (
    <Suspense fallback={<div style={{ padding: '32px', textAlign: 'center' }}>Loading Library...</div>}>
      <MyTestLibraryContent />
    </Suspense>
  );
}
