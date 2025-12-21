import { z } from "zod";
import { previewWithSampleDataSchema } from "../toolDefs";

type Args = z.infer<typeof previewWithSampleDataSchema>;

interface Widget {
  field?: string;
  fields?: string[];
}

interface Specification {
  widgets?: Widget[];
  // structure can include a widgets array
  structure?: { widgets?: Widget[] };
}

export async function previewWithSampleData(args: Args) {
  const parseResult = previewWithSampleDataSchema.safeParse(args);
  if (!parseResult.success) {
    return {
      success: false,
      error: 'Invalid arguments',
      details: parseResult.error
    };
  }

  try {
    const sampleData = JSON.parse(parseResult.data.sampleData);
    const spec = parseResult.data.specification as Specification;
    
    const issues: string[] = [];
    
    const widgets = spec.widgets || spec.structure?.widgets || [];
    for (const widget of widgets) {
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
        widgets: (spec.widgets || spec.structure?.widgets || []).length,
        fieldsValidated: Object.keys(sampleData).length
      }
    };
  } catch (error) {
    return {
      success: false,
      error: "Preview validation failed",
      details: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
