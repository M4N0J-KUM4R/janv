import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const rows = await query<{ count: string }>(
      'SELECT count(*) as count FROM assessments'
    );
    const count = parseInt(rows[0]?.count || '0', 10) + 370;
    const testCode = `SVET${String(count).padStart(5, '0')}`;

    return NextResponse.json({
      status: 200,
      res: {
        total: count,
        testCode,
      },
    });
  } catch (err: any) {
    return NextResponse.json({
      status: 200,
      res: {
        total: 370,
        testCode: 'SVET00370',
      },
    });
  }
}
