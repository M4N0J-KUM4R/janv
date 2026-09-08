'use client';

import Link from 'next/link';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

export default function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="breadcrumb" style={{ margin: '0 0 24px 0' }}>
      <ol style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', padding: 0, margin: 0, listStyle: 'none', gap: '8px' }}>
        {items.map((item, idx) => {
          const isLast = idx === items.length - 1;
          return (
            <li key={idx} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              {idx > 0 && (
                <img
                  src="https://institutions.prepinstaprime.com/static/media/seperator.8680fbeb87a461100eca854602c32372.svg"
                  alt="separator"
                  style={{ width: '19px', height: '19px' }}
                />
              )}
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  style={{
                    margin: 0,
                    color: 'rgb(155, 155, 155)',
                    fontFamily: '"Public Sans", sans-serif',
                    fontSize: '14px',
                    fontWeight: 500,
                    lineHeight: '150%',
                    textDecoration: 'none',
                  }}
                >
                  {item.label}
                </Link>
              ) : (
                <p
                  style={{
                    margin: 0,
                    color: isLast ? 'rgb(1, 125, 249)' : 'rgb(155, 155, 155)',
                    fontFamily: '"Public Sans", sans-serif',
                    fontSize: '14px',
                    fontWeight: 500,
                    lineHeight: '150%',
                  }}
                >
                  {item.label}
                </p>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
