'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { assessments } from '@/lib/api';

export default function SelectProctoringPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const assessmentId = searchParams.get('id') || searchParams.get('assessmentId');

  const [loading, setLoading] = useState(Boolean(assessmentId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Proctoring Settings State
  const [proctoringEnabled, setProctoringEnabled] = useState(true);
  const [webcamEnabled, setWebcamEnabled] = useState(true);
  const [screenShareEnabled, setScreenShareEnabled] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [tabSwitchLimit, setTabSwitchLimit] = useState(3);
  const [proctoringService, setProctoringService] = useState('prepinsta');

  useEffect(() => {
    if (!assessmentId) {
      return;
    }
    let ignore = false;
    assessments
      .getProctoring(assessmentId)
      .then((res) => {
        if (!ignore) {
          setProctoringEnabled(Boolean(res.proctoring_enabled));
          setWebcamEnabled(Boolean(res.webcam_enabled));
          setScreenShareEnabled(Boolean(res.screen_share_enabled));
          setAudioEnabled(Boolean(res.audio_enabled));
          setTabSwitchLimit(res.tab_switch_limit ?? 3);
          setProctoringService(res.proctoring_service || 'prepinsta');
        }
      })
      .catch((err) => {
        if (!ignore) {
          setError(err instanceof Error ? err.message : 'Failed to load proctoring configuration');
        }
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [assessmentId]);

  const handleSave = async () => {
    if (!assessmentId) {
      router.push('/assessment/mytests');
      return;
    }
    setSaving(true);
    try {
      await assessments.updateProctoring(assessmentId, {
        proctoring_enabled: proctoringEnabled,
        webcam_enabled: webcamEnabled,
        screen_share_enabled: screenShareEnabled,
        audio_enabled: audioEnabled,
        tab_switch_limit: Number(tabSwitchLimit),
        proctoring_service: proctoringService,
      });
      setToastMessage('Proctoring configuration updated successfully!');
      setTimeout(() => {
        router.push(`/assessment/createSuccess?id=${assessmentId}`);
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save proctoring configuration');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px' }}>
        <p>Loading proctoring options...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', paddingBottom: '60px' }}>
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
          }}
        >
          {toastMessage}
        </div>
      )}

      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-color)', marginBottom: '8px' }}>
          Select Proctoring & Security
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
          Configure live anti-cheating, webcam monitoring, and tab-switch limits for this assessment.
        </p>
      </div>

      {error && (
        <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #F87171', color: '#991B1B', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', fontSize: '0.875rem' }}>
          {error}
        </div>
      )}

      <div className="card" style={{ padding: '24px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '16px', borderBottom: '1px solid var(--border-color)', marginBottom: '20px' }}>
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Enable Automated Proctoring</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Enforce video recording and candidate verification</p>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={proctoringEnabled}
              onChange={(e) => setProctoringEnabled(e.target.checked)}
              style={{ width: '20px', height: '20px', cursor: 'pointer' }}
            />
          </label>
        </div>

        {proctoringEnabled && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Proctoring Provider */}
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600 }}>Proctoring Engine</label>
              <select
                className="form-input"
                value={proctoringService}
                onChange={(e) => setProctoringService(e.target.value)}
              >
                <option value="prepinsta">PrepInsta AI Proctoring Engine (Native)</option>
                <option value="autoproctor">AutoProctor Live Guard</option>
                <option value="talview">Talview Automated Proctoring</option>
              </select>
            </div>

            {/* Webcam Recording */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Candidate Webcam Verification</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Require camera feed and face detection throughout the exam</div>
              </div>
              <input
                type="checkbox"
                checked={webcamEnabled}
                onChange={(e) => setWebcamEnabled(e.target.checked)}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
            </div>

            {/* Screen Share */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Entire Screen Sharing</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Require desktop screen capture to detect external windows</div>
              </div>
              <input
                type="checkbox"
                checked={screenShareEnabled}
                onChange={(e) => setScreenShareEnabled(e.target.checked)}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
            </div>

            {/* Audio Recording */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Microphone & Audio Monitoring</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Detect background voices and external audio cues</div>
              </div>
              <input
                type="checkbox"
                checked={audioEnabled}
                onChange={(e) => setAudioEnabled(e.target.checked)}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
            </div>

            {/* Tab Switch Limit */}
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600 }}>
                Maximum Tab / Window Switches Allowed
              </label>
              <input
                type="number"
                min={0}
                max={20}
                className="form-input"
                value={tabSwitchLimit}
                onChange={(e) => setTabSwitchLimit(Math.max(0, parseInt(e.target.value) || 0))}
                style={{ maxWidth: '200px' }}
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                Test will auto-submit when the candidate exceeds this number of violations (0 for unlimited).
              </span>
            </div>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
        <button
          type="button"
          className="btn btn--secondary"
          onClick={() => router.back()}
          disabled={saving}
        >
          Cancel
        </button>
        <button
          type="button"
          className="btn btn--primary"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save & Continue'}
        </button>
      </div>
    </div>
  );
}
