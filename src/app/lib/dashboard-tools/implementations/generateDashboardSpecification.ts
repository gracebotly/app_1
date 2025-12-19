import { z } from "zod";
import { generateDashboardSpecificationSchema } from "../toolDefs";
import { matchBestTemplate, TemplateMeta } from "../templates/registry";

type Args = z.infer<typeof generateDashboardSpecificationSchema>;

export async function generateDashboardSpecification(args: Args) {
  try {
    const bestTemplate = matchBestTemplate(args.schema);
    
    if (!bestTemplate.structure) {
      throw new Error(`Template ${bestTemplate.id} is missing structure definition`);
    }
    
    const fieldMappings = mapFieldsToTemplate(args.schema, bestTemplate);
    
    const spec = {
      templateId: bestTemplate.id,
      templateName: bestTemplate.name,
      structure: bestTemplate.structure,
      fieldMappings: fieldMappings,
      theme: args.customizations?.colors || getDefaultTheme()
    };
    
    return {
      success: true,
      specification: spec,
      matchedTemplate: bestTemplate.name,
      confidence: 0.90
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
  template: TemplateMeta
): Record<string, string> {
  const mappings: Record<string, string> = {};
  
  for (const requiredField of template.fieldMapping?.required || []) {
    const match = schema.fields.find(f => 
      f.name.toLowerCase().includes(requiredField.toLowerCase()) ||
      requiredField.toLowerCase().includes(f.name.toLowerCase())
    );
    if (match) {
      mappings[requiredField] = match.name;
    }
  }
  
  for (const optionalField of template.fieldMapping?.optional || []) {
    const match = schema.fields.find(f => 
      f.name.toLowerCase().includes(optionalField.toLowerCase()) ||
      optionalField.toLowerCase().includes(f.name.toLowerCase())
    );
    if (match) {
      mappings[optionalField] = match.name;
    }
  }
  
  return mappings;
}

function getDefaultTheme() {
  return {
    primary: '#6366f1',
    secondary: '#8b5cf6'
  };
}
