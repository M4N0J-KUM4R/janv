import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ collegeId: string }> }
) {
  try {
    const { collegeId } = await params;
    
    // Count existing tests to generate next sequential number
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
        collegeId,
      },
    });
  } catch (err: any) {
    console.error('Error generating current test code:', err);
    return NextResponse.json(
      {
        status: 200,
        res: {
          total: 370,
          testCode: 'SVET00370',
        },
      },
      { status: 200 }
    );
  }
}
