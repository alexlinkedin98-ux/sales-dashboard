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
    const firstName = sequence.contactName.split(' ')[0];
    const prompt = `Write a very short, casual follow-up email to someone you had a call with about 3 months ago.

Contact: ${firstName}
What you discussed: ${callAnalysis.callLabel}
Call date: ${new Date(callAnalysis.callDate).toLocaleDateString()}

${transcript ? `Context from the call:\n${transcript}` : ''}

The email should be:
- 3-4 lines MAX. Super short.
- Casual and human, like texting a friend
- No formal language, no "I hope this email finds you well"
- Reference what you talked about briefly (e.g. "google ads", "your campaigns", etc.)
- End with a simple check-in question
- No signature, no sign-off like "Best regards"
- Lowercase is fine, keep it natural

Example tone:
"hi ${firstName}

hope you're doing well

we chatted about your google ads a few months back — how are things going on that front?"

Write ONLY the email body. Start with "hi ${firstName}" (lowercase).`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 200,
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

    // Save the generated email to the sequence (both new and legacy fields)
    const updatedSequence = await prisma.followUpSequence.update({
      where: { id },
      data: {
        step1Content: emailContent,
        email1Content: emailContent, // Legacy field
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
