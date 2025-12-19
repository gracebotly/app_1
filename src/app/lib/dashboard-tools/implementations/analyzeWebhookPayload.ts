import { z } from "zod";
import { analyzeWebhookPayloadSchema } from "../toolDefs";

type Args = z.infer<typeof analyzeWebhookPayloadSchema>;

export async function analyzeWebhookPayload(args: Args) {
  try {
    const payload = JSON.parse(args.payload);
    
    // Detect field types
    const fields = Object.entries(payload).map(([name, value]) => ({
      name,
      type: detectType(value),
      format: detectFormat(name, value)
    }));
    
    return {
      success: true,
      schema: { fields },
      confidence: calculateConfidence(fields),
      platformHint: args.platformType || detectPlatform(fields)
    };
  } catch (error: any) {
    return {
      success: false,
      error: "Unable to parse webhook JSON",
      details: error.message
    };
  }
}

function detectType(value: any): string {
  if (value === null) return 'unknown';
  if (Array.isArray(value)) return 'array';
  if (value instanceof Date || /^\d{4}-\d{2}-\d{2}/.test(String(value))) return 'date';
  return typeof value;
}

function detectFormat(name: string, value: any): string | undefined {
  const lowerName = name.toLowerCase();
  if (lowerName.includes('time') || lowerName.includes('date')) return 'datetime';
  if (lowerName.includes('email')) return 'email';
  if (lowerName.includes('url')) return 'url';
  return undefined;
}

function calculateConfidence(fields: any[]): number {
  // High confidence if has timestamp + 3+ other fields
  const hasTimestamp = fields.some(f => f.type === 'date');
  const fieldCount = fields.length;
  
  if (hasTimestamp && fieldCount >= 4) return 0.95;
  if (hasTimestamp) return 0.85;
  if (fieldCount >= 3) return 0.75;
  return 0.60;
}

function detectPlatform(fields: any[]): string {
  const fieldNames = fields.map(f => f.name.toLowerCase()).join(',');
  if (fieldNames.includes('call') || fieldNames.includes('vapi')) return 'vapi';
  if (fieldNames.includes('retell')) return 'retell';
  return 'custom';
}
