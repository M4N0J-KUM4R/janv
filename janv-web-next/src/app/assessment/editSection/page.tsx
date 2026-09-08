'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Breadcrumb from '@/components/layout/Breadcrumb';
import { assessments } from '@/lib/api';

function EditSectionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sectionId = searchParams.get('sectionId') || searchParams.get('id') || '';
  const testCode = searchParams.get('testCode') || '';
  const testName = searchParams.get('testName') || '';

  const [sectionName, setSectionName] = useState('');
  const [sectionDuration, setSectionDuration] = useState<number | string>('');
  const [sectionType, setSectionType] = useState<string>('1');
  const [defaultMarks, setDefaultMarks] = useState<number | string>(1);
  const [penaltyMarks, setPenaltyMarks] = useState<number | string>(0);
  const [displayQuestions, setDisplayQuestions] = useState<number | string>('');
  const [instructions, setInstructions] = useState('');

  const [loading, setLoading] = useState(Boolean(sectionId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!sectionId) return;

    let ignore = false;
    assessments.getSection(sectionId)
      .then((sec) => {
        if (!ignore) {
          setSectionName(sec.title || '');
          setSectionDuration(sec.sectionDuration ?? '');
          setSectionType(sec.sectionType === '2' || sec.sectionType?.toLowerCase().includes('code') ? '2' : '1');
          setDefaultMarks(sec.defaultMarks ?? 1);
          setPenaltyMarks(sec.penaltyMarks ?? 0);
          setDisplayQuestions(sec.displayQuestions ?? '');
          setInstructions(sec.sectionInstructions || '');
        }
      })
      .catch((err) => {
        if (!ignore) setError(err instanceof Error ? err.message : 'Failed to load section');
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [sectionId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sectionName.trim()) {
      setError('Section name is required');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      await assessments.updateSection(sectionId, {
        title: sectionName.trim(),
        sectionDuration: Number(sectionDuration) || 30,
        section_type: sectionType === '2' ? 'Coding' : 'Aptitude',
        defaultMarks: Number(defaultMarks) || 1,
        penaltyMarks: Number(penaltyMarks) || 0,
        displayQuestions: sectionType === '2' ? undefined : (displayQuestions !== '' ? Number(displayQuestions) : undefined),
        sectionInstructions: instructions.trim() || undefined,
      });

      setSuccess(true);
      setTimeout(() => {
        router.back();
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error updating section');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '24px 32px 60px' }}>
      <Breadcrumb
        items={[
          { label: 'Assessments', href: '/assessment' },
          { label: 'My Tests', href: '/assessment/mytests' },
          { label: testName || 'Edit Test', href: '#' },
          { label: 'Edit Section', href: '#' },
        ]}
      />

      <div style={{ marginTop: '28px', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 600, color: '#343434', margin: 0, fontFamily: '"Public Sans", sans-serif' }}>
          Edit Section: {sectionName || 'Loading...'} {testCode ? `(${testCode})` : ''}
        </h1>
        <p style={{ margin: '4px 0 0', color: '#727272', fontSize: '14px' }}>
          Configure section duration, marking rules, and instructions.
        </p>
      </div>

      {success && (
        <div style={{ padding: '12px 16px', backgroundColor: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: '8px', color: '#065F46', marginBottom: '20px', fontSize: '14px' }}>
          ✓ Section updated successfully! Redirecting...
        </div>
      )}

      {error && (
        <div style={{ padding: '12px 16px', backgroundColor: '#FEE2E2', border: '1px solid #FCA5A5', borderRadius: '8px', color: '#B91C1C', marginBottom: '20px', fontSize: '14px' }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#8B909A' }}>Loading section details...</div>
      ) : (
        <form onSubmit={handleSubmit} style={{ backgroundColor: '#FFFFFF', padding: '28px', borderRadius: '12px', border: '1px solid #F0F0F0' }}>
          {/* Section Name & Duration */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px', marginBottom: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#4A4A4A', marginBottom: '6px' }}>Section Name *</label>
              <input
                type="text"
                value={sectionName}
                onChange={(e) => setSectionName(e.target.value)}
                placeholder="e.g. Quantitative Aptitude"
                style={{ width: '100%', height: '42px', padding: '0 12px', borderRadius: '8px', border: '1px solid #E2E2E2', fontSize: '14px', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#4A4A4A', marginBottom: '6px' }}>Duration (mins) *</label>
              <input
                type="number"
                min={1}
                max={300}
                value={sectionDuration}
                onChange={(e) => setSectionDuration(e.target.value)}
                style={{ width: '100%', height: '42px', padding: '0 12px', borderRadius: '8px', border: '1px solid #E2E2E2', fontSize: '14px', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          {/* Section Type, Default Marks, Penalty Marks */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#4A4A4A', marginBottom: '6px' }}>Section Type</label>
              <select
                value={sectionType}
                onChange={(e) => setSectionType(e.target.value)}
                style={{ width: '100%', height: '42px', padding: '0 12px', borderRadius: '8px', border: '1px solid #E2E2E2', fontSize: '14px', backgroundColor: '#FFF' }}
              >
                <option value="1">MCQ / Aptitude</option>
                <option value="2">Coding</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#4A4A4A', marginBottom: '6px' }}>Default Marks</label>
              <input
                type="number"
                min={0}
                step="any"
                value={defaultMarks}
                onChange={(e) => setDefaultMarks(e.target.value)}
                style={{ width: '100%', height: '42px', padding: '0 12px', borderRadius: '8px', border: '1px solid #E2E2E2', fontSize: '14px', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#4A4A4A', marginBottom: '6px' }}>Negative / Penalty Marks</label>
              <input
                type="number"
                min={0}
                step="any"
                value={penaltyMarks}
                onChange={(e) => setPenaltyMarks(e.target.value)}
                style={{ width: '100%', height: '42px', padding: '0 12px', borderRadius: '8px', border: '1px solid #E2E2E2', fontSize: '14px', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          {/* Display Questions (MCQ only) */}
          {sectionType !== '2' && (
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#4A4A4A', marginBottom: '6px' }}>
                Display Questions Count (Leave empty to display all questions)
              </label>
              <input
                type="number"
                min={1}
                value={displayQuestions}
                onChange={(e) => setDisplayQuestions(e.target.value)}
                placeholder="Optional subset count"
                style={{ width: '100%', height: '42px', padding: '0 12px', borderRadius: '8px', border: '1px solid #E2E2E2', fontSize: '14px', boxSizing: 'border-box' }}
              />
            </div>
          )}

          {/* Instructions */}
          <div style={{ marginBottom: '28px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#4A4A4A', marginBottom: '6px' }}>Section Instructions (Optional)</label>
            <textarea
              rows={3}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Instructions specific to this section..."
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #E2E2E2', fontSize: '14px', fontFamily: 'inherit', boxSizing: 'border-box' }}
            />
          </div>

          {/* Action buttons */}
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
              disabled={saving}
              style={{
                height: '42px',
                padding: '0 24px',
                borderRadius: '8px',
                backgroundColor: '#017DF9',
                color: '#FFF',
                border: 'none',
                fontSize: '14px',
                fontWeight: 500,
                cursor: saving ? 'not-allowed' : 'pointer',
              }}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export default function EditSectionPage() {
  return (
    <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center' }}>Loading section editor...</div>}>
      <EditSectionContent />
    </Suspense>
  );
}
