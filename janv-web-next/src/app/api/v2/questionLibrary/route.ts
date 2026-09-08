import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = (page - 1) * limit;

    const countRows = await query<{ count: string }>('SELECT count(*) as count FROM questions');
    const total = parseInt(countRows[0]?.count || '0', 10);

    const questions = await query(
      `SELECT q.*, qb.title as bank_title, qb.subject 
       FROM questions q
       LEFT JOIN question_banks qb ON qb.id = q.bank_id
       ORDER BY q.created_at DESC 
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    return NextResponse.json({
      status: 200,
      res: {
        questions,
        total,
        page,
        limit,
      },
    });
  } catch (err: any) {
    return NextResponse.json({
      status: 200,
      res: {
        questions: [],
        total: 0,
      },
    });
  }
}
