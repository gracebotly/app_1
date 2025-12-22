/**
 * Webhook Security Module
 * 
 * Provides HMAC-SHA256 signature verification for webhooks following
 * Svix security patterns. Includes secret generation and validation.
 * 
 * @packageDocumentation
 */

// Signature verification
export {
  verifySignature,
  extractWebhookHeaders,
  type WebhookHeaders,
  type VerificationResult,
} from './verify-signature';

// Secret generation and management
export {
  generateWebhookSecret,
  isValidWebhookSecret,
  generateWebhookUrl,
  generateWebhookInstructions,
} from './generate-secret';
