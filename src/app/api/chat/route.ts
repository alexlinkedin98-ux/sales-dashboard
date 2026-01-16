import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic();

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function POST(request: NextRequest) {
  try {
    const { messages, context, data } = await request.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      );
    }

    // Build system prompt based on context
    const systemPrompt = buildSystemPrompt(context, data);

    // Format messages for Anthropic API
    const formattedMessages: ChatMessage[] = messages.map((msg: { role: string; content: string }) => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    }));

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      messages: formattedMessages,
    });

    // Extract text from response
    const assistantMessage = response.content
      .filter((block) => block.type === 'text')
      .map((block) => (block as { type: 'text'; text: string }).text)
      .join('');

    return NextResponse.json({ message: assistantMessage });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Failed to process chat request' },
      { status: 500 }
    );
  }
}

function buildSystemPrompt(context: string, data: Record<string, unknown>): string {
  const basePrompt = `You are a helpful data analyst assistant for a sales dashboard application. You help users understand their data, identify trends, and provide insights.

Your responses should be:
- Concise and actionable
- Data-driven when possible
- Friendly but professional
- Include specific numbers when referencing data

If you don't have enough data to answer a question, say so and suggest what data might help.

When referencing dashboard sections, be specific about where users can find information.`;

  let contextPrompt = '';
  let dataPrompt = '';

  switch (context) {
    case 'sales':
      contextPrompt = `

You are currently helping with the SALES DASHBOARD. This dashboard tracks:
- Intro Calls Scheduled & Taken
- Accounts Audited
- Proposals Pitched
- Deals Closed
- MRR (Monthly Recurring Revenue)

Key metrics to analyze:
- Show rate (calls taken / calls scheduled)
- Conversion rates through the funnel
- Per-rep performance comparisons
- Weekly and monthly trends`;
      break;

    case 'triage':
      contextPrompt = `

You are currently helping with the TRIAGE DASHBOARD. This dashboard tracks:
- Triage Calls Booked
- Triage Calls Taken
- Qualified for Intro (leads that passed triage)

Key metrics to analyze:
- Show rate (taken / booked)
- Qualification rate (qualified / taken)
- Per-rep triage performance
- Conversion from triage to intro calls`;
      break;

    case 'marketing':
      contextPrompt = `

You are currently helping with the MARKETING DASHBOARD. This dashboard tracks marketing channel performance:
- Ad Spend per channel
- Leads Generated per channel
- Cost Per Lead (CPL)

Key metrics to analyze:
- Which channels are most cost-effective
- ROI comparisons between channels
- Spending trends over time
- Lead generation efficiency`;
      break;

    case 'marketing-triage':
      contextPrompt = `

You are currently helping with the MARKETING TRIAGE DASHBOARD. This dashboard tracks:
- Leads Received per marketing channel

Key metrics to analyze:
- Which channels bring the most leads
- Weekly trends in lead volume
- Channel contribution to total leads`;
      break;

    default:
      contextPrompt = `

You can help with any of the following dashboards:
- Sales Dashboard: Track sales rep performance and pipeline
- Triage Dashboard: Track qualification calls
- Marketing Dashboard: Track ad spend and lead generation
- Marketing Triage: Track leads received by channel`;
  }

  if (data && Object.keys(data).length > 0) {
    dataPrompt = `

Here is the current data from the dashboard:
${JSON.stringify(data, null, 2)}`;
  }

  return basePrompt + contextPrompt + dataPrompt;
}
