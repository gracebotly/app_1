
import { DashboardSpecification } from '../types/WidgetConfig';

export const VAPI_APPOINTMENTS_TEMPLATE = {
  id: 'vapi-appointments',
  name: 'Voice Agent Appointments Dashboard',
  description: 'For voice agent call tracking (Vapi/Retell platforms)',
  category: 'Voice AI Analytics',
  
  signals: {
    requiredFields: ['timestamp', 'duration'],
    optionalFields: ['transcript', 'sentiment', 'cost', 'status', 'caller']
  },
  
  scoring: {
    hasTimestamp: 30,
    hasStatus: 25,
    hasTranscript: 25,
    hasDuration: 15
  },
  
  structure: {
    theme: {
      primaryColor: '#6366f1', // Indigo
      secondaryColor: '#8b5cf6'  // Purple
    },
    widgets: [
      // Row 1: KPI Cards
      {
        id: 'total-calls',
        type: 'stat' as const,
        position: { x: 0, y: 0, width: 3, height: 2 },
        label: 'Total Calls Today',
        value: 0, // Placeholder, filled by data
        icon: 'phone',
        valueColor: '#6366f1'
      },
      {
        id: 'success-rate',
        type: 'stat' as const,
        position: { x: 3, y: 0, width: 3, height: 2 },
        label: 'Success Rate',
        value: 0,
        icon: 'check-circle',
        valueColor: '#10b981'
      },
      {
        id: 'avg-duration',
        type: 'stat' as const,
        position: { x: 6, y: 0, width: 3, height: 2 },
        label: 'Avg Call Duration',
        value: 0,
        icon: 'clock',
        valueColor: '#6366f1'
      },
      {
        id: 'cost-per-success',
        type: 'stat' as const,
        position: { x: 9, y: 0, width: 3, height: 2 },
        label: 'Cost Per Success',
        value: 0,
        icon: 'dollar-sign',
        valueColor: '#6366f1'
      },
      // Row 2: Charts
      {
        id: 'calls-over-time',
        type: 'chart' as const,
        position: { x: 0, y: 2, width: 6, height: 4 },
        chartType: 'line',
        data: { series: [] }, // Filled by data
        xAxisName: 'Time',
        yAxisName: 'Calls',
        showLegend: true
      },
      {
        id: 'call-outcomes',
        type: 'chart' as const,
        position: { x: 6, y: 2, width: 6, height: 4 },
        chartType: 'pie',
        data: { series: [] }, // Filled by data
        showLegend: true
      },
      // Row 3: Data Table
      {
        id: 'recent-calls',
        type: 'table' as const,
        position: { x: 0, y: 6, width: 12, height: 4 },
        columns: [
          { field: 'timestamp', label: 'Time', type: 'datetime' },
          { field: 'caller', label: 'Caller', type: 'text' },
          { field: 'duration', label: 'Duration', type: 'duration' },
          { field: 'outcome', label: 'Status', type: 'badge' },
          { field: 'transcript', label: 'Transcript', type: 'text' }
        ],
        rows: [], // Filled by data
        pageSize: 10,
        enableSearch: true,
        enableSort: true
      }
    ]
  } as DashboardSpecification,
  
  fieldMapping: {
    required: ['timestamp', 'duration', 'outcome'],
    optional: ['transcript', 'cost', 'caller']
  }
};
