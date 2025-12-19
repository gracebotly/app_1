import { z } from "zod";
import { generateDashboardSpecificationSchema } from "../toolDefs";
import { matchBestTemplate } from "../templates/registry";

type Args = z.infer<typeof generateDashboardSpecificationSchema>;

export async function generateDashboardSpecification(args: Args) {
  try {
    // Use deterministic matching (Agent 2's approach)
    const bestTemplate = matchBestTemplate(args.schema);
    
    // Generate Crayon UI spec
    const spec = {
      templateId: bestTemplate.id,
      templateName: bestTemplate.name,
      widgets: generateWidgets(args.schema, bestTemplate),
      layout: generateLayout(),
      theme: args.customizations?.colors || getDefaultTheme()
    };
    
    return {
      success: true,
      specification: spec,
      matchedTemplate: bestTemplate.name,
      confidence: 0.90 // Deterministic matching is highly confident
    };
  } catch (error: any) {
    return {
      success: false,
      error: "Failed to generate dashboard specification",
      details: error.message
    };
  }
}

function generateWidgets(schema: any, template: any) {
  const widgets = [];
  
  // Always add KPI card for event count
  widgets.push({
    type: 'kpi',
    title: 'Total Events',
    field: 'count',
    icon: 'activity'
  });
  
  // Add line chart if has timestamp
  const timestampField = schema.fields.find((f: any) => f.type === 'date');
  if (timestampField) {
    widgets.push({
      type: 'line',
      title: 'Events Over Time',
      xAxis: timestampField.name,
      yAxis: 'count'
    });
  }
  
  // Add pie chart if has status
  const statusField = schema.fields.find((f: any) => 
    f.name.toLowerCase().includes('status')
  );
  if (statusField) {
    widgets.push({
      type: 'pie',
      title: 'Status Distribution',
      field: statusField.name
    });
  }
  
  // Always add data table
  widgets.push({
    type: 'table',
    title: 'Recent Events',
    fields: schema.fields.map((f: any) => f.name)
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
