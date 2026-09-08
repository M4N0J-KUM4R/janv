import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tests = await query(
      `SELECT 
        a.*,
        COALESCE(json_agg(
          json_build_object(
            'id', s.id,
            'title', s.title,
            'duration_mins', s.duration_mins,
            'section_type', s.section_type,
            'default_marks', s.default_marks,
            'penalty_marks', s.penalty_marks,
            'display_questions', s.display_questions,
            'instructions', s.instructions
          )
        ) FILTER (WHERE s.id IS NOT NULL), '[]') as sections
      FROM assessments a
      LEFT JOIN assessment_sections s ON s.assessment_id = a.id
      WHERE a.id = $1
      GROUP BY a.id`,
      [id]
    );

    if (tests.length === 0) {
      return NextResponse.json({ status: 404, message: 'Assessment not found' }, { status: 404 });
    }

    return NextResponse.json({
      status: 200,
      assessment: tests[0],
      res: tests[0],
    });
  } catch (err: any) {
    return NextResponse.json({ status: 500, error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await query('DELETE FROM assessments WHERE id = $1', [id]);
    return NextResponse.json({ status: 200, message: 'Deleted successfully' });
  } catch (err: any) {
    return NextResponse.json({ status: 500, error: err.message }, { status: 500 });
  }
}
