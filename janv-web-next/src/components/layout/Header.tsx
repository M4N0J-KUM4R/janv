'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { useAuth } from '@/lib/auth';
import { useSidebar } from '@/components/layout/AppShell';

const KNOWN_INSTITUTIONS_BY_ID: Record<string, string> = {
  '1': 'D.G. Vaishnav College',
  '2': 'Loyola College',
  '3': 'Madras Christian College',
  '4': 'Presidency College',
  '5': 'College of Engineering Guindy',
  '6': 'SSN College of Engineering',
  '7': 'Hindustan Institute of Technology and Science',
  '8': 'SRM Institute of Science and Technology',
  '9': 'Chennai Mathematical Institute',
  '10': 'PSG College of Technology',
};

const DOMAIN_TO_INSTITUTION: Record<string, string> = {
  'dgvaishnav.edu.in': 'D.G. Vaishnav College',
  'loyolacollege.edu': 'Loyola College',
  'mcc.edu.in': 'Madras Christian College',
  'presidency.edu.in': 'Presidency College',
  'presidencycollegechennai.ac.in': 'Presidency College',
  'ceg.annauniv.edu': 'College of Engineering Guindy',
  'ssn.edu.in': 'SSN College of Engineering',
  'hindustanuniv.ac.in': 'Hindustan Institute of Technology and Science',
  'srmist.edu.in': 'SRM Institute of Science and Technology',
  'cmi.ac.in': 'Chennai Mathematical Institute',
  'psgtech.edu': 'PSG College of Technology',
};

