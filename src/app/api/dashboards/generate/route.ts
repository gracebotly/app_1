import { NextRequest } from 'next/server';
import { getDashboardGenerationTools } from '@/app/lib/dashboard-tools';
import { getSystemPrompt } from '@/app/config/system-prompts';
import OpenAI from 'openai';

export async function POST(request: NextRequest) {
  try {
    const { webhookData } = await request.json();
    
    const encoder = new TextEncoder();
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();

    const writeThinkingState = async (state: { title: string; description: string }) => {
      await writer.write(
        encoder.encode(`data: ${JSON.stringify({ type: 'thinking', ...state })}\n\n`)
      );
    };

    const apiKey = process.env.THESYS_API_KEY;
    
    // Check if real AI should be used or mock
    if (apiKey && apiKey !== '') {
      // Real AI Implementation
      (async () => {
        try {
          const client = new OpenAI({
            baseURL: "https://api.thesys.dev/v1/embed/",
            apiKey: apiKey,
          });
          
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
                content: `Analyze this webhook data and generate a dashboard specification:\n\n${webhookData}`
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

          await writer.close();
        } catch (error) {
          console.error('Real AI generation error:', error);
          await writer.write(
            encoder.encode(`data: ${JSON.stringify({ 
              type: 'error', 
              message: 'Failed to generate dashboard with AI' 
            })}\n\n`)
          );
          await writer.close();
        }
      })();
    } else {
      // Mock Implementation (fallback for development)
      (async () => {
        try {
          await writeThinkingState({
            title: "Analyzing Webhook Payload",
            description: "Extracting schema and identifying key metrics..."
          });
          
          await new Promise(resolve => setTimeout(resolve, 1500));

          await writeThinkingState({
            title: "Matching Template",
            description: "Found best match: Voice Agent Appointments Dashboard"
          });
          
          await new Promise(resolve => setTimeout(resolve, 1500));

          await writeThinkingState({
            title: "Generating Dashboard Specification",
            description: "Creating sections and mapping fields..."
          });
          
          await new Promise(resolve => setTimeout(resolve, 1500));

          const mockSpec = {
            templateId: "voice-agent-dashboard",
            templateName: "Voice Agent Dashboard",
            structure: {
              sections: [
                {
                  type: "kpi-grid",
                  widgets: [
                    {
                      type: "stat-card",
                      label: "Total Calls Today",
                      dataPath: "metrics.totalCalls",
                      icon: "phone",
                      format: "number"
                    },
                    {
                      type: "stat-card",
                      label: "Avg Call Duration",
                      dataPath: "metrics.avgDuration", 
                      icon: "clock",
                      format: "duration"
                    }
                  ]
                }
              ]
            },
            fieldMappings: {
              call_id: "call_id",
              duration: "duration",
              status: "status",
              timestamp: "timestamp"
            },
            theme: {
              primary: "#4F46E5",
              secondary: "#7C3AED"
            }
          };

          const { saveSpec } = await import('@/app/lib/dashboard-tools/specStore');
          const previewId = Math.random().toString(36).substring(2, 11);
          const specToSave = {
            ...mockSpec,
            sampleData: webhookData,
            createdAt: Date.now()
          };
          saveSpec(previewId, specToSave);

          await writer.write(
            encoder.encode(`data: ${JSON.stringify({ 
              type: 'preview_ready', 
              previewId,
              message: 'Dashboard generated successfully (mock mode - set THESYS_API_KEY for real AI)'
            })}\n\n`)
          );

          await writer.close();
        } catch (error) {
          console.error('Mock generation error:', error);
          await writer.write(
            encoder.encode(`data: ${JSON.stringify({ 
              type: 'error', 
              message: 'Failed to generate dashboard' 
            })}\n\n`)
          );
          await writer.close();
        }
      })();
    }

    return new Response(stream.readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Dashboard generation error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to process request' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}