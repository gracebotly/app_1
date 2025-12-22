import { z } from "zod";
import { generateDashboardSpecificationSchema } from "../toolDefs";
import { matchBestTemplate } from "../templates/registry";
import { DashboardSpecification } from '../types/WidgetConfig';

type Args = z.infer<typeof generateDashboardSpecificationSchema>;

// Field detection patterns (from Appsmith research)
const FIELD_PATTERNS = {
  email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  phone: /^\+?[\d\s\-()]+$/,
  url: /^https?:\/\/.+/,
  dateKeywords: ['date', 'time', 'created', 'updated', 'timestamp', 'at', 'when'],
  statusKeywords: ['status', 'state', 'outcome', 'result', 'disposition'],
  idKeywords: ['id', 'uuid', 'key', 'identifier']
};

export async function generateDashboardSpecification(args: Args) {
  try {
    const bestTemplate = matchBestTemplate(args.schema);
    
    if (!bestTemplate.structure) {
      throw new Error(`Template ${bestTemplate.id} is missing structure definition`);
    }
    
    // Map individual fields using the improved function
    const fieldMappings: Record<string, string> = {};
    for (const requiredField of bestTemplate.fieldMapping?.required || []) {
      const mappedField = mapFieldsToTemplate(args.schema, requiredField);
      if (mappedField) {
        fieldMappings[requiredField] = mappedField;
      }
    }
    
    for (const optionalField of bestTemplate.fieldMapping?.optional || []) {
      const mappedField = mapFieldsToTemplate(args.schema, optionalField);
      if (mappedField) {
        fieldMappings[optionalField] = mappedField;
      }
    }
    
    // Change to return DashboardSpecification directly
    return { 
      specification: {
        theme: bestTemplate.structure.theme,
        widgets: bestTemplate.structure.widgets
      } as DashboardSpecification,
      matchedTemplate: bestTemplate.name 
    };
  } catch (error) {
    return {
      success: false,
      error: "Failed to generate dashboard specification",
      details: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

function mapFieldsToTemplate(
  schema: { fields: Array<{ name: string; type: string }> }, 
  requiredField: string
): string | null {
  // 1. Try exact match first
  let match = schema.fields.find(f => f.name === requiredField);
  if (match) return match.name;
  
  // 2. Try case-insensitive exact match
  match = schema.fields.find(f => 
    f.name.toLowerCase() === requiredField.toLowerCase()
  );
  if (match) return match.name;
  
  // 3. Try fuzzy match with common variations
  const requiredLower = requiredField.toLowerCase();
  match = schema.fields.find(f => {
    const fieldLower = f.name.toLowerCase();
    return fieldLower.includes(requiredLower) || requiredLower.includes(fieldLower);
  });
  if (match) return match.name;
  
  // 4. Try semantic matching for common field types
  if (FIELD_PATTERNS.dateKeywords.some(kw => requiredLower.includes(kw))) {
    match = schema.fields.find(f => 
      FIELD_PATTERNS.dateKeywords.some(kw => f.name.toLowerCase().includes(kw))
    );
    if (match) return match.name;
  }
  
  if (FIELD_PATTERNS.statusKeywords.some(kw => requiredLower.includes(kw))) {
    match = schema.fields.find(f => 
      FIELD_PATTERNS.statusKeywords.some(kw => f.name.toLowerCase().includes(kw))
    );
    if (match) return match.name;
  }
  
  return null;
}


