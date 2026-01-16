import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET all review entries
export async function GET() {
  try {
    const entries = await prisma.reviewEntry.findMany({
      include: {
        salesRep: true,
      },
      orderBy: { monthStartDate: 'desc' },
    });

    return NextResponse.json(entries);
  } catch (error) {
    console.error('Error fetching review entries:', error);
    return NextResponse.json(
      { error: 'Failed to fetch review entries' },
      { status: 500 }
    );
  }
}

// POST create new review entry
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { salesRepId, monthStartDate, reviewsRequested, googleReviews, clutchReviews } = body;

    if (!salesRepId || !monthStartDate) {
      return NextResponse.json(
        { error: 'Sales rep and month are required' },
        { status: 400 }
      );
    }

    // Parse month date
    const monthDate = new Date(monthStartDate);
    // Normalize to first of month
    monthDate.setDate(1);
    monthDate.setHours(0, 0, 0, 0);

    const monthLabel = monthDate.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });

    // Check if entry already exists
    const existing = await prisma.reviewEntry.findUnique({
      where: {
        salesRepId_monthStartDate: {
          salesRepId,
          monthStartDate: monthDate,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'An entry already exists for this rep and month' },
        { status: 400 }
      );
    }

    const entry = await prisma.reviewEntry.create({
      data: {
        salesRepId,
        monthStartDate: monthDate,
        monthLabel,
        reviewsRequested: reviewsRequested || 0,
        googleReviews: googleReviews || 0,
        clutchReviews: clutchReviews || 0,
      },
      include: {
        salesRep: true,
      },
    });

    // Log the change
    await prisma.changeLog.create({
      data: {
        entityType: 'ReviewEntry',
        entityId: entry.id,
        action: 'create',
        newData: JSON.stringify(entry),
        description: `Added review entry for ${monthLabel} - ${entry.salesRep.name}`,
        relatedName: entry.salesRep.name,
      },
    });

    return NextResponse.json(entry, { status: 201 });
  } catch (error) {
    console.error('Error creating review entry:', error);
    return NextResponse.json(
      { error: 'Failed to create review entry' },
      { status: 500 }
    );
  }
}
