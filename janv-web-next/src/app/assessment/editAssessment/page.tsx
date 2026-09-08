'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Breadcrumb from '@/components/layout/Breadcrumb';
import { assessments } from '@/lib/api';

function EditAssessmentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const assessmentId = searchParams.get('id') || searchParams.get('assessmentId') || '';

  const [title, setTitle] = useState('');
  const [testCode, setTestCode] = useState('');
  const [description, setDescription] = useState('');
  const [instructions, setInstructions] = useState('');
  const [tabSwitchesAllowed, setTabSwitchesAllowed] = useState<number>(10);
  const [shuffleQuestions, setShuffleQuestions] = useState<boolean>(false);
  const [showResults, setShowResults] = useState<boolean>(false);
  const [isProctoring, setIsProctoring] = useState<boolean>(false);

  const [loading, setLoading] = useState(Boolean(assessmentId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!assessmentId) return;

    let ignore = false;
    assessments.get(assessmentId)
      .then((data) => {
        if (!ignore) {
          const item = data.assessment;
          if (item) {
            setTitle(item.title || '');
            setTestCode(item.test_code || '');
            setDescription(item.description || '');
            setInstructions(item.instructions || '');
            setTabSwitchesAllowed(item.tab_switches_allowed ?? 10);
            setShuffleQuestions(Boolean(item.shuffle_questions));
            setShowResults(Boolean(item.show_results));
            setIsProctoring(Boolean(item.is_proctoring));
          }
        }
      })
      .catch((err) => {
        if (!ignore) setError(err instanceof Error ? err.message : 'Failed to load assessment');
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [assessmentId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Test name is required');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      await assessments.update(assessmentId, {
        title: title.trim(),
        description: description.trim() || undefined,
        instructions: instructions.trim() || undefined,
        tab_switches_allowed: Number(tabSwitchesAllowed) || 10,
        shuffle_questions: shuffleQuestions,
        show_results: showResults,
        is_proctoring: isProctoring,
      });

      setSuccess(true);
      setTimeout(() => {
        router.push(`/assessment/createSuccess?id=${assessmentId}`);
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error updating assessment');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '24px 32px 60px' }}>
      <Breadcrumb
        items={[
          { label: 'Assessments', href: '/assessment' },
          { label: 'My Tests', href: '/assessment/mytests' },
          { label: title || 'Assessment', href: `/assessment/createSuccess?id=${assessmentId}` },
          { label: 'Edit Assessment', href: '#' },
        ]}
      />

      <div style={{ marginTop: '28px', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 600, color: '#343434', margin: 0, fontFamily: '"Public Sans", sans-serif' }}>
          Edit Assessment: {title || 'Loading...'} {testCode ? `(${testCode})` : ''}
        </h1>
        <p style={{ margin: '4px 0 0', color: '#727272', fontSize: '14px' }}>
          Update test configuration, instructions, and proctoring rules.
        </p>
      </div>

      {success && (
        <div style={{ padding: '12px 16px', backgroundColor: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: '8px', color: '#065F46', marginBottom: '20px', fontSize: '14px' }}>
          ✓ Assessment updated successfully! Redirecting...
        </div>
      )}

      {error && (
        <div style={{ padding: '12px 16px', backgroundColor: '#FEE2E2', border: '1px solid #FCA5A5', borderRadius: '8px', color: '#B91C1C', marginBottom: '20px', fontSize: '14px' }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#8B909A' }}>Loading assessment details...</div>
      ) : (
        <form onSubmit={handleSubmit} style={{ backgroundColor: '#FFFFFF', padding: '28px', borderRadius: '12px', border: '1px solid #F0F0F0' }}>
          {/* Test Name & Test Code */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px', marginBottom: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#4A4A4A', marginBottom: '6px' }}>Test Name *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Test title..."
                style={{ width: '100%', height: '42px', padding: '0 12px', borderRadius: '8px', border: '1px solid #E2E2E2', fontSize: '14px', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#4A4A4A', marginBottom: '6px' }}>Test Code</label>
              <input
                type="text"
                value={testCode}
                readOnly
                disabled
                style={{ width: '100%', height: '42px', padding: '0 12px', borderRadius: '8px', border: '1px solid #E2E2E2', backgroundColor: '#FAFAFA', color: '#888', fontSize: '14px', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          {/* Description */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#4A4A4A', marginBottom: '6px' }}>Description</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the test..."
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #E2E2E2', fontSize: '14px', fontFamily: 'inherit', boxSizing: 'border-box' }}
            />
          </div>

          {/* Instructions */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#4A4A4A', marginBottom: '6px' }}>Test Instructions</label>
            <textarea
              rows={4}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Candidate instructions before starting..."
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #E2E2E2', fontSize: '14px', fontFamily: 'inherit', boxSizing: 'border-box' }}
            />
          </div>

          {/* Settings Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#4A4A4A', marginBottom: '6px' }}>Tab-Switch Limit</label>
              <input
                type="number"
                min={0}
                max={50}
                value={tabSwitchesAllowed}
                onChange={(e) => setTabSwitchesAllowed(Number(e.target.value) || 0)}
                style={{ width: '100%', height: '42px', padding: '0 12px', borderRadius: '8px', border: '1px solid #E2E2E2', fontSize: '14px', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600, color: '#4A4A4A', cursor: 'pointer', marginTop: '16px' }}>
                <input
                  type="checkbox"
                  checked={shuffleQuestions}
                  onChange={(e) => setShuffleQuestions(e.target.checked)}
                  style={{ width: '18px', height: '18px', accentColor: '#017DF9' }}
                />
                Shuffle Questions
              </label>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600, color: '#4A4A4A', cursor: 'pointer', marginTop: '16px' }}>
                <input
                  type="checkbox"
                  checked={showResults}
                  onChange={(e) => setShowResults(e.target.checked)}
                  style={{ width: '18px', height: '18px', accentColor: '#017DF9' }}
                />
                Show Results After Completion
              </label>
            </div>
          </div>

          {/* Proctoring */}
          <div style={{ marginBottom: '28px', padding: '16px', backgroundColor: '#FAFAFA', borderRadius: '8px', border: '1px solid #F0F0F0' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 600, color: '#343434', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={isProctoring}
                onChange={(e) => setIsProctoring(e.target.checked)}
                style={{ width: '18px', height: '18px', accentColor: '#017DF9' }}
              />
              Enable Online Proctoring for this Test
            </label>
            <p style={{ margin: '6px 0 0 26px', fontSize: '12px', color: '#727272' }}>
              When enabled, candidate tab switches, focus losses, and webcam status will be logged.
            </p>
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
              {saving ? 'Saving...' : 'Save Assessment'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export default function EditAssessmentPage() {
  return (
    <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center' }}>Loading assessment editor...</div>}>
      <EditAssessmentContent />
    </Suspense>
  );
}
