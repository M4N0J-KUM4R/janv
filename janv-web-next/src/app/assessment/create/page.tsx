'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Breadcrumb from '@/components/layout/Breadcrumb';
import RichTextEditor from '@/components/common/RichTextEditor';

export default function CreateTestPage() {
  const router = useRouter();
  const [departments, setDepartments] = useState<{ id: number; name: string; code: string; aliasName: string }[]>([]);
  const [batches, setBatches] = useState<(number | string)[]>([]);
  const [testName, setTestName] = useState('');
  const [testCode, setTestCode] = useState('SVET00370');
  const [numSections, setNumSections] = useState(1);

  // Multi-select states
  const [testVisibility, setTestVisibility] = useState<string[]>([]);
  const [batchVisibility, setBatchVisibility] = useState<(number | string)[]>([]);
  const [testVisOpen, setTestVisOpen] = useState(false);
  const [batchVisOpen, setBatchVisOpen] = useState(false);

  const testVisRef = useRef<HTMLDivElement>(null);
  const batchVisRef = useRef<HTMLDivElement>(null);

  const [description, setDescription] = useState('');
  const [instructions, setInstructions] = useState('');
  const [tabSwitches, setTabSwitches] = useState(10);
  const [jumbleQuestions, setJumbleQuestions] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [nameError, setNameError] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Restore draft if user navigated back from Step 2 or refreshed
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('currentTestDraft');
      if (saved) {
        try {
          const draft = JSON.parse(saved);
          if (draft.testName) setTestName(draft.testName);
          if (draft.testCode) setTestCode(draft.testCode);
          if (draft.numSections) setNumSections(draft.numSections);
          if (draft.testVisibility) setTestVisibility(draft.testVisibility);
          if (draft.batchVisibility) setBatchVisibility(draft.batchVisibility);
          if (draft.testDesc) setDescription(draft.testDesc);
          if (draft.testInstruct) setInstructions(draft.testInstruct);
          if (draft.tabSwitchLimit !== undefined) setTabSwitches(draft.tabSwitchLimit);
          if (draft.jumbleQuest !== undefined) setJumbleQuestions(draft.jumbleQuest);
          if (draft.showReport !== undefined) setShowReport(draft.showReport);
        } catch {
          // ignore error
        }
      }
    }
  }, []);

  // Fetch real departments of the faculty's institution and user batches from database
  useEffect(() => {
    fetch('/api/v2/departments')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data?.departments) && data.departments.length > 0) {
          setDepartments(data.departments);
        }
      })
      .catch(() => {});

    fetch('/api/v2/batches')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data?.batches) && data.batches.length > 0) {
          setBatches(data.batches);
        }
      })
      .catch(() => {});
  }, []);

  // Fetch live current test code from API if not already restored
  useEffect(() => {
    fetch('/api/v2/assessment/currentTestCode')
      .then((res) => res.json())
      .then((data) => {
        if (data?.res?.testCode) {
          setTestCode((prev) => (prev.startsWith('SVET') && prev !== 'SVET00370' ? prev : data.res.testCode));
        }
      })
      .catch(() => {
        // Fallback
      });
  }, []);

  // Handle outside click to close dropdowns
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (testVisRef.current && !testVisRef.current.contains(event.target as Node)) {
        setTestVisOpen(false);
      }
      if (batchVisRef.current && !batchVisRef.current.contains(event.target as Node)) {
        setBatchVisOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Test Visibility "All" handler
  const handleToggleDepartment = (name: string) => {
    if (name === 'All') {
      if (testVisibility.includes('All')) {
        setTestVisibility([]);
      } else {
        setTestVisibility(['All', ...departments.map((dept) => dept.name)]);
      }
    } else {
      let updated: string[];
      if (testVisibility.includes(name)) {
        updated = testVisibility.filter((x) => x !== name && x !== 'All');
      } else {
        const withoutAll = testVisibility.filter((x) => x !== 'All');
        const next = [...withoutAll, name];
        if (next.length === departments.length) {
          updated = ['All', ...next];
        } else {
          updated = next;
        }
      }
      setTestVisibility(updated);
    }
  };

  // Batch Visibility "All" handler
  const handleToggleBatch = (b: number | string) => {
    if (b === 'All') {
      if (batchVisibility.includes('All')) {
        setBatchVisibility([]);
      } else {
        setBatchVisibility(['All', ...batches]);
      }
    } else {
      let updated: (number | string)[];
      if (batchVisibility.includes(b)) {
        updated = batchVisibility.filter((x) => x !== b && x !== 'All');
      } else {
        const withoutAll = batchVisibility.filter((x) => x !== 'All');
        const next = [...withoutAll, b];
        if (next.length === batches.length) {
          updated = ['All', ...next];
        } else {
          updated = next;
        }
      }
      setBatchVisibility(updated);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (!testName.trim()) {
      setNameError(true);
      setToastMessage('Enter test details');
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }
    setNameError(false);
    setSubmitting(true);

    // Store test draft in sessionStorage for Step 2
    const testDraft = {
      testName: testName.trim(),
      testCode,
      numSections: Number(numSections),
      testVisibility: testVisibility.filter((x) => x !== 'All'),
      batchVisibility: batchVisibility.filter((x) => x !== 'All'),
      testDesc: description,
      testInstruct: instructions,
      tabSwitchLimit: tabSwitches,
      jumbleQuest: jumbleQuestions,
      showReport,
      testType: 'General Assessment',
    };

    if (typeof window !== 'undefined') {
      sessionStorage.setItem('currentTestDraft', JSON.stringify(testDraft));
    }

    router.push('/assessment/createSection');
  };

  // Formatted display values for selects
  const displayTestVisibility = () => {
    const valid = testVisibility.filter((x) => x !== 'All');
    if (valid.length === 0) return 'Select departments for test visibility';
    return valid
      .map((name) => {
        const found = departments.find((d) => d.name === name || d.code === name || String(d.id) === String(name));
        return found ? found.name : name;
      })
      .join(', ');
  };

  const displayBatchVisibility = () => {
    const valid = batchVisibility.filter((x) => x !== 'All');
    if (valid.length === 0) return 'Select batch for visibility';
    return valid.join(', ');
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '60px' }}>
      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { label: 'Assessments', href: '/assessment' },
          { label: 'Create Test', href: '/assessment/create' },
        ]}
      />

      {/* Top Banner Card: Create Test + Progress Bar */}
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
              Create Test
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
                1 of 2
              </span>
            </p>
            <div style={{ width: '100%', height: '10px', borderRadius: '5px', backgroundColor: 'rgb(238, 238, 238)', overflow: 'hidden', position: 'relative' }}>
              <div
                style={{
                  width: '50%',
                  height: '100%',
                  borderRadius: '5px',
                  backgroundColor: 'rgb(26, 144, 255)',
                  transition: 'transform 0.4s linear',
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Form Card */}
      <div
        style={{
          display: 'flex',
          padding: '24px',
          flexDirection: 'column',
          alignItems: 'flex-start',
          gap: '32px',
          alignSelf: 'stretch',
          borderRadius: '10px',
          border: '1px solid rgb(240, 240, 240)',
          backgroundColor: 'rgb(255, 255, 255)',
        }}
      >
        <form onSubmit={handleSubmit} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '32px' }} noValidate>
          {/* Field 1: Name of the Test */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '8px', width: '100%' }}>
            <label
              htmlFor="testName"
              style={{
                fontFamily: '"Public Sans", sans-serif',
                fontSize: '14px',
                fontWeight: 500,
                color: nameError ? 'rgb(244, 67, 54)' : 'rgb(52, 52, 52)',
                lineHeight: '150%',
              }}
            >
              Name of the Test
            </label>
            <div
              style={{
                display: 'flex',
                height: '48px',
                padding: '0px 16px',
                alignItems: 'center',
                gap: '18px',
                alignSelf: 'stretch',
                border: nameError ? '1px solid rgb(244, 67, 54)' : '1px solid rgb(240, 240, 240)',
                backgroundColor: 'rgb(255, 255, 255)',
                borderRadius: '10px',
                boxSizing: 'border-box',
                width: '100%',
              }}
            >
              <input
                id="testName"
                name="testName"
                type="text"
                placeholder="Test Name"
                value={testName}
                onChange={(e) => {
                  setTestName(e.target.value);
                  if (e.target.value.trim()) setNameError(false);
                }}
                style={{
                  border: 'none',
                  outline: 'none',
                  width: '100%',
                  height: '100%',
                  fontFamily: '"Public Sans", sans-serif',
                  fontSize: '14px',
                  color: 'rgb(52, 52, 52)',
                  background: 'transparent',
                }}
              />
            </div>
            {nameError && (
              <span style={{ color: 'rgb(244, 67, 54)', fontSize: '12px', fontFamily: '"Public Sans", sans-serif', fontWeight: 500 }}>
                Test Name is required
              </span>
            )}
          </div>

          {/* Field 2: Test Code (Locked) */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '8px', width: '100%' }}>
            <label
              htmlFor="testCode"
              style={{
                fontFamily: '"Public Sans", sans-serif',
                fontSize: '14px',
                fontWeight: 500,
                color: 'rgb(52, 52, 52)',
                lineHeight: '150%',
              }}
            >
              Test Code
            </label>
            <div
              style={{
                display: 'flex',
                height: '48px',
                padding: '0px 16px',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '18px',
                alignSelf: 'stretch',
                border: '1px solid rgb(240, 240, 240)',
                backgroundColor: 'rgb(240, 240, 240)',
                borderRadius: '10px',
                boxSizing: 'border-box',
                width: '100%',
              }}
            >
              <input
                id="testCode"
                name="testCode"
                type="text"
                disabled
                value={testCode}
                style={{
                  border: 'none',
                  outline: 'none',
                  width: '100%',
                  height: '100%',
                  fontFamily: '"Public Sans", sans-serif',
                  fontSize: '14px',
                  color: 'rgb(114, 114, 114)',
                  backgroundColor: 'transparent',
                  cursor: 'not-allowed',
                }}
              />
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
                <rect x="5" y="11" width="14" height="10" rx="2" stroke="#8B909A" strokeWidth="2" fill="none" />
                <path d="M8 11V7C8 4.79086 9.79086 3 12 3C14.2091 3 16 4.79086 16 7V11" stroke="#8B909A" strokeWidth="2" strokeLinecap="round" />
                <circle cx="12" cy="16" r="1" fill="#8B909A" />
              </svg>
            </div>
          </div>

          {/* Field 3: Number of sections in the Test (1 to 8) */}
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
                Number of sections in the Test
              </label>
              <span
                style={{
                  fontFamily: '"Public Sans", sans-serif',
                  fontSize: '12px',
                  color: 'rgb(155, 155, 155)',
                  fontWeight: 400,
                }}
              >
                (No. of sections can’t be changed later so select carefully)
              </span>
            </div>
            <div style={{ position: 'relative', width: '100%' }}>
              <select
                value={numSections}
                onChange={(e) => setNumSections(Number(e.target.value))}
                style={{
                  display: 'flex',
                  height: '48px',
                  padding: '0px 16px',
                  alignItems: 'center',
                  alignSelf: 'stretch',
                  border: '1px solid rgb(240, 240, 240)',
                  backgroundColor: 'rgb(255, 255, 255)',
                  borderRadius: '10px',
                  boxSizing: 'border-box',
                  width: '100%',
                  fontFamily: '"Public Sans", sans-serif',
                  fontSize: '14px',
                  color: 'rgb(52, 52, 52)',
                  appearance: 'none',
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgb(114, 114, 114)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </span>
            </div>
          </div>

          {/* Field 4: Test Visibility (College / Departments) */}
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
                Test Visibility (College)
              </label>
              <span
                style={{
                  fontFamily: '"Public Sans", sans-serif',
                  fontSize: '12px',
                  color: 'rgb(155, 155, 155)',
                  fontWeight: 400,
                }}
              >
                (Note - Keeping this blank means library test is visible to all institutions)
              </span>
            </div>
            <div ref={testVisRef} style={{ position: 'relative', width: '100%' }}>
              <div
                onClick={() => setTestVisOpen(!testVisOpen)}
                style={{
                  display: 'flex',
                  height: '48px',
                  padding: '0px 16px',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  border: '1px solid rgb(240, 240, 240)',
                  backgroundColor: 'rgb(255, 255, 255)',
                  borderRadius: '10px',
                  boxSizing: 'border-box',
                  width: '100%',
                  fontFamily: '"Public Sans", sans-serif',
                  fontSize: '14px',
                  color: testVisibility.length > 0 ? 'rgb(52, 52, 52)' : 'rgb(193, 193, 193)',
                  cursor: 'pointer',
                  overflow: 'hidden',
                  whiteSpace: 'nowrap',
                  textOverflow: 'ellipsis',
                }}
              >
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: '20px' }}>
                  {displayTestVisibility()}
                </span>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgb(114, 114, 114)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </div>

              {testVisOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: '52px',
                    left: 0,
                    width: '100%',
                    maxHeight: '220px',
                    overflowY: 'auto',
                    backgroundColor: '#ffffff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    zIndex: 200,
                  }}
                >
                  {/* Option: All */}
                  <div
                    onClick={() => handleToggleDepartment('All')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '10px 16px',
                      cursor: 'pointer',
                      backgroundColor: testVisibility.includes('All') ? '#F4F9FF' : 'transparent',
                      borderBottom: '1px solid #f0f0f0',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={testVisibility.includes('All')}
                      onChange={() => {}}
                      style={{ width: '16px', height: '16px', accentColor: '#017DF9', cursor: 'pointer' }}
                    />
                    <span style={{ fontFamily: '"Public Sans", sans-serif', fontSize: '14px', fontWeight: 600, color: '#343434' }}>
                      All
                    </span>
                  </div>

                  {/* Departments of faculty institution */}
                  {departments.map((dept) => {
                    const isChecked = testVisibility.includes(dept.name);
                    return (
                      <div
                        key={dept.id}
                        onClick={() => handleToggleDepartment(dept.name)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          padding: '10px 16px',
                          cursor: 'pointer',
                          backgroundColor: isChecked ? '#F4F9FF' : 'transparent',
                          transition: 'background-color 0.15s',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          style={{ width: '16px', height: '16px', accentColor: '#017DF9', cursor: 'pointer' }}
                        />
                        <span style={{ fontFamily: '"Public Sans", sans-serif', fontSize: '14px', color: '#4A4A4A' }}>
                          {dept.name}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Field 5: Batch Visibility (College / Years) */}
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
                Batch Visibility (College)
              </label>
              <span
                style={{
                  fontFamily: '"Public Sans", sans-serif',
                  fontSize: '12px',
                  color: 'rgb(155, 155, 155)',
                  fontWeight: 400,
                }}
              >
                (Note - Keeping this blank means test is visible to all batches)
              </span>
            </div>
            <div ref={batchVisRef} style={{ position: 'relative', width: '100%' }}>
              <div
                onClick={() => setBatchVisOpen(!batchVisOpen)}
                style={{
                  display: 'flex',
                  height: '48px',
                  padding: '0px 16px',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  border: '1px solid rgb(240, 240, 240)',
                  backgroundColor: 'rgb(255, 255, 255)',
                  borderRadius: '10px',
                  boxSizing: 'border-box',
                  width: '100%',
                  fontFamily: '"Public Sans", sans-serif',
                  fontSize: '14px',
                  color: batchVisibility.length > 0 ? 'rgb(52, 52, 52)' : 'rgb(193, 193, 193)',
                  cursor: 'pointer',
                  overflow: 'hidden',
                  whiteSpace: 'nowrap',
                  textOverflow: 'ellipsis',
                }}
              >
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: '20px' }}>
                  {displayBatchVisibility()}
                </span>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgb(114, 114, 114)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </div>

              {batchVisOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: '52px',
                    left: 0,
                    width: '100%',
                    maxHeight: '220px',
                    overflowY: 'auto',
                    backgroundColor: '#ffffff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    zIndex: 200,
                  }}
                >
                  {/* Option: All */}
                  <div
                    onClick={() => handleToggleBatch('All')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '10px 16px',
                      cursor: 'pointer',
                      backgroundColor: batchVisibility.includes('All') ? '#F4F9FF' : 'transparent',
                      borderBottom: '1px solid #f0f0f0',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={batchVisibility.includes('All')}
                      onChange={() => {}}
                      style={{ width: '16px', height: '16px', accentColor: '#017DF9', cursor: 'pointer' }}
                    />
                    <span style={{ fontFamily: '"Public Sans", sans-serif', fontSize: '14px', fontWeight: 600, color: '#343434' }}>
                      All
                    </span>
                  </div>

                  {/* Batches / Years only */}
                  {batches.map((year) => {
                    const isChecked = batchVisibility.includes(year);
                    return (
                      <div
                        key={year}
                        onClick={() => handleToggleBatch(year)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          padding: '10px 16px',
                          cursor: 'pointer',
                          backgroundColor: isChecked ? '#F4F9FF' : 'transparent',
                          transition: 'background-color 0.15s',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          style={{ width: '16px', height: '16px', accentColor: '#017DF9', cursor: 'pointer' }}
                        />
                        <span style={{ fontFamily: '"Public Sans", sans-serif', fontSize: '14px', color: '#4A4A4A' }}>
                          {year}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Field 6: Test Description */}
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
              Test Description
            </label>
            <RichTextEditor
              value={description}
              onChange={setDescription}
              placeholder="Enter description"
              minHeight="120px"
            />
          </div>

          {/* Field 7: Test Instructions */}
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
              Test Instructions
            </label>
            <RichTextEditor
              value={instructions}
              onChange={setInstructions}
              placeholder="Enter Instructions"
              minHeight="140px"
            />
          </div>

          {/* Field 8: Number of tab switches allowed */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '8px', width: '100%' }}>
            <label
              htmlFor="tabSwitchLimit"
              style={{
                fontFamily: '"Public Sans", sans-serif',
                fontSize: '14px',
                fontWeight: 500,
                color: 'rgb(52, 52, 52)',
                lineHeight: '150%',
              }}
            >
              Number of tab switches allowed
            </label>
            <div
              style={{
                display: 'flex',
                height: '48px',
                padding: '0px 16px',
                alignItems: 'center',
                alignSelf: 'stretch',
                border: '1px solid rgb(240, 240, 240)',
                backgroundColor: 'rgb(255, 255, 255)',
                borderRadius: '10px',
                boxSizing: 'border-box',
                width: '100%',
              }}
            >
              <input
                id="tabSwitchLimit"
                name="tabSwitchLimit"
                type="number"
                min={1}
                value={tabSwitches}
                onChange={(e) => setTabSwitches(Number(e.target.value))}
                placeholder="Enter number of tab switches allowed during test"
                style={{
                  border: 'none',
                  outline: 'none',
                  width: '100%',
                  height: '100%',
                  fontFamily: '"Public Sans", sans-serif',
                  fontSize: '14px',
                  color: 'rgb(52, 52, 52)',
                  background: 'transparent',
                }}
              />
            </div>
          </div>

          {/* Field 9: Jumble Questions */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '12px', width: '100%' }}>
            <label
              style={{
                fontFamily: '"Public Sans", sans-serif',
                fontSize: '14px',
                fontWeight: 500,
                color: 'rgb(52, 52, 52)',
                lineHeight: '150%',
              }}
            >
              Jumble Questions for applications
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontFamily: '"Public Sans", sans-serif', fontSize: '14px', color: 'rgb(52, 52, 52)' }}>
                <input
                  type="radio"
                  name="jumbleQuest"
                  checked={jumbleQuestions === true}
                  onChange={() => setJumbleQuestions(true)}
                  style={{ width: '18px', height: '18px', accentColor: 'rgb(1, 125, 249)', cursor: 'pointer' }}
                />
                Yes
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontFamily: '"Public Sans", sans-serif', fontSize: '14px', color: 'rgb(52, 52, 52)' }}>
                <input
                  type="radio"
                  name="jumbleQuest"
                  checked={jumbleQuestions === false}
                  onChange={() => setJumbleQuestions(false)}
                  style={{ width: '18px', height: '18px', accentColor: 'rgb(1, 125, 249)', cursor: 'pointer' }}
                />
                No
              </label>
            </div>
          </div>

          {/* Field 10: Show performance report */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '12px', width: '100%' }}>
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
                Show performance report after the completion of the test to candidates?
              </label>
              <span
                style={{
                  fontFamily: '"Public Sans", sans-serif',
                  fontSize: '12px',
                  color: 'rgb(155, 155, 155)',
                  fontWeight: 400,
                }}
              >
                (Note : Answers / Explanation / Performance Stats will become visible)
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontFamily: '"Public Sans", sans-serif', fontSize: '14px', color: 'rgb(52, 52, 52)' }}>
                <input
                  type="radio"
                  name="showReport"
                  checked={showReport === true}
                  onChange={() => setShowReport(true)}
                  style={{ width: '18px', height: '18px', accentColor: 'rgb(1, 125, 249)', cursor: 'pointer' }}
                />
                Yes
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontFamily: '"Public Sans", sans-serif', fontSize: '14px', color: 'rgb(52, 52, 52)' }}>
                <input
                  type="radio"
                  name="showReport"
                  checked={showReport === false}
                  onChange={() => setShowReport(false)}
                  style={{ width: '18px', height: '18px', accentColor: 'rgb(1, 125, 249)', cursor: 'pointer' }}
                />
                No
              </label>
            </div>
          </div>

          {/* Submit Button */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%', marginTop: '16px' }}>
            <button
              type="submit"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '42px',
                padding: '10px 48px',
                backgroundColor: 'rgb(1, 125, 249)',
                color: 'rgb(255, 255, 255)',
                fontFamily: '"Public Sans", sans-serif',
                fontSize: '14px',
                fontWeight: 600,
                lineHeight: '150%',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgb(0, 110, 225)')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'rgb(1, 125, 249)')}
            >
              Next
            </button>
          </div>
        </form>
      </div>

      {/* Floating Toast Notification */}
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
