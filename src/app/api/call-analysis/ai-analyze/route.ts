import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic();

const systemPrompt = `You are a sales call analyst expert in three methodologies:

1. SPIN Selling (Neil Rackham):
   - Situation Questions: Gathering facts about buyer's current situation (e.g., "How many employees do you have?", "What tools are you currently using?")
   - Problem Questions: Exploring problems, difficulties, dissatisfactions (e.g., "What challenges are you facing with...?", "Where do you see room for improvement?")
   - Implication Questions: Developing seriousness of problems (e.g., "How does that affect your team's productivity?", "What happens when...")
   - Need-Payoff Questions: Getting buyer to tell you the benefits (e.g., "Would it be helpful if...?", "How would solving that impact your business?")

2. Challenger Sale (Dixon & Adamson):
   - Teaching: Bringing unique insights and perspectives that reframe the customer's thinking
   - Tailoring: Adapting message to specific stakeholder concerns and business context
   - Taking Control: Comfortable discussing money, pushing back on objections, and guiding the conversation

3. Insight Selling:
   - Sharing valuable industry insights and data
   - Articulating clear value propositions
   - Creating "aha moments" that help the prospect see things differently

Analyze the following sales call transcript and provide:
1. Counts for each category (be specific and accurate)
2. Scores (1-10) for SPIN, Challenger, and Insight approaches
3. Specific feedback on what was done well and areas for improvement
4. Overall effectiveness score (1-10)

Return ONLY valid JSON in this exact format (no markdown, no explanation, just JSON):
{
  "counts": {
    "situationQuestions": number,
    "problemQuestions": number,
    "implicationQuestions": number,
    "needPayoffQuestions": number,
    "challengesPresented": number,
    "dataPointsShared": number,
    "insightsShared": number
  },
  "scores": {
    "spin": number,
    "challenger": number,
    "insight": number,
    "overall": number
  },
  "feedback": "string with specific observations and recommendations"
}`;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { transcript } = body;

    if (!transcript || transcript.trim().length === 0) {
      return NextResponse.json(
        { error: 'Transcript is required' },
        { status: 400 }
      );
    }

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `Analyze this sales call transcript:\n\n${transcript}`,
        },
      ],
      system: systemPrompt,
    });

    // Extract text content from the response
    const textContent = message.content.find((block) => block.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      return NextResponse.json(
        { error: 'No text response from AI' },
        { status: 500 }
      );
    }

    // Parse the JSON response
    let analysis;
    try {
      analysis = JSON.parse(textContent.text);
    } catch {
      console.error('Failed to parse AI response:', textContent.text);
      return NextResponse.json(
        { error: 'Failed to parse AI analysis response' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      counts: analysis.counts,
      scores: analysis.scores,
      feedback: analysis.feedback,
    });
  } catch (error) {
    console.error('Error analyzing transcript:', error);
    return NextResponse.json(
      { error: 'Failed to analyze transcript' },
      { status: 500 }
    );
  }
}
