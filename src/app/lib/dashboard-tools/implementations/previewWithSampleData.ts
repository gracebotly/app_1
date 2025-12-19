import { z } from "zod";
import { previewWithSampleDataSchema } from "../toolDefs";

type Args = z.infer<typeof previewWithSampleDataSchema>;

export async function previewWithSampleData(args: Args) {
  try {
    const sampleData = JSON.parse(args.sampleData);
    const spec = args.specification;
    
    // Validate that all fields in spec exist in sample data
    const issues = [];
    
    for (const widget of spec.widgets) {
      if (widget.field && !(widget.field in sampleData)) {
        issues.push(`Field "${widget.field}" not found in sample data`);
      }
      if (widget.fields) {
        for (const field of widget.fields) {
          if (!(field in sampleData)) {
            issues.push(`Field "${field}" not found in sample data`);
          }
        }
      }
    }
    
    return {
      success: issues.length === 0,
      issues,
      preview: {
        widgets: spec.widgets.length,
        fieldsValidated: Object.keys(sampleData).length
      }
    };
  } catch (error: any) {
    return {
      success: false,
      error: "Preview validation failed",
      details: error.message
    };
  }
}
