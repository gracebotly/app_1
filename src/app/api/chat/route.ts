import { NextRequest } from "next/server";
import OpenAI from "openai";
import { makeC1Response } from "@thesysai/genui-sdk/server";
import { getDashboardGenerationTools } from "@/app/lib/dashboard-tools";
import { getSystemPrompt } from "@/app/config/system-prompts";
import { createThread, saveMessages, getThreadMessages } from "@/app/lib/chatStore";

export async function POST(req: NextRequest) {
  const { prompt, threadId } = (await req.json()) as {
    prompt: { role: string; content: string; tool_calls?: unknown };
    threadId?: string;
  };

  const client = new OpenAI({
    baseURL: "https://api.thesys.dev/v1/embed/",
    apiKey: process.env.THESYS_API_KEY,
  });

  let resolvedThreadId = threadId;
if (!resolvedThreadId) {
  resolvedThreadId = await createThread();
}
const existingMessages = await getThreadMessages(resolvedThreadId);

// Always use the dashboard-generation system prompt
const systemPrompt = getSystemPrompt();

  // Create C1 response to stream content and "thinking" states
  const c1Response = makeC1Response();
  c1Response.writeThinkItem({
    title: "Processing your request",
    description: "Analyzing your message...",
  });

  // Build tool definitions
  const tools = getDashboardGenerationTools(c1Response.writeThinkItem);

  // Pull existing thread messages and save the new user message
  const conversationHistory = existingMessages.map((m) => ({
    role: m.role,
    content: m.content,
  }));
  await saveMessages(resolvedThreadId, [prompt]);

  // Call runTools: this will handle tool calls automatically
  const runToolsResponse = client.beta.chat.completions.runTools({
    model: "c1-exp/openai/gpt-4.1/v-20250709",
    messages: [
      { role: "system", content: systemPrompt },
      ...conversationHistory,
    ],
    tools: tools,
    stream: true,
  });

  // Collect messages returned by runTools for persistence
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const messagesToSave: any[] = [];

  runToolsResponse.on("content", (chunk) => {
    c1Response.writeContent(chunk);
  });

  runToolsResponse.on("message", (message) => {
    // Each message may include 'tool_calls' or be a normal assistant reply
    messagesToSave.push(message);
  });

  runToolsResponse.on("error", async (error) => {
    console.error("[Chat API Error]", error);
    // Persist whatever messages were generated before the error
    if (messagesToSave.length > 0) {
      await saveMessages(resolvedThreadId, messagesToSave);
    }
    c1Response.end();
});

runToolsResponse.on("end", async () => {
  c1Response.end();
  if (messagesToSave.length > 0) {
    await saveMessages(resolvedThreadId, messagesToSave);
  }
});

  return new Response(c1Response.responseStream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Thread-Id": resolvedThreadId,
    },
  });
}
