import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic();

// POST - Generate AI email for follow-up sequence
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const sequence = await prisma.followUpSequence.findUnique({
      where: { id },
      include: {
        callAnalysis: {
          include: {
            salesRep: true,
          },
        },
      },
    });

    if (!sequence) {
      return NextResponse.json({ error: 'Follow-up sequence not found' }, { status: 404 });
    }

    const callAnalysis = sequence.callAnalysis;
    const transcript = callAnalysis.transcript;

    // Build the prompt for email generation
    const prompt = `You are a professional sales representative writing a follow-up email to a prospect you spoke with about 3 months ago.

Contact Name: ${sequence.contactName}
Original Call: ${callAnalysis.callLabel}
Call Date: ${new Date(callAnalysis.callDate).toLocaleDateString()}
Sales Rep: ${callAnalysis.salesRep.name}

${transcript ? `Call Transcript/Notes:
${transcript}` : 'No transcript available - generate a generic but warm check-in email.'}

Write a brief, professional follow-up email that:
1. References something specific from your conversation (if transcript available)
2. Checks in on their situation
3. Offers value or relevant insight
4. Has a soft call-to-action (e.g., "Would love to reconnect if timing is better now")

The email should be:
- Friendly but professional
- 3-5 short paragraphs max
- Not pushy or salesy
- Personalized based on the conversation

Write ONLY the email body (no subject line, no signature). Start with "Hi ${sequence.contactName.split(' ')[0]}," or similar greeting.`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    // Extract the text content from the response
    const emailContent = message.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('\n');

    // Save the generated email to the sequence
    const updatedSequence = await prisma.followUpSequence.update({
      where: { id },
      data: {
        email1Content: emailContent,
      },
      include: {
        callAnalysis: {
          include: {
            salesRep: true,
          },
        },
      },
    });

    return NextResponse.json({
      email: emailContent,
      sequence: updatedSequence,
    });
  } catch (error) {
    console.error('Error generating follow-up email:', error);
    return NextResponse.json(
      { error: 'Failed to generate follow-up email' },
      { status: 500 }
    );
  }
}
