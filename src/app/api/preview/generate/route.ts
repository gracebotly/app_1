import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getDashboardGenerationTools } from '@/app/lib/dashboard-tools';
import { getSystemPrompt } from '@/app/config/system-prompts';
import { saveSpec } from '@/app/lib/dashboard-tools/specStore';
import OpenAI from 'openai';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

interface DashboardSpec {
  templateId: string;
  templateName: string;
  structure: {
    sections: Array<{
      type: string;
      responsive?: Record<string, string>;
      widgets: Array<{
        type: string;
        label?: string;
        title?: string;
        dataPath?: string;
        icon?: string;
        format?: string;
        columns?: Array<{ key: string; label: string; format?: string }>;
        pagination?: boolean;
        height?: Record<string, string>;
        xAxis?: string;
        yAxis?: string;
      }>;
      dataPath?: string;
      columns?: Array<{ key: string; label: string; format?: string }>;
      pagination?: boolean;
      title?: string;
    }>;
  };
  fieldMappings: Record<string, string>;
  theme: {
    primary: string;
    secondary: string;
  };
  sampleData?: Record<string, unknown>;
  createdAt: number;  // Required, not optional
}

export async function POST(req: NextRequest) {
  try {
    const { clientId, webhookData } = await req.json();
    
    if (!clientId || !webhookData) {
      return NextResponse.json(
        { error: 'Missing clientId or webhookData' },
        { status: 400 }
      );
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, subdomain')
      .eq('id', clientId)
      .single();
    
    if (clientError || !client) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      );
    }
    
    const apiKey = process.env.THESYS_API_KEY;
    if (!apiKey || apiKey === '') {
      return NextResponse.json(
        { error: 'AI service not configured' },
        { status: 500 }
      );
    }
    
    const aiClient = new OpenAI({
      baseURL: 'https://api.thesys.dev/v1/embed/',
      apiKey,
    });
    
    const writeThinkingState = (state: { title: string; description: string }) => {
      console.log(`[Preview] ${state.title}: ${state.description}`);
    };
    
    const tools = getDashboardGenerationTools(writeThinkingState);
    
    const runToolsResponse = aiClient.beta.chat.completions.runTools({
      model: 'c1-exp/openai/gpt-4.1/v-20250709',
      messages: [
        { role: 'system', content: getSystemPrompt() },
        {
          role: 'user',
          content: `Analyze this webhook data and generate a dashboard specification:\n\n${JSON.stringify(webhookData)}`,
        },
      ],
      tools,
      stream: true,
    });
    
    let finalSpec: DashboardSpec | null = null;
    let savePromise: Promise<void> | null = null;
    
    runToolsResponse.on('message', async (message) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const msg: any = message;
      
      if (
        !savePromise &&
        msg.role === 'tool' &&
        msg.name === 'generate_dashboard_specification' &&
        typeof msg.content === 'string'
      ) {
        try {
          const result = JSON.parse(msg.content);
          if (result && result.specification) {
            const specToSave: DashboardSpec = {
              ...result.specification,
              sampleData: webhookData,
              createdAt: Date.now(),
            };
            
            savePromise = saveSpec(clientId, specToSave);
            finalSpec = specToSave;
            
            console.log(`[Preview] Dashboard spec generation complete for client ${clientId}`);
          }
        } catch (err) {
          console.error('[Preview] Failed to parse tool result:', err);
        }
      }
    });
    
    await new Promise<void>((resolve, reject) => {
      runToolsResponse.on('error', (err) => {
        console.error('[Preview] Tool execution error:', err);
        reject(err);
      });
      
      runToolsResponse.on('end', () => {
        resolve();
      });
    });
    
    if (savePromise) {
      try {
        await savePromise;
        console.log(`[Preview] Dashboard spec saved successfully for client ${clientId}`);
      } catch (err) {
        console.error('[Preview] Failed to save spec:', err);
        return NextResponse.json(
          { error: 'Failed to save dashboard specification' },
          { status: 500 }
        );
      }
    }
    
    if (!finalSpec) {
      return NextResponse.json(
        { error: 'Failed to generate dashboard specification' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      dashboardReady: true,
      previewUrl: `/dashboard/preview/${clientId}`,
      templateName: finalSpec.templateName || 'Generated Dashboard',
      clientId,
      subdomain: client.subdomain,
    });
    
  } catch (error) {
    console.error('[Preview API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
