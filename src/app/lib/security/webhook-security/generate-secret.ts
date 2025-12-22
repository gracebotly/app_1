import crypto from 'crypto';

/**
 * Generates a cryptographically secure webhook secret
 * 
 * Uses Node.js crypto.randomBytes to generate 32 random bytes (256-bit key)
 * suitable for HMAC-SHA256 signing. The secret is Base64-encoded and
 * prefixed with "whsec_" following Svix convention.
 * 
 * @returns Webhook secret string (format: "whsec_<base64>")
 * 
 * @example
 * ```typescript
 * const secret = generateWebhookSecret();
 * // Returns: "whsec_MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKB..."
 * ```
 */
export function generateWebhookSecret(): string {
  // Generate 32 cryptographically secure random bytes (256-bit key)
  const randomBytes = crypto.randomBytes(32);
  
  // Encode as Base64 for storage and transmission
  const base64Secret = randomBytes.toString('base64');
  
  // Add Svix-style prefix for easy identification
  return `whsec_${base64Secret}`;
}

/**
 * Validates that a webhook secret has the correct format
 * 
 * @param secret - Secret to validate
 * @returns True if secret format is valid
 * 
 * @example
 * ```typescript
 * isValidWebhookSecret('whsec_abc123...');  // true
 * isValidWebhookSecret('invalid');          // false
 * ```
 */
export function isValidWebhookSecret(secret: string): boolean {
  if (!secret || typeof secret !== 'string') {
    return false;
  }

  // Must start with whsec_ prefix
  if (!secret.startsWith('whsec_')) {
    return false;
  }

  // Extract Base64 part
  const base64Part = secret.slice(7);

  // Validate Base64 format (should decode to 32 bytes)
  try {
    const decoded = Buffer.from(base64Part, 'base64');
    return decoded.length === 32;
  } catch {
    return false;
  }
}

/**
 * Generates a webhook URL for a client
 * 
 * @param clientId - Client UUID
 * @param baseUrl - Base API URL (e.g., https://app-1.vercel.app)
 * @returns Full webhook URL
 * 
 * @example
 * ```typescript
 * const url = generateWebhookUrl(
 *   'client-uuid-123',
 *   'https://app-1.vercel.app'
 * );
 * // Returns: "https://app-1.vercel.app/api/webhooks/client-uuid-123"
 * ```
 */
export function generateWebhookUrl(clientId: string, baseUrl: string): string {
  // Remove trailing slash from baseUrl if present
  const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  
  return `${cleanBaseUrl}/api/webhooks/${clientId}`;
}

/**
 * Generates webhook setup instructions for agencies
 * 
 * @param webhookUrl - The webhook URL
 * @param webhookSecret - The webhook secret
 * @returns Formatted instructions text
 */
export function generateWebhookInstructions(
  webhookUrl: string,
  webhookSecret: string
): string {
  return `
╔══════════════════════════════════════════════════════════════╗
║                  WEBHOOK CONFIGURATION                        ║
╚══════════════════════════════════════════════════════════════╝

📍 Webhook URL:
${webhookUrl}

🔑 Webhook Secret:
${webhookSecret}

⚠️  IMPORTANT: Keep this secret secure! Anyone with this secret can 
    send fake webhooks to your system.

─────────────────────────────────────────────────────────────────

📋 How to Configure Your Platform:

1. Go to your platform's webhook settings (Vapi, Retell, n8n, etc.)
2. Add the Webhook URL above
3. Configure your platform to send these headers with each webhook:

   Required Headers:
   ┌─────────────────────────────────────────────────────────────┐
   │ svix-id:        Unique event ID (e.g., "evt_abc123")       │
   │ svix-timestamp: Unix timestamp in seconds (e.g., 1703173200)│
   │ svix-signature: HMAC signature (see below)                  │
   └─────────────────────────────────────────────────────────────┘

4. Sign each request using HMAC-SHA256:

   Signing Format:
   ┌─────────────────────────────────────────────────────────────┐
   │ signedContent = "\${eventId}.\${timestamp}.\${requestBody}"   │
   │ signature = HMAC-SHA256(secret, signedContent)              │
   │ encode signature as Base64                                  │
   │ send as: "v1,<base64-signature>"                            │
   └─────────────────────────────────────────────────────────────┘

─────────────────────────────────────────────────────────────────

📖 Example (Node.js):

const crypto = require('crypto');

const eventId = 'evt_' + Date.now();
const timestamp = Math.floor(Date.now() / 1000);
const body = JSON.stringify({ your: 'data' });

const signedContent = "\${eventId}.\${timestamp}.\${body}";
const secretBytes = Buffer.from('${webhookSecret.slice(7)}', 'base64');
const signature = crypto
  .createHmac('sha256', secretBytes)
  .update(signedContent)
  .digest('base64');

// Send webhook with headers:
fetch('${webhookUrl}', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'svix-id': eventId,
    'svix-timestamp': timestamp.toString(),
    'svix-signature': 'v1,' + signature,
  },
  body: body,
});

─────────────────────────────────────────────────────────────────

✅ Your webhooks will be validated and processed automatically!
   
📊 View webhook logs and status in your dashboard.
  `.trim();
}
