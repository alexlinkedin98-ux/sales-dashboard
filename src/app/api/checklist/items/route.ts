import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { startOfWeek } from 'date-fns';

// GET /api/checklist/items - Get checklist items for a sales rep
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const salesRepId = searchParams.get('salesRepId');

    if (!salesRepId) {
      return NextResponse.json(
        { error: 'salesRepId is required' },
        { status: 400 }
      );
    }

    // Get week start (Monday)
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });

    // Get items and completions in parallel
    const [items, completions] = await Promise.all([
      prisma.checklistItem.findMany({
        where: {
          salesRepId,
          isActive: true,
        },
        orderBy: [
          { category: 'asc' },
          { sortOrder: 'asc' },
          { createdAt: 'asc' },
        ],
      }),
      prisma.checklistCompletion.findMany({
        where: {
          salesRepId,
          weekStartDate: weekStart,
        },
      }),
    ]);

    return NextResponse.json({ items, completions });
  } catch (error) {
    console.error('Error fetching checklist items:', error);
    return NextResponse.json(
      { error: 'Failed to fetch checklist items' },
      { status: 500 }
    );
  }
}

// POST /api/checklist/items - Create a new checklist item
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { salesRepId, title, description, category } = body;

    if (!salesRepId || !title) {
      return NextResponse.json(
        { error: 'salesRepId and title are required' },
        { status: 400 }
      );
    }

    // Get the max sort order for this rep
    const maxOrder = await prisma.checklistItem.aggregate({
      where: { salesRepId },
      _max: { sortOrder: true },
    });

    const item = await prisma.checklistItem.create({
      data: {
        salesRepId,
        title,
        description,
        category,
        sortOrder: (maxOrder._max.sortOrder || 0) + 1,
      },
    });

    return NextResponse.json(item);
  } catch (error) {
    console.error('Error creating checklist item:', error);
    return NextResponse.json(
      { error: 'Failed to create checklist item' },
      { status: 500 }
    );
  }
}
