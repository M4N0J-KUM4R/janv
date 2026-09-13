'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Breadcrumb from '@/components/layout/Breadcrumb';
import GoogleFormsQuestionBuilder from '@/components/assessment/GoogleFormsQuestionBuilder';

interface QuestionItem {
  id: string;
  question_type: string;
  content: string;
  options?: unknown;
  difficulty: string;
  tags?: string[];
  points: number;
}

function CustomQuestionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const assessmentId = searchParams.get('assessmentId') || '';
  const sectionId = searchParams.get('sectionId') || '';
  const sectionName = searchParams.get('sectionName') || 'Section';
  const sectionType = searchParams.get('sectionType') || '1';
  const testCode = searchParams.get('testCode') || '';
  const testName = searchParams.get('testName') || '';
  const initialTab = searchParams.get('tab') === 'library' ? 'library' : 'forms';

  const [activeTab, setActiveTab] = useState<'forms' | 'library'>(initialTab);

  const isCoding = sectionType === '2' || sectionType.toLowerCase().includes('code');

  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [difficulty, setDifficulty] = useState<string>('');
  const [page, setPage] = useState(1);
  const limit = 10;

  useEffect(() => {
    if (activeTab !== 'library') return;
    let ignore = false;
    async function load() {
      try {
        setError(null);
        setLoading(true);

        const params = new URLSearchParams();
        if (search.trim()) params.set('search', search.trim());
        if (difficulty) params.set('difficulty', difficulty);
        params.set('question_type', isCoding ? 'coding' : 'mcq');
        params.set('page', String(page));
        params.set('limit', String(limit));

        const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
        const res = await fetch(`/api/assessments/questions?${params}`, {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        if (!res.ok) {
          throw new Error('Failed to load questions from library');
        }

        const data = await res.json();
        if (!ignore) {
          setQuestions(Array.isArray(data) ? data : data.list || []);
        }
      } catch (err) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : 'Error fetching question library');
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, [search, difficulty, page, isCoding, activeTab]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleAddSelected = async () => {
    if (selectedIds.length === 0 || !assessmentId) return;

    try {
      setAdding(true);
      setError(null);

      const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
      const res = await fetch(`/api/assessments/${assessmentId}/questions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          question_ids: selectedIds,
          section_id: sectionId || undefined,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || 'Failed to add questions to section');
      }

      setSuccessMsg(`Successfully added ${selectedIds.length} question(s) to section!`);
      setTimeout(() => {
        router.push(
          `/assessment/testQuestions?assessmentId=${assessmentId}&sectionId=${sectionId}&testCode=${testCode}&testName=${encodeURIComponent(testName)}&sectionType=${sectionType}`
        );
      }, 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error assigning questions');
      setAdding(false);
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px 44px 60px' }}>
      <Breadcrumb
        items={[
          { label: 'Assessments', href: '/assessment' },
          { label: 'My Tests', href: '/assessment/mytests' },
          { label: testName || 'Edit Test', href: assessmentId ? `/assessment/testQuestions?assessmentId=${assessmentId}&sectionId=${sectionId}&testCode=${testCode}` : '#' },
          { label: `${sectionName}: Custom Questions`, href: '#' },
        ]}
      />

      {/* Top Level Nav Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginTop: '28px', marginBottom: '24px', borderBottom: '1px solid #E5E7EB', paddingBottom: '12px' }}>
        <button
          type="button"
          onClick={() => setActiveTab('forms')}
          style={{
            padding: '10px 20px',
            borderRadius: '8px',
            border: 'none',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
            backgroundColor: activeTab === 'forms' ? '#EEF2FF' : 'transparent',
            color: activeTab === 'forms' ? '#4F46E5' : '#6B7280',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          📝 Custom Question Builder (Google Forms)
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('library')}
          style={{
            padding: '10px 20px',
            borderRadius: '8px',
            border: 'none',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
            backgroundColor: activeTab === 'library' ? '#EEF2FF' : 'transparent',
            color: activeTab === 'library' ? '#4F46E5' : '#6B7280',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          📚 Browse Question Library
        </button>
      </div>

      {activeTab === 'forms' ? (
        <GoogleFormsQuestionBuilder
          initialAssessmentId={assessmentId}
          initialSectionId={sectionId}
          initialSectionName={sectionName}
          initialSectionType={sectionType}
          initialTestCode={testCode}
          initialTestName={testName}
        />
      ) : (
        <div>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <div>
              <h1 style={{ fontSize: '20px', fontWeight: 600, color: '#343434', margin: 0, fontFamily: '"Public Sans", sans-serif' }}>
                Question Library ({isCoding ? 'Coding' : 'MCQ'})
              </h1>
              <p style={{ margin: '4px 0 0', color: '#727272', fontSize: '14px' }}>
                Browse and add curated questions to {sectionName}
              </p>
            </div>

            <button
              type="button"
              disabled={selectedIds.length === 0 || adding}
              onClick={handleAddSelected}
              style={{
                display: 'flex',
                height: '42px',
                padding: '0 24px',
                alignItems: 'center',
                gap: '8px',
                borderRadius: '8px',
                backgroundColor: selectedIds.length > 0 && !adding ? '#017DF9' : '#B0B0B0',
                color: '#FFFFFF',
                border: 'none',
                fontSize: '14px',
                fontWeight: 500,
                cursor: selectedIds.length > 0 && !adding ? 'pointer' : 'not-allowed',
                fontFamily: '"Public Sans", sans-serif',
              }}
            >
              {adding ? 'Adding...' : `Add Questions (${selectedIds.length})`}
            </button>
          </div>

          {successMsg && (
            <div style={{ padding: '12px 16px', backgroundColor: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: '8px', color: '#065F46', marginBottom: '20px', fontSize: '14px' }}>
              ✓ {successMsg}
            </div>
          )}

          {error && (
            <div style={{ padding: '12px 16px', backgroundColor: '#FEE2E2', border: '1px solid #FCA5A5', borderRadius: '8px', color: '#B91C1C', marginBottom: '20px', fontSize: '14px' }}>
              {error}
            </div>
          )}

          {/* Search & Filter Toolbar */}
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', backgroundColor: '#FFFFFF', padding: '16px', borderRadius: '8px', border: '1px solid #F0F0F0', marginBottom: '20px' }}>
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search by keyword, tag, or question text..."
              style={{ flex: 1, height: '40px', padding: '0 12px', borderRadius: '8px', border: '1px solid #E2E2E2', fontSize: '14px' }}
            />

            <select
              value={difficulty}
              onChange={(e) => { setDifficulty(e.target.value); setPage(1); }}
              style={{ height: '40px', padding: '0 12px', borderRadius: '8px', border: '1px solid #E2E2E2', fontSize: '14px', backgroundColor: '#FFF' }}
            >
              <option value="">All Difficulties</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>

            {selectedIds.length > 0 && (
              <button
                type="button"
                onClick={() => setSelectedIds([])}
                style={{ background: 'none', border: 'none', color: '#ED4758', fontSize: '13px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
              >
                Deselect all ({selectedIds.length})
              </button>
            )}
          </div>

          {/* Question List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {loading ? (
              <div style={{ backgroundColor: '#FFFFFF', padding: '40px', textAlign: 'center', borderRadius: '8px', border: '1px solid #F0F0F0', color: '#8B909A' }}>
                Loading questions from library...
              </div>
            ) : questions.length === 0 ? (
              <div style={{ backgroundColor: '#FFFFFF', padding: '48px 16px', textAlign: 'center', borderRadius: '8px', border: '1px solid #F0F0F0' }}>
                <p style={{ color: '#4A4A4A', fontSize: '16px', fontWeight: 600, margin: '0 0 8px' }}>No questions found</p>
                <p style={{ color: '#727272', fontSize: '14px', margin: 0 }}>Try clearing your search or filter criteria.</p>
              </div>
            ) : (
              questions.map((q, idx) => {
                const isChecked = selectedIds.includes(q.id);
                return (
                  <div
                    key={q.id}
                    onClick={() => toggleSelect(q.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '16px',
                      padding: '20px',
                      backgroundColor: '#FFFFFF',
                      borderRadius: '8px',
                      border: isChecked ? '1px solid #BEDEFF' : '1px solid #F0F0F0',
                      boxShadow: isChecked ? '0 0 0 1px #BEDEFF' : 'none',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease-in-out',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {}}
                      style={{ width: '18px', height: '18px', marginTop: '2px', cursor: 'pointer', accentColor: '#017DF9' }}
                    />

                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <span style={{ fontSize: '14px', fontWeight: 600, color: '#343434' }}>
                          Q.{(page - 1) * limit + idx + 1}
                        </span>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '8px',
                          fontSize: '11px',
                          fontWeight: 600,
                          backgroundColor: '#FAFAFA',
                          border: '1px solid #E5E7EB',
                          color: '#4A4A4A',
                          textTransform: 'capitalize',
                        }}>
                          {q.difficulty}
                        </span>
                        <span style={{ fontSize: '12px', color: '#727272' }}>
                          • {q.points} pt{q.points > 1 ? 's' : ''}
                        </span>
                      </div>

                      <p style={{ fontSize: '14px', color: '#343434', lineHeight: '1.5', margin: '0 0 12px', whiteSpace: 'pre-wrap' }}>
                        {q.content}
                      </p>

                      {/* Options Preview for MCQs */}
                      {Array.isArray(q.options) && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
                          {q.options.map((opt: Record<string, unknown>, optIdx: number) => {
                            const optText = String(opt.input || opt.text || '');
                            const isCorrect = Boolean(opt.is_correct || opt.isAnswer === 1 || opt.correct);
                            return (
                              <div
                                key={optIdx}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  padding: '6px 10px',
                                  borderRadius: '6px',
                                  backgroundColor: isCorrect ? '#E9F4FF' : '#F9FAFB',
                                  border: isCorrect ? '1px solid #BEDEFF' : '1px solid #F0F0F0',
                                  fontSize: '13px',
                                  color: isCorrect ? '#017DF9' : '#4A4A4A',
                                  fontWeight: isCorrect ? 600 : 400,
                                }}
                              >
                                <span>{String.fromCharCode(65 + optIdx)}.</span>
                                <span>{optText}</span>
                                {isCorrect && <span style={{ marginLeft: 'auto', fontSize: '11px' }}>✓ Correct</span>}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Tags */}
                      {Array.isArray(q.tags) && q.tags.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                          {q.tags.map((t, tIdx) => (
                            <span key={tIdx} style={{ padding: '2px 8px', borderRadius: '12px', backgroundColor: '#F3F4F6', color: '#6B7280', fontSize: '11px' }}>
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Pagination */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '24px' }}>
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              style={{ height: '36px', padding: '0 16px', borderRadius: '6px', backgroundColor: '#FFF', border: '1px solid #E2E2E2', fontSize: '13px', cursor: page <= 1 ? 'not-allowed' : 'pointer' }}
            >
              Previous
            </button>
            <span style={{ display: 'flex', alignItems: 'center', padding: '0 12px', fontSize: '13px', color: '#4A4A4A' }}>
              Page {page}
            </span>
            <button
              type="button"
              disabled={questions.length < limit || loading}
              onClick={() => setPage((p) => p + 1)}
              style={{ height: '36px', padding: '0 16px', borderRadius: '6px', backgroundColor: '#FFF', border: '1px solid #E2E2E2', fontSize: '13px', cursor: questions.length < limit ? 'not-allowed' : 'pointer' }}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CustomQuestionPage() {
  return (
    <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center' }}>Loading question builder...</div>}>
      <CustomQuestionContent />
    </Suspense>
  );
}
