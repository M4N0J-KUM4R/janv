import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const institutionId = searchParams.get('institution_id') || '1';

    const rows = await query<{ id: number; institution_id: number; name: string; code: string; alias_name: string }>(
      'SELECT id, institution_id, name, code, alias_name FROM departments WHERE institution_id = $1 AND is_active = true ORDER BY id ASC',
      [parseInt(institutionId, 10)]
    );

    const departments = rows.map((r) => ({
      id: r.id,
      name: r.name,
      code: r.code,
      aliasName: r.alias_name || r.name,
      institutionId: r.institution_id,
    }));

    return NextResponse.json({
      status: 200,
      departments,
      total: departments.length,
    });
  } catch (err: any) {
    console.error('Error fetching departments from database:', err);
    return NextResponse.json(
      { status: 500, error: err.message, departments: [] },
      { status: 500 }
    );
  }
}
