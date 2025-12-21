import { z } from "zod";
import { generateDashboardFromDataSchema } from "../toolDefs";
import { analyzeWebhookPayload } from "./analyzeWebhookPayload";
import { generateDashboardSpecification } from "./generateDashboardSpecification";

type Args = z.infer<typeof generateDashboardFromDataSchema>;

export async function generateDashboardFromData(args: Args) {
  const parseResult = generateDashboardFromDataSchema.safeParse(args);
  if (!parseResult.success) {
    return {
      success: false,
      error: 'Invalid arguments',
      details: parseResult.error
    };
  }

  try {
    const jsonData = JSON.parse(parseResult.data.jsonData);
    
    // First, analyze the data to detect field types
    const analysisResult = await analyzeWebhookPayload({
      payload: parseResult.data.jsonData,
      platformType: 'custom'
    });
    
    if (!analysisResult.success || !analysisResult.schema) {
      return {
        success: false,
        error: 'Failed to analyze data structure',
        details: analysisResult.error
      };
    }
    
    // Generate dashboard specification based on the analysis
    const specResult = await generateDashboardSpecification({
      schema: analysisResult.schema,
      customizations: {
        title: 'Generated Dashboard',
        colors: {
          primary: '#6366f1',
          secondary: '#8b5cf6'
        }
      }
    });
    
    if (!specResult.success || !specResult.specification) {
      return {
        success: false,
        error: 'Failed to generate dashboard specification',
        details: specResult.error
      };
    }
    
    return {
      success: true,
      specification: specResult.specification,
      analysis: analysisResult.schema,
      sourceData: jsonData
    };
  } catch (error) {
    return {
      success: false,
      error: "Failed to process JSON data",
      details: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
