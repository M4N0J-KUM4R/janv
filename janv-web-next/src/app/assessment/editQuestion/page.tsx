'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Breadcrumb from '@/components/layout/Breadcrumb';
import { questions as apiQuestions, assessments } from '@/lib/api';

interface OptionInput {
  id: string;
  text: string;
  is_correct: boolean;
}

function EditQuestionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const questionId = searchParams.get('questionId') || searchParams.get('id') || '';
  const assessmentId = searchParams.get('assessmentId') || '';
  const sectionId = searchParams.get('sectionId') || '';
  const testCode = searchParams.get('testCode') || '';
  const testName = searchParams.get('testName') || '';

  const [loading, setLoading] = useState(Boolean(questionId));
  const [content, setContent] = useState('');
  const [questionType, setQuestionType] = useState<'mcq' | 'multi_select' | 'true_false'>('mcq');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [points, setPoints] = useState<number>(1);
  const [penaltyMarks, setPenaltyMarks] = useState<number>(0);
  const [explanation, setExplanation] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [options, setOptions] = useState<OptionInput[]>([
    { id: '1', text: '', is_correct: true },
    { id: '2', text: '', is_correct: false },
    { id: '3', text: '', is_correct: false },
    { id: '4', text: '', is_correct: false },
  ]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [linkedAssessments, setLinkedAssessments] = useState<string[]>([]);
  const [showWarningModal, setShowWarningModal] = useState(false);

  useEffect(() => {
    if (!questionId) {
      return;
    }

    let ignore = false;
    Promise.all([
      apiQuestions.get(questionId),
      assessments.getLinkedAssessments([questionId]).catch(() => ({ linked_assessments: [] })),
    ])
      .then(([qData, linkData]) => {
        if (ignore) return;
        const q = qData as unknown as Record<string, unknown>;
        if (q.content) setContent(String(q.content));
        if (q.question_type) setQuestionType(q.question_type as typeof questionType);
        if (q.difficulty) setDifficulty(q.difficulty as typeof difficulty);
        if (typeof q.points === 'number') setPoints(q.points);
        if (typeof q.penalty_marks === 'number') setPenaltyMarks(q.penalty_marks);
        if (q.explanation) setExplanation(String(q.explanation));
        if (Array.isArray(q.tags)) setTags(q.tags as string[]);

        if (Array.isArray(q.options) && q.options.length > 0) {
          setOptions(
            q.options.map((opt: Record<string, unknown>, i: number) => ({
              id: String(opt.id || i + 1),
              text: String(opt.text || opt.content || ''),
              is_correct: Boolean(opt.is_correct),
            }))
          );
        }

        if (linkData?.linked_assessments && linkData.linked_assessments.length > 0) {
          setLinkedAssessments(linkData.linked_assessments.map((a) => a.assessment_title));
        }
      })
      .catch((err) => {
        if (!ignore) {
          setError(err instanceof Error ? err.message : 'Failed to load question details');
        }
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [questionId]);

  const handleOptionChange = (idx: number, text: string) => {
    setOptions((prev) => prev.map((opt, i) => (i === idx ? { ...opt, text } : opt)));
  };

  const handleCorrectToggle = (idx: number) => {
    if (questionType === 'mcq' || questionType === 'true_false') {
      setOptions((prev) => prev.map((opt, i) => ({ ...opt, is_correct: i === idx })));
    } else {
      setOptions((prev) =>
        prev.map((opt, i) => (i === idx ? { ...opt, is_correct: !opt.is_correct } : opt))
      );
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (t: string) => {
    setTags(tags.filter((tag) => tag !== t));
  };

  const handleSave = async () => {
    if (!content.trim()) {
      setError('Question content is required');
      return;
    }

    if (options.some((o) => !o.text.trim())) {
      setError('All option fields must have text');
      return;
    }

    if (!options.some((o) => o.is_correct)) {
      setError('At least one option must be marked as correct');
      return;
    }

    // If linked to active assessments and warning not acknowledged
    if (linkedAssessments.length > 0 && !showWarningModal) {
      setShowWarningModal(true);
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await apiQuestions.update(questionId, {
        content: content.trim(),
        question_type: questionType,
        difficulty,
        points: Number(points),
        penalty_marks: Number(penaltyMarks),
        explanation: explanation.trim() || undefined,
        tags,
        options: options.map((opt) => ({
          text: opt.text.trim(),
          is_correct: opt.is_correct,
        })),
      });

      if (assessmentId) {
        router.push(
          `/assessment/testQuestions?assessmentId=${assessmentId}&sectionId=${sectionId}&testCode=${testCode}&testName=${encodeURIComponent(
            testName
          )}`
        );
      } else {
        router.push('/assessment/myTestLibrary');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update question');
    } finally {
      setSubmitting(false);
      setShowWarningModal(false);
    }
  };

  return (
    <div style={{ padding: '24px 32px', maxWidth: '1000px', margin: '0 auto' }}>
      <Breadcrumb
        items={[
          { label: 'Assessment', href: '/assessment/mytests' },
          { label: 'Edit Question' },
        ]}
      />

      {/* Linked Assessment Conflict Warning Modal */}
      {showWarningModal && (
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
            <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#B45309', margin: '0 0 12px 0' }}>
              ⚠️ Live Linked Assessment Warning
            </h3>
            <p style={{ fontSize: '14px', color: '#4B5563', lineHeight: '1.5', margin: '0 0 16px 0' }}>
              This question is actively linked to <strong>{linkedAssessments.length}</strong> assessment(s):
            </p>
            <ul style={{ fontSize: '13px', color: '#374151', marginBottom: '20px', paddingLeft: '20px' }}>
              {linkedAssessments.map((a, i) => (
                <li key={i}>{a}</li>
              ))}
            </ul>
            <p style={{ fontSize: '13px', color: '#6B7280', margin: '0 0 24px 0' }}>
              Updating this question will change the question text, options, and grading for all active assessments referencing it. Are you sure you wish to proceed?
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                type="button"
                onClick={() => setShowWarningModal(false)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#F3F4F6',
                  color: '#374151',
                  border: '1px solid #D1D5DB',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '13px',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#D97706',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '13px',
                }}
              >
                Proceed & Save
              </button>
            </div>
          </div>
        </div>
      )}

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
        <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#111827', margin: '0 0 24px 0' }}>
          Edit MCQ / Standard Question
        </h1>

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
            Loading question...
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSave();
            }}
          >
            {error && (
              <div style={{ marginBottom: '20px', padding: '12px 16px', backgroundColor: '#FEF2F2', borderRadius: '8px', color: '#DC2626', fontSize: '14px' }}>
                {error}
              </div>
            )}

            {/* Question Text */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
                Question Content / Prompt *
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={4}
                placeholder="Enter the question text..."
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid #D1D5DB',
                  fontSize: '14px',
                  outline: 'none',
                }}
              />
            </div>

            {/* Options */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                Answer Options (select correct radio/checkbox) *
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {options.map((opt, idx) => (
                  <div key={opt.id} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <input
                      type={questionType === 'mcq' || questionType === 'true_false' ? 'radio' : 'checkbox'}
                      name="correct_option"
                      checked={opt.is_correct}
                      onChange={() => handleCorrectToggle(idx)}
                      style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                    />
                    <input
                      type="text"
                      value={opt.text}
                      onChange={(e) => handleOptionChange(idx, e.target.value)}
                      placeholder={`Option ${idx + 1}`}
                      style={{
                        flex: 1,
                        padding: '10px 14px',
                        borderRadius: '8px',
                        border: '1px solid #D1D5DB',
                        fontSize: '14px',
                        outline: 'none',
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Marks, Penalty, Difficulty Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
                  Points (Marks)
                </label>
                <input
                  type="number"
                  min="1"
                  value={points}
                  onChange={(e) => setPoints(Number(e.target.value))}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '14px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
                  Negative Marks (Penalty)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.25"
                  value={penaltyMarks}
                  onChange={(e) => setPenaltyMarks(Number(e.target.value))}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '14px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
                  Difficulty Level
                </label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as typeof difficulty)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '14px', backgroundColor: '#fff' }}
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
            </div>

            {/* Explanation */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
                Explanation / Solution Note (Shown after evaluation)
              </label>
              <textarea
                value={explanation}
                onChange={(e) => setExplanation(e.target.value)}
                rows={3}
                placeholder="Optional explanation..."
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '14px' }}
              />
            </div>

            {/* Tags */}
            <div style={{ marginBottom: '32px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
                Tags / Topics
              </label>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                  placeholder="Add a tag and press Enter..."
                  style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '14px' }}
                />
                <button
                  type="button"
                  onClick={handleAddTag}
                  style={{ padding: '8px 16px', backgroundColor: '#F3F4F6', border: '1px solid #D1D5DB', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}
                >
                  Add
                </button>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {tags.map((t) => (
                  <span
                    key={t}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      backgroundColor: '#EEF2FF',
                      color: '#4F46E5',
                      padding: '4px 10px',
                      borderRadius: '16px',
                      fontSize: '12px',
                    }}
                  >
                    {t}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(t)}
                      style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#6B7280', fontSize: '14px', lineHeight: '1' }}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid #E5E7EB', paddingTop: '20px' }}>
              <button
                type="button"
                onClick={() => router.back()}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#fff',
                  border: '1px solid #D1D5DB',
                  borderRadius: '8px',
                  color: '#374151',
                  fontWeight: '600',
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                style={{
                  padding: '10px 24px',
                  backgroundColor: '#4F46E5',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#fff',
                  fontWeight: '600',
                  fontSize: '14px',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  opacity: submitting ? 0.7 : 1,
                }}
              >
                {submitting ? 'Saving...' : 'Save Question'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default function EditQuestionPage() {
  return (
    <Suspense fallback={<div style={{ padding: '32px', textAlign: 'center' }}>Loading Editor...</div>}>
      <EditQuestionContent />
    </Suspense>
  );
}
