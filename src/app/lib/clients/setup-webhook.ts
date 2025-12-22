import {
  generateWebhookSecret,
  generateWebhookUrl,
  generateWebhookInstructions,
} from '@/app/lib/security/webhook-security';
import { createServerSupabaseClient } from '@/app/lib/supabase-server';

/**
 * Result of webhook setup
 */
export interface WebhookSetupResult {
  success: boolean;
  webhookUrl?: string;
  webhookSecret?: string;
  instructions?: string;
  error?: string;
}

/**
 * Sets up webhook configuration for a client
 * 
 * This function:
 * 1. Generates a cryptographically secure webhook secret
 * 2. Generates the webhook URL for the client
 * 3. Updates the client record in Supabase
 * 4. Returns setup instructions for the agency
 * 
 * @param clientId - Client UUID
 * @returns Webhook setup result with URL, secret, and instructions
 * 
 * @example
 * ```typescript
 * const result = await setupWebhookForClient('client-uuid-123');
 * if (result.success) {
 *   console.log('Webhook URL:', result.webhookUrl);
 *   console.log('Secret:', result.webhookSecret);
 *   console.log(result.instructions);
 * }
 * ```
 */
export async function setupWebhookForClient(
  clientId: string
): Promise<WebhookSetupResult> {
  try {
    // Validate clientId
    if (!clientId || typeof clientId !== 'string') {
      return {
        success: false,
        error: 'Invalid client ID provided',
      };
    }

    // Create Supabase client
    const supabase = createServerSupabaseClient();

    // Check if client exists
    const { data: existingClient, error: fetchError } = await supabase
      .from('clients')
      .select('id, webhook_secret_id, webhook_url')
      .eq('id', clientId)
      .single();

    if (fetchError || !existingClient) {
      return {
        success: false,
        error: `Client not found: ${fetchError?.message || 'Unknown error'}`,
      };
    }

    // Check if webhook is already configured
    if (existingClient.webhook_secret_id && existingClient.webhook_url) {
      // Already configured - retrieve secret from Vault
      const { data: secretData } = await supabase.rpc('get_decrypted_secret', {
        secret_id: existingClient.webhook_secret_id,
      });

      const webhookSecret = secretData as string;

      return {
        success: true,
        webhookUrl: existingClient.webhook_url,
        webhookSecret,
        instructions: generateWebhookInstructions(
          existingClient.webhook_url,
          webhookSecret
        ),
      };
    }

    // Generate webhook secret
    const webhookSecret = generateWebhookSecret();

    // Store secret in Supabase Vault
    const secretId = `webhook_secret_${clientId}`;
    const { error: vaultError } = await supabase.rpc('create_vault_secret', {
      secret_value: webhookSecret,
      secret_id: secretId,
    });

    if (vaultError) {
      return {
        success: false,
        error: `Failed to store secret in Vault: ${vaultError.message}`,
      };
    }

    // Generate webhook URL
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    const webhookUrl = generateWebhookUrl(clientId, baseUrl);

    // Update client with webhook configuration (store Vault secret ID, not secret itself)
    const { data: updatedClient, error: updateError } = await supabase
      .from('clients')
      .update({
        webhook_secret_id: secretId,
        webhook_url: webhookUrl,
        status: 'webhook-configured',
        updated_at: new Date().toISOString(),
      })
      .eq('id', clientId)
      .select()
      .single();

    if (updateError || !updatedClient) {
      return {
        success: false,
        error: `Failed to configure webhook: ${updateError?.message || 'Unknown error'}`,
      };
    }

    // Generate setup instructions
    const instructions = generateWebhookInstructions(webhookUrl, webhookSecret);

    return {
      success: true,
      webhookUrl,
      webhookSecret,
      instructions,
    };
  } catch (error) {
    console.error('[setupWebhookForClient] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Rotates the webhook secret for a client
 * 
 * Generates a new secret and updates the client record.
 * The old secret is immediately invalidated.
 * 
 * @param clientId - Client UUID
 * @returns New webhook setup with rotated secret
 * 
 * @example
 * ```typescript
 * const result = await rotateWebhookSecret('client-uuid-123');
 * if (result.success) {
 *   console.log('New secret:', result.webhookSecret);
 *   // Update platform configuration with new secret
 * }
 * ```
 */
export async function rotateWebhookSecret(
  clientId: string
): Promise<WebhookSetupResult> {
  try {
    const supabase = createServerSupabaseClient();

    // Generate new secret
    const newSecret = generateWebhookSecret();

    // Get existing webhook configuration
    const { data: client } = await supabase
      .from('clients')
      .select('webhook_url, webhook_secret_id')
      .eq('id', clientId)
      .single();

    if (!client?.webhook_url || !client?.webhook_secret_id) {
      return {
        success: false,
        error: 'Client webhook not configured. Use setupWebhookForClient first.',
      };
    }

    // Update secret in Vault (same secret ID, new value)
    const { error: vaultError } = await supabase.rpc('update_vault_secret', {
      secret_id: client.webhook_secret_id,
      secret_value: newSecret,
    });

    if (vaultError) {
      return {
        success: false,
        error: `Failed to rotate secret: ${vaultError.message}`,
      };
    }

    // Update timestamp
    const { error: updateError } = await supabase
      .from('clients')
      .update({
        updated_at: new Date().toISOString(),
      })
      .eq('id', clientId);

    if (updateError) {
      return {
        success: false,
        error: `Failed to rotate secret: ${updateError.message}`,
      };
    }

    return {
      success: true,
      webhookUrl: client.webhook_url,
      webhookSecret: newSecret,
      instructions: generateWebhookInstructions(client.webhook_url, newSecret),
    };
  } catch (error) {
    console.error('[rotateWebhookSecret] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Retrieves webhook configuration for a client (without exposing secret)
 * 
 * @param clientId - Client UUID
 * @returns Webhook configuration (secret masked)
 */
export async function getWebhookConfig(clientId: string) {
  try {
    const supabase = createServerSupabaseClient();

    const { data: client, error } = await supabase
      .from('clients')
      .select('webhook_url, webhook_secret_id')
      .eq('id', clientId)
      .single();

    if (error || !client) {
      return {
        configured: false,
        webhookUrl: null,
        secretMasked: null,
      };
    }

    // Mask secret ID (show first 15 chars)
    const secretMasked = client.webhook_secret_id
      ? `${client.webhook_secret_id.substring(0, 15)}...`
      : null;

    return {
      configured: !!client.webhook_secret_id,
      webhookUrl: client.webhook_url,
      secretMasked,
    };
  } catch (error) {
    console.error('[getWebhookConfig] Error:', error);
    return {
      configured: false,
      webhookUrl: null,
      secretMasked: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
