'use client';

import { Suspense } from 'react';
import GoogleFormsQuestionBuilder from '@/components/assessment/GoogleFormsQuestionBuilder';

export default function AddQuestionPage() {
  return (
    <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center' }}>Loading question builder...</div>}>
      <GoogleFormsQuestionBuilder />
    </Suspense>
  );
}
