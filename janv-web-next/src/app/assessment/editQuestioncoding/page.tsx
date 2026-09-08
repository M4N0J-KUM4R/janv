'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Breadcrumb from '@/components/layout/Breadcrumb';
import { questions as apiQuestions, assessments } from '@/lib/api';

interface TestCaseInput {
  input: string;
  output: string;
  is_sample: boolean;
}

function EditQuestionCodingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const questionId = searchParams.get('questionId') || searchParams.get('id') || '';
  const assessmentId = searchParams.get('assessmentId') || '';
  const sectionId = searchParams.get('sectionId') || '';
  const testCode = searchParams.get('testCode') || '';
  const testName = searchParams.get('testName') || '';

  const [loading, setLoading] = useState(Boolean(questionId));
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [points, setPoints] = useState<number>(10);
  const [penaltyMarks, setPenaltyMarks] = useState<number>(0);
  const [timeLimit, setTimeLimit] = useState<number>(1000);
  const [memoryLimit, setMemoryLimit] = useState<number>(256);
  const [constraints, setConstraints] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [testCases, setTestCases] = useState<TestCaseInput[]>([
    { input: '', output: '', is_sample: true },
    { input: '', output: '', is_sample: false },
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
        if (q.title) setTitle(String(q.title));
        if (q.content) setContent(String(q.content));
        if (q.difficulty) setDifficulty(q.difficulty as typeof difficulty);
        if (typeof q.points === 'number') setPoints(q.points);
        if (typeof q.penalty_marks === 'number') setPenaltyMarks(q.penalty_marks);
        if (typeof q.time_limit_ms === 'number') setTimeLimit(q.time_limit_ms);
        if (typeof q.memory_limit_mb === 'number') setMemoryLimit(q.memory_limit_mb);
        if (q.constraints) setConstraints(String(q.constraints));
        if (Array.isArray(q.tags)) setTags(q.tags as string[]);

        if (Array.isArray(q.test_cases) && q.test_cases.length > 0) {
          setTestCases(
            q.test_cases.map((tc: Record<string, unknown>) => ({
              input: String(tc.input || ''),
              output: String(tc.output || tc.expected_output || ''),
              is_sample: Boolean(tc.is_sample),
            }))
          );
        }

        if (linkData?.linked_assessments && linkData.linked_assessments.length > 0) {
          setLinkedAssessments(linkData.linked_assessments.map((a) => a.assessment_title));
        }
      })
      .catch((err) => {
        if (!ignore) {
          setError(err instanceof Error ? err.message : 'Failed to load coding question details');
        }
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [questionId]);

  const handleAddTestCase = () => {
    setTestCases([...testCases, { input: '', output: '', is_sample: false }]);
  };

  const handleRemoveTestCase = (index: number) => {
    if (testCases.length <= 1) return;
    setTestCases(testCases.filter((_, i) => i !== index));
  };

  const handleTestCaseChange = (index: number, field: keyof TestCaseInput, value: unknown) => {
    setTestCases((prev) =>
      prev.map((tc, i) => (i === index ? { ...tc, [field]: value } : tc))
    );
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
    if (!title.trim()) {
      setError('Problem title is required');
      return;
    }
    if (!content.trim()) {
      setError('Problem statement is required');
      return;
    }

    if (testCases.some((tc) => !tc.input.trim() || !tc.output.trim())) {
      setError('All test cases must specify input and expected output');
      return;
    }

    if (linkedAssessments.length > 0 && !showWarningModal) {
      setShowWarningModal(true);
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await apiQuestions.update(questionId, {
        title: title.trim(),
        content: content.trim(),
        question_type: 'coding',
        difficulty,
        points: Number(points),
        penalty_marks: Number(penaltyMarks),
        time_limit_ms: Number(timeLimit),
        memory_limit_mb: Number(memoryLimit),
        constraints: constraints.trim() || undefined,
        tags,
        test_cases: testCases.map((tc) => ({
          input: tc.input.trim(),
          output: tc.output.trim(),
          is_sample: tc.is_sample,
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
      setError(err instanceof Error ? err.message : 'Failed to update coding question');
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
          { label: 'Edit Coding Problem' },
        ]}
      />

      {/* Warning Modal */}
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
              This coding question is actively linked to <strong>{linkedAssessments.length}</strong> assessment(s):
            </p>
            <ul style={{ fontSize: '13px', color: '#374151', marginBottom: '20px', paddingLeft: '20px' }}>
              {linkedAssessments.map((a, i) => (
                <li key={i}>{a}</li>
              ))}
            </ul>
            <p style={{ fontSize: '13px', color: '#6B7280', margin: '0 0 24px 0' }}>
              Updating this coding problem will modify test suites and scoring across all linked assessments.
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
          Edit Coding Problem
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
            Loading coding problem...
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

            {/* Title */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
                Problem Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Reverse a Linked List"
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '14px' }}
              />
            </div>

            {/* Content */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
                Problem Statement (Markdown supported) *
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={6}
                placeholder="Detailed description of the task, input format, and output format..."
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '14px' }}
              />
            </div>

            {/* Constraints */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
                Constraints
              </label>
              <textarea
                value={constraints}
                onChange={(e) => setConstraints(e.target.value)}
                rows={2}
                placeholder="e.g. 1 <= N <= 10^5, 0 <= A[i] <= 10^9"
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '14px' }}
              />
            </div>

            {/* Limits & Points Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
                  Points
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
                  Difficulty
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

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
                  Time Limit (ms)
                </label>
                <input
                  type="number"
                  min="100"
                  step="100"
                  value={timeLimit}
                  onChange={(e) => setTimeLimit(Number(e.target.value))}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '14px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
                  Memory Limit (MB)
                </label>
                <input
                  type="number"
                  min="32"
                  value={memoryLimit}
                  onChange={(e) => setMemoryLimit(Number(e.target.value))}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '14px' }}
                />
              </div>
            </div>

            {/* Test Cases */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <label style={{ fontSize: '14px', fontWeight: '600', color: '#374151' }}>
                  Test Cases (Input & Expected Output) *
                </label>
                <button
                  type="button"
                  onClick={handleAddTestCase}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: '#EEF2FF',
                    color: '#4F46E5',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer',
                  }}
                >
                  + Add Test Case
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {testCases.map((tc, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '16px',
                      borderRadius: '8px',
                      border: '1px solid #E5E7EB',
                      backgroundColor: '#F9FAFB',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <span style={{ fontSize: '13px', fontWeight: '700', color: '#111827' }}>
                        Test Case #{idx + 1}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#4B5563', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={tc.is_sample}
                            onChange={(e) => handleTestCaseChange(idx, 'is_sample', e.target.checked)}
                          />
                          Sample / Visible to Candidate
                        </label>
                        {testCases.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveTestCase(idx)}
                            style={{ border: 'none', background: 'none', color: '#DC2626', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div>
                        <span style={{ display: 'block', fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>Input</span>
                        <textarea
                          value={tc.input}
                          onChange={(e) => handleTestCaseChange(idx, 'input', e.target.value)}
                          rows={3}
                          style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '13px', fontFamily: 'monospace' }}
                        />
                      </div>
                      <div>
                        <span style={{ display: 'block', fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>Expected Output</span>
                        <textarea
                          value={tc.output}
                          onChange={(e) => handleTestCaseChange(idx, 'output', e.target.value)}
                          rows={3}
                          style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '13px', fontFamily: 'monospace' }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Tags */}
            <div style={{ marginBottom: '32px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
                Tags / Categories
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
                  placeholder="Add a tag..."
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

            {/* Submit Bar */}
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
                {submitting ? 'Saving...' : 'Save Coding Problem'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default function EditQuestionCodingPage() {
  return (
    <Suspense fallback={<div style={{ padding: '32px', textAlign: 'center' }}>Loading Coding Editor...</div>}>
      <EditQuestionCodingContent />
    </Suspense>
  );
}
