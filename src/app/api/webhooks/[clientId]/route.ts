
import { NextRequest, NextResponse } from 'next/server';
import { getDashboardGenerationTools } from '@/app/lib/dashboard-tools';
import { getSystemPrompt } from '@/app/config/system-prompts';
import OpenAI from 'openai';
import { saveSpec } from '@/app/lib/dashboard-tools/specStore';

// Store received webhooks in memory (temporary - will use database later)
type WebhookEvent = Readonly<{
  timestamp: string;
  data: unknown;
}>;

const webhookStore = new Map<string, WebhookEvent[]>();

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ clientId: string }> }
) {
  const { clientId } = await context.params;
  try {
    const webhookData = await request.json() as Record<string, unknown>;

    console.log(`[Webhook] Received for client ${clientId}:`, webhookData);

    // Store the webhook event
    if (!webhookStore.has(clientId)) {
      webhookStore.set(clientId, []);
    }
    webhookStore.get(clientId)!.push({
      timestamp: new Date().toISOString(),
      data: webhookData
    });

    // Generate dashboard using real AI
    const apiKey = process.env.THESYS_API_KEY;
    
    if (apiKey && apiKey !== '') {
      const client = new OpenAI({
        baseURL: "https://api.thesys.dev/v1/embed/",
        apiKey: apiKey,
      });

      const progressMessages: string[] = [];
      const writeThinkingState = async (state: { title: string; description: string }) => {
        progressMessages.push(`${state.title}: ${state.description}`);
      };

      const tools = getDashboardGenerationTools(writeThinkingState);

      const llmStream = await client.chat.completions.create({
        model: "c1/openai/gpt-4o/v-20241120",
        messages: [
          {
            role: "system",
            content: getSystemPrompt()
          },
          {
            role: "user",
            content: `Analyze this webhook data and generate a dashboard specification:\n\n${JSON.stringify(webhookData)}`
          }
        ],
        tools: tools.map(tool => ({
          type: "function" as const,
          function: {
            name: tool.function.name,
            description: tool.function.description,
            parameters: tool.function.parameters,
          }
        })),
        tool_choice: "auto",
        stream: true,
      });

      // Process AI response and execute tools
      for await (const chunk of llmStream) {
        const toolCalls = chunk.choices[0]?.delta?.tool_calls;
        
        if (toolCalls) {
          for (const toolCall of toolCalls) {
            if (toolCall.function?.name && toolCall.function?.arguments) {
              const toolName = toolCall.function.name;
              const tool = tools.find(t => t.function.name === toolName);
              if (tool) {
                const args = JSON.parse(toolCall.function.arguments);
                await tool.function.execute(args);
              }
            }
          }
        }
      }

      // Save generated spec with clientId as preview ID
      const mockSpec = {
        templateId: "webhook-dashboard",
        templateName: "Webhook Dashboard",
        structure: {
          sections: [
            {
              type: "kpi-grid",
              widgets: [
                {
                  type: "stat-card",
                  label: "Total Events",
                  dataPath: "metrics.totalEvents",
                  icon: "activity",
                  format: "number"
                }
              ]
            }
          ]
        },
        fieldMappings: {},
        theme: {
          primary: "#4F46E5",
          secondary: "#7C3AED"
        },
        sampleData: webhookData,
        createdAt: Date.now()
      };

      saveSpec(clientId, mockSpec);

      console.log(`[Webhook] Dashboard generated for client ${clientId}`);
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Webhook received and dashboard generated',
      clientId 
    });

  } catch (error) {
    console.error('[Webhook] Error:', error);
    return NextResponse.json(
      { error: 'Failed to process webhook' },
      { status: 500 }
    );
  }
}

// Allow GET to check webhook status
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ clientId: string }> }
) {
  const { clientId } = await context.params;
  const events = webhookStore.get(clientId) || [];
  
  return NextResponse.json({
    clientId,
    eventCount: events.length,
    events: events.slice(-5) // Return last 5 events
  });
}
