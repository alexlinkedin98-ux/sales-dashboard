import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic();

const PROSPECT_SYSTEM_PROMPT = `You are playing a prospect in a SPIN selling training simulation. Stay in character and respond naturally as a business owner/decision-maker would.

RESPONSE RULES BASED ON QUESTION QUALITY:
- Quality >= 80: Reveal substantial information, be engaged and forthcoming, share specific numbers and details
- Quality 60-79: Give moderate information, some useful details but not everything
- Quality 40-59: Give brief, surface-level responses, be somewhat guarded
- Quality < 40: Be vague, deflect, or give minimal information

STAY IN CHARACTER:
- Respond as the prospect would naturally respond
- Don't break character or mention that you're in a training simulation
- Use conversational language appropriate to the business context
- Show emotion when appropriate (frustration with problems, excitement about solutions)

RESPONSE LENGTH:
- Match response length to question quality
- High quality = detailed, multi-sentence response
- Low quality = short, vague response

Return ONLY valid JSON (no markdown, no code blocks):
{
  "response": "Your in-character response as the prospect",
  "informationRevealed": ["List", "of", "new", "information", "shared"],
  "engagementLevel": "high" | "medium" | "low",
  "nextHook": "Optional hint about what they could ask next (or null)"
}`;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      prospectPersona,
      scenarioContext,
      conversationHistory,
      traineeQuestion,
      qualityScore,
    } = body;

    // Validate required fields
    if (!prospectPersona || !traineeQuestion) {
      return NextResponse.json(
        { error: 'Missing required fields: prospectPersona, traineeQuestion' },
        { status: 400 }
      );
    }

    const userPrompt = `
PROSPECT PERSONA:
${typeof prospectPersona === 'string' ? prospectPersona : JSON.stringify(prospectPersona, null, 2)}

SCENARIO CONTEXT:
${scenarioContext || 'Initial discovery call'}

CONVERSATION SO FAR:
${conversationHistory || 'This is the start of the conversation.'}

TRAINEE'S QUESTION:
"${traineeQuestion}"

QUESTION QUALITY SCORE: ${qualityScore || 50}/100

Respond as the prospect based on the quality score. Remember:
- High quality (80+) = be forthcoming and detailed
- Medium quality (60-79) = give moderate detail
- Low quality (40-59) = be brief and surface-level
- Very low quality (<40) = be vague or deflect`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      system: PROSPECT_SYSTEM_PROMPT,
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
    let result;
    try {
      let cleanedResponse = textContent.text.trim();
      if (cleanedResponse.startsWith('```')) {
        cleanedResponse = cleanedResponse.replace(/```json?\n?/g, '').replace(/```$/g, '').trim();
      }
      result = JSON.parse(cleanedResponse);
    } catch {
      // If JSON parsing fails, try to extract just the response
      console.error('Failed to parse prospect response as JSON:', textContent.text);
      result = {
        response: textContent.text,
        informationRevealed: [],
        engagementLevel: 'medium',
        nextHook: null,
      };
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error generating prospect response:', error);
    return NextResponse.json(
      { error: 'Failed to generate prospect response' },
      { status: 500 }
    );
  }
}
