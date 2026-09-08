'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Breadcrumb from '@/components/layout/Breadcrumb';
import RichTextEditor from '@/components/common/RichTextEditor';

interface SectionData {
  sectionName: string;
  sectionDuration: number;
  sectionType: number; // 1 = MCQ, 2 = Coding
  sectionInstructions?: string;
  defaultMarks: number;
  penaltyMarks: number;
  displayQuestions?: number;
}

export default function CreateSectionPage() {
  const router = useRouter();

  // Test draft loaded from Step 1
  const [testDraft, setTestDraft] = useState<any>(null);

  // Current section index (0-based)
  const [currentSectionIndex, setCurrentSectionIndex] = useState<number>(0);

  // Form fields for active section
  const [sectionName, setSectionName] = useState('');
  const [sectionDuration, setSectionDuration] = useState<string | number>('');
  const [sectionType, setSectionType] = useState<number>(1); // 1 = MCQ, 2 = Coding
  const [sectionInstructions, setSectionInstructions] = useState('');
  const [defaultMarks, setDefaultMarks] = useState<string | number>(1);
  const [penaltyMarks, setPenaltyMarks] = useState<string | number>('');
  const [displayQuestions, setDisplayQuestions] = useState<string | number>('');

  // Saved sections array
  const [savedSections, setSavedSections] = useState<SectionData[]>([]);

  // Validation & Touched state
  const [touched, setTouched] = useState<{ [key: string]: boolean }>({});
  const [submitting, setSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const draftStr = sessionStorage.getItem('currentTestDraft');
      if (draftStr) {
        try {
          const parsed = JSON.parse(draftStr);
          setTestDraft(parsed);
        } catch {
          // ignore
        }
      }
    }
  }, []);

  const totalSectionsRequired = Number(testDraft?.numSections || 1);

  // Populate active form when switching sections
  const loadSectionIntoForm = (index: number, sectionsList = savedSections) => {
    const existing = sectionsList[index];
    if (existing) {
      setSectionName(existing.sectionName);
      setSectionDuration(existing.sectionDuration);
      setSectionType(existing.sectionType);
      setSectionInstructions(existing.sectionInstructions || '');
      setDefaultMarks(existing.defaultMarks);
      setPenaltyMarks(existing.penaltyMarks);
      setDisplayQuestions(existing.displayQuestions ?? '');
    } else {
      setSectionName('');
      setSectionDuration('');
      setSectionType(1);
      setSectionInstructions('');
      setDefaultMarks(1);
      setPenaltyMarks('');
      setDisplayQuestions('');
    }
    setIsEditing(false);
    setTouched({});
  };

  const validate = () => {
    const errors: { [key: string]: string } = {};

    if (!sectionName.trim()) {
      errors.sectionName = 'Section Name is required';
    } else if (!/^[a-zA-Z0-9 ]+$/.test(sectionName.trim())) {
      errors.sectionName = 'Section Name must contain only alphabets and numbers';
    }

    if (sectionDuration === '' || sectionDuration === null || sectionDuration === undefined) {
      errors.sectionDuration = 'Duration is required';
    } else {
      const dur = Number(sectionDuration);
      if (isNaN(dur) || dur <= 0) {
        errors.sectionDuration = 'Duration is required';
      } else if (dur > 300) {
        errors.sectionDuration = 'Section Duration must not be greater than 300';
      }
    }

    if (sectionType === 1) {
      if (defaultMarks === '' || defaultMarks === null || defaultMarks === undefined) {
        errors.defaultMarks = 'Marks per correct answer is required';
      }
    }

    return errors;
  };

  const errors = validate();

  const handleSaveSection = () => {
    setTouched({
      sectionName: true,
      sectionDuration: true,
      sectionType: true,
      defaultMarks: true,
      penaltyMarks: true,
    });

    const currentErrors = validate();
    if (Object.keys(currentErrors).length > 0) {
      setToastMessage('Please fill all required section details correctly');
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }

    const newSec: SectionData = {
      sectionName: sectionName.trim(),
      sectionDuration: Number(sectionDuration),
      sectionType: Number(sectionType),
      sectionInstructions,
      defaultMarks: sectionType === 1 ? Number(defaultMarks || 1) : 0,
      penaltyMarks: sectionType === 1 ? Number(penaltyMarks || 0) : 0,
      displayQuestions: displayQuestions !== '' ? Number(displayQuestions) : undefined,
    };

    const updated = [...savedSections];
    updated[currentSectionIndex] = newSec;
    setSavedSections(updated);
    setIsEditing(false);

    setToastMessage(`Section "${newSec.sectionName}" saved successfully!`);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handlePrevious = () => {
    if (currentSectionIndex > 0) {
      const prevIdx = currentSectionIndex - 1;
      setCurrentSectionIndex(prevIdx);
      loadSectionIntoForm(prevIdx);
    }
  };

  const handleNext = () => {
    if (currentSectionIndex + 1 < totalSectionsRequired && savedSections[currentSectionIndex]) {
      const nextIdx = currentSectionIndex + 1;
      setCurrentSectionIndex(nextIdx);
      loadSectionIntoForm(nextIdx);
    }
  };

  const handleFinish = async () => {
    if (submitting) return;

    if (savedSections.length < totalSectionsRequired) {
      setToastMessage(`Please save all ${totalSectionsRequired} section(s) before finishing.`);
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }

    setSubmitting(true);

    const payload = {
      ...testDraft,
      section: savedSections.map((s) => ({
        sectionName: s.sectionName,
        sectionDuration: s.sectionDuration,
        sectionType: s.sectionType === 1 ? 'MCQ' : 'Coding',
        sectionInstructions: s.sectionInstructions,
        defaultMarks: s.defaultMarks,
        penaltyMarks: s.penaltyMarks,
        displayQuestions: s.displayQuestions || 10,
      })),
    };

    try {
      const res = await fetch('/api/v2/assessment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.status === 200) {
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('currentTestDraft');
        }
        const createdId = data.res?.[0]?.assessmentId || data.data?.id || '';
        router.push(`/assessment/createSuccess?id=${createdId}`);
      } else {
        setToastMessage(data.err?.msg || data.message || 'Failed to create test');
        setTimeout(() => setToastMessage(null), 3500);
      }
    } catch (err: any) {
      setToastMessage('Network error occurred while creating test');
      setTimeout(() => setToastMessage(null), 3500);
    } finally {
      setSubmitting(false);
    }
  };

  const isCurrentSectionSaved = Boolean(savedSections[currentSectionIndex]);
  const isFieldDisabled = isCurrentSectionSaved && !isEditing;

  // Exact 1:1 logic from 378.chunk.js:
  // Previous: 1 == $ in 1-based index => currentSectionIndex === 0
  const isPreviousLocked = currentSectionIndex === 0;

  // Next: K >= $ && $ < q in 1-based index => currentSectionIndex + 1 < totalSectionsRequired && isCurrentSectionSaved
  const isNextLocked = currentSectionIndex + 1 >= totalSectionsRequired || !savedSections[currentSectionIndex];

  const allSectionsSaved = savedSections.length === totalSectionsRequired;

  return (
    <div style={{ maxWidth: '1300px', margin: '0 auto', paddingBottom: '80px' }}>
      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { label: 'Assessments', href: '/assessment' },
          { label: 'Create New Test', href: '/assessment/create' },
          { label: 'Sections', href: '/assessment/createSection' },
        ]}
      />

      {/* Top Banner Card: Create New Sections + Progress Bar */}
      <div
        style={{
          display: 'flex',
          padding: '24px',
          alignItems: 'center',
          gap: '10px',
          alignSelf: 'stretch',
          borderRadius: '10px',
          border: '1px solid rgb(240, 240, 240)',
          backgroundColor: 'rgb(255, 255, 255)',
          marginBottom: '24px',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '4px', width: '100%' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
            <p
              style={{
                margin: '0px',
                lineHeight: '1.334em',
                color: 'rgb(52, 52, 52)',
                fontFamily: '"Public Sans", sans-serif',
                fontSize: '20px',
                fontWeight: 600,
              }}
            >
              Create New Sections
            </p>
            <p
              style={{
                margin: '0px',
                color: 'rgb(114, 114, 114)',
                fontFamily: '"Public Sans", sans-serif',
                fontSize: '14px',
                fontWeight: 500,
                lineHeight: '150%',
              }}
            >
              Note - Do not worry you can always edit these anytime later.
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px', width: '100%', marginTop: '8px' }}>
            <p
              style={{
                margin: '0px',
                color: 'rgb(1, 125, 249)',
                textAlign: 'right',
                fontFamily: '"Public Sans", sans-serif',
                fontSize: '12px',
                fontWeight: 600,
                lineHeight: '130%',
              }}
            >
              Step{' '}
              <span
                style={{
                  color: 'rgb(139, 144, 154)',
                  textAlign: 'right',
                  fontFamily: '"Public Sans", sans-serif',
                  fontSize: '12px',
                  fontWeight: 600,
                  lineHeight: '130%',
                }}
              >
                2 of 2
              </span>
            </p>
            <div style={{ width: '100%', height: '10px', borderRadius: '5px', backgroundColor: 'rgb(238, 238, 238)', overflow: 'hidden', position: 'relative' }}>
              <div
                style={{
                  width: `${Math.min(100, Math.max(50, (savedSections.length / totalSectionsRequired) * 100))}%`,
                  height: '100%',
                  borderRadius: '5px',
                  backgroundColor: 'rgb(26, 144, 255)',
                  transition: 'width 0.4s linear',
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Split Layout: Left Form (66%) and Right Live Preview (34%) */}
      <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start', width: '100%' }}>
        {/* Left Form Card */}
        <div
          style={{
            flex: '1 1 66%',
            display: 'flex',
            padding: '24px',
            flexDirection: 'column',
            alignItems: 'flex-start',
            gap: '32px',
            borderRadius: '10px',
            border: '1px solid rgb(240, 240, 240)',
            backgroundColor: 'rgb(255, 255, 255)',
          }}
        >
          {/* Section Header: Left: Enter Section N (+ Edit button), Right: N/Total */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              width: '100%',
              paddingBottom: '16px',
              borderBottom: '1px solid #f0f0f0',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span
                style={{
                  fontFamily: '"Public Sans", sans-serif',
                  fontSize: '18px',
                  fontWeight: 600,
                  color: '#343434',
                  lineHeight: '150%',
                }}
              >
                Enter Section {currentSectionIndex + 1}
              </span>
              {isCurrentSectionSaved && (
                <button
                  type="button"
                  onClick={() => setIsEditing(!isEditing)}
                  style={{
                    padding: '2px 10px',
                    fontSize: '12px',
                    fontWeight: 500,
                    fontFamily: '"Public Sans", sans-serif',
                    color: isEditing ? '#017DF9' : '#727272',
                    border: '1px solid #E2E2E2',
                    borderRadius: '4px',
                    backgroundColor: isEditing ? '#E9F4FF' : '#FFF',
                    cursor: 'pointer',
                  }}
                >
                  {isEditing ? 'Cancel Edit' : 'Edit'}
                </button>
              )}
            </div>
            <span
              style={{
                fontFamily: '"Public Sans", sans-serif',
                fontSize: '14px',
                fontWeight: 500,
                color: '#017DF9',
                lineHeight: '150%',
              }}
            >
              <span>{currentSectionIndex + 1}</span>
              <span style={{ color: '#9B9B9B' }}>/{totalSectionsRequired}</span>
            </span>
          </div>

          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '32px' }}>
            {/* Field 1: Name of the Section (NO *) */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '8px', width: '100%' }}>
              <label
                style={{
                  fontFamily: '"Public Sans", sans-serif',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: touched.sectionName && errors.sectionName ? 'rgb(244, 67, 54)' : 'rgb(52, 52, 52)',
                  lineHeight: '150%',
                }}
              >
                Name of the Section
              </label>
              <div
                style={{
                  display: 'flex',
                  height: '48px',
                  padding: '0px 16px',
                  alignItems: 'center',
                  alignSelf: 'stretch',
                  border: touched.sectionName && errors.sectionName ? '1px solid rgb(244, 67, 54)' : '1px solid rgb(240, 240, 240)',
                  backgroundColor: isFieldDisabled ? 'rgb(240, 240, 240)' : 'rgb(255, 255, 255)',
                  borderRadius: '10px',
                  boxSizing: 'border-box',
                  width: '100%',
                  cursor: isFieldDisabled ? 'not-allowed' : 'default',
                }}
              >
                <input
                  type="text"
                  placeholder="Enter section name"
                  value={sectionName}
                  disabled={isFieldDisabled}
                  onBlur={() => setTouched({ ...touched, sectionName: true })}
                  onChange={(e) => setSectionName(e.target.value)}
                  style={{
                    border: 'none',
                    outline: 'none',
                    width: '100%',
                    height: '100%',
                    fontFamily: '"Public Sans", sans-serif',
                    fontSize: '14px',
                    color: isFieldDisabled ? 'rgb(114, 114, 114)' : 'rgb(52, 52, 52)',
                    background: 'transparent',
                    cursor: isFieldDisabled ? 'not-allowed' : 'text',
                  }}
                />
              </div>
              {touched.sectionName && errors.sectionName && (
                <span style={{ color: 'rgb(244, 67, 54)', fontSize: '12px', fontFamily: '"Public Sans", sans-serif', fontWeight: 500 }}>
                  {errors.sectionName}
                </span>
              )}
            </div>

            {/* Field 2: Enter Section Duration (in minutes) (NO *) */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '8px', width: '100%' }}>
              <label
                style={{
                  fontFamily: '"Public Sans", sans-serif',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: touched.sectionDuration && errors.sectionDuration ? 'rgb(244, 67, 54)' : 'rgb(52, 52, 52)',
                  lineHeight: '150%',
                }}
              >
                Enter Section Duration (in minutes)
              </label>
              <div
                style={{
                  display: 'flex',
                  height: '48px',
                  padding: '0px 16px',
                  alignItems: 'center',
                  alignSelf: 'stretch',
                  border: touched.sectionDuration && errors.sectionDuration ? '1px solid rgb(244, 67, 54)' : '1px solid rgb(240, 240, 240)',
                  backgroundColor: isFieldDisabled ? 'rgb(240, 240, 240)' : 'rgb(255, 255, 255)',
                  borderRadius: '10px',
                  boxSizing: 'border-box',
                  width: '100%',
                  cursor: isFieldDisabled ? 'not-allowed' : 'default',
                }}
              >
                <input
                  type="number"
                  min={1}
                  max={300}
                  placeholder="Enter Duration in mins"
                  value={sectionDuration}
                  disabled={isFieldDisabled}
                  onBlur={() => setTouched({ ...touched, sectionDuration: true })}
                  onChange={(e) => setSectionDuration(e.target.value)}
                  style={{
                    border: 'none',
                    outline: 'none',
                    width: '100%',
                    height: '100%',
                    fontFamily: '"Public Sans", sans-serif',
                    fontSize: '14px',
                    color: isFieldDisabled ? 'rgb(114, 114, 114)' : 'rgb(52, 52, 52)',
                    background: 'transparent',
                    cursor: isFieldDisabled ? 'not-allowed' : 'text',
                  }}
                />
              </div>
              {touched.sectionDuration && errors.sectionDuration && (
                <span style={{ color: 'rgb(244, 67, 54)', fontSize: '12px', fontFamily: '"Public Sans", sans-serif', fontWeight: 500 }}>
                  {errors.sectionDuration}
                </span>
              )}
            </div>

            {/* Field 3: Section Instructions */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '8px', width: '100%' }}>
              <label
                style={{
                  fontFamily: '"Public Sans", sans-serif',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: 'rgb(52, 52, 52)',
                  lineHeight: '150%',
                }}
              >
                Section Instructions
              </label>
              <RichTextEditor
                value={sectionInstructions}
                onChange={setSectionInstructions}
                placeholder="Enter Instructions"
                minHeight="120px"
                disabled={isFieldDisabled}
              />
            </div>

            {/* Field 4: Type of section (Only MCQ & Coding) */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '8px', width: '100%' }}>
              <label
                style={{
                  fontFamily: '"Public Sans", sans-serif',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: 'rgb(52, 52, 52)',
                  lineHeight: '150%',
                }}
              >
                Type of section
              </label>
              <div style={{ position: 'relative', width: '100%' }}>
                <select
                  value={sectionType}
                  disabled={isFieldDisabled}
                  onChange={(e) => setSectionType(Number(e.target.value))}
                  style={{
                    display: 'flex',
                    height: '48px',
                    padding: '0px 16px',
                    alignItems: 'center',
                    alignSelf: 'stretch',
                    border: '1px solid rgb(240, 240, 240)',
                    backgroundColor: isFieldDisabled ? 'rgb(240, 240, 240)' : 'rgb(255, 255, 255)',
                    borderRadius: '10px',
                    boxSizing: 'border-box',
                    width: '100%',
                    fontFamily: '"Public Sans", sans-serif',
                    fontSize: '14px',
                    color: isFieldDisabled ? 'rgb(114, 114, 114)' : 'rgb(52, 52, 52)',
                    appearance: 'none',
                    outline: 'none',
                    cursor: isFieldDisabled ? 'not-allowed' : 'pointer',
                  }}
                >
                  <option value={1}>MCQ</option>
                  <option value={2}>Coding</option>
                </select>
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgb(114, 114, 114)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </span>
              </div>
            </div>

            {/* Field 5: Default Correct Marks (Hidden/Disabled if Coding) */}
            {sectionType !== 2 && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '8px', width: '100%' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '2px' }}>
                  <label
                    style={{
                      fontFamily: '"Public Sans", sans-serif',
                      fontSize: '14px',
                      fontWeight: 500,
                      color: 'rgb(52, 52, 52)',
                      lineHeight: '150%',
                    }}
                  >
                    Default Correct Marks
                  </label>
                  <span style={{ fontFamily: '"Public Sans", sans-serif', fontSize: '12px', color: 'rgb(155, 155, 155)', fontWeight: 400 }}>
                    (Note - You can set custom marks for specific questions later when adding questions in test)
                  </span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    height: '48px',
                    padding: '0px 16px',
                    alignItems: 'center',
                    alignSelf: 'stretch',
                    border: '1px solid rgb(240, 240, 240)',
                    backgroundColor: isFieldDisabled ? 'rgb(240, 240, 240)' : 'rgb(255, 255, 255)',
                    borderRadius: '10px',
                    boxSizing: 'border-box',
                    width: '100%',
                    cursor: isFieldDisabled ? 'not-allowed' : 'default',
                  }}
                >
                  <input
                    type="number"
                    min={0}
                    step="any"
                    placeholder="Marks per correct answer"
                    value={defaultMarks}
                    disabled={isFieldDisabled}
                    onChange={(e) => setDefaultMarks(e.target.value)}
                    style={{
                      border: 'none',
                      outline: 'none',
                      width: '100%',
                      height: '100%',
                      fontFamily: '"Public Sans", sans-serif',
                      fontSize: '14px',
                      color: isFieldDisabled ? 'rgb(114, 114, 114)' : 'rgb(52, 52, 52)',
                      background: 'transparent',
                      cursor: isFieldDisabled ? 'not-allowed' : 'text',
                    }}
                  />
                </div>
                {/* Pills: 1, 2, 5, 10 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '4px' }}>
                  {[1, 2, 5, 10].map((val) => (
                    <button
                      key={val}
                      type="button"
                      disabled={isFieldDisabled}
                      onClick={() => setDefaultMarks(val)}
                      style={{
                        padding: '4px 32px',
                        borderRadius: '6px',
                        border: '1px solid #F0F0F0',
                        backgroundColor: Number(defaultMarks) === val ? '#E9F4FF' : '#FAFAFA',
                        color: Number(defaultMarks) === val ? '#017DF9' : '#343434',
                        fontFamily: '"Public Sans", sans-serif',
                        fontSize: '14px',
                        fontWeight: 500,
                        cursor: isFieldDisabled ? 'not-allowed' : 'pointer',
                        opacity: isFieldDisabled ? 0.6 : 1,
                        transition: 'all 0.15s',
                      }}
                    >
                      {val}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Field 6: Default Incorrect Mark Penalty (Pills: 1, 2, 5, 10) */}
            {sectionType !== 2 && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '8px', width: '100%' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '2px' }}>
                  <label
                    style={{
                      fontFamily: '"Public Sans", sans-serif',
                      fontSize: '14px',
                      fontWeight: 500,
                      color: 'rgb(52, 52, 52)',
                      lineHeight: '150%',
                    }}
                  >
                    Default Incorrect Mark Penalty
                  </label>
                  <span style={{ fontFamily: '"Public Sans", sans-serif', fontSize: '12px', color: 'rgb(155, 155, 155)', fontWeight: 400 }}>
                    (Note - You can set custom penalty for specific questions later when adding questions in test)
                  </span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    height: '48px',
                    padding: '0px 16px',
                    alignItems: 'center',
                    alignSelf: 'stretch',
                    border: '1px solid rgb(240, 240, 240)',
                    backgroundColor: isFieldDisabled ? 'rgb(240, 240, 240)' : 'rgb(255, 255, 255)',
                    borderRadius: '10px',
                    boxSizing: 'border-box',
                    width: '100%',
                    cursor: isFieldDisabled ? 'not-allowed' : 'default',
                  }}
                >
                  <input
                    type="number"
                    min={0}
                    step="any"
                    placeholder="Negative marks per Incorrect answer"
                    value={penaltyMarks}
                    disabled={isFieldDisabled}
                    onChange={(e) => setPenaltyMarks(e.target.value)}
                    style={{
                      border: 'none',
                      outline: 'none',
                      width: '100%',
                      height: '100%',
                      fontFamily: '"Public Sans", sans-serif',
                      fontSize: '14px',
                      color: isFieldDisabled ? 'rgb(114, 114, 114)' : 'rgb(52, 52, 52)',
                      background: 'transparent',
                      cursor: isFieldDisabled ? 'not-allowed' : 'text',
                    }}
                  />
                </div>
                {/* Pills: 1, 2, 5, 10 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '4px' }}>
                  {[1, 2, 5, 10].map((val) => (
                    <button
                      key={val}
                      type="button"
                      disabled={isFieldDisabled}
                      onClick={() => setPenaltyMarks(val)}
                      style={{
                        padding: '4px 32px',
                        borderRadius: '6px',
                        border: '1px solid #F0F0F0',
                        backgroundColor: Number(penaltyMarks) === val ? '#E9F4FF' : '#FAFAFA',
                        color: Number(penaltyMarks) === val ? '#017DF9' : '#343434',
                        fontFamily: '"Public Sans", sans-serif',
                        fontSize: '14px',
                        fontWeight: 500,
                        cursor: isFieldDisabled ? 'not-allowed' : 'pointer',
                        opacity: isFieldDisabled ? 0.6 : 1,
                        transition: 'all 0.15s',
                      }}
                    >
                      {val}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Field 7: Display Questions */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '8px', width: '100%' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '2px' }}>
                <label
                  style={{
                    fontFamily: '"Public Sans", sans-serif',
                    fontSize: '14px',
                    fontWeight: 500,
                    color: 'rgb(52, 52, 52)',
                    lineHeight: '150%',
                  }}
                >
                  Display Questions
                </label>
                <span style={{ fontFamily: '"Public Sans", sans-serif', fontSize: '12px', color: 'rgb(155, 155, 155)', fontWeight: 400 }}>
                  (displayed in the test out of total questions available in this section)
                </span>
              </div>
              <div
                style={{
                  display: 'flex',
                  height: '48px',
                  padding: '0px 16px',
                  alignItems: 'center',
                  alignSelf: 'stretch',
                  border: '1px solid rgb(240, 240, 240)',
                  backgroundColor: isFieldDisabled || sectionType === 2 ? 'rgb(240, 240, 240)' : 'rgb(255, 255, 255)',
                  borderRadius: '10px',
                  boxSizing: 'border-box',
                  width: '100%',
                  cursor: isFieldDisabled || sectionType === 2 ? 'not-allowed' : 'default',
                }}
              >
                <input
                  type="number"
                  min={1}
                  placeholder="display questions"
                  value={displayQuestions}
                  disabled={isFieldDisabled || sectionType === 2}
                  onChange={(e) => setDisplayQuestions(e.target.value)}
                  style={{
                    border: 'none',
                    outline: 'none',
                    width: '100%',
                    height: '100%',
                    fontFamily: '"Public Sans", sans-serif',
                    fontSize: '14px',
                    color: isFieldDisabled || sectionType === 2 ? 'rgb(114, 114, 114)' : 'rgb(52, 52, 52)',
                    background: 'transparent',
                    cursor: isFieldDisabled || sectionType === 2 ? 'not-allowed' : 'text',
                  }}
                />
              </div>
            </div>

            {/* Bottom Navigation & Actions Bar */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                width: '100%',
                marginTop: '16px',
                paddingTop: '20px',
                borderTop: '1px solid #f0f0f0',
              }}
            >
              {/* Left Group: < Previous and Next > */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                {/* Previous Button */}
                <button
                  type="button"
                  disabled={isPreviousLocked}
                  onClick={handlePrevious}
                  style={{
                    display: 'flex',
                    height: '40px',
                    padding: '10px 16px',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: '6px',
                    borderRadius: '8px',
                    border: '1px solid #E2E2E2',
                    backgroundColor: isPreviousLocked ? '#b3b3b3' : '#FFF',
                    cursor: isPreviousLocked ? 'not-allowed' : 'pointer',
                    width: '99px',
                  }}
                >
                  <img
                    src="/static/media/arrow-left-icon.49919c07afbe6ed5d90e2a0dd7014548.svg"
                    alt="left-arrow"
                    width="20"
                    height="20"
                    style={{
                      filter: isPreviousLocked ? 'brightness(0) invert(1)' : 'none',
                    }}
                  />
                  <span
                    style={{
                      color: isPreviousLocked ? '#FFFFFF' : '#727272',
                      fontFamily: '"Public Sans", sans-serif',
                      fontSize: '14px',
                      fontWeight: 600,
                      lineHeight: '150%',
                    }}
                  >
                    Previous
                  </span>
                </button>

                {/* Next Button */}
                <button
                  type="button"
                  disabled={isNextLocked}
                  onClick={handleNext}
                  style={{
                    display: 'flex',
                    height: '40px',
                    padding: '10px 16px',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: '6px',
                    borderRadius: '8px',
                    border: '1px solid #E2E2E2',
                    backgroundColor: isNextLocked ? '#b3b3b3' : '#FFF',
                    cursor: isNextLocked ? 'not-allowed' : 'pointer',
                    width: '99px',
                  }}
                >
                  <span
                    style={{
                      color: isNextLocked ? '#FFFFFF' : '#727272',
                      fontFamily: '"Public Sans", sans-serif',
                      fontSize: '14px',
                      fontWeight: 600,
                      lineHeight: '150%',
                    }}
                  >
                    Next
                  </span>
                  <img
                    src="/static/media/arrow-right-icon.bd29089eca499b88f30bb3fdb27e9758.svg"
                    alt="right-arrow"
                    width="20"
                    height="20"
                    style={{
                      filter: isNextLocked ? 'brightness(0) invert(1)' : 'none',
                    }}
                  />
                </button>
              </div>

              {/* Right Group: Save or Finish */}
              <div>
                {!allSectionsSaved || isEditing ? (
                  <button
                    type="button"
                    disabled={isFieldDisabled}
                    onClick={handleSaveSection}
                    style={{
                      display: 'flex',
                      width: '120px',
                      height: '40px',
                      justifyContent: 'center',
                      alignItems: 'center',
                      borderRadius: '8px',
                      backgroundColor: isFieldDisabled ? '#b3b3b3' : '#017DF9',
                      border: 'none',
                      color: isFieldDisabled ? '#727272' : '#FFF',
                      fontFamily: '"Public Sans", sans-serif',
                      fontSize: '14px',
                      fontWeight: 600,
                      lineHeight: '150%',
                      cursor: isFieldDisabled ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {isEditing ? 'Update' : 'Save'}
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={handleFinish}
                    style={{
                      display: 'flex',
                      width: '120px',
                      height: '40px',
                      justifyContent: 'center',
                      alignItems: 'center',
                      borderRadius: '8px',
                      backgroundColor: '#017DF9',
                      border: 'none',
                      color: '#FFF',
                      fontFamily: '"Public Sans", sans-serif',
                      fontSize: '14px',
                      fontWeight: 600,
                      lineHeight: '150%',
                      cursor: submitting ? 'not-allowed' : 'pointer',
                      opacity: submitting ? 0.7 : 1,
                    }}
                  >
                    {submitting ? 'Saving...' : 'Finish'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Live Preview Panel (34%) */}
        <div
          style={{
            flex: '0 0 32%',
            display: 'inline-flex',
            padding: '24px 20px',
            flexDirection: 'column',
            alignItems: 'flex-start',
            gap: '24px',
            backgroundColor: '#FFF',
            border: '1px solid rgb(240, 240, 240)',
            borderRadius: '10px',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '4px', width: '100%' }}>
            <span
              style={{
                color: '#343434',
                fontFamily: '"Public Sans", sans-serif',
                fontSize: '18px',
                fontWeight: 600,
              }}
            >
              Preview
            </span>
            <span
              style={{
                color: '#9B9B9B',
                fontFamily: '"Public Sans", sans-serif',
                fontSize: '13px',
                fontWeight: 500,
                lineHeight: '150%',
              }}
            >
              (Note: Preview on how your section will look like)
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '12px', width: '100%' }}>
            <span
              style={{
                color: '#4A4A4A',
                fontFamily: '"Public Sans", sans-serif',
                fontSize: '15px',
                fontWeight: 600,
                lineHeight: '150%',
              }}
            >
              {testDraft?.testName || 'Test Name'}
            </span>

            {/* Preview Table */}
            <div
              style={{
                width: '100%',
                border: '1px solid #F0F0F0',
                borderRadius: '6px',
                overflow: 'hidden',
              }}
            >
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: '#FAFAFA', borderBottom: '1px solid #F0F0F0' }}>
                    <th style={{ padding: '10px 12px', fontFamily: '"Public Sans", sans-serif', fontSize: '11px', fontWeight: 600, color: '#8B909A' }}>
                      S.NO
                    </th>
                    <th style={{ padding: '10px 12px', fontFamily: '"Public Sans", sans-serif', fontSize: '11px', fontWeight: 600, color: '#8B909A' }}>
                      SECTION NAME
                    </th>
                    <th style={{ padding: '10px 12px', fontFamily: '"Public Sans", sans-serif', fontSize: '11px', fontWeight: 600, color: '#8B909A', textAlign: 'center' }}>
                      DURATION
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {savedSections.length === 0 ? (
                    <tr>
                      <td colSpan={3} style={{ padding: '24px', textAlign: 'center', color: '#C1C1C1', fontSize: '12px', fontFamily: '"Public Sans", sans-serif' }}>
                        No sections added yet
                      </td>
                    </tr>
                  ) : (
                    savedSections.map((sec, idx) => {
                      const displayName = sec.sectionName.length > 17 ? sec.sectionName.slice(0, 17) + '...' : sec.sectionName;
                      return (
                        <tr key={idx} style={{ borderBottom: '1px solid #F0F0F0' }}>
                          <td style={{ padding: '10px 12px', color: '#727272', fontSize: '12px', fontFamily: '"Public Sans", sans-serif', fontWeight: 500 }}>
                            {idx + 1}
                          </td>
                          <td style={{ padding: '10px 12px', color: '#4A4A4A', fontSize: '12px', fontFamily: '"Public Sans", sans-serif', fontWeight: 600 }}>
                            {displayName}
                          </td>
                          <td style={{ padding: '10px 12px', color: '#4A4A4A', fontSize: '12px', fontFamily: '"Public Sans", sans-serif', textAlign: 'center' }}>
                            {sec.sectionDuration} min
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: 'rgba(33, 33, 33, 0.9)',
            color: '#fff',
            padding: '10px 24px',
            borderRadius: '24px',
            fontSize: '14px',
            fontFamily: '"Public Sans", sans-serif',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: 9999,
          }}
        >
          {toastMessage}
        </div>
      )}
    </div>
  );
}
