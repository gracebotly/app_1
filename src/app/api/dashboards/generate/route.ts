import { OpenAI } from "openai";
import { getDashboardGenerationTools } from "@/app/lib/dashboard-tools";
import { GETFLOWETIC_SYSTEM_PROMPT } from "@/app/config/system-prompts";
import { analyzeWebhookPayload } from "@/app/lib/dashboard-tools/implementations/analyzeWebhookPayload";
import { generateDashboardSpecification } from "@/app/lib/dashboard-tools/implementations/generateDashboardSpecification";
import { previewWithSampleData } from "@/app/lib/dashboard-tools/implementations/previewWithSampleData";

export async function POST(request: Request) {
  const { webhookData } = await request.json();

  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  const client = new OpenAI({
    apiKey: process.env.THESYS_API_KEY!,
    baseURL: "https://api.thesys.dev/v1/embed/",
  });

  const writeThinkingState = (state: { title: string; description: string }) => {
    writer.write(
      encoder.encode(`data: ${JSON.stringify({ type: 'thinking', ...state })}\n\n`)
    );
  };

  const tools = getDashboardGenerationTools(writeThinkingState);

  (async () => {
    try {
      const completion = await client.chat.completions.create({
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
      
      const message = completion.choices[0]?.message;
      
      if (message?.tool_calls) {
        for (const toolCall of message.tool_calls) {
          const functionName = toolCall.function.name;
          const functionArgs = JSON.parse(toolCall.function.arguments || '{}');
          
          if (functionName === 'analyze_webhook_payload') {
            writeThinkingState({ title: "Analyzing webhook data...", description: "Detecting field types and data structure" });
            const result = await analyzeWebhookPayload(functionArgs);
            writer.write(encoder.encode(`data: ${JSON.stringify({ type: 'tool_result', tool: functionName, result })}\n\n`));
          } else if (functionName === 'generate_dashboard_specification') {
            writeThinkingState({ title: "Generating dashboard...", description: "Creating widgets and layout specification" });
            const result = await generateDashboardSpecification(functionArgs);
            writer.write(encoder.encode(`data: ${JSON.stringify({ type: 'tool_result', tool: functionName, result })}\n\n`));
          } else if (functionName === 'preview_with_sample_data') {
            writeThinkingState({ title: "Validating dashboard...", description: "Testing spec with sample webhook data" });
            const result = await previewWithSampleData(functionArgs);
            writer.write(encoder.encode(`data: ${JSON.stringify({ type: 'tool_result', tool: functionName, result })}\n\n`));
          }
        }
      }
      
      writer.write(
        encoder.encode(`data: ${JSON.stringify({ type: 'complete', result: message?.content || 'Dashboard generation completed' })}\n\n`)
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