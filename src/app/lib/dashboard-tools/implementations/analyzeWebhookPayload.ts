import { z } from "zod";
import { analyzeWebhookPayloadSchema } from "../toolDefs";

type Args = z.infer<typeof analyzeWebhookPayloadSchema>;

export async function analyzeWebhookPayload(args: Args) {
  const parseResult = analyzeWebhookPayloadSchema.safeParse(args);
  if (!parseResult.success) {
    return {
      success: false,
      error: 'Invalid arguments',
      details: parseResult.error
    };
  }

  try {
    const payload = JSON.parse(parseResult.data.payload);
    
    const fields = Object.entries(payload).map(([name, value]) => ({
      name,
      type: detectType(value),
      format: detectFormat(name)
    }));
    
    return {
      success: true,
      schema: { fields },
      confidence: calculateConfidence(fields),
      platformHint: args.platformType || detectPlatform(fields)
    };
  } catch (error) {
    return {
      success: false,
      error: "Unable to parse webhook JSON",
      details: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

function detectType(value: unknown): "string" | "number" | "boolean" | "object" | "date" | "array" {
  if (value === null) return 'object';
  if (Array.isArray(value)) return 'array';
  if (value instanceof Date || /^\d{4}-\d{2}-\d{2}/.test(String(value))) return 'date';
  const t = typeof value;
  if (t === "string" || t === "number" || t === "boolean") return t;
  if (t === "object") return "object";
  return "string";
}

function detectFormat(name: string): string | undefined {
  const lowerName = name.toLowerCase();
  if (lowerName.includes('time') || lowerName.includes('date')) return 'datetime';
  if (lowerName.includes('email')) return 'email';
  if (lowerName.includes('url')) return 'url';
  return undefined;
}

function calculateConfidence(fields: Array<{ type: string }>): number {
  const hasTimestamp = fields.some(f => f.type === 'date');
  const fieldCount = fields.length;
  
  if (hasTimestamp && fieldCount >= 4) return 0.95;
  if (hasTimestamp) return 0.85;
  if (fieldCount >= 3) return 0.75;
  return 0.60;
}

function detectPlatform(fields: Array<{ name: string }>): string {
  const fieldNames = fields.map(f => f.name.toLowerCase()).join(',');
  if (fieldNames.includes('call') || fieldNames.includes('vapi')) return 'vapi';
  if (fieldNames.includes('retell')) return 'retell';
  return 'custom';
}
