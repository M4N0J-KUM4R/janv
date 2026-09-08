'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Breadcrumb from '@/components/layout/Breadcrumb';

interface OptionInput {
  id: string;
  text: string;
  is_correct: boolean;
}

function AddQuestionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const assessmentId = searchParams.get('assessmentId') || '';
  const sectionId = searchParams.get('sectionId') || '';
  const testCode = searchParams.get('testCode') || '';
  const testName = searchParams.get('testName') || '';

  const [content, setContent] = useState('');
  const [questionType, setQuestionType] = useState<'mcq' | 'multi_select' | 'true_false'>('mcq');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [points, setPoints] = useState<number>(1);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      setError('Question content is required');
      return;
    }

    const hasCorrect = options.some((opt) => opt.is_correct);
    if (!hasCorrect) {
      setError('Please select at least one correct option');
      return;
    }

    const emptyOpt = options.find((opt) => !opt.text.trim());
    if (emptyOpt) {
      setError('All option texts must be filled');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      // Create question
      const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
      const createRes = await fetch('/api/assessments/questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          question_type: questionType,
          content: content.trim(),
          options: options.map((opt) => ({
            input: opt.text,
            is_correct: opt.is_correct,
            isAnswer: opt.is_correct ? 1 : 0,
          })),
          explanation: explanation.trim() || undefined,
          difficulty,
          tags: tags.length > 0 ? tags : undefined,
          points,
        }),
      });

      if (!createRes.ok) {
        const errJson = await createRes.json().catch(() => ({}));
        throw new Error(errJson.message || 'Failed to create question');
      }

      const createdQ = await createRes.json();

      // If tied to an assessment, add it to the assessment / section
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
          throw new Error(addErr.message || 'Question created but failed to assign to assessment');
        }

        router.push(
          `/assessment/testQuestions?assessmentId=${assessmentId}&sectionId=${sectionId}&testCode=${testCode}&testName=${encodeURIComponent(testName)}`
        );
      } else {
        router.push('/assessment');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error creating question');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '24px 32px 60px' }}>
      <Breadcrumb
        items={[
          { label: 'Assessments', href: '/assessment' },
          { label: 'My Tests', href: '/assessment/mytests' },
          { label: testName || 'Edit Test', href: assessmentId ? `/assessment/testQuestions?assessmentId=${assessmentId}&sectionId=${sectionId}&testCode=${testCode}` : '#' },
          { label: 'Add Custom Question', href: '#' },
        ]}
      />

      <div style={{ marginTop: '28px', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 600, color: '#343434', margin: 0, fontFamily: '"Public Sans", sans-serif' }}>
          Add Custom MCQ Question
        </h1>
        <p style={{ margin: '4px 0 0', color: '#727272', fontSize: '14px' }}>
          Create a multiple-choice, multi-select, or true/false question.
        </p>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', backgroundColor: '#FEE2E2', border: '1px solid #FCA5A5', borderRadius: '8px', color: '#B91C1C', marginBottom: '20px', fontSize: '14px' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ backgroundColor: '#FFFFFF', padding: '28px', borderRadius: '12px', border: '1px solid #F0F0F0' }}>
        {/* Question Type & Difficulty */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '20px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#4A4A4A', marginBottom: '6px' }}>Question Type</label>
            <select
              value={questionType}
              onChange={(e) => {
                const val = e.target.value as 'mcq' | 'multi_select' | 'true_false';
                setQuestionType(val);
                if (val === 'true_false') {
                  setOptions([
                    { id: '1', text: 'True', is_correct: true },
                    { id: '2', text: 'False', is_correct: false },
                  ]);
                } else if (options.length < 4) {
                  setOptions([
                    { id: '1', text: '', is_correct: true },
                    { id: '2', text: '', is_correct: false },
                    { id: '3', text: '', is_correct: false },
                    { id: '4', text: '', is_correct: false },
                  ]);
                }
              }}
              style={{ width: '100%', height: '42px', padding: '0 12px', borderRadius: '8px', border: '1px solid #E2E2E2', fontSize: '14px', backgroundColor: '#FFF' }}
            >
              <option value="mcq">Single Choice (MCQ)</option>
              <option value="multi_select">Multiple Choice</option>
              <option value="true_false">True / False</option>
            </select>
          </div>

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
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#4A4A4A', marginBottom: '6px' }}>Points / Marks</label>
            <input
              type="number"
              min={1}
              value={points}
              onChange={(e) => setPoints(Number(e.target.value) || 1)}
              style={{ width: '100%', height: '42px', padding: '0 12px', borderRadius: '8px', border: '1px solid #E2E2E2', fontSize: '14px', boxSizing: 'border-box' }}
            />
          </div>
        </div>

        {/* Content */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#4A4A4A', marginBottom: '6px' }}>Question Content *</label>
          <textarea
            rows={4}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Type your question here..."
            style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #E2E2E2', fontSize: '14px', fontFamily: 'inherit', boxSizing: 'border-box' }}
          />
        </div>

        {/* Options */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#4A4A4A', marginBottom: '8px' }}>
            Answer Options (Select the correct answer) *
          </label>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {options.map((opt, idx) => (
              <div key={opt.id} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <input
                  type={questionType === 'multi_select' ? 'checkbox' : 'radio'}
                  name="correct_option"
                  checked={opt.is_correct}
                  onChange={() => handleCorrectToggle(idx)}
                  style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#017DF9' }}
                />
                <span style={{ fontSize: '14px', fontWeight: 600, color: '#727272', width: '20px' }}>
                  {String.fromCharCode(65 + idx)}.
                </span>
                <input
                  type="text"
                  value={opt.text}
                  onChange={(e) => handleOptionChange(idx, e.target.value)}
                  placeholder={`Option ${String.fromCharCode(65 + idx)} text`}
                  style={{ flex: 1, height: '40px', padding: '0 12px', borderRadius: '8px', border: '1px solid #E2E2E2', fontSize: '14px' }}
                />
                {opt.is_correct && (
                  <span style={{ color: '#017DF9', fontSize: '12px', fontWeight: 600 }}>✓ Correct</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Explanation */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#4A4A4A', marginBottom: '6px' }}>Explanation (Optional)</label>
          <textarea
            rows={2}
            value={explanation}
            onChange={(e) => setExplanation(e.target.value)}
            placeholder="Explain why this answer is correct..."
            style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #E2E2E2', fontSize: '14px', fontFamily: 'inherit', boxSizing: 'border-box' }}
          />
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
              placeholder="e.g. Algorithms, Data Structures"
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
              <span key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '16px', backgroundColor: '#E9F4FF', color: '#017DF9', fontSize: '12px', fontWeight: 500 }}>
                {t}
                <button type="button" onClick={() => handleRemoveTag(t)} style={{ background: 'none', border: 'none', color: '#017DF9', cursor: 'pointer', padding: 0 }}>×</button>
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
            {submitting ? 'Saving...' : 'Save Question'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function AddQuestionPage() {
  return (
    <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center' }}>Loading form...</div>}>
      <AddQuestionContent />
    </Suspense>
  );
}
