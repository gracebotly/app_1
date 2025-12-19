import { VAPI_APPOINTMENTS_TEMPLATE } from './vapi-appointments';
import { CHATBOT_ANALYTICS_TEMPLATE } from './chatbot-analytics';

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
  structure?: any; // eslint-disable-line @typescript-eslint/no-explicit-any -- Use 'any' to allow flexible template structures
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
      optionalFields: ['timestamp']
    },
    scoring: {
      hasTimestamp: 20,
      hasStatus: 10,
      hasTranscript: 0,
      hasDuration: 0
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
