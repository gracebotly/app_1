// Agent 1's SSE streaming pattern adapted for Getflowetic

import { OpenAI } from "openai";
import { getDashboardGenerationTools } from "@/app/lib/dashboard-tools";
import { GETFLOWETIC_SYSTEM_PROMPT } from "@/app/config/system-prompts";

export async function POST(request: Request) {
  const { webhookData, clientId } = await request.json();

  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  // Initialize OpenAI client pointing to Thesys
  const client = new OpenAI({
    apiKey: process.env.THESYS_API_KEY!,
    baseURL: "https://api.thesys.dev/v1/embed/",
  });

  // Thinking state writer
  const writeThinkingState = (state: { title: string; description: string }) => {
    writer.write(
      encoder.encode(`data: ${JSON.stringify({ type: 'thinking', ...state })}\n\n`)
    );
  };

  // Get tools
  const tools = getDashboardGenerationTools(writeThinkingState);

  // Start generation in background
  (async () => {
    try {
      const runner = client.beta.chat.completions.runTools({
        model: "c1/openai/gpt-5/v-20251130",
        messages: [
          { role: "system", content: GETFLOWETIC_SYSTEM_PROMPT },
          { 
            role: "user", 
            content: `Generate a dashboard for this webhook data:\n${JSON.stringify(webhookData, null, 2)}` 
          }
        ],
        tools,
      });

      // Stream tool calls
      runner.on("message", (message) => {
        writer.write(
          encoder.encode(`data: ${JSON.stringify({ type: 'message', message })}\n\n`)
        );
      });

      // Wait for completion
      const finalMessage = await runner.finalContent();
      
      writer.write(
        encoder.encode(`data: ${JSON.stringify({ type: 'complete', result: finalMessage })}\n\n`)
      );
    } catch (error) {
      console.error("Dashboard generation failed:", error);
      writer.write(
        encoder.encode(`data: ${JSON.stringify({ type: 'error', error: String(error) })}\n\n`)
      );
    } finally {
      await writer.close();
    }
  })();

  return new Response(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
