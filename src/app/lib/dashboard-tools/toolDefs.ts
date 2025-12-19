// Zod schemas for your 3 tools
import { z } from "zod";

export const analyzeWebhookPayloadSchema = z.object({
  payload: z.string().describe("Raw webhook JSON as string"),
  platformType: z.enum(["vapi", "retell", "n8n", "make", "custom"]).optional()
    .describe("Platform that sent the webhook (if known)"),
});

export const generateDashboardSpecificationSchema = z.object({
  schema: z.object({
    fields: z.array(z.object({
      name: z.string(),
      type: z.enum(["string", "number", "boolean", "date", "array", "object"]),
      format: z.string().optional()
    }))
  }).describe("Detected schema from Tool 1"),
  customizations: z.object({
    title: z.string().optional(),
    colors: z.object({
      primary: z.string(),
      secondary: z.string()
    }).optional()
  }).optional()
});

export const previewWithSampleDataSchema = z.object({
  specification: z.any().describe("Dashboard spec from Tool 2"),
  sampleData: z.string().describe("Sample webhook JSON to test against")
});
