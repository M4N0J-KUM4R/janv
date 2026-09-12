'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { login, logout } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const loggedUser = await login(email, password, rememberMe);
      const role = (loggedUser?.role || '').toLowerCase();
      if (role === 'student') {
        // Redirect student to the Student Portal (backend URL or student home)
        const studentUrl = process.env.NEXT_PUBLIC_STUDENT_APP_URL || '/';
        window.location.href = studentUrl;
        return;
      }
      router.push('/learn/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Invalid credentials');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: '#f5f5f5',
        fontFamily: '"Public Sans", sans-serif',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '420px',
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)',
          padding: '40px 32px',
        }}
      >
        {/* Logo & Title */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '16px' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/static/media/prepinsta-logo.c8726ee83431bd38ed4bb2df7fee6a8f.svg"
              alt="PrepInsta"
              width="32"
              height="32"
            />
            <span
              style={{
                fontFamily: 'Montserrat, sans-serif',
                fontSize: '20px',
                fontWeight: 700,
                color: 'rgb(52, 52, 52)',
              }}
            >
              PrepInsta
            </span>
          </div>
          <h1
            style={{
              margin: '0 0 4px 0',
              fontSize: '22px',
              fontWeight: 600,
              color: 'rgb(35, 39, 46)',
              lineHeight: 1.4,
            }}
          >
            Institutions Admin
          </h1>
          <p
            style={{
              margin: 0,
              fontSize: '14px',
              color: 'rgb(114, 114, 114)',
              fontWeight: 400,
            }}
          >
            Sign in to your account
          </p>
        </div>

        {/* Error Banner */}
        {error && (
          <div
            style={{
              padding: '10px 14px',
              background: '#FEF2F2',
              color: '#DC2626',
              borderRadius: '8px',
              marginBottom: '20px',
              fontSize: '13px',
              fontWeight: 500,
              border: '1px solid #FECACA',
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Email */}
          <div style={{ marginBottom: '20px' }}>
            <label
              htmlFor="admin-email"
              style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: 500,
                color: 'rgb(52, 52, 52)',
                marginBottom: '8px',
              }}
            >
              Email Address
            </label>
            <div
              style={{
                display: 'flex',
                height: '48px',
                padding: '0 16px',
                alignItems: 'center',
                border: '1px solid rgb(224, 224, 224)',
                borderRadius: '10px',
                backgroundColor: '#fff',
              }}
            >
              <input
                id="admin-email"
                type="email"
                placeholder="Enter email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                style={{
                  border: 'none',
                  outline: 'none',
                  width: '100%',
                  height: '100%',
                  fontSize: '14px',
                  color: 'rgb(52, 52, 52)',
                  backgroundColor: 'transparent',
                  fontFamily: '"Public Sans", sans-serif',
                }}
              />
            </div>
          </div>

          {/* Password */}
          <div style={{ marginBottom: '16px' }}>
            <label
              htmlFor="admin-password"
              style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: 500,
                color: 'rgb(52, 52, 52)',
                marginBottom: '8px',
              }}
            >
              Password
            </label>
            <div
              style={{
                display: 'flex',
                height: '48px',
                padding: '0 16px',
                alignItems: 'center',
                border: '1px solid rgb(224, 224, 224)',
                borderRadius: '10px',
                backgroundColor: '#fff',
                gap: '8px',
              }}
            >
              <input
                id="admin-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                style={{
                  border: 'none',
                  outline: 'none',
                  width: '100%',
                  height: '100%',
                  fontSize: '14px',
                  color: 'rgb(52, 52, 52)',
                  backgroundColor: 'transparent',
                  fontFamily: '"Public Sans", sans-serif',
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  flexShrink: 0,
                }}
              >
                {showPassword ? (
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="rgb(114, 114, 114)">
                    <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="rgb(114, 114, 114)">
                    <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46A11.804 11.804 0 001 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Remember Me */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '24px',
            }}
          >
            <input
              id="remember-me"
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              style={{
                width: '16px',
                height: '16px',
                accentColor: '#017DF9',
                cursor: 'pointer',
              }}
            />
            <label
              htmlFor="remember-me"
              style={{
                fontSize: '14px',
                color: 'rgb(52, 52, 52)',
                cursor: 'pointer',
                userSelect: 'none',
              }}
            >
              Remember me
            </label>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            style={{
              width: '100%',
              height: '48px',
              borderRadius: '10px',
              border: 'none',
              backgroundColor: submitting ? '#93C5FD' : '#017DF9',
              color: '#ffffff',
              fontSize: '15px',
              fontWeight: 600,
              cursor: submitting ? 'not-allowed' : 'pointer',
              fontFamily: '"Public Sans", sans-serif',
              transition: 'background-color 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            {submitting && (
              <svg width="18" height="18" viewBox="0 0 24 24" style={{ animation: 'spin 1s linear infinite' }}>
                <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="3" fill="none" strokeDasharray="31.4 31.4" strokeLinecap="round" />
              </svg>
            )}
            {submitting ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
