'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSidebar } from '@/components/layout/AppShell';

const sections = [
  {
    title: 'Learning',
    items: [
      { label: 'Dashboard', href: '/learn/dashboard', iconSrc: '/static/media/dashboard-icon.ce7ddd9fa5b22dc711cf7df2ec7ee994.svg' },
      { label: 'View Reports', href: '/learn/overallReport', iconSrc: '/static/media/view-reports-icon.e5a80f9cdd3ddc56a35bbb18ef9498fd.svg' },
      { label: 'Download Reports', href: '/learn/customReport', iconSrc: '/static/media/download-report-icon.a4381d04c61180c3562c4d5ae7c070ff.svg' },
      { label: 'Search Student', href: '/learn/search', iconSrc: '/static/media/search-student-icon.83d3f285c78952b4199679312408ddbf.svg' },
    ],
  },
  {
    title: 'Assessments',
    items: [
      { label: 'Create Test', href: '/assessment/create', iconSrc: '/static/media/create-test-icon2.935c9679c5f4cc8be2c0de56d581f46d.svg' },
      { label: 'My Tests', href: '/assessment/mytests', iconSrc: '/static/media/my-test-icon.7eb6537b9d58ffcba1fb849146627b5a.svg' },
      { label: 'Create from Template', href: '/assessment/createfromtemplate', iconSrc: '/static/media/create-template-icon.28e489b6c4a195db9060ddbf107945b2.svg' },
      { label: 'Pass Code', href: '/institute/passcode', iconSrc: '/static/media/passcode-icon.d575f1d24f9cef93269785933e4132bb.svg' },
      { label: 'FAQs', href: '/assessment/faq', iconSrc: '/static/media/faqs-icon.4922126553687a92614115dc0b63f82b.svg' },
      { label: 'Leaderboard', href: '/assessment/leaderboard', iconSrc: '/static/media/leaderboard-icon.3120df95265fd1785822e921f70790a3.svg' },
    ],
  },
  {
    title: 'Certificates',
    items: [
      { label: 'View Certificates Report', href: '/Certificates/view', iconSrc: '/static/media/view-reports-icon.e5a80f9cdd3ddc56a35bbb18ef9498fd.svg' },
      { label: 'Download Certificate Report', href: '/Certificates/downloadReport', iconSrc: '/static/media/download-report-icon.a4381d04c61180c3562c4d5ae7c070ff.svg' },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { sidebarOpen, setSidebarOpen } = useSidebar();

  return (
    <aside className={`sidebar ${sidebarOpen ? 'sidebar--open' : ''}`}>
      {/* Mobile close header */}
      <div className="sidebar-mobile-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/static/media/prepinsta-logo.c8726ee83431bd38ed4bb2df7fee6a8f.svg"
            alt="logo"
            width="24"
            height="24"
          />
          <h3
            style={{
              margin: 0,
              fontSize: '1.1rem',
              fontWeight: 600,
              fontFamily: 'Montserrat, sans-serif',
              color: 'rgb(52, 52, 52)',
            }}
          >
            PrepInsta
          </h3>
        </div>
        <button
          type="button"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close sidebar"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '20px',
            color: 'rgb(114, 114, 114)',
            padding: '4px 8px',
          }}
        >
          ✕
        </button>
      </div>

      {sections.map((section, index) => (
        <div key={section.title} style={{ display: 'flex', flexDirection: 'column' }}>
          {index > 0 && <div className="sidebar-divider"></div>}
          <div className="sidebar-section">
            <h3 className="sidebar-section-title">{section.title}</h3>
            <div className="sidebar-nav">
              {section.items.map((item) => {
                const isActive =
                  item.href === '/'
                    ? pathname === '/'
                    : pathname.startsWith(item.href) ||
                      (item.href === '/Certificates/view' && pathname.startsWith('/certificates/view')) ||
                      (item.href === '/Certificates/downloadReport' && pathname.startsWith('/certificates/downloadReport'));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`sidebar-link ${isActive ? 'active' : ''}`}
                    onClick={() => setSidebarOpen(false)}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.iconSrc} alt={item.label} width="18" height="19" />
                    <div style={{ margin: 0, overflow: 'hidden' }}>
                      <p style={{ margin: 0, textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' }}>{item.label}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      ))}
    </aside>
  );
}
