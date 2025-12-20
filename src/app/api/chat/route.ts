import { NextRequest } from "next/server";
import OpenAI from "openai";
import { makeC1Response } from "@thesysai/genui-sdk/server";
import { getDashboardGenerationTools } from "@/app/lib/dashboard-tools";
import { getSystemPrompt } from "@/app/config/system-prompts";
import { DBMessage, getMessageStore } from "./messageStore";

export async function POST(req: NextRequest) {
  const { prompt, threadId } = (await req.json()) as {
    prompt: DBMessage;
    threadId: string;
  };

  const client = new OpenAI({
    baseURL: "https://api.thesys.dev/v1/embed/",
    apiKey: process.env.THESYS_API_KEY,
  });

  const messageStore = getMessageStore(threadId);

  // Decide which system prompt to use based on user message
  const isWebhookRequest =
    typeof prompt.content === "string" &&
    /webhook|client id|dashboard|generate/i.test(prompt.content);

  const systemPrompt = isWebhookRequest
    ? getSystemPrompt() // dashboard-specific prompt
    : "You are a helpful AI assistant. Provide clear, concise, and accurate responses."; // generic chat prompt

  // Create C1 response to stream content and "thinking" states
  const c1Response = makeC1Response();
  c1Response.writeThinkItem({
    title: "Processing your request",
    description: "Analyzing your message...",
  });

  // Build tool definitions
  const tools = getDashboardGenerationTools(c1Response.writeThinkItem);

  // Pull existing thread messages and save the new user message
  const conversationHistory = await messageStore.getOpenAICompatibleMessageList();
  await messageStore.addMessage(prompt);

  // Call runTools: this will handle tool calls automatically
  const runToolsResponse = client.beta.chat.completions.runTools({
    model: "c1/openai/gpt-4o/v-20241120",
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

  runToolsResponse.on("error", (error) => {
    console.error("[Chat API Error]", error);
    c1Response.end();
  });

  runToolsResponse.on("end", async () => {
    c1Response.end();
    // Persist assistant + tool messages to Supabase
    for (const msg of messagesToSave) {
      await messageStore.addMessage({
        role: msg.role,
        content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
        id: msg.id || crypto.randomUUID(),
      });
    }
  });

  return new Response(c1Response.responseStream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
