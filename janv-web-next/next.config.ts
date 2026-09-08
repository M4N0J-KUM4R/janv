/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  serverExternalPackages: ['pg'],
  async redirects() {
    return [
      {
        source: '/assessments/:path*',
        destination: '/assessment/:path*',
        permanent: true,
      },
      {
        source: '/login',
        destination: '/adminLogin',
        permanent: true,
      },
      {
        source: '/passcode',
        destination: '/institute/passcode',
        permanent: true,
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: process.env.BACKEND_URL || 'http://localhost:8080/api/:path*',
      },
      {
        source: '/assessment/myTests',
        destination: '/assessment/mytests',
      },
      {
        source: '/assessment/myTestLibrary',
        destination: '/assessment',
      },
      {
        source: '/assessment/CourseAssessments',
        destination: '/assessment',
      },
    ];
  },
};

export default nextConfig;
