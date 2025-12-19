// Agent 1's exact pattern from analytics-with-c1

import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { 
  analyzeWebhookPayloadSchema,
  generateDashboardSpecificationSchema,
  previewWithSampleDataSchema 
} from "./toolDefs";
import { analyzeWebhookPayload } from "./implementations/analyzeWebhookPayload";
import { generateDashboardSpecification } from "./implementations/generateDashboardSpecification";
import { previewWithSampleData } from "./implementations/previewWithSampleData";

export const getDashboardGenerationTools = (
  writeThinkingState: (item: { title: string; description: string }) => void
) => {
  let lastThinkingState: { title: string; description: string } | null = null;

  const createTool = <T extends z.ZodRawShape>(
    name: string,
    description: string,
    schema: z.ZodObject<T>,
    fn: (args: z.infer<z.ZodObject<T>>) => Promise<unknown>,
    thinkingState:
      | { title: string; description: string }
      | ((args: z.infer<z.ZodObject<T>>) => {
          title: string;
          description: string;
        })
  ) => ({
    type: "function" as const,
    function: {
      name,
      description,
      parameters: zodToJsonSchema(schema),
      function: async (args: string) => {
        try {
          const parsedArgs = JSON.parse(args);
          const state =
            typeof thinkingState === "function"
              ? thinkingState(parsedArgs)
              : thinkingState;
          if (JSON.stringify(state) !== JSON.stringify(lastThinkingState)) {
            writeThinkingState(state);
            lastThinkingState = state;
          }

          const result = await fn(parsedArgs);
          return JSON.stringify(result);
        } catch (error) {
          console.error(`error calling tool ${name}: `, error);
          return JSON.stringify({
            success: false,
            error: `Error calling tool ${name}`,
            details: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      },
    },
  });

  return [
    createTool(
      "analyze_webhook_payload",
      "Analyzes webhook JSON to detect field types, data patterns, and relationships",
      analyzeWebhookPayloadSchema,
      analyzeWebhookPayload,
      (args) => ({
        title: "Analyzing webhook data...",
        description: "Detecting field types and data structure"
      })
    ),
    
    createTool(
      "generate_dashboard_specification",
      "Generates complete dashboard specification with auto-matched template",
      generateDashboardSpecificationSchema,
      generateDashboardSpecification,
      () => ({
        title: "Generating dashboard...",
        description: "Creating widgets and layout specification"
      })
    ),
    
    createTool(
      "preview_with_sample_data",
      "Validates dashboard spec against sample data",
      previewWithSampleDataSchema,
      previewWithSampleData,
      () => ({
        title: "Validating dashboard...",
        description: "Testing spec with sample webhook data"
      })
    ),
  ];
};
