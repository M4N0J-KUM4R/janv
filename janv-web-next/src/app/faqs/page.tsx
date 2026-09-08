'use client';

import { useEffect, useState } from 'react';
import Breadcrumb from '@/components/layout/Breadcrumb';
import { analytics } from '@/lib/api';
import type { Faq } from '@/lib/types';

export default function FaqsPage() {
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  useEffect(() => {
    analytics
      .faqs()
      .then((data) => setFaqs(data || []))
      .catch((err) => {
        console.error('Failed to load FAQs:', err);
        setFaqs([]);
      });
  }, []);

  return (
    <div>
      <Breadcrumb items={[{ label: 'Assessments' }, { label: 'FAQs', href: '/faqs' }]} />

      <h1 className="page-title">Frequently Asked Questions</h1>
      <p className="page-subtitle">Find answers to common questions about tests, grading, and platform policies.</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '800px' }}>
        {faqs.length === 0 ? (
          <div className="card" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No FAQs published at this time.
          </div>
        ) : (
          faqs.map((faq, idx) => (
            <div key={faq.id || idx} className="card">
              <div
                className="card-header"
                style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                onClick={() => setOpenIdx(openIdx === idx ? null : idx)}
              >
                <span>{faq.question}</span>
                <span>{openIdx === idx ? '▲' : '▼'}</span>
              </div>
              {openIdx === idx && (
                <div className="card-body" style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  {faq.answer}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
