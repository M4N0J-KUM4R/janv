'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Breadcrumb from '@/components/layout/Breadcrumb';

interface QuestionItem {
  id: string;
  question_type: string;
  content: string;
  options?: unknown;
  difficulty: string;
  points: number;
  sort_order?: number;
}

function TestQuestionsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const assessmentId = searchParams.get('assessmentId') || searchParams.get('id') || '';
  const sectionId = searchParams.get('sectionId') || '';
  const sectionName = searchParams.get('sectionName') || 'Section';
  const testName = searchParams.get('testName') || '';
  const testCode = searchParams.get('testCode') || '';
  const sectionType = searchParams.get('sectionType') || '1'; // '1' = MCQ, '2' = Coding

  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [loading, setLoading] = useState(Boolean(assessmentId));
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    if (!assessmentId) return;

    let ignore = false;
    const query = sectionId ? `?section_id=${sectionId}` : '';
    fetch(`/api/assessments/${assessmentId}/questions${query}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load questions');
        return res.json();
      })
      .then((data) => {
        if (!ignore) {
          setQuestions(data.list || []);
        }
      })
      .catch((err) => {
        if (!ignore) {
          setError(err instanceof Error ? err.message : 'Error loading questions');
        }
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [assessmentId, sectionId]);

  const handleRemoveQuestion = async (questionId: string) => {
    try {
      setDeletingId(questionId);
      const res = await fetch(`/api/assessments/${assessmentId}/questions/${questionId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setQuestions((prev) => prev.filter((q) => q.id !== questionId));
      } else {
        const errData = await res.json().catch(() => ({}));
        setError(errData.message || 'Failed to remove question');
      }
    } catch {
      setError('Network error while removing question');
    } finally {
      setDeletingId(null);
    }
  };

  const isCoding = sectionType === '2' || sectionType.toLowerCase().includes('code');

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px 44px 60px' }}>
      <Breadcrumb
        items={[
          { label: 'Assessments', href: '/assessment' },
          { label: 'My Tests', href: '/assessment/mytests' },
          { label: testName ? `Edit Test: ${testName}` : 'Edit Test', href: `/assessment/createSuccess?id=${assessmentId}` },
          { label: `${sectionName} Questions`, href: '#' },
        ]}
      />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '32px', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 600, color: '#343434', margin: 0, fontFamily: '"Public Sans", sans-serif' }}>
            {sectionName} Questions {testCode ? `(${testCode})` : ''}
          </h1>
          <p style={{ margin: '4px 0 0', color: '#727272', fontSize: '14px', fontFamily: '"Public Sans", sans-serif' }}>
            Total Questions: {questions.length}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          style={{
            display: 'flex',
            height: '40px',
            padding: '0 20px',
            alignItems: 'center',
            gap: '8px',
            borderRadius: '8px',
            backgroundColor: '#017DF9',
            color: '#FFFFFF',
            border: 'none',
            fontSize: '14px',
            fontWeight: 500,
            cursor: 'pointer',
            fontFamily: '"Public Sans", sans-serif',
          }}
        >
          <span>+</span> Add Questions
        </button>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', backgroundColor: '#FEE2E2', border: '1px solid #FCA5A5', borderRadius: '8px', color: '#B91C1C', marginBottom: '20px', fontSize: '14px' }}>
          {error}
        </div>
      )}

      {/* Questions Table */}
      <div style={{ width: '100%', backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px solid #F0F0F0', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: '#FAFAFA', borderBottom: '1px solid #F0F0F0' }}>
              <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#9B9B9B', width: '50px' }}>S.NO</th>
              <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#9B9B9B' }}>QUESTION CONTENT</th>
              <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#9B9B9B', width: '100px' }}>TYPE</th>
              <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#9B9B9B', width: '100px' }}>DIFFICULTY</th>
              <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#9B9B9B', width: '80px' }}>POINTS</th>
              <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#9B9B9B', width: '80px', textAlign: 'center' }}>ACTION</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: '#8B909A' }}>
                  Loading questions...
                </td>
              </tr>
            ) : questions.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '48px 16px', textAlign: 'center' }}>
                  <p style={{ color: '#4A4A4A', fontSize: '16px', fontWeight: 600, margin: '0 0 8px' }}>
                    No questions added to this section yet
                  </p>
                  <p style={{ color: '#727272', fontSize: '14px', margin: '0 0 16px' }}>
                    Choose questions from the Question Library or add your own custom questions.
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowAddModal(true)}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#017DF9',
                      color: '#FFF',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontWeight: 500,
                      cursor: 'pointer',
                    }}
                  >
                    Add Questions
                  </button>
                </td>
              </tr>
            ) : (
              questions.map((q, idx) => (
                <tr key={q.id} style={{ borderBottom: '1px solid #F0F0F0' }}>
                  <td style={{ padding: '14px 16px', color: '#727272', fontSize: '13px' }}>{idx + 1}</td>
                  <td style={{ padding: '14px 16px', color: '#343434', fontSize: '14px', fontWeight: 500 }}>
                    {q.content.length > 120 ? `${q.content.slice(0, 120)}...` : q.content}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '3px 8px',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: 600,
                      backgroundColor: q.question_type === 'coding' ? '#F9F1FF' : '#EBFAF3',
                      color: q.question_type === 'coding' ? '#944DE7' : '#2EB67C',
                      textTransform: 'uppercase',
                    }}>
                      {q.question_type}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '3px 8px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: 500,
                      backgroundColor: '#FAFAFA',
                      border: '1px solid #E5E7EB',
                      color: '#4A4A4A',
                      textTransform: 'capitalize',
                    }}>
                      {q.difficulty}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px', color: '#4A4A4A', fontSize: '13px', fontWeight: 600 }}>
                    {q.points}
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                    <button
                      type="button"
                      disabled={deletingId === q.id}
                      onClick={() => handleRemoveQuestion(q.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#ED4758',
                        fontSize: '13px',
                        fontWeight: 500,
                      }}
                    >
                      {deletingId === q.id ? '...' : 'Remove'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add Questions Modal */}
      {showAddModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
          onClick={() => setShowAddModal(false)}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              padding: '24px',
              width: '420px',
              maxWidth: '90vw',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#343434', fontFamily: '"Public Sans", sans-serif' }}>
                Add questions from
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#888' }}
              >
                ✕
              </button>
            </div>

            <p style={{ margin: '0 0 20px', fontSize: '13px', color: '#727272', lineHeight: '1.4' }}>
              Find questions in our question library, or create your own custom questions for this section.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button
                type="button"
                onClick={() => {
                  setShowAddModal(false);
                  const dest = isCoding
                    ? `/assessment/addQuestioncoding?assessmentId=${assessmentId}&sectionId=${sectionId}&testCode=${testCode}&testName=${encodeURIComponent(testName)}`
                    : `/assessment/addQuestion?assessmentId=${assessmentId}&sectionId=${sectionId}&testCode=${testCode}&testName=${encodeURIComponent(testName)}`;
                  router.push(dest);
                }}
                style={{
                  height: '42px',
                  borderRadius: '8px',
                  backgroundColor: '#017DF9',
                  color: '#FFFFFF',
                  border: 'none',
                  fontWeight: 500,
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                Add Custom Question
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowAddModal(false);
                  router.push(`/assessment/customQuestion?assessmentId=${assessmentId}&sectionId=${sectionId}&sectionName=${encodeURIComponent(sectionName)}&sectionType=${sectionType}&testCode=${testCode}&testName=${encodeURIComponent(testName)}`);
                }}
                style={{
                  height: '42px',
                  borderRadius: '8px',
                  backgroundColor: '#FFFFFF',
                  color: '#4A4A4A',
                  border: '1px solid #E2E2E2',
                  fontWeight: 500,
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                Choose From Library
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TestQuestionsPage() {
  return (
    <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center' }}>Loading questions...</div>}>
      <TestQuestionsContent />
    </Suspense>
  );
}
