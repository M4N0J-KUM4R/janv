import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const rows = await query<{ branch: string }>(
      "SELECT DISTINCT branch FROM users WHERE branch IS NOT NULL AND branch != '' AND LENGTH(branch) > 1 ORDER BY branch ASC"
    );

    const branches = rows.map((r) => r.branch);

    return NextResponse.json({
      status: 200,
      branches,
      total: branches.length,
    });
  } catch (err: any) {
    console.error('Error fetching branches from database:', err);
    return NextResponse.json(
      { status: 500, error: err.message, branches: [] },
      { status: 500 }
    );
  }
}
