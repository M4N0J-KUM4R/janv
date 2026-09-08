import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const institutionId = searchParams.get('institution_id');

    let sql = "SELECT DISTINCT branch FROM users WHERE branch IS NOT NULL AND branch != '' AND LENGTH(branch) > 1";
    const params: unknown[] = [];
    if (institutionId) {
      params.push(parseInt(institutionId, 10));
      sql += ` AND institution_id = $1`;
    }
    sql += " ORDER BY branch ASC";

    const rows = await query<{ branch: string }>(sql, params);
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
