import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // The id can be an assessment_id (to list all sections of a test)
    // or a section_id
    const sql = `
      SELECT 
        s.id as "_id",
        s.id,
        s.title as "sectionName",
        s.duration_mins as "sectionDuration",
        CASE 
          WHEN s.section_type ILIKE '%code%' OR s.section_type = '2' THEN '2'
          ELSE '1'
        END as "sectionType",
        s.instructions as "sectionInstructions",
        s.default_marks as "defaultMarks",
        s.penalty_marks as "penaltyMarks",
        s.display_questions as "displayQuestions",
        s.sort_order as "orderIndex",
        COALESCE(
          (SELECT COUNT(*) FROM assessment_questions aq WHERE aq.section_id = s.id),
          0
        ) as "Questions"
      FROM assessment_sections s
      WHERE s.assessment_id = $1 OR s.id = $1
      ORDER BY s.sort_order ASC, s.created_at ASC
    `;

    const rows = await query(sql, [id]);

    return NextResponse.json({
      status: 200,
      list: rows,
      total: rows.length,
      res: rows,
    });
  } catch (err: any) {
    console.error('Error fetching assessment sections:', err);
    return NextResponse.json(
      { status: 500, error: err.message, list: [] },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const sql = `DELETE FROM assessment_sections WHERE id = $1 RETURNING id`;
    const deleted = await query(sql, [id]);

    if (deleted.length === 0) {
      return NextResponse.json(
        { status: 404, message: 'Section not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      status: 200,
      message: 'Section deleted successfully',
      res: deleted[0],
    });
  } catch (err: any) {
    console.error('Error deleting assessment section:', err);
    return NextResponse.json(
      { status: 500, error: err.message },
      { status: 500 }
    );
  }
}
