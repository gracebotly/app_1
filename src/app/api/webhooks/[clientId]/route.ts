
import { NextRequest, NextResponse } from 'next/server';
import { getDashboardGenerationTools } from '@/app/lib/dashboard-tools';
import { getSystemPrompt } from '@/app/config/system-prompts';
import { saveSpec } from '@/app/lib/dashboard-tools/specStore';
import { verifySignature, extractWebhookHeaders } from '@/app/lib/security/webhook-security';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ clientId: string }> }
) {
  const startTime = Date.now();
  const { clientId } = await context.params;

  try {
    // CRITICAL: Get raw body BEFORE any JSON parsing
    // Signature verification requires exact raw string
    const rawBody = await request.text();

    // Extract webhook headers (Svix convention)
    const webhookHeaders = extractWebhookHeaders(request);

    // Get client from Supabase (includes webhook_secret_id for Vault)
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, webhook_secret_id, agency_id')
      .eq('id', clientId)
      .single();

    if (clientError || !client) {
      await logWebhookEvent(
        supabase,
        clientId,
        webhookHeaders['svix-id'],
        'error',
        'Client not found'
      );
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      );
    }

    if (!client.webhook_secret_id) {
      await logWebhookEvent(
        supabase,
        clientId,
        webhookHeaders['svix-id'],
        'error',
        'Webhook not configured for this client'
      );
      return NextResponse.json(
        { error: 'Webhook not configured' },
        { status: 500 }
      );
    }

    // Decrypt webhook secret from Supabase Vault
    const { data: secretData, error: secretError } = await supabase
      .rpc('get_decrypted_secret', { secret_id: client.webhook_secret_id });

    if (secretError || !secretData) {
      console.error('[Webhook] Failed to decrypt secret:', secretError);
      await logWebhookEvent(
        supabase,
        clientId,
        webhookHeaders['svix-id'],
        'error',
        'Failed to retrieve webhook secret'
      );
      return NextResponse.json(
        { error: 'Configuration error' },
        { status: 500 }
      );
    }

    const webhookSecret = secretData as string;

    // SECURITY: Verify HMAC signature
    const verification = verifySignature(rawBody, webhookHeaders, webhookSecret);

    if (!verification.valid) {
      // Log rejection with reason
      await logWebhookEvent(
        supabase,
        clientId,
        webhookHeaders['svix-id'],
        'rejected',
        verification.reason || 'Signature validation failed',
        {
          signature_valid: false,
          timestamp_valid: webhookHeaders['svix-timestamp'] ? true : false,
        }
      );

      return NextResponse.json(
        {
          error: 'Signature verification failed',
          reason: verification.reason,
        },
        { status: 401 }
      );
    }

    // Check for duplicate event (idempotency via event_id)
    const { data: existingEvent } = await supabase
      .from('interactions')
      .select('id')
      .eq('event_id', verification.eventId)
      .single();

    if (existingEvent) {
      // Event already processed - return 200 to prevent retries
      await logWebhookEvent(
        supabase,
        clientId,
        verification.eventId,
        'duplicate',
        'Event already processed'
      );

      return NextResponse.json(
        {
          status: 'ok',
          message: 'Event already processed',
          eventId: verification.eventId,
        },
        { status: 200 }
      );
    }

    // Parse webhook payload (safe to parse after signature verification)
    let webhookData: Record<string, unknown>;
    try {
      webhookData = JSON.parse(rawBody);
    } catch {
      await logWebhookEvent(
        supabase,
        clientId,
        verification.eventId,
        'error',
        'Invalid JSON payload'
      );
      return NextResponse.json(
        { error: 'Invalid JSON payload' },
        { status: 400 }
      );
    }

    // Store webhook event in interactions table
    const { data: interaction, error: insertError } = await supabase
      .from('interactions')
      .insert({
        client_id: clientId,
        event_id: verification.eventId,
        webhook_data: webhookData,
        signature_verified: true,
        webhook_timestamp: new Date(
          parseInt(webhookHeaders['svix-timestamp']) * 1000
        ),
        ip_address:
          request.headers.get('x-forwarded-for') ||
          request.headers.get('x-real-ip'),
        processed: false,
      })
      .select()
      .single();

    if (insertError) {
      console.error('[Webhook] Failed to store event:', insertError);
      await logWebhookEvent(
        supabase,
        clientId,
        verification.eventId,
        'error',
        'Database insert failed'
      );
      return NextResponse.json(
        { error: 'Failed to store event' },
        { status: 500 }
      );
    }

    // Log successful validation
    await logWebhookEvent(
      supabase,
      clientId,
      verification.eventId,
      'validated',
      'Signature verified successfully',
      {
        signature_valid: true,
        timestamp_valid: true,
      }
    );

    // PERFORMANCE: Return 200 OK immediately (< 100ms target)
    const responseTime = Date.now() - startTime;
    console.log(`[Webhook] Validated and stored in ${responseTime}ms`);

    // Trigger async processing (non-blocking)
    // Use Vercel's waitUntil if available, otherwise fire-and-forget
    const asyncProcessing = processWebhookAsync(
      interaction.id,
      clientId,
      webhookData
    );

    type GlobalWithWaitUntil = {
      waitUntil?: (promise: Promise<unknown>) => void;
    };

    const globalWithWaitUntil = globalThis as GlobalWithWaitUntil;
    if (typeof globalWithWaitUntil.waitUntil === 'function') {
      globalWithWaitUntil.waitUntil(asyncProcessing);
    } else {
      // Development fallback - process but don't await
      asyncProcessing.catch((error) => {
        console.error('[Webhook] Async processing failed:', error);
      });
    }

    return NextResponse.json(
      {
        status: 'ok',
        eventId: verification.eventId,
        interactionId: interaction.id,
        responseTime: `${responseTime}ms`,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Webhook] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Helper: Log webhook events to webhook_logs table
 */
async function logWebhookEvent(
  supabase: any, // eslint-disable-line @typescript-eslint/no-explicit-any -- Use any to avoid type conflicts between different Supabase client instances
  clientId: string,
  eventId: string | undefined,
  status: string,
  reason?: string,
  extra?: { signature_valid?: boolean; timestamp_valid?: boolean }
) {
  try {
    await supabase.from('webhook_logs').insert({
      client_id: clientId,
      event_id: eventId,
      status,
      rejection_reason: reason,
      signature_valid: extra?.signature_valid,
      timestamp_valid: extra?.timestamp_valid,
    });
  } catch (error) {
    console.error('[Webhook] Failed to log event:', error);
  }
}

/**
 * Async processing: Generate dashboard from webhook data
 * Runs in background, does not block webhook response
 */
async function processWebhookAsync(
  interactionId: string,
  clientId: string,
  webhookData: Record<string, unknown>
) {
  try {
    console.log(`[Webhook] Starting async processing for ${interactionId}`);

    const apiKey = process.env.THESYS_API_KEY;
    if (!apiKey || apiKey === '') {
      throw new Error('THESYS_API_KEY not configured');
    }

    const client = new OpenAI({
      baseURL: 'https://api.thesys.dev/v1/embed/',
      apiKey,
    });

    const progressMessages: string[] = [];
    const writeThinkingState = (state: {
      title: string;
      description: string;
    }) => {
      progressMessages.push(`${state.title}: ${state.description}`);
    };

    const tools = getDashboardGenerationTools(writeThinkingState);

    const runToolsResponse = client.beta.chat.completions.runTools({
      model: 'c1-exp/openai/gpt-4.1/v-20250709',
      messages: [
        { role: 'system', content: getSystemPrompt() },
        {
          role: 'user',
          content: `Analyze this webhook data and generate a dashboard specification:\n\n${JSON.stringify(
            webhookData
          )}`,
        },
      ],
      tools,
      stream: true,
    });

    runToolsResponse.on('error', (err) => {
      console.error('[Webhook] runTools error:', err);
    });

    let specSaved = false;
    runToolsResponse.on('message', async (message) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const msg: any = message;
      if (
        !specSaved &&
        msg.role === 'tool' &&
        msg.name === 'generate_dashboard_specification' &&
        typeof msg.content === 'string'
      ) {
        try {
          const result = JSON.parse(msg.content);
          if (result && result.specification) {
            const specToSave = {
              ...result.specification,
              sampleData: webhookData,
              createdAt: Date.now(),
            };
            await saveSpec(clientId, specToSave);
            specSaved = true;

            // Mark interaction as processed
            const supabase = createClient(supabaseUrl, supabaseKey);
            await supabase
              .from('interactions')
              .update({
                processed: true,
                processed_at: new Date().toISOString(),
              })
              .eq('id', interactionId);

            console.log(
              `[Webhook] Dashboard generated and saved for client ${clientId}`
            );
          }
        } catch (err) {
          console.error('Failed to parse tool result', err);
        }
      }
    });

    await new Promise<void>((resolve, reject) => {
      runToolsResponse.on('end', () => resolve());
      runToolsResponse.on('error', (err) => reject(err));
    });
  } catch (error) {
    console.error('[Webhook] Async processing error:', error);

    // Update interaction with error
    const supabase = createClient(supabaseUrl, supabaseKey);
    await supabase
      .from('interactions')
      .update({
        processing_error:
          error instanceof Error ? error.message : 'Unknown error',
      })
      .eq('id', interactionId);
  }
}

/**
 * GET endpoint: Check webhook status and recent events
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ clientId: string }> }
) {
  const { clientId } = await context.params;

  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data: events, error } = await supabase
    .from('interactions')
    .select('id, event_id, received_at, processed')
    .eq('client_id', clientId)
    .order('received_at', { ascending: false })
    .limit(10);

  if (error) {
    return NextResponse.json(
      { error: 'Failed to fetch events' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    clientId,
    eventCount: events?.length || 0,
    recentEvents: events || [],
  });
}
