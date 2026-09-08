'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Breadcrumb from '@/components/layout/Breadcrumb';

interface TestCaseInput {
  input: string;
  output: string;
  is_sample: boolean;
}

function AddQuestionCodingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const assessmentId = searchParams.get('assessmentId') || '';
  const sectionId = searchParams.get('sectionId') || '';
  const testCode = searchParams.get('testCode') || '';
  const testName = searchParams.get('testName') || '';

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [points, setPoints] = useState<number>(10);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Problem title is required');
      return;
    }
    if (!content.trim()) {
      setError('Problem statement is required');
      return;
    }

    const emptyCase = testCases.find((tc) => !tc.input.trim() || !tc.output.trim());
    if (emptyCase) {
      setError('All test cases must include input and expected output');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const fullContent = `${title.trim()}\n\n${content.trim()}${constraints.trim() ? `\n\nConstraints:\n${constraints.trim()}` : ''}`;
      const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');

      const createRes = await fetch('/api/assessments/questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          question_type: 'coding',
          content: fullContent,
          options: {
            title: title.trim(),
            time_limit_ms: timeLimit,
            memory_limit_kb: memoryLimit * 1024,
            testCases: testCases.map((tc) => ({
              input: tc.input.trim(),
              output: tc.output.trim(),
              is_sample: tc.is_sample,
            })),
          },
          difficulty,
          tags: tags.length > 0 ? tags : undefined,
          points,
        }),
      });

      if (!createRes.ok) {
        const errJson = await createRes.json().catch(() => ({}));
        throw new Error(errJson.message || 'Failed to create coding problem');
      }

      const createdQ = await createRes.json();

      if (assessmentId) {
        const addRes = await fetch(`/api/assessments/${assessmentId}/questions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            question_ids: [createdQ.id],
            section_id: sectionId || undefined,
          }),
        });

        if (!addRes.ok) {
          const addErr = await addRes.json().catch(() => ({}));
          throw new Error(addErr.message || 'Question created but failed to assign to section');
        }

        router.push(
          `/assessment/testQuestions?assessmentId=${assessmentId}&sectionId=${sectionId}&testCode=${testCode}&testName=${encodeURIComponent(testName)}&sectionType=2`
        );
      } else {
        router.push('/assessment');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error creating coding problem');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', padding: '24px 32px 60px' }}>
      <Breadcrumb
        items={[
          { label: 'Assessments', href: '/assessment' },
          { label: 'My Tests', href: '/assessment/mytests' },
          { label: testName || 'Edit Test', href: assessmentId ? `/assessment/testQuestions?assessmentId=${assessmentId}&sectionId=${sectionId}&testCode=${testCode}` : '#' },
          { label: 'Add Coding Question', href: '#' },
        ]}
      />

      <div style={{ marginTop: '28px', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 600, color: '#343434', margin: 0, fontFamily: '"Public Sans", sans-serif' }}>
          Add Coding Question
        </h1>
        <p style={{ margin: '4px 0 0', color: '#727272', fontSize: '14px' }}>
          Create a programming problem with input/output test cases.
        </p>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', backgroundColor: '#FEE2E2', border: '1px solid #FCA5A5', borderRadius: '8px', color: '#B91C1C', marginBottom: '20px', fontSize: '14px' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ backgroundColor: '#FFFFFF', padding: '28px', borderRadius: '12px', border: '1px solid #F0F0F0' }}>
        {/* Title */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#4A4A4A', marginBottom: '6px' }}>Problem Title *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Reverse a Linked List"
            style={{ width: '100%', height: '42px', padding: '0 12px', borderRadius: '8px', border: '1px solid #E2E2E2', fontSize: '14px', boxSizing: 'border-box' }}
          />
        </div>

        {/* Difficulty, Points, Limits */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '20px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#4A4A4A', marginBottom: '6px' }}>Difficulty</label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as 'easy' | 'medium' | 'hard')}
              style={{ width: '100%', height: '42px', padding: '0 12px', borderRadius: '8px', border: '1px solid #E2E2E2', fontSize: '14px', backgroundColor: '#FFF' }}
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#4A4A4A', marginBottom: '6px' }}>Points</label>
            <input
              type="number"
              min={1}
              value={points}
              onChange={(e) => setPoints(Number(e.target.value) || 10)}
              style={{ width: '100%', height: '42px', padding: '0 12px', borderRadius: '8px', border: '1px solid #E2E2E2', fontSize: '14px', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#4A4A4A', marginBottom: '6px' }}>Time Limit (ms)</label>
            <input
              type="number"
              min={100}
              step={100}
              value={timeLimit}
              onChange={(e) => setTimeLimit(Number(e.target.value) || 1000)}
              style={{ width: '100%', height: '42px', padding: '0 12px', borderRadius: '8px', border: '1px solid #E2E2E2', fontSize: '14px', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#4A4A4A', marginBottom: '6px' }}>Memory Limit (MB)</label>
            <input
              type="number"
              min={16}
              value={memoryLimit}
              onChange={(e) => setMemoryLimit(Number(e.target.value) || 256)}
              style={{ width: '100%', height: '42px', padding: '0 12px', borderRadius: '8px', border: '1px solid #E2E2E2', fontSize: '14px', boxSizing: 'border-box' }}
            />
          </div>
        </div>

        {/* Problem Statement */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#4A4A4A', marginBottom: '6px' }}>Problem Statement / Description *</label>
          <textarea
            rows={5}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Describe the task, inputs, outputs, and expected behavior..."
            style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #E2E2E2', fontSize: '14px', fontFamily: 'inherit', boxSizing: 'border-box' }}
          />
        </div>

        {/* Constraints */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#4A4A4A', marginBottom: '6px' }}>Constraints (Optional)</label>
          <textarea
            rows={2}
            value={constraints}
            onChange={(e) => setConstraints(e.target.value)}
            placeholder="e.g. 1 <= N <= 10^5, 0 <= A[i] <= 10^9"
            style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #E2E2E2', fontSize: '14px', fontFamily: 'inherit', boxSizing: 'border-box' }}
          />
        </div>

        {/* Test Cases */}
        <div style={{ marginBottom: '28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <label style={{ fontSize: '14px', fontWeight: 600, color: '#343434' }}>
              Test Cases ({testCases.length}) *
            </label>
            <button
              type="button"
              onClick={handleAddTestCase}
              style={{ padding: '6px 12px', backgroundColor: '#E9F4FF', color: '#017DF9', border: '1px solid #BEDEFF', borderRadius: '6px', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}
            >
              + Add Test Case
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {testCases.map((tc, idx) => (
              <div key={idx} style={{ padding: '16px', border: '1px solid #E5E7EB', borderRadius: '8px', backgroundColor: '#FAFAFA' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#4A4A4A' }}>Test Case {idx + 1}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#727272', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={tc.is_sample}
                        onChange={(e) => handleTestCaseChange(idx, 'is_sample', e.target.checked)}
                      />
                      Sample / Public
                    </label>
                    {testCases.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveTestCase(idx)}
                        style={{ background: 'none', border: 'none', color: '#ED4758', fontSize: '12px', cursor: 'pointer' }}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: '#727272', marginBottom: '4px' }}>Input</label>
                    <textarea
                      rows={3}
                      value={tc.input}
                      onChange={(e) => handleTestCaseChange(idx, 'input', e.target.value)}
                      placeholder="Input data..."
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '13px', fontFamily: 'monospace', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: '#727272', marginBottom: '4px' }}>Expected Output</label>
                    <textarea
                      rows={3}
                      value={tc.output}
                      onChange={(e) => handleTestCaseChange(idx, 'output', e.target.value)}
                      placeholder="Expected output..."
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '13px', fontFamily: 'monospace', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tags */}
        <div style={{ marginBottom: '28px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#4A4A4A', marginBottom: '6px' }}>Tags</label>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag(); } }}
              placeholder="e.g. Arrays, Strings, Dynamic Programming"
              style={{ flex: 1, height: '40px', padding: '0 12px', borderRadius: '8px', border: '1px solid #E2E2E2', fontSize: '14px' }}
            />
            <button
              type="button"
              onClick={handleAddTag}
              style={{ padding: '0 16px', height: '40px', borderRadius: '8px', backgroundColor: '#FAFAFA', border: '1px solid #E2E2E2', color: '#343434', fontSize: '13px', cursor: 'pointer' }}
            >
              Add Tag
            </button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {tags.map((t) => (
              <span key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '16px', backgroundColor: '#F9F1FF', color: '#944DE7', fontSize: '12px', fontWeight: 500 }}>
                {t}
                <button type="button" onClick={() => handleRemoveTag(t)} style={{ background: 'none', border: 'none', color: '#944DE7', cursor: 'pointer', padding: 0 }}>×</button>
              </span>
            ))}
          </div>
        </div>

        {/* Submit */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button
            type="button"
            onClick={() => router.back()}
            style={{ height: '42px', padding: '0 20px', borderRadius: '8px', backgroundColor: '#FFF', border: '1px solid #E2E2E2', color: '#727272', fontSize: '14px', cursor: 'pointer' }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            style={{
              height: '42px',
              padding: '0 24px',
              borderRadius: '8px',
              backgroundColor: '#017DF9',
              color: '#FFF',
              border: 'none',
              fontSize: '14px',
              fontWeight: 500,
              cursor: submitting ? 'not-allowed' : 'pointer',
            }}
          >
            {submitting ? 'Saving...' : 'Save Coding Question'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function AddQuestionCodingPage() {
  return (
    <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center' }}>Loading coding form...</div>}>
      <AddQuestionCodingContent />
    </Suspense>
  );
}