export default function Header() {
  const { user, logout } = useAuth();
  const { toggleSidebar } = useSidebar();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dynamicInstName, setDynamicInstName] = useState<string>('');

  // Fetch institution name if not in static map
  useEffect(() => {
    if (!user) return;
    const instId = user.institution_id ? String(user.institution_id) : '';
    if (instId && !KNOWN_INSTITUTIONS_BY_ID[instId]) {
      fetch('/api/v2/institutions')
        .then((res) => res.json())
        .then((data) => {
          const found = data?.institutions?.find(
            (item: any) => String(item.id) === instId || item.id === instId
          );
          if (found?.name) {
            setDynamicInstName(found.name);
          }
        })
        .catch(() => {});
    }
  }, [user]);

  const institutionName = useMemo(() => {
    if (!user) return '';
    if ((user as any).institution_name) return (user as any).institution_name;

    const instId = user.institution_id ? String(user.institution_id) : '';
    if (instId && KNOWN_INSTITUTIONS_BY_ID[instId]) {
      return KNOWN_INSTITUTIONS_BY_ID[instId];
    }

    if (dynamicInstName) return dynamicInstName;

    // Fallback: derive from email domain
    const emailDomain = user.email?.split('@')[1]?.toLowerCase() || '';
    if (emailDomain && DOMAIN_TO_INSTITUTION[emailDomain]) {
      return DOMAIN_TO_INSTITUTION[emailDomain];
    }

    return '';
  }, [user, dynamicInstName]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const secondaryDisplayName = useMemo(() => {
    const fullName = user?.full_name || '';
    if (institutionName && fullName) {
      return institutionName + ' | ' + fullName;
    }
    return fullName || institutionName || '';
  }, [institutionName, user?.full_name]);

  return (
    <header
      className="header"
      style={{
        height: '72px',
        borderBottom: '1px solid rgb(240, 240, 240)',
        backgroundColor: 'rgb(255, 255, 255)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 24px 12px 16px',
        boxShadow: 'none',
      }}
    >
      {/* Left section: Hamburger + Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button
          type="button"
          onClick={toggleSidebar}
          aria-label="Toggle sidebar"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/static/media/menu-icon.f58bf04032e75005f600579b0f026d1f.svg"
            alt="menu"
            style={{ height: '18px', width: '18px' }}
          />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/static/media/prepinsta-logo.c8726ee83431bd38ed4bb2df7fee6a8f.svg"
            alt="logo"
            width="21.84"
            height="21.84"
          />
          <p
            style={{
              margin: '0 0 0 1px',
              lineHeight: '1.334em',
              color: 'rgb(52, 52, 52)',
              alignSelf: 'stretch',
              textAlign: 'center',
              justifyContent: 'center',
              fontFamily: 'Montserrat, sans-serif',
              fontSize: '16px',
              fontWeight: 600,
            }}
          >
            PrepInsta
          </p>
        </div>
      </div>

      <div style={{ flexGrow: 1 }}></div>

      {/* Right section: Profile dropdown */}
      <div ref={dropdownRef} style={{ position: 'relative' }}>
        <div
          style={{
            display: 'flex',
            padding: '4px 8px',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer',
            borderRadius: '8px',
            transition: 'background-color 0.15s ease',
          }}
          onClick={() => setDropdownOpen(!dropdownOpen)}
          title="Profile menu"
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
              justifyContent: 'center',
              textAlign: 'right',
              minHeight: '40px',
            }}
          >
            {/* Primary line (Top): Email */}
            <p
              style={{
                margin: 0,
                color: 'rgb(52, 52, 52)',
                fontFamily: '"Public Sans", sans-serif',
                fontSize: '14px',
                fontWeight: 600,
                lineHeight: '140%',
                textAlign: 'right',
                maxWidth: '500px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {user?.email || ''}
            </p>

            {/* Secondary line (Bottom): Institute Name | Full Name */}
            {secondaryDisplayName && (
              <p
                style={{
                  margin: '2px 0 0 0',
                  color: 'rgb(114, 114, 114)',
                  fontFamily: '"Public Sans", sans-serif',
                  fontSize: '12px',
                  fontWeight: 500,
                  lineHeight: '130%',
                  textAlign: 'right',
                  maxWidth: '500px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {secondaryDisplayName}
              </p>
            )}
          </div>

          <svg
            focusable="false"
            aria-hidden="true"
            viewBox="0 0 24 24"
            style={{
              userSelect: 'none',
              width: '1.2em',
              height: '1.2em',
              display: 'inline-block',
              fill: 'currentColor',
              flexShrink: 0,
              transition: 'transform 200ms cubic-bezier(0.4, 0, 0.2, 1)',
              fontSize: '1.25rem',
              color: 'rgb(114, 114, 114)',
              cursor: 'pointer',
              transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            }}
          >
            <path d="M7.41 8.59 12 13.17l4.59-4.58L18 10l-6 6-6-6z"></path>
          </svg>
        </div>

        {/* Dropdown Menu */}
        {dropdownOpen && (
          <div
            style={{
              position: 'absolute',
              top: '56px',
              right: 0,
              minWidth: '240px',
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              border: '1px solid rgb(224, 224, 224)',
              boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
              zIndex: 1000,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '12px 16px',
                borderBottom: '1px solid rgb(240, 240, 240)',
                fontSize: '13px',
                color: 'rgb(114, 114, 114)',
              }}
            >
              <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#9CA3AF', marginBottom: '4px' }}>
                Signed in as
              </div>
              <strong style={{ color: 'rgb(35, 39, 46)', display: 'block', fontSize: '13px' }}>
                {user?.full_name || user?.email || ''}
              </strong>
              {institutionName && (
                <div style={{ marginTop: '2px', fontSize: '12px', color: '#017DF9', fontWeight: 500 }}>
                  {institutionName}
                </div>
              )}
              <div style={{ marginTop: '2px', fontSize: '12px', color: '#6B7280' }}>
                {user?.email || ''}
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setDropdownOpen(false);
                logout();
              }}
              style={{
                width: '100%',
                padding: '12px 16px',
                border: 'none',
                backgroundColor: 'transparent',
                textAlign: 'left',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 500,
                color: '#DC2626',
                fontFamily: '"Public Sans", sans-serif',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#FEF2F2')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="#DC2626">
                <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z" />
              </svg>
              Logout
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
