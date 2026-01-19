import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// Default checklist items (Alex's template)
const DEFAULT_CHECKLIST_ITEMS = [
  // Warm-up category
  { title: 'Tongue Twister Practice', description: 'Warm up your speaking voice with tongue twisters', category: 'Warm-up', sortOrder: 1 },

  // Learning category
  { title: 'Review Intro Call Script', description: 'Listen to and review the intro call script', category: 'Learning', sortOrder: 2 },
  { title: 'Review Follow-up Call Script', description: 'Listen to and review the FUP call script', category: 'Learning', sortOrder: 3 },
  { title: 'Weekly Objection Handling Practice', description: 'Work through one objection scenario this week', category: 'Learning', sortOrder: 4 },
  { title: 'Listen to Sales Commandments', description: 'Review core sales principles', category: 'Learning', sortOrder: 5 },
  { title: 'Sales Book Reading', description: 'Read a chapter from current sales book', category: 'Learning', sortOrder: 6 },
  { title: 'Sales Course Progress', description: 'Complete a module from sales training course', category: 'Learning', sortOrder: 7 },
  { title: 'Watch Top Performer Calls', description: "Study Luke's, Craig's, or Rikki's sales calls", category: 'Learning', sortOrder: 8 },

  // Energy & Mindset category
  { title: 'Mindset/Energy Chat', description: 'Connect with a like-minded person (Skool/Vlad) to energize', category: 'Energy', sortOrder: 9 },

  // Content & Community category
  { title: 'Watch Sales YouTube Video', description: 'Watch at least one sales training video', category: 'Content', sortOrder: 10 },
  { title: 'Sales Community Engagement', description: 'Read 5 posts, make 5 comments, have 1 meaningful engagement', category: 'Community', sortOrder: 11 },
  { title: 'Sales Discussion with Team', description: 'Chat with Luke about sales learnings and takeaways', category: 'Community', sortOrder: 12 },

  // Practice category
  { title: 'Analyze Own Sales Call', description: 'Watch and analyze at least one of your own calls', category: 'Practice', sortOrder: 13 },
  { title: 'Watch a Hot Call', description: 'Study a high-performing recent call', category: 'Practice', sortOrder: 14 },
  { title: 'Watch Company YouTube Content', description: 'Stay updated with our channel content', category: 'Content', sortOrder: 15 },

  // Language & Presentation category
  { title: 'Language Practice (Cambly)', description: 'Practice conversational English with a native speaker', category: 'Practice', sortOrder: 16 },
  { title: 'Presentation Practice', description: 'Practice pitch delivery and presentation skills', category: 'Practice', sortOrder: 17 },

  // Action category
  { title: 'Lead Follow-up', description: 'Complete 1 follow-up with a lead you spoke with', category: 'Action', sortOrder: 18 },
];

// POST /api/checklist/seed - Seed default checklist items for a sales rep
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { salesRepId, force } = body;

    if (!salesRepId) {
      return NextResponse.json(
        { error: 'salesRepId is required' },
        { status: 400 }
      );
    }

    // Check if rep already has items (unless force=true)
    const existingItems = await prisma.checklistItem.findMany({
      where: { salesRepId },
    });

    if (existingItems.length > 0 && !force) {
      return NextResponse.json({
        message: 'Sales rep already has checklist items',
        itemCount: existingItems.length,
      });
    }

    // Create items
    const items = await prisma.checklistItem.createMany({
      data: DEFAULT_CHECKLIST_ITEMS.map(item => ({
        ...item,
        salesRepId,
      })),
      skipDuplicates: true,
    });

    return NextResponse.json({
      message: 'Checklist items created',
      itemCount: items.count,
    });
  } catch (error) {
    console.error('Error seeding checklist items:', error);
    return NextResponse.json(
      { error: 'Failed to seed checklist items' },
      { status: 500 }
    );
  }
}

// GET /api/checklist/seed - Seed items for all reps who don't have any
export async function GET() {
  try {
    // Get all sales reps
    const reps = await prisma.salesRep.findMany({
      include: {
        _count: {
          select: { checklistItems: true },
        },
      },
    });

    const results = [];

    for (const rep of reps) {
      if (rep._count.checklistItems === 0) {
        // Create items for this rep
        const items = await prisma.checklistItem.createMany({
          data: DEFAULT_CHECKLIST_ITEMS.map(item => ({
            ...item,
            salesRepId: rep.id,
          })),
        });

        results.push({
          repId: rep.id,
          repName: rep.name,
          itemsCreated: items.count,
        });
      } else {
        results.push({
          repId: rep.id,
          repName: rep.name,
          itemsCreated: 0,
          message: 'Already has items',
        });
      }
    }

    return NextResponse.json({
      message: 'Seeding complete',
      results,
    });
  } catch (error) {
    console.error('Error seeding checklist items:', error);
    return NextResponse.json(
      { error: 'Failed to seed checklist items' },
      { status: 500 }
    );
  }
}
