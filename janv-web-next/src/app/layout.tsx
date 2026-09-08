import './globals.css';
import { AuthProvider } from '@/lib/auth';
import AppShell from '@/components/layout/AppShell';

export const metadata = {
  title: 'Janv — PrepInsta Assessment Platform',
  description: 'Comprehensive Assessment & Learning Service built with Rust & Next.js',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <AppShell>{children}</AppShell>
        </AuthProvider>
      </body>
    </html>
  );
}
