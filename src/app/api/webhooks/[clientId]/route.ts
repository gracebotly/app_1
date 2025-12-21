
import { NextRequest, NextResponse } from 'next/server';
import { getDashboardGenerationTools } from '@/app/lib/dashboard-tools';
import { getSystemPrompt } from '@/app/config/system-prompts';
import OpenAI from 'openai';
import { saveSpec } from '@/app/lib/dashboard-tools/specStore';
import { saveMessages, createThread } from '@/app/lib/chatStore';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

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
    const payload = await request.json() as Record<string, unknown>;

    console.log(`[Webhook] Received for client ${clientId}:`, payload);

    // Save raw payload to interactions table
    if (supabase) {
      await supabase.from('interactions').insert({
        client_id: clientId,
        payload: payload,
        received_at: new Date().toISOString(),
      });
    }

    // Store the webhook event (for backward compatibility)
    if (!webhookStore.has(clientId)) {
      webhookStore.set(clientId, []);
    }
    webhookStore.get(clientId)!.push({
      timestamp: new Date().toISOString(),
      data: payload
    });

    // Generate dashboard using real AI
    const apiKey = process.env.THESYS_API_KEY;
    
    if (apiKey && apiKey !== '') {
      const client = new OpenAI({
        baseURL: "https://api.thesys.dev/v1/embed/",
        apiKey,
      });

      // Capture intermediate thinking states into an array (for logging/debugging only)
      const progressMessages: string[] = [];
      const writeThinkingState = (state: { title: string; description: string }) => {
        progressMessages.push(`${state.title}: ${state.description}`);
      };

      const tools = getDashboardGenerationTools(writeThinkingState);

      // Create a thread for this webhook processing
      const threadId = await createThread(`webhook-${clientId}-${Date.now()}`);

      // Save the initial webhook message
      await saveMessages(threadId, [{
        role: "user",
        content: `Analyze this webhook data and generate a dashboard specification:\n\n${JSON.stringify(payload)}`,
      }]);

      // Run tools via the OpenAI helper. This automatically invokes any tools
      // called by the model and emits events as content/messages.
      const runToolsResponse = client.beta.chat.completions.runTools({
        model: "c1-exp/openai/gpt-4.1/v-20250709",
        messages: [
          { role: "system", content: getSystemPrompt() },
          {
            role: "user",
            content: `Analyze this webhook data and generate a dashboard specification:\n\n${JSON.stringify(payload)}`,
          },
        ],
        tools,
        stream: true,
      });

      const messagesToSave: { role: string; content?: unknown; tool_calls?: unknown }[] = [];

      runToolsResponse.on("error", async (err) => {
        console.error("[Webhook] runTools error:", err);
        // Persist whatever messages were generated before the error
        if (messagesToSave.length > 0) {
          await saveMessages(threadId, messagesToSave);
        }
      });

      runToolsResponse.on("message", async (message) => {
        // Transform the OpenAI message to match our expected format
        const messageToSave = {
          role: message.role,
          content: message.content,
          tool_calls: (message as { tool_calls?: unknown }).tool_calls,
        };
        messagesToSave.push(messageToSave);

        // Check properties directly on 'message' rather than casting to any
        if (
          message.role === "tool" &&
          (message as { name?: string }).name === "generate_dashboard_specification" &&
          typeof message.content === "string"
        ) {
          try {
            const result = JSON.parse(message.content);
            if (result && result.specification) {
              const specToSave = {
                ...result.specification,
                sampleData: payload,
                createdAt: Date.now(),
              };
              await saveSpec(clientId, specToSave);
              console.log(`[Webhook] Dashboard generated and saved for client ${clientId}`);
            }
          } catch (err) {
            console.error("Failed to parse tool result", err);
          }
        }
      });

      // Wait for completion
      await new Promise<void>((resolve, reject) => {
        runToolsResponse.on("end", async () => {
          // Persist all messages when processing completes
          if (messagesToSave.length > 0) {
            await saveMessages(threadId, messagesToSave);
          }
          resolve();
        });
        runToolsResponse.on("error", (err) => reject(err));
      });
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
