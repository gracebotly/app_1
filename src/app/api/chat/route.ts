import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { transformStream } from "@crayonai/stream";
import { DBMessage, getMessageStore } from "./messageStore";

export async function POST(req: NextRequest) {
  const { prompt, threadId, responseId } = (await req.json()) as {
    prompt: DBMessage;
    threadId: string;
    responseId: string;
  };

  const client = new OpenAI({
    baseURL: "https://api.thesys.dev/v1/embed/",
    apiKey: process.env.THESYS_API_KEY,
  });
  
  const messageStore = getMessageStore(threadId);

  // Check if this is a webhook URL generation message
  if (typeof prompt.content === 'string' && prompt.content.startsWith('WEBHOOK_URL_GENERATED:')) {
    const parts = prompt.content.split(':');
    const webhookUrl = parts[1];
    const clientId = parts[2];

    const responseMessage = `I've created a webhook URL for you:

**${webhookUrl}**

📋 **Next Steps:**

1. Copy the URL above
2. Add it to your platform (Vapi, Retell, n8n, Make, etc.)
   - For Vapi: Settings → Webhooks → Add webhook URL
   - For Retell: Dashboard → Webhooks → Create webhook
   - For n8n: Webhook node → Production URL
   - For Make: Webhooks → Add webhook

3. Send a test event from your platform

4. I'll automatically detect the data structure and generate your dashboard!

**Waiting for webhook event...** I'll notify you as soon as data arrives.

You can check webhook status here: ${webhookUrl.replace('/api/webhooks/', '/api/webhooks-status/')}`;

  messageStore.addMessage(prompt);
  messageStore.addMessage({
    role: "assistant",
    content: responseMessage,
    id: responseId,
  });

  return NextResponse.json({
    message: responseMessage,
    webhookUrl,
    clientId
  });
}

  // Normal chat flow
  messageStore.addMessage(prompt);

  const llmStream = await client.chat.completions.create({
    model: "c1/openai/gpt-5/v-20251130",
    messages: messageStore.getOpenAICompatibleMessageList(),
    stream: true,
  });

  const responseStream = transformStream(
    llmStream,
    (chunk) => {
      return chunk.choices?.[0]?.delta?.content ?? "";
    },
    {
      onEnd: ({ accumulated }) => {
        const message = accumulated.filter((message) => message).join("");
        messageStore.addMessage({
          role: "assistant",
          content: message,
          id: responseId,
        });
      },
    }
  ) as ReadableStream<string>;

  return new NextResponse(responseStream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
