'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Breadcrumb from '@/components/layout/Breadcrumb';
import { IconSearch } from '@/components/common/Icons';
import { assessments } from '@/lib/api';
import type { Assessment } from '@/lib/types';

function CourseAssessmentsContent() {
  const searchParams = useSearchParams();
  const courseIdParam = searchParams.get('courseId') || searchParams.get('course_id') || '';

  const [courseAssessments, setCourseAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    assessments
      .listCourseAssessments(courseIdParam || undefined)
      .then((res) => {
        if (!ignore) {
          setCourseAssessments(res.data || []);
          setError(null);
        }
      })
      .catch((err) => {
        if (!ignore) {
          setError(err instanceof Error ? err.message : 'Failed to load course assessments');
        }
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [courseIdParam]);

  const filtered = courseAssessments.filter(
    (a) =>
      a.title.toLowerCase().includes(search.toLowerCase()) ||
      (a.test_code && a.test_code.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div style={{ padding: '24px 32px', maxWidth: '1440px', margin: '0 auto' }}>
      <Breadcrumb
        items={[
          { label: 'Assessment', href: '/assessment/mytests' },
          { label: 'Course Assessments' },
        ]}
      />

      <div
        style={{
          marginTop: '16px',
          marginBottom: '24px',
          backgroundColor: '#fff',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          border: '1px solid #E5E7EB',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#111827', margin: '0 0 6px 0' }}>
            Course-Linked Assessments
          </h1>
          <p style={{ margin: 0, fontSize: '14px', color: '#6B7280' }}>
            Assessments mapped to curricular courses and training modules.
          </p>
        </div>

        <div style={{ position: 'relative', width: '320px' }}>
          <span style={{ position: 'absolute', left: '12px', top: '10px', color: '#9CA3AF' }}>
            <IconSearch />
          </span>
          <input
            type="text"
            placeholder="Search course tests..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '9px 12px 9px 36px',
              borderRadius: '8px',
              border: '1px solid #D1D5DB',
              fontSize: '14px',
              outline: 'none',
            }}
          />
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '64px', textAlign: 'center', color: '#6B7280' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              border: '3px solid #E5E7EB',
              borderTopColor: '#4F46E5',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 16px auto',
            }}
          />
          Loading course assessments...
        </div>
      ) : error ? (
        <div style={{ padding: '24px', backgroundColor: '#FEF2F2', borderRadius: '8px', color: '#DC2626' }}>
          {error}
        </div>
      ) : filtered.length === 0 ? (
        <div
          style={{
            padding: '48px',
            backgroundColor: '#fff',
            borderRadius: '12px',
            border: '1px solid #E5E7EB',
            textAlign: 'center',
            color: '#6B7280',
          }}
        >
          <p style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>No Course Assessments Found</p>
          <p style={{ fontSize: '14px' }}>There are no assessments attached to courses matching this filter.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
          {filtered.map((item) => (
            <div
              key={item.id}
              style={{
                backgroundColor: '#fff',
                borderRadius: '12px',
                padding: '20px',
                border: '1px solid #E5E7EB',
                boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#111827', margin: 0 }}>{item.title}</h3>
                  {item.test_code && (
                    <span style={{ fontSize: '11px', fontWeight: '600', backgroundColor: '#DEF7EC', color: '#03543F', padding: '2px 6px', borderRadius: '4px' }}>
                      {item.test_code}
                    </span>
                  )}
                </div>
                <p style={{ fontSize: '13px', color: '#6B7280', margin: '0 0 16px 0', minHeight: '36px' }}>
                  {item.description || 'Curricular assessment module.'}
                </p>
                <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: '#4B5563', marginBottom: '16px' }}>
                  <span>⏱️ {item.duration_mins || 60}m</span>
                  <span>🎯 {item.total_marks || 100} marks</span>
                  <span>🏆 Pass: {item.pass_percentage || 40}%</span>
                </div>
              </div>

              <div style={{ borderTop: '1px solid #F3F4F6', paddingTop: '14px' }}>
                <Link
                  href={`/assessment/testDetails?id=${item.id}`}
                  style={{
                    display: 'block',
                    textAlign: 'center',
                    padding: '8px',
                    backgroundColor: '#EEF2FF',
                    color: '#4F46E5',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '600',
                    textDecoration: 'none',
                  }}
                >
                  View Performance
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CourseAssessmentsPage() {
  return (
    <Suspense fallback={<div style={{ padding: '32px', textAlign: 'center' }}>Loading Course Assessments...</div>}>
      <CourseAssessmentsContent />
    </Suspense>
  );
}
