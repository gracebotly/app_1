import { z } from "zod";
import { generateDashboardSpecificationSchema } from "../toolDefs";
import { matchBestTemplate } from "../templates/registry";

type Args = z.infer<typeof generateDashboardSpecificationSchema>;

export async function generateDashboardSpecification(args: Args) {
  try {
    const bestTemplate = matchBestTemplate(args.schema);
    
    const spec = {
      templateId: bestTemplate.id,
      templateName: bestTemplate.name,
      widgets: generateWidgets(args.schema),
      layout: generateLayout(),
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

function generateWidgets(schema: { fields: Array<{ name: string; type: string }> }) {
  const widgets = [];
  
  widgets.push({
    type: 'kpi',
    title: 'Total Events',
    field: 'count',
    icon: 'activity'
  });
  
  const timestampField = schema.fields.find((f) => f.type === 'date');
  if (timestampField) {
    widgets.push({
      type: 'line',
      title: 'Events Over Time',
      xAxis: timestampField.name,
      yAxis: 'count'
    });
  }
  
  const statusField = schema.fields.find((f) => 
    f.name.toLowerCase().includes('status')
  );
  if (statusField) {
    widgets.push({
      type: 'pie',
      title: 'Status Distribution',
      field: statusField.name
    });
  }
  
  widgets.push({
    type: 'table',
    title: 'Recent Events',
    fields: schema.fields.map((f) => f.name)
  });
  
  return widgets;
}

function generateLayout() {
  return {
    columns: 12,
    rows: 'auto',
    gap: 16
  };
}

function getDefaultTheme() {
  return {
    primary: '#6366f1',
    secondary: '#8b5cf6'
  };
}
