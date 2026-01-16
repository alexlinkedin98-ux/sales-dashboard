import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { undoChange } from '@/lib/changeLog';

// GET - Fetch change history
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get('entityType');
    const limit = parseInt(searchParams.get('limit') || '50');

    const where = entityType ? { entityType } : {};

    const changes = await prisma.changeLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return NextResponse.json(changes);
  } catch (error) {
    console.error('Error fetching change history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch change history' },
      { status: 500 }
    );
  }
}

// POST - Undo a change
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { changeLogId } = body;

    if (!changeLogId) {
      return NextResponse.json(
        { error: 'changeLogId is required' },
        { status: 400 }
      );
    }

    const result = await undoChange(changeLogId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.message },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, message: result.message });
  } catch (error) {
    console.error('Error undoing change:', error);
    return NextResponse.json(
      { error: 'Failed to undo change' },
      { status: 500 }
    );
  }
}
