'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { assessments } from '@/lib/api';
import type { Attempt, Question } from '@/lib/types';

export default function TakeAssessmentPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();

  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number | number[]>>({});
  const [remainingSecs, setRemainingSecs] = useState<number>(1800);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    assessments
      .start(id)
      .then((res) => {
        setAttempt(res.attempt);
        setQuestions(res.questions || []);
        setRemainingSecs((res.duration_mins || 30) * 60);
      })
      .catch((err) => {
        console.error('Failed to start assessment:', err);
        setError(err instanceof Error ? err.message : 'Failed to start assessment');
      })
      .finally(() => setLoading(false));
  }, [id]);

  // Countdown timer
  useEffect(() => {
    if (remainingSecs <= 0) {
      handleSubmit();
      return;
    }
    const interval = setInterval(() => {
      setRemainingSecs((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [remainingSecs]);

  const handleSelectOption = (qId: string, optIdx: number) => {
    setAnswers((prev) => ({
      ...prev,
      [qId]: optIdx,
    }));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      if (attempt?.id) {
        await assessments.submitAttempt(attempt.id, answers);
      }
      setToastMessage('Test submitted successfully!');
      setTimeout(() => router.push('/assessment'), 1200);
    } catch {
      setToastMessage('Test submitted!');
      setTimeout(() => router.push('/assessment'), 1200);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '60px' }}>Loading examination environment...</div>;
  }

  if (error || questions.length === 0) {
    return (
      <div style={{ maxWidth: '640px', margin: '60px auto', padding: '32px', textAlign: 'center' }} className="card">
        <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#DC2626', marginBottom: '8px' }}>
          {error || 'No Questions Available'}
        </h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '20px', fontSize: '14px' }}>
          {error ? 'Could not launch examination session.' : 'This assessment has no questions configured.'}
        </p>
        <button className="btn btn--primary" onClick={() => router.push('/assessment')}>
          Back to Assessments
        </button>
      </div>
    );
  }

  const q = questions[currentIdx];

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto' }}>
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            top: '24px',
            right: '24px',
            backgroundColor: '#10b981',
            color: '#ffffff',
            padding: '12px 24px',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: 9999,
            fontFamily: '"Public Sans", sans-serif',
            fontSize: '14px',
            fontWeight: 500,
          }}
        >
          {toastMessage}
        </div>
      )}

      {/* Top Exam Header */}
      <div
        className="card"
        style={{
          padding: '16px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          background: '#1e293b',
          color: 'white',
        }}
      >
        <div>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>AWS Certification Mock Exam</h2>
          <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>
            Question {currentIdx + 1} of {questions.length}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>TIME REMAINING</div>
            <div
              style={{
                fontFamily: 'monospace',
                fontSize: '1.4rem',
                fontWeight: 700,
                color: remainingSecs < 300 ? '#f87171' : '#4ade80',
              }}
            >
              ⏱ {formatTime(remainingSecs)}
            </div>
          </div>

          <button className="btn btn--danger" onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Submitting...' : 'Submit Test'}
          </button>
        </div>
      </div>

      {/* Main Question Card */}
      {q && (
        <div className="card" style={{ marginBottom: '24px' }}>
          <div className="card-body">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
              <span className="badge badge--info">{q.question_type}</span>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                Points: {q.points}
              </span>
            </div>

            <h3 style={{ fontSize: '1.15rem', fontWeight: 600, marginBottom: '24px', lineHeight: 1.5 }}>
              {currentIdx + 1}. {q.content}
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {q.options?.map((opt, optIdx) => {
                const isSelected = answers[q.id] === optIdx;
                return (
                  <div
                    key={optIdx}
                    onClick={() => handleSelectOption(q.id, optIdx)}
                    style={{
                      padding: '14px 18px',
                      borderRadius: 'var(--radius-md)',
                      border: isSelected ? '2px solid var(--brand-accent)' : '1px solid var(--border-light)',
                      background: isSelected ? 'var(--brand-accent-light)' : 'var(--bg-card)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      transition: 'all var(--transition-fast)',
                    }}
                  >
                    <div
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: 'var(--radius-full)',
                        border: isSelected ? '6px solid var(--brand-accent)' : '2px solid var(--border-medium)',
                        background: 'white',
                      }}
                    />
                    <span style={{ fontWeight: isSelected ? 600 : 400 }}>{opt.text}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button
          className="btn btn--secondary"
          disabled={currentIdx === 0}
          onClick={() => setCurrentIdx((i) => i - 1)}
        >
          ← Previous
        </button>

        <div style={{ display: 'flex', gap: '8px' }}>
          {questions.map((_, i) => (
            <button
              key={i}
              className={`pagination-btn ${i === currentIdx ? 'pagination-btn--active' : ''}`}
              style={{
                background: answers[questions[i]?.id] !== undefined && i !== currentIdx ? '#dcfce7' : undefined,
              }}
              onClick={() => setCurrentIdx(i)}
            >
              {i + 1}
            </button>
          ))}
        </div>

        <button
          className="btn btn--primary"
          disabled={currentIdx === questions.length - 1}
          onClick={() => setCurrentIdx((i) => i + 1)}
        >
          Next →
        </button>
      </div>
    </div>
  );
}
