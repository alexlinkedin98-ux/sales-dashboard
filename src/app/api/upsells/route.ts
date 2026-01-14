import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET all upsell entries
export async function GET() {
  try {
    const entries = await prisma.upsellEntry.findMany({
      include: {
        salesRep: true,
      },
      orderBy: [
        { weekStartDate: 'desc' },
        { salesRep: { name: 'asc' } },
      ],
    });

    return NextResponse.json(entries);
  } catch (error) {
    console.error('Error fetching upsell entries:', error);
    return NextResponse.json(
      { error: 'Failed to fetch upsell entries' },
      { status: 500 }
    );
  }
}

// POST create a new upsell entry
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      salesRepId,
      weekStartDate,
      outreachCount,
      meetingsBooked,
      proposalsMade,
      dealsClosed,
      upsellRevenue,
    } = body;

    // Validate required fields
    if (!salesRepId || !weekStartDate) {
      return NextResponse.json(
        { error: 'Sales rep and week start date are required' },
        { status: 400 }
      );
    }

    // Generate week label
    const date = new Date(weekStartDate);
    const weekLabel = date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });

    // Create or update (upsert) the entry
    const entry = await prisma.upsellEntry.upsert({
      where: {
        salesRepId_weekStartDate: {
          salesRepId,
          weekStartDate: new Date(weekStartDate),
        },
      },
      update: {
        outreachCount: outreachCount || 0,
        meetingsBooked: meetingsBooked || 0,
        proposalsMade: proposalsMade || 0,
        dealsClosed: dealsClosed || 0,
        upsellRevenue: upsellRevenue || 0,
      },
      create: {
        salesRepId,
        weekStartDate: new Date(weekStartDate),
        weekLabel,
        outreachCount: outreachCount || 0,
        meetingsBooked: meetingsBooked || 0,
        proposalsMade: proposalsMade || 0,
        dealsClosed: dealsClosed || 0,
        upsellRevenue: upsellRevenue || 0,
      },
      include: {
        salesRep: true,
      },
    });

    return NextResponse.json(entry, { status: 201 });
  } catch (error) {
    console.error('Error creating upsell entry:', error);
    return NextResponse.json(
      { error: 'Failed to create upsell entry' },
      { status: 500 }
    );
  }
}
