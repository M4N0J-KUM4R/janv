import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const rows = await query<{ batch: number }>(
      'SELECT DISTINCT batch FROM users WHERE batch IS NOT NULL ORDER BY batch ASC'
    );

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
