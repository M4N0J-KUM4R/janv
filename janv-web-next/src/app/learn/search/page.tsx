'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Breadcrumb from '@/components/layout/Breadcrumb';
import { admin } from '@/lib/api';

interface StudentMatch {
  name: string;
  email: string;
  batchBranch: string;
  started: string;
  completed: string;
}

export default function SearchStudentPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<StudentMatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doSearch = useCallback(async (searchQuery: string) => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    setLoading(true);
    setError(null);
    setHasSearched(true);

    try {
      const res = await admin.searchStudents(trimmed);
      const mapped: StudentMatch[] = (res.data || []).map((u) => ({
        name: u.full_name || '',
        email: u.email || '',
        batchBranch: [u.batch, (u as any).branch || u.department].filter(Boolean).join(' | ') || '-',
        started: '0 Started',
        completed: '0 Completed',
      }));
      setResults(mapped);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to search students');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      doSearch(query);
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, doSearch]);

  return (
    <div>
      <Breadcrumb items={[{ label: 'Learning' }, { label: 'Search Student', href: '/learn/search' }]} />

      <h1 style={{ fontSize: '18px', fontWeight: 600, color: 'rgb(35, 39, 46)', margin: '0 0 24px 0', fontFamily: '"Public Sans", sans-serif' }}>
        Search a student
      </h1>

      {/* Search Input Box */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          width: '100%',
          maxWidth: '420px',
          height: '48px',
          backgroundColor: '#ffffff',
          border: '1px solid rgb(224, 224, 224)',
          borderRadius: '8px',
          padding: '0 16px',
          marginBottom: '32px',
        }}
      >
        <svg viewBox="0 0 24 24" style={{ width: '20px', height: '20px', fill: 'rgb(114, 114, 114)', flexShrink: 0 }}>
          <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
        </svg>
        <input
          type="text"
          placeholder="Search a student by email/phone"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{
            border: 'none',
            outline: 'none',
            width: '100%',
            fontSize: '14px',
            color: 'rgb(35, 39, 46)',
            backgroundColor: 'transparent',
          }}
        />
        {loading && (
          <svg width="18" height="18" viewBox="0 0 24 24" style={{ animation: 'spin 1s linear infinite', flexShrink: 0 }}>
            <circle cx="12" cy="12" r="10" stroke="rgb(114, 114, 114)" strokeWidth="3" fill="none" strokeDasharray="31.4 31.4" strokeLinecap="round" />
          </svg>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div
          style={{
            padding: '10px 16px',
            background: '#FEF2F2',
            color: '#DC2626',
            borderRadius: '8px',
            marginBottom: '16px',
            fontSize: '13px',
            fontWeight: 500,
            border: '1px solid #FECACA',
          }}
        >
          {error}
        </div>
      )}

      {/* Table Card */}
      <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid rgb(240, 240, 240)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgb(240, 240, 240)', color: 'rgb(114, 114, 114)', fontWeight: 600, fontSize: '12px', letterSpacing: '0.05em' }}>
              <th style={{ padding: '16px 20px' }}>STUDENT NAME</th>
              <th style={{ padding: '16px 20px' }}>EMAIL</th>
              <th style={{ padding: '16px 20px' }}>BATCH/BRANCH</th>
              <th style={{ padding: '16px 20px' }}>STARTED</th>
              <th style={{ padding: '16px 20px' }}>COMPLETED</th>
            </tr>
          </thead>
          <tbody>
            {!hasSearched ? (
              <tr>
                <td
                  colSpan={5}
                  style={{
                    padding: '80px 20px',
                    textAlign: 'center',
                    color: 'rgb(114, 114, 114)',
                    fontSize: '15px',
                    fontWeight: 500,
                  }}
                >
                  Search a student to populate the table !
                </td>
              </tr>
            ) : loading ? (
              <tr>
                <td
                  colSpan={5}
                  style={{
                    padding: '80px 20px',
                    textAlign: 'center',
                    color: 'rgb(114, 114, 114)',
                    fontSize: '15px',
                    fontWeight: 500,
                  }}
                >
                  Searching...
                </td>
              </tr>
            ) : results.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  style={{
                    padding: '80px 20px',
                    textAlign: 'center',
                    color: 'rgb(114, 114, 114)',
                    fontSize: '15px',
                    fontWeight: 500,
                  }}
                >
                  No data found
                </td>
              </tr>
            ) : (
              results.map((s) => (
                <tr key={s.email} style={{ borderBottom: '1px solid rgb(245, 245, 245)' }}>
                  <td style={{ padding: '16px 20px', color: 'rgb(35, 39, 46)', fontWeight: 500 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '50%',
                          backgroundColor: 'rgb(224, 224, 224)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          flexShrink: 0,
                        }}
                      >
                        <svg viewBox="0 0 24 24" style={{ width: '18px', height: '18px', fill: 'white' }}>
                          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                        </svg>
                      </div>
                      <span>{s.name}</span>
                    </div>
                  </td>
                  <td style={{ padding: '16px 20px', color: 'rgb(35, 39, 46)' }}>{s.email}</td>
                  <td style={{ padding: '16px 20px', color: 'rgb(35, 39, 46)' }}>{s.batchBranch}</td>
                  <td style={{ padding: '16px 20px', color: 'rgb(35, 39, 46)' }}>{s.started}</td>
                  <td style={{ padding: '16px 20px', color: 'rgb(35, 39, 46)' }}>{s.completed}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
