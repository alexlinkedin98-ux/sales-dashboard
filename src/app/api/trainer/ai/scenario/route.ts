import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic();

const SCENARIO_SYSTEM_PROMPT = `You are a training scenario generator for SPIN selling practice at a Google Ads agency. Generate realistic scenarios based on REAL prospects that come to Google Ads agencies.

AGENCY CONTEXT:
You are training sales reps for a Google Ads agency that primarily works with:
- E-commerce brands (Shopify, WooCommerce, DTC brands) running Google Shopping, Search, and Performance Max
- Lead generation businesses (contractors, legal, dental, home services, B2B) running Search and Local campaigns
- Some Meta/Facebook ads as a secondary service

COMMON PROSPECT SITUATIONS (use these as inspiration):
1. "We've been running ads ourselves but can't seem to scale past $X/month"
2. "Our ROAS has been declining and we don't know why"
3. "We tried an agency before but they wasted our money"
4. "We're spending $X but have no idea if it's working"
5. "Our cost per lead keeps going up"
6. "We can't figure out why our competitors are beating us"
7. "We're getting clicks but no conversions"
8. "Our campaigns were doing great but suddenly tanked"
9. "We're launching a new product and need help with ads"
10. "We've been relying on organic/referrals but need to scale with paid"

COMMON PROSPECT PAIN POINTS:
- Wasted ad spend with no clear ROI
- Previous agency failed them (poor communication, no results)
- Don't understand their own data/metrics
- Scaling issues (ROAS tanks when they increase budget)
- High CPL/CPA eating into margins
- Competitors outbidding them
- Landing page/conversion issues
- Attribution confusion
- Seasonal fluctuations they can't manage
- Cash flow issues from slow-paying campaigns

VERTICALS TO USE:
- ecommerce: Shopify stores, DTC brands, product companies ($10K-$500K/mo ad spend)
- leadgen: Home services, legal, dental, B2B SaaS, contractors ($2K-$50K/mo ad spend)
- local_services: Single or multi-location businesses, franchises

Each scenario should feel like a REAL discovery call with a Google Ads prospect.

PROMPT TYPES:
- identify: Present a question and ask the trainee to identify if it's S, P, I, or N
- craft_single: Present a situation and ask trainee to craft ONE specific question type
- craft_chain: Present a response that needs I → N-P follow-up
- scenario: Start of a full discovery conversation
- curveball: Prospect deflects, rambles, or gives vague answer

Return ONLY valid JSON (no markdown, no code blocks).`;

interface ScenarioRequest {
  vertical: string;
  level: number;
  promptType: string;
  questionType?: string;
}

export async function POST(request: Request) {
  try {
    const body: ScenarioRequest = await request.json();
    const { vertical, level, promptType, questionType } = body;

    // Validate required fields
    if (!vertical || !level || !promptType) {
      return NextResponse.json(
        { error: 'Missing required fields: vertical, level, promptType' },
        { status: 400 }
      );
    }

    let userPrompt = '';

    switch (promptType) {
      case 'identify':
        userPrompt = `Generate a Level ${level} identification question for the ${vertical} vertical.

The trainee needs to identify what type of SPIN question is being asked.

Return JSON:
{
  "scenarioContext": "Brief context about the prospect/situation",
  "prospectStatement": "What the prospect just said (this provides context)",
  "sampleQuestion": "A clear example of a ${questionType || 'random SPIN'} question",
  "correctAnswer": "${questionType || 'S/P/I/N'}",
  "explanation": "Why this is a ${questionType || '[type]'} question"
}

${level <= 2 ? 'Make it straightforward and clear for beginners.' : ''}
${level >= 4 ? 'Make it nuanced - the question type should be less obvious.' : ''}`;
        break;

      case 'craft_single':
        userPrompt = `Generate a Level ${level} question crafting scenario for the ${vertical} vertical.

The trainee needs to craft a ${questionType} question.

Return JSON:
{
  "prospectPersona": {
    "name": "First name",
    "role": "Their title",
    "company": "Brief company description",
    "revenue": "Approximate revenue/size",
    "teamSize": "Number of employees if relevant"
  },
  "scenarioContext": "Detailed context about the business situation",
  "prospectStatement": "What the prospect just said that creates the opening for a ${questionType} question",
  "expectedType": "${questionType}",
  "sampleGoodResponse": "An example of an excellent ${questionType} question they could ask",
  "hints": ["Hint 1 for crafting a good question", "Hint 2"]
}

${level === 1 ? 'Make the opening obvious - clearly sets up for a ' + questionType + ' question.' : ''}
${level === 2 ? 'The prospect statement should clearly lead to a ' + questionType + ' question.' : ''}
${level >= 3 ? 'Make it more nuanced - trainee needs to think about the right question.' : ''}`;
        break;

      case 'craft_chain':
        userPrompt = `Generate a Level ${level} chain question scenario for the ${vertical} vertical.

The trainee needs to ask an Implication question, then follow up with a Need-Payoff question.

Return JSON:
{
  "prospectPersona": {
    "name": "First name",
    "role": "Their title",
    "company": "Brief company description"
  },
  "scenarioContext": "Context about the discovered problem",
  "prospectStatement": "Prospect's statement admitting a problem (sets up I question)",
  "expectedSequence": ["I", "N"],
  "sampleImplicationQuestion": "Example Implication question",
  "sampleNeedPayoffQuestion": "Example Need-Payoff question after they answer",
  "prospectResponseToImplication": "How prospect would respond to a good I question"
}`;
        break;

      case 'scenario':
        userPrompt = `Generate a Level ${level} full scenario for the ${vertical} vertical.

This is the start of a discovery call simulation.

Return JSON:
{
  "prospectPersona": {
    "name": "First name",
    "role": "Their title",
    "company": "Detailed company description",
    "revenue": "Revenue/size",
    "teamSize": "Team size",
    "currentSituation": "What they're currently doing",
    "surfaceProblem": "Problem they openly state",
    "deeperProblem": "Hidden problem they haven't articulated",
    "quantifiableCost": "The cost of the problem they haven't calculated",
    "desiredFuture": "What success looks like to them"
  },
  "scenarioContext": "Opening context for the call",
  "openingStatement": "Prospect's opening statement to start the conversation",
  "callObjective": "What the trainee should accomplish in this call"
}`;
        break;

      case 'curveball':
        userPrompt = `Generate a Level ${level} curveball scenario for the ${vertical} vertical.

The prospect will deflect, ramble, or give a vague answer. Trainee must redirect.

Return JSON:
{
  "prospectPersona": {
    "name": "First name",
    "role": "Their title",
    "company": "Brief company description"
  },
  "scenarioContext": "Context leading up to this moment",
  "previousQuestion": "The question that was asked",
  "curveballType": "deflection" | "rambling" | "vague" | "objection",
  "prospectResponse": "The deflecting/rambling/vague response",
  "recoveryHint": "How to redirect back to the conversation",
  "goodRecoveryExample": "Example of a good recovery question"
}`;
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid promptType' },
          { status: 400 }
        );
    }

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system: SCENARIO_SYSTEM_PROMPT,
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
      console.error('Failed to parse scenario response:', textContent.text);
      return NextResponse.json(
        { error: 'Failed to parse scenario response' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ...result,
      promptType,
      vertical,
      level,
    });
  } catch (error) {
    console.error('Error generating scenario:', error);
    return NextResponse.json(
      { error: 'Failed to generate scenario' },
      { status: 500 }
    );
  }
}
