import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { transformStream } from "@crayonai/stream";
import { DBMessage, getMessageStore } from "./messageStore";

export async function POST(req: NextRequest) {
  const { prompt, threadId, responseId, webhookData, webhookSuccess } = (await req.json()) as {
    prompt: DBMessage;
    threadId: string;
    responseId: string;
    webhookData?: { clientId: string; webhookUrl: string };
    webhookSuccess?: { previewUrl: string; templateName: string };
  };

  const client = new OpenAI({
    baseURL: "https://api.thesys.dev/v1/embed/",
    apiKey: process.env.THESYS_API_KEY,
  });
  
  const messageStore = getMessageStore(threadId);

  // Save user message
  await messageStore.addMessage(prompt);

  // Handle webhook setup
  if (webhookData?.webhookUrl) {
    const responseMessage = `I've created a webhook URL for you:

**${webhookData.webhookUrl}**

📋 **Setup Instructions:**

1. Copy the URL above
2. Add it to your platform:
   - **Vapi:** Dashboard → Server URL → Paste webhook URL
   - **Retell:** Settings → Webhook URL → Paste URL
   - **n8n:** Webhook node → Production URL → Deploy
   - **Make:** Webhooks → Custom Webhook → Paste URL

3. Send a test event from your platform

I'm now listening for webhook data. Once you send a test event, I'll automatically detect your data structure and generate a dashboard preview.

⏳ **Status:** Waiting for first webhook event...`;

    await messageStore.addMessage({
      role: "assistant",
      content: responseMessage,
      id: responseId,
    });

    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        controller.enqueue(encoder.encode(responseMessage));
        controller.close();
      }
    });

    return new NextResponse(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  }

  // Handle webhook success
  if (webhookSuccess) {
    const successMessage = `🎉 **Webhook Connected Successfully!**

Your dashboard has been generated and is ready!

**📊 Preview URL:** ${webhookSuccess.previewUrl}
**🎨 Template Used:** ${webhookSuccess.templateName || 'Auto-detected'}

You can:
- Click the preview link above to see your dashboard
- Ask me to customize specific charts or metrics
- Request changes to colors, layouts, or data displays

What would you like to do next?`;

    await messageStore.addMessage({
      role: "assistant",
      content: successMessage,
      id: responseId,
    });

    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        controller.enqueue(encoder.encode(successMessage));
        controller.close();
      }
    });

    return new NextResponse(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  }

  // Normal AI chat - load history
  const llmStream = await client.chat.completions.create({
    model: "c1/openai/gpt-5/v-20251130",
    messages: await messageStore.getOpenAICompatibleMessageList(),
    stream: true,
  });

  const responseStream = transformStream(
    llmStream,
    (chunk) => {
      return chunk.choices?.[0]?.delta?.content ?? "";
    },
    {
      onEnd: async ({ accumulated }) => {
        const message = accumulated.filter((message) => message).join("");
        await messageStore.addMessage({
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
