import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const institutionId = searchParams.get('institution_id');

    let rows: { id: number; institution_id: number; name: string; code: string; alias_name: string }[] = [];

    if (institutionId) {
      rows = await query<{ id: number; institution_id: number; name: string; code: string; alias_name: string }>(
        'SELECT id, institution_id, name, code, alias_name FROM departments WHERE institution_id = $1 AND is_active = true ORDER BY name ASC',
        [parseInt(institutionId, 10)]
      );
    } else {
      rows = await query<{ id: number; institution_id: number; name: string; code: string; alias_name: string }>(
        'SELECT id, institution_id, name, code, alias_name FROM departments WHERE is_active = true ORDER BY name ASC'
      );
    }

    // Also include branches from users table for this institution if any exist and aren't already listed
    if (institutionId) {
      const branchRows = await query<{ branch: string }>(
        "SELECT DISTINCT branch FROM users WHERE institution_id = $1 AND branch IS NOT NULL AND branch != '' ORDER BY branch ASC",
        [parseInt(institutionId, 10)]
      );

      const existingNames = new Set(rows.map((r) => r.name.trim().toLowerCase()));
      let nextId = rows.length + 1;
      for (const b of branchRows) {
        const branchName = b.branch.trim();
        if (branchName && !existingNames.has(branchName.toLowerCase())) {
          existingNames.add(branchName.toLowerCase());
          rows.push({
            id: nextId++,
            institution_id: parseInt(institutionId, 10),
            name: branchName,
            code: branchName.substring(0, 10).toUpperCase(),
            alias_name: branchName,
          });
        }
      }
    }

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

