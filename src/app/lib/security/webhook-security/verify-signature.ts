import crypto from 'crypto';

/**
 * Webhook headers following Svix convention
 */
export interface WebhookHeaders {
  'svix-id': string;
  'svix-timestamp': string;
  'svix-signature': string;
}

/**
 * Result of signature verification
 */
export interface VerificationResult {
  valid: boolean;
  reason?: string;
  eventId?: string;
}

/**
 * Configuration options for verification
 */
interface VerificationOptions {
  /**
   * Maximum age of webhook in seconds (default: 300 = 5 minutes)
   */
  toleranceSeconds?: number;

  /**
   * Allow clock skew for future timestamps in seconds (default: 60)
   */
  clockSkewSeconds?: number;
}

const DEFAULT_TOLERANCE = 300; // 5 minutes
const DEFAULT_CLOCK_SKEW = 60; // 1 minute

/**
 * Verifies webhook signature using HMAC-SHA256 (Svix pattern)
 * 
 * @param rawBody - The exact raw request body string (not parsed JSON)
 * @param headers - Webhook headers (svix-id, svix-timestamp, svix-signature)
 * @param secret - Webhook secret (Base64-encoded with whsec_ prefix)
 * @param options - Optional configuration
 * @returns Verification result with validity and reason
 * 
 * @example
 * ```typescript
 * const result = verifySignature(
 *   '{"event":"test"}',
 *   {
 *     'svix-id': 'evt_123',
 *     'svix-timestamp': '1703173200',
 *     'svix-signature': 'v1,g0hM9SsE+OTPJTGt...'
 *   },
 *   'whsec_abc123...'
 * );
 * 
 * if (result.valid) {
 *   console.log('Verified!', result.eventId);
 * } else {
 *   console.error('Invalid:', result.reason);
 * }
 * ```
 */
export function verifySignature(
  rawBody: string,
  headers: WebhookHeaders,
  secret: string,
  options: VerificationOptions = {}
): VerificationResult {
  const {
    toleranceSeconds = DEFAULT_TOLERANCE,
    clockSkewSeconds = DEFAULT_CLOCK_SKEW,
  } = options;

  // Extract headers
  const eventId = headers['svix-id'];
  const timestamp = headers['svix-timestamp'];
  const signatureHeader = headers['svix-signature'];

  // Validate required headers
  if (!eventId || !timestamp || !signatureHeader) {
    return {
      valid: false,
      reason: 'Missing required headers (svix-id, svix-timestamp, or svix-signature)',
    };
  }

  // Parse and validate timestamp
  const timestampNum = parseInt(timestamp, 10);
  if (isNaN(timestampNum)) {
    return {
      valid: false,
      reason: 'Invalid timestamp format (must be Unix seconds)',
    };
  }

  const now = Math.floor(Date.now() / 1000);
  const timestampAge = now - timestampNum;

  // Check if timestamp is too old (replay attack prevention)
  if (timestampAge > toleranceSeconds) {
    return {
      valid: false,
      reason: `Timestamp too old (${timestampAge}s ago, max ${toleranceSeconds}s). Possible replay attack.`,
    };
  }

  // Check if timestamp is in the future (clock skew tolerance)
  if (timestampAge < -clockSkewSeconds) {
    return {
      valid: false,
      reason: `Timestamp is ${Math.abs(timestampAge)}s in the future (max ${clockSkewSeconds}s clock skew allowed)`,
    };
  }

  // Decode secret from Base64
  // Secret format: "whsec_<base64>" or just "<base64>"
  let secretBytes: Buffer;
  try {
    const secretWithoutPrefix = secret.startsWith('whsec_') 
      ? secret.slice(7)  // Remove "whsec_" prefix
      : secret;
    
    secretBytes = Buffer.from(secretWithoutPrefix, 'base64');
  } catch {
    return {
      valid: false,
      reason: 'Invalid secret format (must be Base64-encoded)',
    };
  }

  // Compute expected signature
  // Format: ${eventId}.${timestamp}.${rawBody}
  const signedContent = `${eventId}.${timestamp}.${rawBody}`;
  const expectedSignature = crypto
    .createHmac('sha256', secretBytes)
    .update(signedContent, 'utf8')
    .digest('base64');

  // Parse signatures from header
  // Format: "v1,<sig1> v2,<sig2>" or just "v1,<sig>"
  const signatures = signatureHeader
    .split(' ')
    .map((sig) => {
      // Remove version prefix (e.g., "v1,abc" → "abc")
      const parts = sig.split(',');
      return parts.length > 1 ? parts[1] : parts[0];
    })
    .filter((sig) => sig && sig.length > 0);

  if (signatures.length === 0) {
    return {
      valid: false,
      reason: 'No signatures found in svix-signature header',
    };
  }

  // Check if any signature matches (constant-time comparison)
  let hasValidSignature = false;
  for (const providedSignature of signatures) {
    try {
      // Convert both signatures to Buffers for constant-time comparison
      const providedBuffer = Buffer.from(providedSignature, 'base64');
      const expectedBuffer = Buffer.from(expectedSignature, 'base64');

      // Ensure buffers are same length (required for timingSafeEqual)
      if (providedBuffer.length !== expectedBuffer.length) {
        continue;
      }

      // Constant-time comparison to prevent timing attacks
      if (crypto.timingSafeEqual(providedBuffer, expectedBuffer)) {
        hasValidSignature = true;
        break;
      }
    } catch {
      // Invalid signature format, try next one
      continue;
    }
  }

  if (!hasValidSignature) {
    return {
      valid: false,
      reason: 'Signature mismatch (HMAC verification failed)',
    };
  }

  // All checks passed
  return {
    valid: true,
    eventId,
  };
}

/**
 * Extracts webhook headers from Next.js request
 * 
 * @param request - Next.js NextRequest object
 * @returns Webhook headers object
 */
export function extractWebhookHeaders(request: Request): WebhookHeaders {
  return {
    'svix-id': request.headers.get('svix-id') || '',
    'svix-timestamp': request.headers.get('svix-timestamp') || '',
    'svix-signature': request.headers.get('svix-signature') || '',
  };
}
