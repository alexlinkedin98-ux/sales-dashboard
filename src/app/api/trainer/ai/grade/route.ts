import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { calculateGrade, calculateIdentifyGrade } from '@/lib/trainer/gradeCalculator';

const anthropic = new Anthropic();

const GRADING_SYSTEM_PROMPT = `You are an expert SPIN selling coach evaluating trainee questions.

SPIN Question Types:
- Situation (S): Gather facts about current state. Examples: "What CRM do you use?" "How many reps on your team?" "What's your current ad spend?"
- Problem (P): Explore difficulties/pain points. Examples: "What challenges do you face with..." "Where do you see issues?" "What's frustrating about..."
- Implication (I): Develop the seriousness/cost. Examples: "How does that affect..." "What happens when..." "What's that costing you?"
- Need-Payoff (N): Get them to articulate the benefit/future state. Examples: "Would it help if..." "How would that impact..." "If we fix this, what changes?"

Grade the trainee's question based on these criteria:

1. TYPE ACCURACY (0-100):
- Did they craft the correct question type for the situation?
- Does it match the expected type?

2. QUALITY (0-100):
- Is it open-ended (not yes/no)?
- Does it flow naturally from the context?
- Does it dig deeper / advance the conversation?
- Is it specific to the prospect's situation?
- Does it use the prospect's own words/numbers?
- Does it make the prospect do the work (think, calculate)?

3. NATURALNESS (0-100):
- Does it sound like natural conversation?
- Avoids robotic/scripted language?
- Appropriate tone for a sales call?
- Would a real prospect feel understood (not interrogated)?

Common Mistakes to Flag:
- Asking yes/no questions (rephrase as open-ended)
- Jumping to Need-Payoff before Implication
- Stating the implication instead of asking
- Being vague ("What does that mean for your business?") vs. specific ("What's that cost you per month?")
- Apologizing or softening unnecessarily

Good Phrases to Encourage:
- "How long has that been going on?"
- "What's that cost you?"
- "What happens if that continues?"
- "If we fix that, what changes?"
- "Does that sound right?" (after doing math for them)

Return ONLY valid JSON (no markdown, no code blocks):
{
  "identifiedType": "S" | "P" | "I" | "N",
  "typeCorrect": true | false,
  "typeAccuracy": number (0-100),
  "qualityScore": number (0-100),
  "naturalnessScore": number (0-100),
  "feedback": "Brief, actionable feedback (1-2 sentences)",
  "improvedVersion": "A better version of their question"
}`;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      promptType,
      promptContext,
      expectedType,
      traineeResponse,
    } = body;

    // Validate required fields
    if (!promptContext || !traineeResponse) {
      return NextResponse.json(
        { error: 'Missing required fields: promptContext, traineeResponse' },
        { status: 400 }
      );
    }

    // For identification questions (Level 1), we don't need AI grading
    if (promptType === 'identify') {
      const isCorrect = traineeResponse.toUpperCase() === expectedType;
      const result = calculateIdentifyGrade(isCorrect);

      return NextResponse.json({
        identifiedType: traineeResponse.toUpperCase(),
        typeCorrect: isCorrect,
        typeAccuracy: isCorrect ? 100 : 0,
        qualityScore: null,
        naturalnessScore: null,
        feedback: isCorrect
          ? 'Correct! You identified the question type accurately.'
          : `Incorrect. This was a ${getTypeName(expectedType)} question. ${getTypeHint(expectedType)}`,
        grade: result.grade,
        overallScore: result.overallScore,
      });
    }

    // For crafting questions, use AI grading
    const userPrompt = `
SCENARIO/CONTEXT:
${promptContext}

EXPECTED QUESTION TYPE: ${expectedType} (${getTypeName(expectedType)})

TRAINEE'S QUESTION:
"${traineeResponse}"

Evaluate this question and provide your assessment.`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      system: GRADING_SYSTEM_PROMPT,
      messages: [
        { role: 'user', content: userPrompt },
      ],
    });

    // Extract the text response
    const textContent = message.content.find(c => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text response from AI');
    }

    // Parse the JSON response
    let aiResult;
    try {
      // Clean the response (remove any markdown formatting if present)
      let cleanedResponse = textContent.text.trim();
      if (cleanedResponse.startsWith('```')) {
        cleanedResponse = cleanedResponse.replace(/```json?\n?/g, '').replace(/```$/g, '').trim();
      }
      aiResult = JSON.parse(cleanedResponse);
    } catch {
      console.error('Failed to parse AI response:', textContent.text);
      return NextResponse.json(
        { error: 'Failed to parse AI grading response' },
        { status: 500 }
      );
    }

    // Calculate overall grade
    const gradeResult = calculateGrade({
      typeAccuracy: aiResult.typeAccuracy || (aiResult.typeCorrect ? 100 : 0),
      qualityScore: aiResult.qualityScore || 50,
      naturalnessScore: aiResult.naturalnessScore || 50,
    });

    return NextResponse.json({
      ...aiResult,
      grade: gradeResult.grade,
      overallScore: gradeResult.overallScore,
      breakdown: gradeResult.breakdown,
    });
  } catch (error) {
    console.error('Error grading response:', error);
    return NextResponse.json(
      { error: 'Failed to grade response' },
      { status: 500 }
    );
  }
}

function getTypeName(type: string): string {
  switch (type) {
    case 'S': return 'Situation';
    case 'P': return 'Problem';
    case 'I': return 'Implication';
    case 'N': return 'Need-Payoff';
    default: return type;
  }
}

function getTypeHint(type: string): string {
  switch (type) {
    case 'S':
      return 'Situation questions gather facts about current state (CRM, team size, spend, etc.)';
    case 'P':
      return 'Problem questions explore difficulties and pain points the prospect is facing.';
    case 'I':
      return 'Implication questions develop the seriousness - "What\'s that costing you?"';
    case 'N':
      return 'Need-Payoff questions get the prospect to articulate the benefit of solving the problem.';
    default:
      return '';
  }
}
