
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
    sections: [
      {
        type: 'kpi-grid',
        responsive: {
          mobile: 'grid-cols-1',
          tablet: 'grid-cols-2',
          desktop: 'grid-cols-4'
        },
        widgets: [
          {
            type: 'stat-card',
            label: 'Total Calls Today',
            dataPath: 'metrics.totalCalls',
            icon: 'phone',
            format: 'number'
          },
          {
            type: 'stat-card',
            label: 'Success Rate',
            dataPath: 'metrics.successRate',
            icon: 'check-circle',
            format: 'percentage'
          },
          {
            type: 'stat-card',
            label: 'Avg Call Duration',
            dataPath: 'metrics.avgDuration',
            icon: 'clock',
            format: 'duration'
          },
          {
            type: 'stat-card',
            label: 'Cost Per Success',
            dataPath: 'metrics.costPerSuccess',
            icon: 'dollar-sign',
            format: 'currency'
          }
        ]
      },
      {
        type: 'chart-row',
        responsive: {
          mobile: 'grid-cols-1',
          tablet: 'grid-cols-1',
          desktop: 'grid-cols-2'
        },
        widgets: [
          {
            type: 'line-chart',
            title: 'Calls Over Time',
            dataPath: 'timeSeries.calls',
            xAxis: 'timestamp',
            yAxis: 'count',
            height: { mobile: '300px', tablet: '300px', desktop: '400px' }
          },
          {
            type: 'pie-chart',
            title: 'Call Outcomes',
            dataPath: 'distribution.outcomes',
            height: { mobile: '300px', tablet: '300px', desktop: '400px' }
          }
        ]
      },
      {
        type: 'data-table',
        title: 'Recent Calls',
        dataPath: 'calls',
        columns: [
          { key: 'timestamp', label: 'Time', format: 'datetime' },
          { key: 'caller', label: 'Caller', format: 'text' },
          { key: 'duration', label: 'Duration', format: 'duration' },
          { key: 'outcome', label: 'Status', format: 'badge' },
          { key: 'transcript', label: 'Transcript', format: 'text-truncate' }
        ],
        pagination: true,
        responsive: {
          mobile: { visibleColumns: ['timestamp', 'caller', 'outcome'] },
          tablet: { visibleColumns: ['timestamp', 'caller', 'outcome'] },
          desktop: { visibleColumns: 'all' }
        }
      }
    ]
  },
  
  fieldMapping: {
    required: ['timestamp', 'duration', 'outcome'],
    optional: ['transcript', 'cost', 'caller']
  }
};
