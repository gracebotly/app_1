export interface TemplateMeta {
  id: string;
  name: string;
  description: string;
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
}

export const TEMPLATE_REGISTRY: TemplateMeta[] = [
  {
    id: 'voice-analytics',
    name: 'Voice Call Analytics',
    description: 'For Vapi/Retell voice agent platforms',
    signals: {
      requiredFields: ['timestamp', 'duration'],
      optionalFields: ['transcript', 'sentiment', 'cost', 'status'],
    },
    scoring: {
      hasTimestamp: 30,
      hasStatus: 25,
      hasTranscript: 25,
      hasDuration: 15,
    }
  },
  
  {
    id: 'chat-analytics',
    name: 'Chatbot Analytics',
    description: 'For chat/messaging platforms',
    signals: {
      requiredFields: ['timestamp', 'messages'],
      optionalFields: ['user_id', 'session_id'],
    },
    scoring: {
      hasTimestamp: 30,
      hasStatus: 15,
      hasTranscript: 0,
      hasDuration: 10,
    }
  },
  
  {
    id: 'generic-analytics',
    name: 'Generic Event Analytics',
    description: 'Fallback for any webhook',
    signals: {
      requiredFields: [],
      optionalFields: ['timestamp'],
    },
    scoring: {
      hasTimestamp: 20,
      hasStatus: 10,
      hasTranscript: 0,
      hasDuration: 0,
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
