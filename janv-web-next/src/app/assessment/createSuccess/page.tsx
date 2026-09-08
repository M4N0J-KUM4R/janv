'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Breadcrumb from '@/components/layout/Breadcrumb';

interface SectionItem {
  _id: string;
  id?: string;
  sectionName: string;
  Questions: number;
  sectionDuration: number;
  sectionType: string;
}

function CreateSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const assessmentId = searchParams.get('id') || searchParams.get('assessmentId') || '';

  const [sections, setSections] = useState<SectionItem[]>([]);
  const [selected, setSelected] = useState<{ [key: number]: boolean }>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!assessmentId) {
      setLoading(false);
      return;
    }

    fetch(`/api/v2/assessment/section/${assessmentId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data?.list) {
          setSections(data.list);
        }
      })
      .catch((err) => console.error('Failed to load sections:', err))
      .finally(() => setLoading(false));
  }, [assessmentId]);

  const handleDeleteSection = async (sectionId: string) => {
    if (sections.length <= 1) return;
    try {
      const res = await fetch(`/api/v2/assessment/section/${sectionId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setSections(sections.filter((s) => s._id !== sectionId && s.id !== sectionId));
      }
    } catch (err) {
      console.error('Failed to delete section:', err);
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '60px' }}>
      <Breadcrumb
        items={[
          { label: 'Assessments', href: '/assessment' },
          { label: 'Create Test', href: '/assessment/create' },
          { label: 'Success', href: '/assessment/createSuccess' },
        ]}
      />

      <div
        style={{
          width: '100%',
          display: 'flex',
          marginTop: '40px',
          paddingLeft: '44px',
          paddingRight: '44px',
          flexDirection: 'column',
          gap: '48px',
          marginBottom: '25px',
          boxSizing: 'border-box',
        }}
      >
        {/* Top Congratulation Section */}
        <div
          style={{
            display: 'inline-flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '24px',
            width: '100%',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '8px',
              alignSelf: 'stretch',
            }}
          >
            <img
              src="/static/media/congatulation-icon.d04ee2b45fcfc3334f516c43e2ce0176.svg"
              width="115"
              height="86"
              alt="Congrats"
              style={{ objectFit: 'contain' }}
            />
            <p
              style={{
                color: '#F25E68',
                textAlign: 'center',
                fontFamily: '"Public Sans", sans-serif',
                fontSize: '20px',
                fontWeight: 600,
                lineHeight: '1.4',
                margin: 0,
              }}
            >
              Congratulations you have successfully
              <br />
              completed the test !!
            </p>
          </div>

          <button
            type="button"
            onClick={() => router.push('/assessment/mytests')}
            style={{
              display: 'flex',
              height: '48px',
              padding: '16px 24px',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '8px',
              borderRadius: '8px',
              backgroundColor: '#017DF9',
              border: 'none',
              cursor: 'pointer',
              color: '#FFF',
              fontFamily: '"Public Sans", sans-serif',
              fontSize: '16px',
              fontWeight: 500,
              lineHeight: '130%',
              boxShadow: '0 2px 4px rgba(1, 125, 249, 0.2)',
            }}
          >
            View Created Test
          </button>
        </div>

        {/* Bottom Section with Blue Alert and Table */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            gap: '16px',
            width: '100%',
          }}
        >
          {/* Blue Alert Banner */}
          <div
            style={{
              display: 'flex',
              padding: '12px 16px',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '10px',
              borderRadius: '8px',
              backgroundColor: '#E9F4FF',
              width: '100%',
              boxSizing: 'border-box',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                alignSelf: 'stretch',
              }}
            >
              <img
                src="/static/media/error-blue-alert.914414c431ad0b69562885899a169c85.svg"
                width="24"
                height="24"
                alt="alert"
              />
              <span
                style={{
                  color: '#017DF9',
                  fontFamily: '"Public Sans", sans-serif',
                  fontSize: '16px',
                  fontWeight: 500,
                  lineHeight: '150%',
                }}
              >
                Add questions in each section of the test from the table below
              </span>
            </div>
          </div>

          {/* Section Table */}
          <div
            style={{
              width: '100%',
              backgroundColor: '#FFFFFF',
              borderRadius: '8px',
              border: '1px solid #F0F0F0',
              overflow: 'hidden',
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#FAFAFA', borderBottom: '1px solid #F0F0F0' }}>
                  <th style={{ padding: '12px 16px', width: '40px' }}>
                    <input
                      type="checkbox"
                      style={{ width: '14px', height: '14px', cursor: 'pointer' }}
                      checked={sections.length > 0 && Object.keys(selected).length === sections.length}
                      onChange={(e) => {
                        const isChecked = e.target.checked;
                        const newSel: { [key: number]: boolean } = {};
                        if (isChecked) {
                          sections.forEach((_, idx) => (newSel[idx] = true));
                        }
                        setSelected(newSel);
                      }}
                    />
                  </th>
                  <th style={headerStyle}>S.NO</th>
                  <th style={headerStyle}>SECTION NAME</th>
                  <th style={headerStyle}>QUESTION</th>
                  <th style={headerStyle}>DURATION</th>
                  <th style={headerStyle}>TYPE</th>
                  <th style={{ ...headerStyle, textAlign: 'center', width: '60px' }}></th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: '#8B909A' }}>
                      Loading test sections...
                    </td>
                  </tr>
                ) : sections.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: '#8B909A' }}>
                      No sections configured for this test yet.
                    </td>
                  </tr>
                ) : (
                  sections.map((sec, idx) => {
                    const isMcq = sec.sectionType === '1' || sec.sectionType?.toLowerCase().includes('apt') || sec.sectionType?.toLowerCase().includes('mcq');
                    return (
                      <tr key={sec._id || sec.id || idx} style={{ borderBottom: '1px solid #F0F0F0' }}>
                        <td style={{ padding: '14px 16px' }}>
                          <input
                            type="checkbox"
                            checked={Boolean(selected[idx])}
                            onChange={(e) => setSelected({ ...selected, [idx]: e.target.checked })}
                            style={{ width: '14px', height: '14px', cursor: 'pointer' }}
                          />
                        </td>
                        <td style={{ ...cellStyle, color: '#727272' }}>{idx + 1}</td>
                        <td style={{ ...cellStyle, color: '#4A4A4A', fontWeight: 600 }}>{sec.sectionName}</td>
                        <td style={{ ...cellStyle, color: '#4A4A4A' }}>{sec.Questions || 0} Question</td>
                        <td style={{ ...cellStyle, color: '#4A4A4A' }}>{sec.sectionDuration} min</td>
                        <td style={{ padding: '14px 16px' }}>
                          <div
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: isMcq ? '4px 8px' : '4px 6px',
                              borderRadius: isMcq ? '19px' : '15px',
                              border: isMcq ? '1px solid #5BD3A0' : '1px solid #EBD5FF',
                              backgroundColor: isMcq ? '#EBFAF3' : '#F9F1FF',
                            }}
                          >
                            <img
                              src={isMcq ? '/static/media/mcq-icon.62d72278489f763bcdcb5d806093069a.svg' : '/static/media/code-icon.f87570319ac82c562fbd55e59ebaf29f.svg'}
                              width="12"
                              height="12"
                              alt="type"
                            />
                            <span
                              style={{
                                color: isMcq ? '#2EB67C' : '#944DE7',
                                fontFamily: '"Public Sans", sans-serif',
                                fontSize: '10px',
                                fontWeight: 600,
                              }}
                            >
                              {isMcq ? 'MCQs' : 'CODING'}
                            </span>
                          </div>
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                          <img
                            src="/static/media/delete-icon.a596eed13e7433c545202cecf62c49ef.svg"
                            alt="delete"
                            width="16"
                            height="16"
                            onClick={() => handleDeleteSection(sec._id || sec.id || '')}
                            style={{
                              cursor: sections.length > 1 ? 'pointer' : 'not-allowed',
                              opacity: sections.length > 1 ? 1 : 0.4,
                            }}
                          />
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
  );
}

const headerStyle: React.CSSProperties = {
  padding: '14px 16px',
  color: '#9B9B9B',
  fontFamily: '"Public Sans", sans-serif',
  fontSize: '12px',
  fontWeight: 500,
  lineHeight: '130%',
  whiteSpace: 'nowrap',
};

const cellStyle: React.CSSProperties = {
  padding: '14px 16px',
  fontFamily: '"Public Sans", sans-serif',
  fontSize: '12px',
  fontWeight: 500,
  lineHeight: '130%',
};

export default function CreateSuccessPage() {
  return (
    <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center' }}>Loading...</div>}>
      <CreateSuccessContent />
    </Suspense>
  );
}
