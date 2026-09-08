'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Breadcrumb from '@/components/layout/Breadcrumb';
import { templates } from '@/lib/api';
import type { AssessmentTemplate } from '@/lib/types';

export default function TemplatesPage() {
  const [list, setList] = useState<AssessmentTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    templates
      .list()
      .then(setList)
      .catch((err) => {
        console.error('Failed to load templates:', err);
        setList([]);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <Breadcrumb
        items={[
          { label: 'Assessments', href: '/assessment' },
          { label: 'Create from Template', href: '/assessment/templates' },
        ]}
      />

      <h1 className="page-title">Assessment Templates</h1>
      <p className="page-subtitle">Choose a pre-built template to quickly instantiate tests with pre-configured rules and question sets.</p>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>Loading templates...</div>
      ) : list.length === 0 ? (
        <div className="card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <p style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>No Templates Found</p>
          <p style={{ fontSize: '14px' }}>Create custom assessments or add question sets from your test library.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
          {list.map((tpl) => (
            <div key={tpl.id} className="card">
              <div className="card-body">
                <span className="badge badge--info" style={{ marginBottom: '12px' }}>
                  {tpl.category || 'General'}
                </span>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '8px' }}>{tpl.title}</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '16px', minHeight: '40px' }}>
                  {tpl.description}
                </p>

                <div style={{ display: 'flex', gap: '16px', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
                  <span>Duration: {tpl.duration_mins} mins</span>
                  <span>Marks: {tpl.total_marks}</span>
                  <span>Pass: {tpl.pass_percentage}%</span>
                </div>

                <Link href={`/assessment/create?template_id=${tpl.id}`} className="btn btn--primary" style={{ width: '100%' }}>
                  Use Template
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
