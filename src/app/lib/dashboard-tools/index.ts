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
  ) => {
    return {
      type: "function" as const,
      function: {
        name,
        description,
        parameters: zodToJsonSchema(schema) as Record<string, unknown>,
        parse: (argsString: string) => JSON.parse(argsString),
        function: async (args: z.infer<z.ZodObject<T>>) => {
          const state =
            typeof thinkingState === "function"
              ? thinkingState(args)
              : thinkingState;
          writeThinkingState(state);
          const result = await fn(args);
          return result;
        },
      },
    };
  };

  return [
    createTool(
      "analyze_webhook_payload",
      "Analyzes webhook JSON to detect field types, data patterns, and relationships",
      analyzeWebhookPayloadSchema,
      analyzeWebhookPayload,
      () => ({
        title: "Analyzing webhook data...",
        description: "Detecting field types and data structure",
      })
    ),
    
    createTool(
      "generate_dashboard_specification",
      "Generates complete dashboard specification with auto-matched template",
      generateDashboardSpecificationSchema,
      generateDashboardSpecification,
      () => ({
        title: "Generating dashboard...",
        description: "Creating widgets and layout specification",
      })
    ),
    
    createTool(
      "preview_with_sample_data",
      "Validates dashboard spec against sample data",
      previewWithSampleDataSchema,
      previewWithSampleData,
      () => ({
        title: "Validating dashboard...",
        description: "Testing spec with sample webhook data",
      })
    ),
  ];
};
