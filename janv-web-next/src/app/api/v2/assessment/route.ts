import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';

    let sql = `
      SELECT 
        a.id,
        a.title,
        a.test_code,
        a.description,
        a.instructions,
        a.duration_mins,
        a.total_marks,
        a.pass_percentage,
        a.is_published,
        a.shuffle_questions,
        a.show_results,
        a.num_sections,
        a.tab_switches_allowed,
        a.status,
        a.created_at,
        COALESCE(json_agg(
          json_build_object(
            'id', s.id,
            'title', s.title,
            'duration_mins', s.duration_mins,
            'section_type', s.section_type,
            'default_marks', s.default_marks,
            'penalty_marks', s.penalty_marks,
            'display_questions', s.display_questions
          )
        ) FILTER (WHERE s.id IS NOT NULL), '[]') as sections,
        (SELECT count(*) FROM assessment_questions aq WHERE aq.assessment_id = a.id) as question_count
      FROM assessments a
      LEFT JOIN assessment_sections s ON s.assessment_id = a.id
    `;

    const whereClauses: string[] = [];
    const params: any[] = [];

    if (search) {
      params.push(`%${search}%`);
      whereClauses.push(`(a.title ILIKE $${params.length} OR a.test_code ILIKE $${params.length})`);
    }

    if (status && status !== 'all') {
      params.push(status);
      whereClauses.push(`a.status = $${params.length}::assessment_status`);
    }

    if (whereClauses.length > 0) {
      sql += ' WHERE ' + whereClauses.join(' AND ');
    }

    sql += ' GROUP BY a.id ORDER BY a.created_at DESC';

    const tests = await query(sql, params);

    return NextResponse.json({
      status: 200,
      res: {
        tests,
        total: tests.length,
      },
      data: tests,
    });
  } catch (err: any) {
    console.error('Error fetching assessments:', err);
    return NextResponse.json(
      { status: 500, error: err.message, data: [] },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const title = body.testName || body.title || 'Untitled Assessment';
    const testCode = body.testCode || `SVET${Math.floor(10000 + Math.random() * 90000)}`;
    const description = body.testDesc || body.description || '';
    const instructions = body.testInstruct || body.instructions || '';
    const testType = body.testType || 'General Assessment';
    const tabSwitchesAllowed = Number(body.tabSwitchLimit || body.tab_switches_allowed || 10);
    const shuffleQuestions = Boolean(body.jumbleQuest ?? body.shuffle_questions ?? false);
    const showResults = Boolean(body.showReport ?? body.show_results ?? false);
    const isProctoring = Boolean(body.isProctoring ?? false);
    const sections = Array.isArray(body.section) ? body.section : [];
    const numSections = sections.length > 0 ? sections.length : Number(body.num_sections || 1);

    // Calculate duration from sections if available
    let totalDuration = 0;
    let totalMarks = 0;
    for (const sec of sections) {
      totalDuration += Number(sec.sectionDuration || sec.duration_mins || 30);
      const marksPerQ = Number(sec.defaultMarks || sec.default_marks || 1);
      const qCount = Number(sec.displayQuestions || 10);
      totalMarks += marksPerQ * qCount;
    }
    if (totalDuration === 0) totalDuration = Number(body.duration_mins || 60);
    if (totalMarks === 0) totalMarks = Number(body.total_marks || 100);

    const batchVisibility = Array.isArray(body.batchVisibility)
      ? body.batchVisibility.map(String)
      : Array.isArray(body.batch_visibility)
      ? body.batch_visibility.map(String)
      : [];

    // Insert assessment
    const insertAssessmentSql = `
      INSERT INTO assessments (
        title,
        test_code,
        description,
        instructions,
        test_type,
        duration_mins,
        total_marks,
        pass_percentage,
        is_published,
        shuffle_questions,
        show_results,
        is_proctoring,
        num_sections,
        tab_switches_allowed,
        batch_visibility,
        status,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 'draft', NOW())
      RETURNING id, title, test_code, created_at
    `;

    const assessmentRows = await query<{ id: string }>(insertAssessmentSql, [
      title,
      testCode,
      description,
      instructions,
      testType,
      totalDuration,
      totalMarks,
      40.0,
      false,
      shuffleQuestions,
      showResults,
      isProctoring,
      numSections,
      tabSwitchesAllowed,
      batchVisibility,
    ]);

    const createdAssessment = assessmentRows[0];
    const assessmentId = createdAssessment?.id;

    // Insert sections
    if (sections.length > 0) {
      for (let i = 0; i < sections.length; i++) {
        const sec = sections[i];
        const secTitle = sec.sectionName || sec.title || `Section ${i + 1}`;
        const secDuration = Number(sec.sectionDuration || sec.duration_mins || 30);
        const secType = sec.sectionType || 'Aptitude';
        const secInstructions = sec.sectionInstructions || sec.instructions || '';
        const defaultMarks = Number(sec.defaultMarks || sec.default_marks || 1);
        const penaltyMarks = Number(sec.penaltyMarks || sec.penalty_marks || 0);
        const displayQuestions = Number(sec.displayQuestions || 10);

        const insertSectionSql = `
          INSERT INTO assessment_sections (
            assessment_id,
            title,
            section_type,
            duration_mins,
            instructions,
            default_marks,
            penalty_marks,
            display_questions,
            sort_order,
            created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
        `;

        await query(insertSectionSql, [
          assessmentId,
          secTitle,
          secType,
          secDuration,
          secInstructions,
          defaultMarks,
          penaltyMarks,
          displayQuestions,
          i,
        ]);
      }
    }

    return NextResponse.json({
      status: 200,
      res: [
        {
          assessmentId,
          testCode,
          testName: title,
        },
      ],
      data: {
        id: assessmentId,
        testCode,
        title,
      },
    });
  } catch (err: any) {
    console.error('Error creating assessment:', err);
    return NextResponse.json(
      {
        status: 400,
        err: {
          msg: err.message || 'Failed to create assessment',
          errCode: 101,
        },
      },
      { status: 400 }
    );
  }
}
