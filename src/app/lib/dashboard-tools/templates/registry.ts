import { VAPI_APPOINTMENTS_TEMPLATE } from './vapi-appointments';
import { CHATBOT_ANALYTICS_TEMPLATE } from './chatbot-analytics';
import { DashboardSpecification } from '../types/WidgetConfig';

export interface TemplateMeta {
  id: string;
  name: string;
  description: string;
  category?: string;
  signals: {
    requiredFields: string[];
    optionalFields: string[];
  };
  scoring: {
    hasTimestamp: number;
    hasStatus: number;
    hasTranscript: number;
    hasDuration: number;
  };
  structure: DashboardSpecification;
  fieldMapping?: {
    required: string[];
    optional: string[];
  };
}

export const TEMPLATE_REGISTRY: TemplateMeta[] = [
  VAPI_APPOINTMENTS_TEMPLATE,
  CHATBOT_ANALYTICS_TEMPLATE,
  {
    id: 'generic-analytics',
    name: 'Generic Event Analytics',
    description: 'Fallback for any webhook',
    signals: {
      requiredFields: [],
      optionalFields: ['timestamp', 'id', 'event_type', 'data']
    },
    scoring: {
      hasTimestamp: 10,
      hasStatus: 5,
      hasTranscript: 0,
      hasDuration: 5
    },
    structure: {
      theme: {
        primaryColor: '#6366f1',
        secondaryColor: '#8b5cf6'
      },
      widgets: [
        {
          id: 'total-events',
          type: 'stat' as const,
          position: { x: 0, y: 0, width: 3, height: 2 },
          label: 'Total Events',
          value: 0,
          icon: 'activity',
          valueColor: '#6366f1'
        },
        {
          id: 'events-over-time',
          type: 'chart' as const,
          position: { x: 0, y: 2, width: 12, height: 4 },
          chartType: 'line',
          data: { series: [] },
          xAxisName: 'Time',
          yAxisName: 'Count',
          showLegend: true
        },
        {
          id: 'recent-events',
          type: 'table' as const,
          position: { x: 0, y: 6, width: 12, height: 4 },
          columns: [
            { field: 'timestamp', label: 'Time', type: 'datetime' },
            { field: 'event_type', label: 'Type', type: 'text' },
            { field: 'data', label: 'Data', type: 'text' }
          ],
          rows: [],
          pageSize: 10,
          enableSearch: true,
          enableSort: true
        }
      ]
    } as DashboardSpecification,
    fieldMapping: {
      required: [],
      optional: ['timestamp', 'id', 'event_type', 'data']
    }
  }
];

export function scoreTemplateMatch(
  schema: { fields: Array<{ name: string; type: string }> }, 
  template: TemplateMeta
): number {
  let score = 0;
  
  if (schema.fields.some((f) => 
    f.type === 'date' || f.name.toLowerCase().includes('time')
  )) {
    score += template.scoring.hasTimestamp;
  }
  
  if (schema.fields.some((f) => 
    f.name.toLowerCase().includes('status')
  )) {
    score += template.scoring.hasStatus;
  }
  
  if (schema.fields.some((f) => 
    f.name.toLowerCase().includes('transcript')
  )) {
    score += template.scoring.hasTranscript;
  }
  
  if (schema.fields.some((f) => 
    f.name.toLowerCase().includes('duration')
  )) {
    score += template.scoring.hasDuration;
  }
  
  return score;
}

export function matchBestTemplate(
  schema: { fields: Array<{ name: string; type: string }> }
): TemplateMeta {
  const scored = TEMPLATE_REGISTRY.map(template => ({
    template,
    score: scoreTemplateMatch(schema, template)
  }));
  
  scored.sort((a, b) => b.score - a.score);
  
  return scored[0].template;
}
