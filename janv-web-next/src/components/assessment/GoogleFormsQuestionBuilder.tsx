'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Breadcrumb from '@/components/layout/Breadcrumb';

export type QuestionType = 'mcq' | 'multi_select' | 'true_false' | 'short_answer' | 'coding';
export type Difficulty = 'easy' | 'medium' | 'hard';

export interface OptionItem {
  id: string;
  text: string;
  is_correct: boolean;
}

export interface TestCaseItem {
  id: string;
  input: string;
  output: string;
  is_sample: boolean;
}

export interface FormQuestionCard {
  id: string;
  type: QuestionType;
  content: string;
  difficulty: Difficulty;
  points: number;
  explanation: string;
  tags: string[];
  required: boolean;
  options: OptionItem[];
  // Coding specific
  codingTitle?: string;
  starterCode?: string;
  language?: string;
  timeLimitMs?: number;
  memoryLimitKb?: number;
  testCases?: TestCaseItem[];
  // Short answer specific
  acceptedAnswers?: string[];
  // UI state
  isAnswerKeyMode?: boolean;
}

interface GoogleFormsQuestionBuilderProps {
  initialAssessmentId?: string;
  initialSectionId?: string;
  initialSectionName?: string;
  initialSectionType?: string;
  initialTestCode?: string;
  initialTestName?: string;
}

const DEFAULT_OPTIONS: OptionItem[] = [
  { id: 'opt-1', text: 'Option 1', is_correct: true },
  { id: 'opt-2', text: 'Option 2', is_correct: false },
  { id: 'opt-3', text: 'Option 3', is_correct: false },
  { id: 'opt-4', text: 'Option 4', is_correct: false },
];

