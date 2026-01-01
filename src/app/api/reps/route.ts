import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET all sales reps
export async function GET() {
  try {
    const reps = await prisma.salesRep.findMany({
      orderBy: { name: 'asc' },
    });
    return NextResponse.json(reps);
  } catch (error) {
    console.error('Error fetching reps:', error);
    return NextResponse.json({ error: 'Failed to fetch reps' }, { status: 500 });
  }
}

// POST create a new sales rep
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const rep = await prisma.salesRep.create({
      data: { name: name.trim() },
    });

    return NextResponse.json(rep, { status: 201 });
  } catch (error: unknown) {
    console.error('Error creating rep:', error);
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return NextResponse.json({ error: 'A rep with this name already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to create rep' }, { status: 500 });
  }
}
