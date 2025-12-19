
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
            label: 'Total Conversations',
            dataPath: 'metrics.totalConversations',
            icon: 'message-circle',
            format: 'number'
          },
          {
            type: 'stat-card',
            label: 'Resolution Rate',
            dataPath: 'metrics.resolutionRate',
            icon: 'check-circle',
            format: 'percentage'
          },
          {
            type: 'stat-card',
            label: 'Avg Response Time',
            dataPath: 'metrics.avgResponseTime',
            icon: 'clock',
            format: 'duration'
          },
          {
            type: 'stat-card',
            label: 'User Satisfaction',
            dataPath: 'metrics.satisfaction',
            icon: 'star',
            format: 'percentage'
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
            title: 'Conversations Over Time',
            dataPath: 'timeSeries.conversations',
            xAxis: 'timestamp',
            yAxis: 'count',
            height: { mobile: '300px', tablet: '300px', desktop: '400px' }
          },
          {
            type: 'bar-chart',
            title: 'Top Intents',
            dataPath: 'distribution.intents',
            height: { mobile: '300px', tablet: '300px', desktop: '400px' }
          }
        ]
      },
      {
        type: 'data-table',
        title: 'Recent Conversations',
        dataPath: 'conversations',
        columns: [
          { key: 'timestamp', label: 'Time', format: 'datetime' },
          { key: 'user_id', label: 'User', format: 'text' },
          { key: 'intent', label: 'Intent', format: 'badge' },
          { key: 'sentiment', label: 'Sentiment', format: 'badge' },
          { key: 'messages', label: 'Messages', format: 'text-truncate' }
        ],
        pagination: true
      }
    ]
  },
  
  fieldMapping: {
    required: ['timestamp', 'messages'],
    optional: ['user_id', 'session_id', 'intent', 'sentiment']
  }
};
