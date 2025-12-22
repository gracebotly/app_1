
import { DashboardSpecification } from '../types/WidgetConfig';

export const CHATBOT_ANALYTICS_TEMPLATE = {
  id: 'chatbot-analytics',
  name: 'Chatbot Analytics Dashboard',
  description: 'For chat/messaging platforms',
  category: 'Chatbot Analytics',
  
  signals: {
    requiredFields: ['timestamp', 'messages'],
    optionalFields: ['user_id', 'session_id', 'intent', 'sentiment']
  },
  
  scoring: {
    hasTimestamp: 30,
    hasStatus: 15,
    hasTranscript: 0,
    hasDuration: 10
  },
  
  structure: {
    theme: {
      primaryColor: '#8b5cf6', // Purple
      secondaryColor: '#6366f1'  // Indigo
    },
    widgets: [
      // Row 1: KPI Cards
      {
        id: 'total-conversations',
        type: 'stat' as const,
        position: { x: 0, y: 0, width: 3, height: 2 },
        label: 'Total Conversations',
        value: 0,
        icon: 'message-circle',
        valueColor: '#8b5cf6'
      },
      {
        id: 'resolution-rate',
        type: 'stat' as const,
        position: { x: 3, y: 0, width: 3, height: 2 },
        label: 'Resolution Rate',
        value: 0,
        icon: 'check-circle',
        valueColor: '#10b981'
      },
      {
        id: 'avg-response-time',
        type: 'stat' as const,
        position: { x: 6, y: 0, width: 3, height: 2 },
        label: 'Avg Response Time',
        value: 0,
        icon: 'clock',
        valueColor: '#8b5cf6'
      },
      {
        id: 'satisfaction',
        type: 'stat' as const,
        position: { x: 9, y: 0, width: 3, height: 2 },
        label: 'User Satisfaction',
        value: 0,
        icon: 'star',
        valueColor: '#8b5cf6'
      },
      // Row 2: Charts
      {
        id: 'conversations-over-time',
        type: 'chart' as const,
        position: { x: 0, y: 2, width: 6, height: 4 },
        chartType: 'line',
        data: { series: [] },
        xAxisName: 'Time',
        yAxisName: 'Conversations',
        showLegend: true
      },
      {
        id: 'top-intents',
        type: 'chart' as const,
        position: { x: 6, y: 2, width: 6, height: 4 },
        chartType: 'bar',
        data: { series: [] },
        showLegend: false
      },
      // Row 3: Data Table
      {
        id: 'recent-conversations',
        type: 'table' as const,
        position: { x: 0, y: 6, width: 12, height: 4 },
        columns: [
          { field: 'timestamp', label: 'Time', type: 'datetime' },
          { field: 'user_id', label: 'User', type: 'text' },
          { field: 'intent', label: 'Intent', type: 'badge' },
          { field: 'sentiment', label: 'Sentiment', type: 'badge' },
          { field: 'messages', label: 'Messages', type: 'text' }
        ],
        rows: [],
        pageSize: 10,
        enableSearch: true,
        enableSort: true
      }
    ]
  } as DashboardSpecification,
  
  fieldMapping: {
    required: ['timestamp', 'messages'],
    optional: ['user_id', 'session_id', 'intent', 'sentiment']
  }
};
