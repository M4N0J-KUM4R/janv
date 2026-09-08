import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const rows = await query<{ id: number; name: string; is_active: boolean }>(
      'SELECT id, name, is_active FROM institutions WHERE is_active = true ORDER BY id'
    );

    return NextResponse.json({
      status: 200,
      institutions: rows,
      total: rows.length,
    });
  } catch (err: any) {
    console.error('Error fetching institutions from database:', err);
    return NextResponse.json(
      { status: 500, error: err.message, institutions: [] },
      { status: 500 }
    );
  }
}
