'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

// Auth-free routes (no sidebar/header)
const PUBLIC_ROUTES = ['/login', '/adminLogin'];

interface SidebarContextType {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
}

const SidebarContext = createContext<SidebarContextType>({
  sidebarOpen: true,
  setSidebarOpen: () => {},
  toggleSidebar: () => {},
});

export function useSidebar() {
  return useContext(SidebarContext);
}

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { loading, isAuthenticated, user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isPublicRoute = PUBLIC_ROUTES.some((r) => pathname.startsWith(r));

  useEffect(() => {
    if (!isPublicRoute && !loading) {
      if (!isAuthenticated) {
        router.push('/adminLogin');
      } else if (user?.role?.toLowerCase() === 'student') {
        const studentUrl = process.env.NEXT_PUBLIC_STUDENT_APP_URL || '/';
        window.location.href = studentUrl;
      }
    }
  }, [isPublicRoute, loading, isAuthenticated, user, router]);

  // On public routes, render children without shell
  if (isPublicRoute) {
    return <>{children}</>;
  }

  // While auth is loading on protected routes, show a minimal loader
  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          fontFamily: '"Public Sans", sans-serif',
          color: 'rgb(114, 114, 114)',
          fontSize: '14px',
        }}
      >
        Loading...
      </div>
    );
  }

  // If not authenticated on a protected route, render nothing while redirecting
  if (!isAuthenticated) {
    return null;
  }

  return (
    <SidebarContext.Provider
      value={{
        sidebarOpen,
        setSidebarOpen,
        toggleSidebar: () => setSidebarOpen((prev) => !prev),
      }}
    >
      <div className="app-layout">
        <Sidebar />
        <Header />
        <main className="main-content">
          <div className="page-container">{children}</div>
        </main>
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </SidebarContext.Provider>
  );
}
