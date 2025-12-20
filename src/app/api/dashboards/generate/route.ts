import { saveSpec } from '@/app/lib/dashboard-tools/specStore';
import { DashboardSpecification } from '@/app/lib/dashboard-tools/types';

export async function POST(request: Request) {
  const { webhookData } = await request.json();

  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  const writeThinkingState = (state: { title: string; description: string }) => {
    writer.write(
      encoder.encode(`data: ${JSON.stringify({ type: 'thinking', ...state })}\n\n`)
    );
  };

  // Mock implementation for development without API keys
  (async () => {
    try {
      // Simulate analyzing webhook payload
      writeThinkingState({ title: "Analyzing webhook data...", description: "Detecting field types and data structure" });
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockSchema = {
        fields: [
          { name: 'timestamp', type: 'datetime' },
          { name: 'duration', type: 'number' },
          { name: 'status', type: 'string' },
          { name: 'caller', type: 'string' },
          { name: 'transcript', type: 'string' },
          { name: 'cost', type: 'number' }
        ]
      };
      
      writer.write(encoder.encode(`data: ${JSON.stringify({ 
        type: 'tool_result', 
        tool: 'analyze_webhook_payload', 
        result: { success: true, schema: mockSchema } 
      })}\n\n`));

      // Simulate generating dashboard specification
      writeThinkingState({ title: "Generating dashboard...", description: "Creating widgets and layout specification" });
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const mockSpec: DashboardSpecification = {
        templateId: 'vapi-appointments',
        templateName: 'Voice Agent Appointments Dashboard',
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
                desktop: 'grid-cols-2'
              },
              widgets: [
                {
                  type: 'line-chart',
                  title: 'Calls Over Time',
                  dataPath: 'timeSeries.calls',
                  xAxis: 'timestamp',
                  yAxis: 'count',
                  height: { mobile: '300px', desktop: '400px' }
                },
                {
                  type: 'pie-chart',
                  title: 'Call Outcomes',
                  dataPath: 'distribution.outcomes',
                  height: { mobile: '300px', desktop: '400px' }
                }
              ]
            },
            {
              type: 'table-section',
              widgets: [
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
                  pagination: true
                }
              ]
            }
          ]
        },
        fieldMappings: {
          timestamp: 'timestamp',
          duration: 'duration',
          outcome: 'status',
          transcript: 'transcript',
          cost: 'cost',
          caller: 'caller'
        },
        theme: {
          primary: '#4F46E5',
          secondary: '#7C3AED'
        }
      };

      writer.write(encoder.encode(`data: ${JSON.stringify({ 
        type: 'tool_result', 
        tool: 'generate_dashboard_specification', 
        result: { success: true, specification: mockSpec } 
      })}\n\n`));

      // Simulate validating with sample data
      writeThinkingState({ title: "Validating dashboard...", description: "Testing spec with sample webhook data" });
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      writer.write(encoder.encode(`data: ${JSON.stringify({ 
        type: 'tool_result', 
        tool: 'preview_with_sample_data', 
        result: { success: true, validation: 'All field mappings valid' } 
      })}\n\n`));

      // Generate preview ID and save spec
      const previewId = Math.random().toString(36).substring(2, 11);
      const specToSave = {
        ...mockSpec,
        createdAt: Date.now(),
        sampleData: webhookData
      };
      saveSpec(previewId, specToSave);
      
      writer.write(
        encoder.encode(`data: ${JSON.stringify({ 
          type: 'preview_ready', 
          previewUrl: `/dashboard/preview/${previewId}`,
          previewId: previewId
        })}\n\n`)
      );
      
      writer.write(
        encoder.encode(`data: ${JSON.stringify({ type: 'complete', result: 'Dashboard generation completed successfully' })}\n\n`)
      );
    } catch (error) {
      console.error("Dashboard generation failed:", error);
      writer.write(
        encoder.encode(`data: ${JSON.stringify({ type: 'error', error: String(error) })}\n\n`)
      );
    } finally {
      await writer.close();
    }
  })();

  return new Response(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}