function createNewCard(type: QuestionType = 'mcq'): FormQuestionCard {
  const cardId = `q-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  if (type === 'true_false') {
    return {
      id: cardId,
      type: 'true_false',
      content: '',
      difficulty: 'easy',
      points: 1,
      explanation: '',
      tags: [],
      required: true,
      options: [
        { id: `opt-${Date.now()}-1`, text: 'True', is_correct: true },
        { id: `opt-${Date.now()}-2`, text: 'False', is_correct: false },
      ],
    };
  }
  if (type === 'short_answer') {
    return {
      id: cardId,
      type: 'short_answer',
      content: '',
      difficulty: 'medium',
      points: 2,
      explanation: '',
      tags: [],
      required: true,
      options: [],
      acceptedAnswers: [''],
    };
  }
  if (type === 'coding') {
    return {
      id: cardId,
      type: 'coding',
      content: '',
      difficulty: 'medium',
      points: 10,
      explanation: '',
      tags: ['coding'],
      required: true,
      options: [],
      codingTitle: 'Coding Challenge',
      language: 'cpp',
      starterCode: '#include <iostream>\nusing namespace std;\n\nint main() {\n    // Write your code here\n    return 0;\n}',
      timeLimitMs: 1000,
      memoryLimitKb: 256 * 1024,
      testCases: [
        { id: 'tc-1', input: '5\n1 2 3 4 5', output: '15', is_sample: true },
        { id: 'tc-2', input: '3\n10 20 30', output: '60', is_sample: false },
      ],
    };
  }
  return {
    id: cardId,
    type: type,
    content: '',
    difficulty: 'medium',
    points: 1,
    explanation: '',
    tags: [],
    required: true,
    options: [
      { id: `opt-${Date.now()}-1`, text: 'Option 1', is_correct: true },
      { id: `opt-${Date.now()}-2`, text: 'Option 2', is_correct: false },
      { id: `opt-${Date.now()}-3`, text: 'Option 3', is_correct: false },
      { id: `opt-${Date.now()}-4`, text: 'Option 4', is_correct: false },
    ],
  };
}

export default function GoogleFormsQuestionBuilder({
  initialAssessmentId,
  initialSectionId,
  initialSectionName,
  initialSectionType,
  initialTestCode,
  initialTestName,
}: GoogleFormsQuestionBuilderProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const assessmentId = initialAssessmentId || searchParams.get('assessmentId') || searchParams.get('id') || '';
  const sectionId = initialSectionId || searchParams.get('sectionId') || '';
  const sectionName = initialSectionName || searchParams.get('sectionName') || 'Main Section';
  const sectionType = initialSectionType || searchParams.get('sectionType') || '1';
  const testCode = initialTestCode || searchParams.get('testCode') || '';
  const testName = initialTestName || searchParams.get('testName') || 'Assessment';

  const isDefaultCoding = sectionType === '2' || sectionType.toLowerCase().includes('code');

  const [cards, setCards] = useState<FormQuestionCard[]>(() => [
    createNewCard(isDefaultCoding ? 'coding' : 'mcq'),
  ]);
  const [activeCardId, setActiveCardId] = useState<string>(cards[0]?.id || '');
  const [viewMode, setViewMode] = useState<'editor' | 'preview'>('editor');
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [tagInputMap, setTagInputMap] = useState<Record<string, string>>({});

  // Student preview simulation state
  const [studentAnswers, setStudentAnswers] = useState<Record<string, any>>({});
  const [previewSubmitted, setPreviewSubmitted] = useState(false);
  const [previewScore, setPreviewScore] = useState<{ earned: number; total: number } | null>(null);

  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Restore draft from localStorage if available
  useEffect(() => {
    const draftKey = `janv_custom_q_draft_${assessmentId || 'standalone'}_${sectionId || 'default'}`;
    const saved = localStorage.getItem(draftKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setCards(parsed);
          setActiveCardId(parsed[0].id);
        }
      } catch {
        // ignore invalid JSON
      }
    }
  }, [assessmentId, sectionId]);

  // Auto-save draft to localStorage
  useEffect(() => {
    const draftKey = `janv_custom_q_draft_${assessmentId || 'standalone'}_${sectionId || 'default'}`;
    if (cards.length > 0) {
      localStorage.setItem(draftKey, JSON.stringify(cards));
    }
  }, [cards, assessmentId, sectionId]);

  const totalPoints = cards.reduce((sum, c) => sum + (c.points || 0), 0);

  // Card Management
  const handleAddCard = (type: QuestionType = 'mcq') => {
    const newCard = createNewCard(type);
    setCards((prev) => [...prev, newCard]);
    setActiveCardId(newCard.id);
    setTimeout(() => {
      cardRefs.current[newCard.id]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  };

  const handleDuplicateCard = (cardId: string) => {
    const idx = cards.findIndex((c) => c.id === cardId);
    if (idx === -1) return;
    const target = cards[idx];
    const clone: FormQuestionCard = {
      ...target,
      id: `q-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      content: target.content ? `${target.content} (Copy)` : '',
      options: target.options.map((opt) => ({
        ...opt,
        id: `opt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      })),
      testCases: target.testCases?.map((tc) => ({
        ...tc,
        id: `tc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      })),
      isAnswerKeyMode: false,
    };
    const nextCards = [...cards];
    nextCards.splice(idx + 1, 0, clone);
    setCards(nextCards);
    setActiveCardId(clone.id);
  };

  const handleDeleteCard = (cardId: string) => {
    if (cards.length <= 1) {
      setErrorMsg('At least one question is required.');
      setTimeout(() => setErrorMsg(null), 3000);
      return;
    }
    const filtered = cards.filter((c) => c.id !== cardId);
    setCards(filtered);
    if (activeCardId === cardId) {
      setActiveCardId(filtered[0]?.id || '');
    }
  };

  const handleMoveCard = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= cards.length) return;
    const nextCards = [...cards];
    const temp = nextCards[index];
    nextCards[index] = nextCards[targetIndex];
    nextCards[targetIndex] = temp;
    setCards(nextCards);
  };

  const updateCard = (cardId: string, updater: (card: FormQuestionCard) => FormQuestionCard) => {
    setCards((prev) => prev.map((c) => (c.id === cardId ? updater(c) : c)));
  };

  // Option operations
  const handleAddOption = (cardId: string, customText?: string) => {
    updateCard(cardId, (c) => {
      const nextNum = c.options.length + 1;
      const newOpt: OptionItem = {
        id: `opt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        text: customText || `Option ${nextNum}`,
        is_correct: c.options.length === 0,
      };
      return { ...c, options: [...c.options, newOpt] };
    });
  };

  const handleRemoveOption = (cardId: string, optId: string) => {
    updateCard(cardId, (c) => {
      if (c.options.length <= 2) return c;
      const remaining = c.options.filter((o) => o.id !== optId);
      // If removed option was correct, make first remaining option correct
      const hasCorrect = remaining.some((o) => o.is_correct);
      if (!hasCorrect && remaining.length > 0) {
        remaining[0].is_correct = true;
      }
      return { ...c, options: remaining };
    });
  };

  const handleOptionTextChange = (cardId: string, optId: string, text: string) => {
    updateCard(cardId, (c) => ({
      ...c,
      options: c.options.map((o) => (o.id === optId ? { ...o, text } : o)),
    }));
  };

  const handleOptionCorrectToggle = (cardId: string, optId: string) => {
    updateCard(cardId, (c) => {
      if (c.type === 'mcq' || c.type === 'true_false') {
        return {
          ...c,
          options: c.options.map((o) => ({ ...o, is_correct: o.id === optId })),
        };
      }
      // Multi-select / checkboxes
      return {
        ...c,
        options: c.options.map((o) => (o.id === optId ? { ...o, is_correct: !o.is_correct } : o)),
      };
    });
  };

  // Change Question Type
  const handleChangeQuestionType = (cardId: string, newType: QuestionType) => {
    updateCard(cardId, (c) => {
      if (newType === 'true_false') {
        return {
          ...c,
          type: newType,
          options: [
            { id: `opt-${Date.now()}-1`, text: 'True', is_correct: true },
            { id: `opt-${Date.now()}-2`, text: 'False', is_correct: false },
          ],
        };
      }
      if (newType === 'short_answer') {
        return {
          ...c,
          type: newType,
          options: [],
          acceptedAnswers: c.acceptedAnswers && c.acceptedAnswers.length > 0 ? c.acceptedAnswers : [''],
        };
      }
      if (newType === 'coding') {
        return {
          ...c,
          type: newType,
          options: [],
          codingTitle: c.codingTitle || c.content || 'Coding Challenge',
          starterCode: c.starterCode || '// Write solution here\n',
          testCases: c.testCases && c.testCases.length > 0 ? c.testCases : [
            { id: 'tc-1', input: '', output: '', is_sample: true },
          ],
        };
      }
      // MCQ or Multi-select
      const opts = c.options.length >= 2 ? c.options : DEFAULT_OPTIONS;
      return {
        ...c,
        type: newType,
        options: opts,
      };
    });
  };

  // Tag Management
  const handleAddTag = (cardId: string) => {
    const rawTag = tagInputMap[cardId]?.trim();
    if (!rawTag) return;
    updateCard(cardId, (c) => {
      if (c.tags.includes(rawTag)) return c;
      return { ...c, tags: [...c.tags, rawTag] };
    });
    setTagInputMap((prev) => ({ ...prev, [cardId]: '' }));
  };

  const handleRemoveTag = (cardId: string, tagToRemove: string) => {
    updateCard(cardId, (c) => ({
      ...c,
      tags: c.tags.filter((t) => t !== tagToRemove),
    }));
  };

  // Validate all cards before submission
  const validateForm = (): boolean => {
    for (let i = 0; i < cards.length; i++) {
      const card = cards[i];
      if (!card.content.trim()) {
        setErrorMsg(`Question #${i + 1} is missing a question prompt/title.`);
        setActiveCardId(card.id);
        return false;
      }
      if (card.type === 'mcq' || card.type === 'multi_select') {
        if (card.options.length < 2) {
          setErrorMsg(`Question #${i + 1} must have at least 2 options.`);
          setActiveCardId(card.id);
          return false;
        }
        const emptyOpt = card.options.find((o) => !o.text.trim());
        if (emptyOpt) {
          setErrorMsg(`Question #${i + 1} has an empty option.`);
          setActiveCardId(card.id);
          return false;
        }
        const hasCorrect = card.options.some((o) => o.is_correct);
        if (!hasCorrect) {
          setErrorMsg(`Question #${i + 1} requires at least one correct answer marked in Answer Key.`);
          setActiveCardId(card.id);
          return false;
        }
      }
      if (card.type === 'coding') {
        if (!card.testCases || card.testCases.length === 0) {
          setErrorMsg(`Coding Question #${i + 1} must have at least 1 testcase.`);
          setActiveCardId(card.id);
          return false;
        }
      }
    }
    return true;
  };

  // Submit all questions
  const handleSaveAll = async () => {
    if (!validateForm()) return;

    try {
      setSaving(true);
      setErrorMsg(null);
      setSuccessMsg(null);

      const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');

      // Format payload
      const formattedQuestions = cards.map((c) => {
        if (c.type === 'coding') {
          return {
            question_type: 'coding',
            content: `${c.codingTitle || 'Coding Challenge'}\n\n${c.content}`,
            options: {
              title: c.codingTitle || 'Coding Challenge',
              language: c.language || 'cpp',
              starter_code: c.starterCode || '',
              time_limit_ms: c.timeLimitMs || 1000,
              memory_limit_kb: c.memoryLimitKb || 256 * 1024,
              test_cases: c.testCases || [],
            },
            explanation: c.explanation.trim() || undefined,
            difficulty: c.difficulty,
            tags: c.tags.length > 0 ? c.tags : undefined,
            points: c.points || 10,
            assessment_id: assessmentId || undefined,
            section_id: sectionId || undefined,
          };
        }

        if (c.type === 'short_answer') {
          return {
            question_type: 'mcq',
            content: c.content.trim(),
            options: {
              type: 'short_answer',
              accepted_answers: c.acceptedAnswers || [],
            },
            explanation: c.explanation.trim() || undefined,
            difficulty: c.difficulty,
            tags: c.tags.length > 0 ? c.tags : undefined,
            points: c.points || 2,
            assessment_id: assessmentId || undefined,
            section_id: sectionId || undefined,
          };
        }

        // MCQ / Multi-select / True-False
        return {
          question_type: c.type,
          content: c.content.trim(),
          options: c.options.map((opt, idx) => ({
            id: String.fromCharCode(65 + idx), // A, B, C, D
            input: opt.text.trim(),
            is_correct: opt.is_correct,
            isAnswer: opt.is_correct ? 1 : 0,
          })),
          explanation: c.explanation.trim() || undefined,
          difficulty: c.difficulty,
          tags: c.tags.length > 0 ? c.tags : undefined,
          points: c.points || 1,
          assessment_id: assessmentId || undefined,
          section_id: sectionId || undefined,
        };
      });

      const res = await fetch('/api/assessments/questions/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          questions: formattedQuestions,
          assessment_id: assessmentId || undefined,
          section_id: sectionId || undefined,
        }),
      });

      if (!res.ok) {
        // Fallback: iterate and save each question if batch endpoint is not available
        for (const q of formattedQuestions) {
          const singleRes = await fetch('/api/assessments/questions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify(q),
          });
          if (!singleRes.ok) {
            const errJson = await singleRes.json().catch(() => ({}));
            throw new Error(errJson.message || 'Failed to create questions.');
          }
        }
      }

      // Clear draft
      const draftKey = `janv_custom_q_draft_${assessmentId || 'standalone'}_${sectionId || 'default'}`;
      localStorage.removeItem(draftKey);

      setSuccessMsg(`🎉 Successfully created and linked ${cards.length} question(s)!`);

      setTimeout(() => {
        if (assessmentId) {
          router.push(
            `/assessment/testQuestions?assessmentId=${assessmentId}&sectionId=${sectionId}&sectionName=${encodeURIComponent(sectionName)}&sectionType=${sectionType}&testCode=${testCode}&testName=${encodeURIComponent(testName)}`
          );
        } else {
          router.push('/assessment');
        }
      }, 1200);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Error creating questions');
    } finally {
      setSaving(false);
    }
  };

  // Student preview simulation submit
  const handleSimulateSubmit = () => {
    let earned = 0;
    let total = 0;

    cards.forEach((card) => {
      total += card.points || 0;
      const ans = studentAnswers[card.id];

      if (card.type === 'mcq' || card.type === 'true_false') {
        const correctOpt = card.options.find((o) => o.is_correct);
        if (correctOpt && ans === correctOpt.id) {
          earned += card.points || 0;
        }
      } else if (card.type === 'multi_select') {
        const correctIds = card.options.filter((o) => o.is_correct).map((o) => o.id);
        const userSelected: string[] = ans || [];
        const isMatch =
          correctIds.length === userSelected.length &&
          correctIds.every((id) => userSelected.includes(id));
        if (isMatch) {
          earned += card.points || 0;
        }
      } else if (card.type === 'short_answer') {
        const userText = (ans || '').trim().toLowerCase();
        const matches = (card.acceptedAnswers || []).some(
          (acc) => acc.trim().toLowerCase() === userText
        );
        if (matches && userText) {
          earned += card.points || 0;
        }
      } else if (card.type === 'coding') {
        if (ans && ans.length > 10) {
          earned += card.points || 0;
        }
      }
    });

    setPreviewScore({ earned, total });
    setPreviewSubmitted(true);
  };

  return (
    <div style={{ maxWidth: '1080px', margin: '0 auto', padding: '24px 32px 80px', fontFamily: '"Public Sans", sans-serif' }}>
      <Breadcrumb
        items={[
          { label: 'Assessments', href: '/assessment' },
          { label: 'My Tests', href: '/assessment/mytests' },
          { label: testName || 'Edit Test', href: assessmentId ? `/assessment/testQuestions?assessmentId=${assessmentId}&sectionId=${sectionId}&testCode=${testCode}` : '#' },
          { label: 'Custom Question Builder', href: '#' },
        ]}
      />

      {/* Top Banner & Mode Switcher */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: '28px',
          marginBottom: '20px',
          backgroundColor: '#FFFFFF',
          padding: '16px 24px',
          borderRadius: '14px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          border: '1px solid #EAEAEA',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span
              style={{
                backgroundColor: '#EDE9FE',
                color: '#6D28D9',
                fontSize: '12px',
                fontWeight: 700,
                padding: '4px 10px',
                borderRadius: '20px',
                letterSpacing: '0.5px',
                textTransform: 'uppercase',
              }}
            >
              Forms Builder
            </span>
            {testCode && (
              <span style={{ fontSize: '13px', color: '#6B7280', fontWeight: 500 }}>
                Code: <strong style={{ color: '#111827' }}>{testCode}</strong>
              </span>
            )}
            <span style={{ fontSize: '13px', color: '#9CA3AF' }}>•</span>
            <span style={{ fontSize: '13px', color: '#374151', fontWeight: 600 }}>
              Section: {sectionName}
            </span>
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#1F2937', margin: '6px 0 0' }}>
            Custom Question Form
          </h1>
        </div>

        {/* View mode toggle & stats */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              display: 'flex',
              backgroundColor: '#F3F4F6',
              padding: '4px',
              borderRadius: '10px',
              gap: '4px',
            }}
          >
            <button
              type="button"
              onClick={() => { setViewMode('editor'); setPreviewSubmitted(false); }}
              style={{
                padding: '6px 14px',
                fontSize: '13px',
                fontWeight: 600,
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                backgroundColor: viewMode === 'editor' ? '#FFFFFF' : 'transparent',
                color: viewMode === 'editor' ? '#1E40AF' : '#6B7280',
                boxShadow: viewMode === 'editor' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              ✏️ Editor
            </button>
            <button
              type="button"
              onClick={() => { setViewMode('preview'); setPreviewSubmitted(false); }}
              style={{
                padding: '6px 14px',
                fontSize: '13px',
                fontWeight: 600,
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                backgroundColor: viewMode === 'preview' ? '#FFFFFF' : 'transparent',
                color: viewMode === 'preview' ? '#1E40AF' : '#6B7280',
                boxShadow: viewMode === 'preview' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              👁 Student Preview
            </button>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '6px 14px',
              backgroundColor: '#F9FAFB',
              border: '1px solid #E5E7EB',
              borderRadius: '10px',
            }}
          >
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '11px', color: '#6B7280', fontWeight: 500, textTransform: 'uppercase' }}>
                Questions
              </div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#111827' }}>
                {cards.length}
              </div>
            </div>
            <div style={{ height: '24px', width: '1px', backgroundColor: '#E5E7EB' }} />
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '11px', color: '#6B7280', fontWeight: 500, textTransform: 'uppercase' }}>
                Total Points
              </div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#059669' }}>
                {totalPoints} pts
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div
          style={{
            padding: '14px 20px',
            backgroundColor: '#ECFDF5',
            border: '1px solid #6EE7B7',
            borderRadius: '10px',
            color: '#065F46',
            marginBottom: '20px',
            fontSize: '14px',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div
          style={{
            padding: '14px 20px',
            backgroundColor: '#FEF2F2',
            border: '1px solid #FCA5A5',
            borderRadius: '10px',
            color: '#991B1B',
            marginBottom: '20px',
            fontSize: '14px',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          ⚠️ {errorMsg}
        </div>
      )}

      {/* VIEW MODE: STUDENT PREVIEW SIMULATION */}
      {viewMode === 'preview' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '14px',
              padding: '24px 32px',
              border: '1px solid #E5E7EB',
              borderTop: '6px solid #6366F1',
              boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
            }}
          >
            <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#111827', margin: '0 0 8px' }}>
              {testName || 'Interactive Assessment'}
            </h2>
            <p style={{ color: '#4B5563', fontSize: '14px', margin: 0 }}>
              Section: <strong>{sectionName}</strong> • {cards.length} Questions • Total {totalPoints} Points
            </p>
          </div>

          {cards.map((card, qIdx) => {
            const currentAns = studentAnswers[card.id];
            return (
              <div
                key={card.id}
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '12px',
                  padding: '24px 28px',
                  border: '1px solid #E5E7EB',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '16px', fontWeight: 700, color: '#1F2937' }}>
                      {qIdx + 1}. {card.content || 'Untitled Question'}
                    </span>
                    {card.required && <span style={{ color: '#EF4444', fontWeight: 700 }}>*</span>}
                  </div>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#6B7280', backgroundColor: '#F3F4F6', padding: '4px 10px', borderRadius: '6px' }}>
                    {card.points} {card.points === 1 ? 'pt' : 'pts'}
                  </span>
                </div>

                {/* MCQ / True-False Options */}
                {(card.type === 'mcq' || card.type === 'true_false') && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {card.options.map((opt, optIdx) => {
                      const isSelected = currentAns === opt.id;
                      const isCorrect = opt.is_correct;
                      let optionBg = '#FAFAFA';
                      let optionBorder = '#E5E7EB';

                      if (previewSubmitted) {
                        if (isCorrect) {
                          optionBg = '#ECFDF5';
                          optionBorder = '#10B981';
                        } else if (isSelected && !isCorrect) {
                          optionBg = '#FEF2F2';
                          optionBorder = '#EF4444';
                        }
                      } else if (isSelected) {
                        optionBg = '#EFF6FF';
                        optionBorder = '#3B82F6';
                      }

                      return (
                        <label
                          key={opt.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            padding: '12px 16px',
                            borderRadius: '8px',
                            border: `1px solid ${optionBorder}`,
                            backgroundColor: optionBg,
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <input
                            type="radio"
                            name={`preview-q-${card.id}`}
                            checked={isSelected}
                            onChange={() => setStudentAnswers({ ...studentAnswers, [card.id]: opt.id })}
                            style={{ width: '18px', height: '18px', accentColor: '#2563EB', cursor: 'pointer' }}
                          />
                          <span style={{ fontWeight: 600, color: '#4B5563', fontSize: '14px', width: '20px' }}>
                            {String.fromCharCode(65 + optIdx)}.
                          </span>
                          <span style={{ fontSize: '14px', color: '#1F2937', flex: 1 }}>{opt.text}</span>
                          {previewSubmitted && isCorrect && (
                            <span style={{ fontSize: '12px', fontWeight: 600, color: '#059669' }}>✓ Correct</span>
                          )}
                          {previewSubmitted && isSelected && !isCorrect && (
                            <span style={{ fontSize: '12px', fontWeight: 600, color: '#DC2626' }}>✗ Incorrect</span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                )}

                {/* Multi-Select Options */}
                {card.type === 'multi_select' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {card.options.map((opt, optIdx) => {
                      const selectedList: string[] = currentAns || [];
                      const isSelected = selectedList.includes(opt.id);
                      const isCorrect = opt.is_correct;
                      let optionBg = '#FAFAFA';
                      let optionBorder = '#E5E7EB';

                      if (previewSubmitted) {
                        if (isCorrect) {
                          optionBg = '#ECFDF5';
                          optionBorder = '#10B981';
                        } else if (isSelected && !isCorrect) {
                          optionBg = '#FEF2F2';
                          optionBorder = '#EF4444';
                        }
                      } else if (isSelected) {
                        optionBg = '#EFF6FF';
                        optionBorder = '#3B82F6';
                      }

                      return (
                        <label
                          key={opt.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            padding: '12px 16px',
                            borderRadius: '8px',
                            border: `1px solid ${optionBorder}`,
                            backgroundColor: optionBg,
                            cursor: 'pointer',
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {
                              const updated = isSelected
                                ? selectedList.filter((id) => id !== opt.id)
                                : [...selectedList, opt.id];
                              setStudentAnswers({ ...studentAnswers, [card.id]: updated });
                            }}
                            style={{ width: '18px', height: '18px', accentColor: '#2563EB', cursor: 'pointer' }}
                          />
                          <span style={{ fontWeight: 600, color: '#4B5563', fontSize: '14px', width: '20px' }}>
                            {String.fromCharCode(65 + optIdx)}.
                          </span>
                          <span style={{ fontSize: '14px', color: '#1F2937', flex: 1 }}>{opt.text}</span>
                          {previewSubmitted && isCorrect && (
                            <span style={{ fontSize: '12px', fontWeight: 600, color: '#059669' }}>✓ Correct Answer</span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                )}

                {/* Short Answer Input */}
                {card.type === 'short_answer' && (
                  <div style={{ marginTop: '8px' }}>
                    <input
                      type="text"
                      placeholder="Type your answer here..."
                      value={currentAns || ''}
                      onChange={(e) => setStudentAnswers({ ...studentAnswers, [card.id]: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        borderRadius: '8px',
                        border: '1px solid #D1D5DB',
                        fontSize: '14px',
                      }}
                    />
                    {previewSubmitted && (
                      <div style={{ marginTop: '8px', fontSize: '13px', color: '#059669', fontWeight: 500 }}>
                        Accepted Answers: {card.acceptedAnswers?.join(', ')}
                      </div>
                    )}
                  </div>
                )}

                {/* Coding Challenge View */}
                {card.type === 'coding' && (
                  <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ fontSize: '13px', color: '#4B5563', backgroundColor: '#F3F4F6', padding: '12px', borderRadius: '8px' }}>
                      <strong>Language:</strong> {card.language?.toUpperCase()} • <strong>Time Limit:</strong> {card.timeLimitMs}ms • <strong>Memory:</strong> {(card.memoryLimitKb || 256 * 1024) / 1024}MB
                    </div>
                    <textarea
                      rows={6}
                      value={currentAns !== undefined ? currentAns : card.starterCode || ''}
                      onChange={(e) => setStudentAnswers({ ...studentAnswers, [card.id]: e.target.value })}
                      placeholder="Write your code solution here..."
                      style={{
                        width: '100%',
                        padding: '12px',
                        fontFamily: 'monospace',
                        fontSize: '13px',
                        backgroundColor: '#1E293B',
                        color: '#F8FAFC',
                        borderRadius: '8px',
                        border: '1px solid #334155',
                      }}
                    />
                    {card.testCases && card.testCases.length > 0 && (
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>Sample Test Cases:</div>
                        {card.testCases.filter((tc) => tc.is_sample).map((tc, tcIdx) => (
                          <div key={tc.id} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '12px', marginBottom: '6px' }}>
                            <div style={{ backgroundColor: '#F9FAFB', padding: '8px', borderRadius: '6px', border: '1px solid #E5E7EB' }}>
                              <strong>Input {tcIdx + 1}:</strong>
                              <pre style={{ margin: '4px 0 0', fontFamily: 'monospace' }}>{tc.input}</pre>
                            </div>
                            <div style={{ backgroundColor: '#F9FAFB', padding: '8px', borderRadius: '6px', border: '1px solid #E5E7EB' }}>
                              <strong>Expected Output:</strong>
                              <pre style={{ margin: '4px 0 0', fontFamily: 'monospace' }}>{tc.output}</pre>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Explanation feedback */}
                {previewSubmitted && card.explanation && (
                  <div style={{ marginTop: '14px', padding: '10px 14px', backgroundColor: '#F0FDF4', borderLeft: '4px solid #10B981', borderRadius: '6px', fontSize: '13px', color: '#065F46' }}>
                    <strong>Explanation:</strong> {card.explanation}
                  </div>
                )}
              </div>
            );
          })}

          {/* Test Submit Buttons & Score */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFFFFF', padding: '20px 28px', borderRadius: '12px', border: '1px solid #E5E7EB' }}>
            <button
              type="button"
              onClick={handleSimulateSubmit}
              style={{
                height: '42px',
                padding: '0 28px',
                backgroundColor: '#2563EB',
                color: '#FFFFFF',
                borderRadius: '8px',
                border: 'none',
                fontWeight: 600,
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              Test Submit & Grade
            </button>

            {previewScore && (
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#111827' }}>
                Simulated Score: <span style={{ color: '#059669' }}>{previewScore.earned}</span> / {previewScore.total} Points (
                {Math.round((previewScore.earned / Math.max(previewScore.total, 1)) * 100)}%)
              </div>
            )}
          </div>
        </div>
      ) : (
        /* VIEW MODE: GOOGLE FORMS EDITOR */
        <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
          {/* Main Cards Deck */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Form Header Card */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '14px',
                padding: '24px 28px',
                border: '1px solid #E5E7EB',
                borderTop: '8px solid #4F46E5',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              }}
            >
              <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#1F2937', margin: '0 0 6px' }}>
                {testName} — {sectionName}
              </h2>
              <p style={{ margin: 0, color: '#6B7280', fontSize: '14px' }}>
                Add and configure custom questions below. All questions support instant answer keys, difficulty scoring, and multi-option configurations.
              </p>
            </div>

            {/* Dynamic Question Cards */}
            {cards.map((card, qIdx) => {
              const isActive = activeCardId === card.id;

              return (
                <div
                  key={card.id}
                  ref={(el) => {
                    cardRefs.current[card.id] = el;
                  }}
                  onClick={() => setActiveCardId(card.id)}
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '14px',
                    padding: '24px 28px',
                    border: isActive ? '2px solid #6366F1' : '1px solid #E5E7EB',
                    borderLeft: isActive ? '8px solid #6366F1' : '1px solid #E5E7EB',
                    boxShadow: isActive ? '0 6px 20px rgba(99,102,241,0.08)' : '0 2px 6px rgba(0,0,0,0.03)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {/* Card Top Row: Question Title & Type Selector */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 220px', gap: '16px', alignItems: 'flex-start', marginBottom: '20px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: '#4F46E5', backgroundColor: '#EEF2FF', padding: '2px 8px', borderRadius: '4px' }}>
                          Question {qIdx + 1}
                        </span>
                        {card.tags.map((t) => (
                          <span key={t} style={{ fontSize: '11px', color: '#4B5563', backgroundColor: '#F3F4F6', padding: '2px 6px', borderRadius: '4px' }}>
                            #{t}
                          </span>
                        ))}
                      </div>
                      <input
                        type="text"
                        placeholder="Enter question title or prompt here..."
                        value={card.content}
                        onChange={(e) => updateCard(card.id, (c) => ({ ...c, content: e.target.value }))}
                        style={{
                          width: '100%',
                          fontSize: '16px',
                          fontWeight: 600,
                          color: '#111827',
                          padding: '10px 14px',
                          borderRadius: '8px',
                          border: '1px solid #E5E7EB',
                          backgroundColor: '#F9FAFB',
                          outline: 'none',
                        }}
                      />
                    </div>

                    {/* Question Type Selector */}
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#6B7280', marginBottom: '6px' }}>
                        Question Type
                      </label>
                      <select
                        value={card.type}
                        onChange={(e) => handleChangeQuestionType(card.id, e.target.value as QuestionType)}
                        style={{
                          width: '100%',
                          height: '42px',
                          padding: '0 12px',
                          borderRadius: '8px',
                          border: '1px solid #D1D5DB',
                          fontSize: '14px',
                          fontWeight: 500,
                          backgroundColor: '#FFFFFF',
                          color: '#1F2937',
                          cursor: 'pointer',
                        }}
                      >
                        <option value="mcq">🔘 Multiple Choice (Radio)</option>
                        <option value="multi_select">☑️ Checkboxes (Multi-Select)</option>
                        <option value="true_false">⚪ True / False</option>
                        <option value="short_answer">📝 Short Answer</option>
                        <option value="coding">💻 Coding Challenge</option>
                      </select>
                    </div>
                  </div>

                  {/* Card Body: Options / Inputs per Type */}

                  {/* MCQ & Multi-Select Option Editor */}
                  {(card.type === 'mcq' || card.type === 'multi_select' || card.type === 'true_false') && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                      {card.options.map((opt, optIdx) => {
                        const isAnswerKey = card.isAnswerKeyMode;

                        return (
                          <div
                            key={opt.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '12px',
                              padding: '8px 12px',
                              borderRadius: '8px',
                              backgroundColor: opt.is_correct && isAnswerKey ? '#ECFDF5' : '#FFFFFF',
                              border: opt.is_correct && isAnswerKey ? '1px solid #10B981' : '1px solid #F3F4F6',
                            }}
                          >
                            {/* Radio / Checkbox toggle */}
                            <button
                              type="button"
                              onClick={() => handleOptionCorrectToggle(card.id, opt.id)}
                              title={card.isAnswerKeyMode ? 'Click to set correct answer' : 'Toggle Answer Key mode to edit correct answers'}
                              style={{
                                width: '22px',
                                height: '22px',
                                borderRadius: card.type === 'multi_select' ? '4px' : '50%',
                                border: opt.is_correct ? '2px solid #059669' : '2px solid #D1D5DB',
                                backgroundColor: opt.is_correct ? '#059669' : '#FFFFFF',
                                color: '#FFFFFF',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '12px',
                                cursor: 'pointer',
                                flexShrink: 0,
                              }}
                            >
                              {opt.is_correct ? '✓' : ''}
                            </button>

                            {/* Option Letter Badge (A, B, C, D) */}
                            <span
                              style={{
                                fontSize: '12px',
                                fontWeight: 700,
                                color: opt.is_correct ? '#065F46' : '#6B7280',
                                backgroundColor: opt.is_correct ? '#D1FAE5' : '#F3F4F6',
                                padding: '3px 8px',
                                borderRadius: '4px',
                                minWidth: '24px',
                                textAlign: 'center',
                              }}
                            >
                              {String.fromCharCode(65 + optIdx)}
                            </span>

                            {/* Option Text Input */}
                            <input
                              type="text"
                              value={opt.text}
                              disabled={card.type === 'true_false'}
                              onChange={(e) => handleOptionTextChange(card.id, opt.id, e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && optIdx === card.options.length - 1 && card.type !== 'true_false') {
                                  e.preventDefault();
                                  handleAddOption(card.id);
                                }
                              }}
                              placeholder={`Option ${optIdx + 1}`}
                              style={{
                                flex: 1,
                                height: '38px',
                                padding: '0 12px',
                                borderRadius: '6px',
                                border: '1px solid #E5E7EB',
                                fontSize: '14px',
                                color: '#1F2937',
                                backgroundColor: card.type === 'true_false' ? '#F9FAFB' : '#FFFFFF',
                              }}
                            />

                            {/* Delete Option (x) */}
                            {card.type !== 'true_false' && card.options.length > 2 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveOption(card.id, opt.id)}
                                title="Remove option"
                                style={{
                                  width: '32px',
                                  height: '32px',
                                  borderRadius: '6px',
                                  border: 'none',
                                  backgroundColor: 'transparent',
                                  color: '#9CA3AF',
                                  cursor: 'pointer',
                                  fontSize: '18px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                ×
                              </button>
                            )}
                          </div>
                        );
                      })}

                      {/* Add Option Button Row */}
                      {card.type !== 'true_false' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px', paddingLeft: '40px' }}>
                          <button
                            type="button"
                            onClick={() => handleAddOption(card.id)}
                            style={{
                              fontSize: '13px',
                              fontWeight: 600,
                              color: '#2563EB',
                              backgroundColor: 'transparent',
                              border: 'none',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '6px 10px',
                              borderRadius: '6px',
                            }}
                          >
                            ➕ Add Option
                          </button>
                          <span style={{ color: '#D1D5DB' }}>or</span>
                          <button
                            type="button"
                            onClick={() => handleAddOption(card.id, 'Other...')}
                            style={{
                              fontSize: '13px',
                              fontWeight: 500,
                              color: '#4B5563',
                              backgroundColor: 'transparent',
                              border: 'none',
                              cursor: 'pointer',
                              padding: '6px 10px',
                            }}
                          >
                            Add &quot;Other&quot;
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Short Answer Editor */}
                  {card.type === 'short_answer' && (
                    <div style={{ padding: '16px', backgroundColor: '#F9FAFB', borderRadius: '8px', border: '1px solid #E5E7EB', marginBottom: '20px' }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>
                        Accepted Answers (Evaluated for grading):
                      </div>
                      {(card.acceptedAnswers || ['']).map((acc, accIdx) => (
                        <div key={accIdx} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                          <input
                            type="text"
                            value={acc}
                            placeholder="e.g. O(n log n)"
                            onChange={(e) => {
                              const nextAcc = [...(card.acceptedAnswers || [''])];
                              nextAcc[accIdx] = e.target.value;
                              updateCard(card.id, (c) => ({ ...c, acceptedAnswers: nextAcc }));
                            }}
                            style={{ flex: 1, height: '36px', padding: '0 12px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '14px' }}
                          />
                          {(card.acceptedAnswers || []).length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                const nextAcc = (card.acceptedAnswers || []).filter((_, idx) => idx !== accIdx);
                                updateCard(card.id, (c) => ({ ...c, acceptedAnswers: nextAcc }));
                              }}
                              style={{ width: '36px', height: '36px', border: 'none', background: 'transparent', color: '#EF4444', cursor: 'pointer', fontSize: '16px' }}
                            >
                              🗑
                            </button>
                          )}
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => updateCard(card.id, (c) => ({ ...c, acceptedAnswers: [...(c.acceptedAnswers || []), ''] }))}
                        style={{ fontSize: '12px', fontWeight: 600, color: '#2563EB', border: 'none', background: 'transparent', cursor: 'pointer', padding: '4px 0' }}
                      >
                        ➕ Add another acceptable answer
                      </button>
                    </div>
                  )}

                  {/* Coding Challenge Editor */}
                  {card.type === 'coding' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#4B5563', marginBottom: '4px' }}>Language</label>
                          <select
                            value={card.language || 'cpp'}
                            onChange={(e) => updateCard(card.id, (c) => ({ ...c, language: e.target.value }))}
                            style={{ width: '100%', height: '38px', padding: '0 10px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '13px' }}
                          >
                            <option value="cpp">C++ (GCC 14)</option>
                            <option value="python">Python 3.12</option>
                            <option value="java">Java 21</option>
                            <option value="javascript">JavaScript (Node.js)</option>
                            <option value="rust">Rust 1.75</option>
                          </select>
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#4B5563', marginBottom: '4px' }}>Time Limit (ms)</label>
                          <input
                            type="number"
                            value={card.timeLimitMs || 1000}
                            onChange={(e) => updateCard(card.id, (c) => ({ ...c, timeLimitMs: parseInt(e.target.value, 10) || 1000 }))}
                            style={{ width: '100%', height: '38px', padding: '0 10px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '13px' }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#4B5563', marginBottom: '4px' }}>Memory (MB)</label>
                          <input
                            type="number"
                            value={(card.memoryLimitKb || 256 * 1024) / 1024}
                            onChange={(e) => updateCard(card.id, (c) => ({ ...c, memoryLimitKb: (parseInt(e.target.value, 10) || 256) * 1024 }))}
                            style={{ width: '100%', height: '38px', padding: '0 10px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '13px' }}
                          />
                        </div>
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#4B5563', marginBottom: '4px' }}>Starter Code Template</label>
                        <textarea
                          rows={4}
                          value={card.starterCode || ''}
                          onChange={(e) => updateCard(card.id, (c) => ({ ...c, starterCode: e.target.value }))}
                          style={{ width: '100%', padding: '10px', fontFamily: 'monospace', fontSize: '13px', borderRadius: '6px', border: '1px solid #D1D5DB', backgroundColor: '#1E293B', color: '#F8FAFC' }}
                        />
                      </div>

                      {/* Test cases */}
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <span style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>Test Cases</span>
                          <button
                            type="button"
                            onClick={() => {
                              const newTc: TestCaseItem = {
                                id: `tc-${Date.now()}`,
                                input: '',
                                output: '',
                                is_sample: false,
                              };
                              updateCard(card.id, (c) => ({ ...c, testCases: [...(c.testCases || []), newTc] }));
                            }}
                            style={{ fontSize: '12px', fontWeight: 600, color: '#2563EB', background: 'transparent', border: 'none', cursor: 'pointer' }}
                          >
                            ➕ Add Test Case
                          </button>
                        </div>
                        {(card.testCases || []).map((tc, tcIdx) => (
                          <div key={tc.id} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 100px 32px', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                            <input
                              type="text"
                              placeholder={`Input ${tcIdx + 1}`}
                              value={tc.input}
                              onChange={(e) => {
                                const nextTcs = [...(card.testCases || [])];
                                nextTcs[tcIdx].input = e.target.value;
                                updateCard(card.id, (c) => ({ ...c, testCases: nextTcs }));
                              }}
                              style={{ height: '36px', padding: '0 10px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '13px' }}
                            />
                            <input
                              type="text"
                              placeholder="Expected Output"
                              value={tc.output}
                              onChange={(e) => {
                                const nextTcs = [...(card.testCases || [])];
                                nextTcs[tcIdx].output = e.target.value;
                                updateCard(card.id, (c) => ({ ...c, testCases: nextTcs }));
                              }}
                              style={{ height: '36px', padding: '0 10px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '13px' }}
                            />
                            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#4B5563', cursor: 'pointer' }}>
                              <input
                                type="checkbox"
                                checked={tc.is_sample}
                                onChange={(e) => {
                                  const nextTcs = [...(card.testCases || [])];
                                  nextTcs[tcIdx].is_sample = e.target.checked;
                                  updateCard(card.id, (c) => ({ ...c, testCases: nextTcs }));
                                }}
                              />
                              Sample
                            </label>
                            <button
                              type="button"
                              onClick={() => {
                                const nextTcs = (card.testCases || []).filter((_, idx) => idx !== tcIdx);
                                updateCard(card.id, (c) => ({ ...c, testCases: nextTcs }));
                              }}
                              style={{ width: '32px', height: '32px', border: 'none', background: 'transparent', color: '#EF4444', cursor: 'pointer', fontSize: '16px' }}
                            >
                              🗑
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Answer Key Drawer / Mode */}
                  {card.isAnswerKeyMode && (
                    <div
                      style={{
                        padding: '16px 20px',
                        backgroundColor: '#ECFDF5',
                        border: '1px solid #A7F3D0',
                        borderRadius: '10px',
                        marginBottom: '20px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '14px', fontWeight: 700, color: '#065F46' }}>
                            🎯 Answer Key & Points Settings
                          </span>
                          <span style={{ fontSize: '12px', color: '#047857' }}>
                            (Click option radios above to designate correct answer)
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <label style={{ fontSize: '13px', fontWeight: 600, color: '#065F46' }}>Points:</label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={card.points}
                            onChange={(e) => updateCard(card.id, (c) => ({ ...c, points: Math.max(0, parseInt(e.target.value, 10) || 0) }))}
                            style={{
                              width: '70px',
                              height: '34px',
                              padding: '0 8px',
                              borderRadius: '6px',
                              border: '1px solid #10B981',
                              fontSize: '14px',
                              fontWeight: 700,
                              textAlign: 'center',
                              backgroundColor: '#FFFFFF',
                            }}
                          />
                        </div>
                      </div>

                      {/* Explanation input */}
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#065F46', marginBottom: '4px' }}>
                          Answer Feedback / Explanation:
                        </label>
                        <textarea
                          rows={2}
                          value={card.explanation}
                          onChange={(e) => updateCard(card.id, (c) => ({ ...c, explanation: e.target.value }))}
                          placeholder="Provide reasoning or notes shown after grading..."
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            border: '1px solid #A7F3D0',
                            fontSize: '13px',
                            backgroundColor: '#FFFFFF',
                          }}
                        />
                      </div>

                      <div style={{ marginTop: '12px', textAlign: 'right' }}>
                        <button
                          type="button"
                          onClick={() => updateCard(card.id, (c) => ({ ...c, isAnswerKeyMode: false }))}
                          style={{
                            padding: '6px 16px',
                            backgroundColor: '#059669',
                            color: '#FFFFFF',
                            borderRadius: '6px',
                            border: 'none',
                            fontWeight: 600,
                            fontSize: '13px',
                            cursor: 'pointer',
                          }}
                        >
                          Done
                        </button>
                      </div>
                    </div>
                  )}

                  <hr style={{ margin: '16px 0', border: 'none', borderTop: '1px solid #F3F4F6' }} />

                  {/* Card Bottom Toolbar */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                    {/* Left: Answer Key button & Points indicator */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <button
                        type="button"
                        onClick={() => updateCard(card.id, (c) => ({ ...c, isAnswerKeyMode: !c.isAnswerKeyMode }))}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 14px',
                          borderRadius: '8px',
                          border: card.isAnswerKeyMode ? '1px solid #10B981' : '1px solid #E5E7EB',
                          backgroundColor: card.isAnswerKeyMode ? '#ECFDF5' : '#F9FAFB',
                          color: card.isAnswerKeyMode ? '#047857' : '#2563EB',
                          fontWeight: 600,
                          fontSize: '13px',
                          cursor: 'pointer',
                        }}
                      >
                        🎯 {card.isAnswerKeyMode ? 'Hide Answer Key' : `Answer Key (${card.points} ${card.points === 1 ? 'pt' : 'pts'})`}
                      </button>

                      {/* Difficulty selector */}
                      <select
                        value={card.difficulty}
                        onChange={(e) => updateCard(card.id, (c) => ({ ...c, difficulty: e.target.value as Difficulty }))}
                        style={{
                          height: '32px',
                          padding: '0 8px',
                          borderRadius: '6px',
                          border: '1px solid #E5E7EB',
                          fontSize: '12px',
                          fontWeight: 600,
                          backgroundColor:
                            card.difficulty === 'easy'
                              ? '#ECFDF5'
                              : card.difficulty === 'medium'
                              ? '#FFFBEB'
                              : '#FEF2F2',
                          color:
                            card.difficulty === 'easy'
                              ? '#065F46'
                              : card.difficulty === 'medium'
                              ? '#92400E'
                              : '#991B1B',
                          cursor: 'pointer',
                        }}
                      >
                        <option value="easy">🟢 Easy</option>
                        <option value="medium">🟡 Medium</option>
                        <option value="hard">🔴 Hard</option>
                      </select>

                      {/* Tag Input */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <input
                          type="text"
                          placeholder="+ Tag"
                          value={tagInputMap[card.id] || ''}
                          onChange={(e) => setTagInputMap({ ...tagInputMap, [card.id]: e.target.value })}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddTag(card.id);
                            }
                          }}
                          style={{
                            width: '80px',
                            height: '30px',
                            padding: '0 8px',
                            borderRadius: '6px',
                            border: '1px solid #E5E7EB',
                            fontSize: '12px',
                          }}
                        />
                        {card.tags.map((t) => (
                          <span
                            key={t}
                            onClick={() => handleRemoveTag(card.id, t)}
                            title="Click to remove"
                            style={{
                              fontSize: '11px',
                              color: '#4B5563',
                              backgroundColor: '#F3F4F6',
                              padding: '2px 8px',
                              borderRadius: '12px',
                              cursor: 'pointer',
                            }}
                          >
                            #{t} ×
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Right: Actions (Duplicate, Delete, Required, Move) */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {/* Move Up/Down */}
                      <button
                        type="button"
                        disabled={qIdx === 0}
                        onClick={() => handleMoveCard(qIdx, 'up')}
                        title="Move question up"
                        style={{
                          width: '30px',
                          height: '30px',
                          border: 'none',
                          background: 'transparent',
                          color: qIdx === 0 ? '#D1D5DB' : '#6B7280',
                          cursor: qIdx === 0 ? 'not-allowed' : 'pointer',
                          fontSize: '14px',
                        }}
                      >
                        ⬆
                      </button>
                      <button
                        type="button"
                        disabled={qIdx === cards.length - 1}
                        onClick={() => handleMoveCard(qIdx, 'down')}
                        title="Move question down"
                        style={{
                          width: '30px',
                          height: '30px',
                          border: 'none',
                          background: 'transparent',
                          color: qIdx === cards.length - 1 ? '#D1D5DB' : '#6B7280',
                          cursor: qIdx === cards.length - 1 ? 'not-allowed' : 'pointer',
                          fontSize: '14px',
                        }}
                      >
                        ⬇
                      </button>

                      {/* Duplicate Card */}
                      <button
                        type="button"
                        onClick={() => handleDuplicateCard(card.id)}
                        title="Duplicate Question"
                        style={{
                          width: '32px',
                          height: '32px',
                          border: 'none',
                          background: 'transparent',
                          color: '#4B5563',
                          cursor: 'pointer',
                          fontSize: '16px',
                        }}
                      >
                        ⧉
                      </button>

                      {/* Delete Card */}
                      <button
                        type="button"
                        onClick={() => handleDeleteCard(card.id)}
                        title="Delete Question"
                        style={{
                          width: '32px',
                          height: '32px',
                          border: 'none',
                          background: 'transparent',
                          color: '#EF4444',
                          cursor: 'pointer',
                          fontSize: '16px',
                        }}
                      >
                        🗑
                      </button>

                      <div style={{ height: '20px', width: '1px', backgroundColor: '#E5E7EB' }} />

                      {/* Required Toggle */}
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#4B5563', cursor: 'pointer' }}>
                        <span>Required</span>
                        <input
                          type="checkbox"
                          checked={card.required}
                          onChange={(e) => updateCard(card.id, (c) => ({ ...c, required: e.target.checked }))}
                          style={{ width: '16px', height: '16px', accentColor: '#4F46E5', cursor: 'pointer' }}
                        />
                      </label>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Bottom Add Question Button */}
            <div style={{ textAlign: 'center', marginTop: '10px' }}>
              <button
                type="button"
                onClick={() => handleAddCard('mcq')}
                style={{
                  padding: '12px 28px',
                  backgroundColor: '#FFFFFF',
                  color: '#4F46E5',
                  borderRadius: '10px',
                  border: '2px dashed #C7D2FE',
                  fontWeight: 600,
                  fontSize: '14px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.15s ease',
                }}
              >
                ➕ Add Question Card
              </button>
            </div>
          </div>

          {/* Right Sticky Action Dock (Google Forms Floating Bar) */}
          <div
            style={{
              position: 'sticky',
              top: '24px',
              width: '240px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '14px',
                padding: '20px',
                border: '1px solid #E5E7EB',
                boxShadow: '0 4px 14px rgba(0,0,0,0.06)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase' }}>
                Form Quick Actions
              </div>

              {/* Add Multiple Question Types */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                <button
                  type="button"
                  onClick={() => handleAddCard('mcq')}
                  style={{
                    padding: '8px 10px',
                    backgroundColor: '#EEF2FF',
                    color: '#4338CA',
                    borderRadius: '8px',
                    border: 'none',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    textAlign: 'center',
                  }}
                >
                  + MCQ
                </button>
                <button
                  type="button"
                  onClick={() => handleAddCard('multi_select')}
                  style={{
                    padding: '8px 10px',
                    backgroundColor: '#EEF2FF',
                    color: '#4338CA',
                    borderRadius: '8px',
                    border: 'none',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    textAlign: 'center',
                  }}
                >
                  + Checkbox
                </button>
                <button
                  type="button"
                  onClick={() => handleAddCard('true_false')}
                  style={{
                    padding: '8px 10px',
                    backgroundColor: '#EEF2FF',
                    color: '#4338CA',
                    borderRadius: '8px',
                    border: 'none',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    textAlign: 'center',
                  }}
                >
                  + True/False
                </button>
                <button
                  type="button"
                  onClick={() => handleAddCard('coding')}
                  style={{
                    padding: '8px 10px',
                    backgroundColor: '#EEF2FF',
                    color: '#4338CA',
                    borderRadius: '8px',
                    border: 'none',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    textAlign: 'center',
                  }}
                >
                  + Coding
                </button>
              </div>

              <hr style={{ margin: '4px 0', border: 'none', borderTop: '1px solid #F3F4F6' }} />

              {/* Save & Submit Primary Button */}
              <button
                type="button"
                disabled={saving}
                onClick={handleSaveAll}
                style={{
                  height: '44px',
                  backgroundColor: saving ? '#9CA3AF' : '#017DF9',
                  color: '#FFFFFF',
                  borderRadius: '8px',
                  border: 'none',
                  fontWeight: 600,
                  fontSize: '14px',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 2px 6px rgba(1,125,249,0.3)',
                }}
              >
                {saving ? 'Saving Questions...' : `💾 Save & Add Questions (${cards.length})`}
              </button>

              {/* Preview Button */}
              <button
                type="button"
                onClick={() => { setViewMode('preview'); setPreviewSubmitted(false); }}
                style={{
                  height: '38px',
                  backgroundColor: '#FFFFFF',
                  color: '#374151',
                  borderRadius: '8px',
                  border: '1px solid #D1D5DB',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                👁 Preview as Student
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
