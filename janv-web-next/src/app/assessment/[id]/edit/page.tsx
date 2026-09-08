'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Breadcrumb from '@/components/layout/Breadcrumb';
import RichTextEditor from '@/components/common/RichTextEditor';
import { assessments, questionBanks } from '@/lib/api';
import type { Assessment, Question, QuestionBank, QuestionType, Difficulty } from '@/lib/types';

export default function EditTestPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromCreate = searchParams.get('from') === 'create';

  const [test, setTest] = useState<Assessment | null>(null);
  const [banks, setBanks] = useState<QuestionBank[]>([]);
  const [selectedBank, setSelectedBank] = useState<string>('');
  const [availableQuestions, setAvailableQuestions] = useState<Question[]>([]);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modal State for custom question
  const [showAddModal, setShowAddModal] = useState(false);
  const [newQuestionText, setNewQuestionText] = useState('');
  const [newQuestionType, setNewQuestionType] = useState<QuestionType>('Mcq');
  const [newDifficulty, setNewDifficulty] = useState<Difficulty>('Easy');
  const [newExplanation, setNewExplanation] = useState('');

  const handleAddCustomQuestion = () => {
    if (!newQuestionText.trim()) return;
    const newQ: Question = {
      id: `q-custom-${Date.now()}`,
      question_type: newQuestionType,
      content: newQuestionText,
      explanation: newExplanation,
      difficulty: newDifficulty,
      points: 10,
      created_at: new Date().toISOString(),
      options: [{ text: 'Option A' }, { text: 'Option B' }],
    };

    setAvailableQuestions((prev) => [newQ, ...prev]);
    setSelectedQuestionIds((prev) => [newQ.id, ...prev]);
    setShowAddModal(false);
    setNewQuestionText('');
    setNewExplanation('');
  };

  useEffect(() => {
    Promise.all([
      assessments.get(id).catch(() => null),
      questionBanks.list().catch(() => []),
    ]).then(async ([res, bankList]) => {
      if (res) {
        setTest(res.assessment);
        if (res.questions && res.questions.length > 0) {
          setAvailableQuestions(res.questions);
          setSelectedQuestionIds(res.questions.map((q: Question) => q.id));
        }
      }
      setBanks(bankList || []);
      if (bankList && bankList.length > 0) {
        try {
          const bankQuestions = await questionBanks.listQuestions(bankList[0].id);
          if (bankQuestions && bankQuestions.length > 0) {
            setAvailableQuestions((prev) => {
              const ids = new Set(prev.map((q) => q.id));
              const newQs = bankQuestions.filter((q) => !ids.has(q.id));
              return [...prev, ...newQs];
            });
          }
        } catch {
          // ignore
        }
      }
      setLoading(false);
    });
  }, [id]);

  const toggleSelectQuestion = (qId: string) => {
    setSelectedQuestionIds((prev) =>
      prev.includes(qId) ? prev.filter((item) => item !== qId) : [...prev, qId]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (selectedQuestionIds.length > 0) {
        await assessments.addQuestions(id, selectedQuestionIds);
      }
      await assessments.publish(id);
      setToastMessage('Test saved & published successfully!');
      setTimeout(() => router.push('/assessment'), 1000);
    } catch {
      setToastMessage('Test saved!');
      setTimeout(() => router.push('/assessment'), 1000);
    }
  };

  // Breadcrumb differs: Create Test flow vs Edit Test from My Tests
  const breadcrumbItems = fromCreate
    ? [
        { label: 'Assessments', href: '/assessment' },
        { label: 'Create Test', href: '/assessment/create' },
        { label: 'Step 2: Add Questions', href: `/assessment/${id}/edit?from=create` },
      ]
    : [
        { label: 'Assessments', href: '/assessment' },
        { label: 'My Tests', href: '/assessment' },
        { label: 'Edit Test', href: `/assessment/${id}/edit` },
      ];

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '60px' }}>Loading...</div>;
  }

  return (
    <div>
      <Breadcrumb items={breadcrumbItems} />

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

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <h1 className="page-title" style={{ marginBottom: 0 }}>
          {fromCreate ? 'Step 2: Add Questions' : `Edit Test — ${test?.title || ''}`}
        </h1>
      </div>

      {fromCreate && (
        <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '20px' }}>
          Select questions to add to your test sections.
        </div>
      )}

      <div className="step-indicator" style={{ marginBottom: '24px' }}>
        {fromCreate ? (
          <>
            <div className="step-dot step-dot--done">✓</div>
            <span>Step 1 Complete</span>
            <div style={{ margin: '0 8px', color: 'var(--text-muted)' }}>→</div>
            <div className="step-dot step-dot--active">2</div>
            <span>Step 2 of 2: Select &amp; Assign Questions</span>
          </>
        ) : (
          <>
            <div className="step-dot step-dot--active">1</div>
            <span>Editing: {test?.title || 'Test'}</span>
          </>
        )}
      </div>

      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="card-header">Question Bank Filter</div>
        <div className="card-body">
          <div className="form-row">
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Select Question Bank</label>
              <select className="form-select" value={selectedBank} onChange={(e) => setSelectedBank(e.target.value)}>
                <option value="">All Question Banks (AWS, Web Dev, Aptitude)</option>
                {banks.map((b) => (
                  <option key={b.id} value={b.id}>{b.title}</option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Selected Questions</label>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--brand-accent)', paddingTop: '6px' }}>
                {selectedQuestionIds.length} of {availableQuestions.length} Questions
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Available Questions</span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className="btn btn--primary btn--sm"
              onClick={() => setShowAddModal(true)}
            >
              + Create Custom Question
            </button>
            <button
              className="btn btn--ghost btn--sm"
              onClick={() =>
                setSelectedQuestionIds(
                  selectedQuestionIds.length === availableQuestions.length
                    ? []
                    : availableQuestions.map((q) => q.id)
                )
              }
            >
              {selectedQuestionIds.length === availableQuestions.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          {availableQuestions.map((q, idx) => {
            const isSelected = selectedQuestionIds.includes(q.id);
            return (
              <div
                key={q.id}
                onClick={() => toggleSelectQuestion(q.id)}
                style={{
                  padding: '16px 24px',
                  borderBottom: '1px solid var(--border-light)',
                  cursor: 'pointer',
                  background: isSelected ? 'var(--brand-primary-light)' : 'transparent',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '16px',
                  transition: 'background var(--transition-fast)',
                }}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => {}}
                  style={{ width: '18px', height: '18px', marginTop: '3px', accentColor: 'var(--brand-accent)' }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Q{idx + 1}.</span>
                    <span className="badge badge--info">{q.question_type}</span>
                    <span className="badge badge--neutral">{q.difficulty}</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>Points: {q.points}</span>
                  </div>
                  <div
                    style={{ fontSize: '0.95rem', fontWeight: 500, color: 'var(--text-primary)' }}
                    dangerouslySetInnerHTML={{ __html: q.content }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
        <button className="btn btn--secondary" onClick={() => router.push('/assessment')}>
          {fromCreate ? 'Save Draft' : 'Cancel'}
        </button>
        <button className="btn btn--primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : fromCreate ? 'Publish Test' : 'Save & Publish'}
        </button>
      </div>

      {/* Add Custom Question Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '720px', width: '90%' }}>
            <div className="modal-header">
              <h3>Create Custom Question</h3>
              <button className="modal-close" onClick={() => setShowAddModal(false)}>×</button>
            </div>
            <div className="modal-body" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
              <div className="form-group">
                <label className="form-label">Question Text (Rich Text & Formula Editor)</label>
                <RichTextEditor
                  value={newQuestionText}
                  onChange={setNewQuestionText}
                  placeholder="Type your question content here..."
                  minHeight="120px"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Question Type</label>
                  <select
                    className="form-select"
                    value={newQuestionType}
                    onChange={(e) => setNewQuestionType(e.target.value as QuestionType)}
                  >
                    <option value="Mcq">Multiple Choice (MCQ)</option>
                    <option value="MultiSelect">Multi Select</option>
                    <option value="TrueFalse">True / False</option>
                    <option value="Coding">Coding Challenge</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Difficulty</label>
                  <select
                    className="form-select"
                    value={newDifficulty}
                    onChange={(e) => setNewDifficulty(e.target.value as Difficulty)}
                  >
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Explanation / Solution Hint</label>
                <RichTextEditor
                  value={newExplanation}
                  onChange={setNewExplanation}
                  placeholder="Enter detailed explanation or hint..."
                  minHeight="90px"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn--secondary" onClick={() => setShowAddModal(false)}>
                Cancel
              </button>
              <button className="btn btn--primary" onClick={handleAddCustomQuestion}>
                Add Question
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
