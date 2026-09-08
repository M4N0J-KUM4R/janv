import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const institutionId = searchParams.get('institution_id');

    let sql = 'SELECT DISTINCT batch FROM users WHERE batch IS NOT NULL';
    const params: unknown[] = [];
    if (institutionId) {
      params.push(parseInt(institutionId, 10));
      sql += ' AND institution_id = $1';
    }
    sql += ' ORDER BY batch ASC';

    const rows = await query<{ batch: number }>(sql, params);
    const batches = rows.map((r) => r.batch);

    return NextResponse.json({
      status: 200,
      batches,
      total: batches.length,
    });
  } catch (err: any) {
    console.error('Error fetching batches from database:', err);
    return NextResponse.json(
      { status: 500, error: err.message, batches: [] },
      { status: 500 }
    );
  }
}
