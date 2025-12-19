
'use client';

import React from 'react';
import { DashboardSpecification } from '@/app/lib/dashboard-tools/types';

interface DashboardRendererProps {
  spec: DashboardSpecification;
  deviceView?: 'mobile' | 'tablet' | 'desktop';
}

export function DashboardRenderer({ spec, deviceView = 'desktop' }: DashboardRendererProps) {
  const containerClass = deviceView === 'mobile' 
    ? 'max-w-[390px] mx-auto'
    : deviceView === 'tablet'
    ? 'max-w-[768px] mx-auto'
    : 'w-full';

  return (
    <div className={`${containerClass} p-6 space-y-6 bg-gray-50 dark:bg-gray-900 min-h-screen`}>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          {spec.templateName}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Template: {spec.templateId}
        </p>
      </div>

      {spec.structure.sections.map((section, sectionIdx) => (
        <div key={sectionIdx} className="space-y-4">
          {section.type === 'kpi-grid' && (
            <div className={`grid gap-4 ${section.responsive?.[deviceView] || 'grid-cols-4'}`}>
              {section.widgets.map((widget, widgetIdx) => (
                <div
                  key={widgetIdx}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow p-6"
                  style={{ borderTop: `3px solid ${spec.theme.primary}` }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {widget.label}
                    </span>
                    <span className="text-2xl">{widget.icon === 'phone' ? '📞' : widget.icon === 'check-circle' ? '✅' : widget.icon === 'clock' ? '⏱️' : '💰'}</span>
                  </div>
                  <div className="mt-4">
                    <div className="text-3xl font-bold text-gray-900 dark:text-white">
                      {getSampleValue(widget.dataPath || '')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {section.type === 'chart-row' && (
            <div className={`grid gap-6 ${section.responsive?.[deviceView] || 'grid-cols-2'}`}>
              {section.widgets.map((widget, widgetIdx) => (
                <div
                  key={widgetIdx}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow p-6"
                >
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    {widget.title}
                  </h3>
                  <div
                    className="flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded"
                    style={{ height: widget.height?.[deviceView] || '300px' }}
                  >
                    <span className="text-gray-500 dark:text-gray-400">
                      {widget.type === 'line-chart' ? '📈' : widget.type === 'pie-chart' ? '📊' : '📉'} Chart Preview
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {section.type === 'data-table' && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  {section.title}
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-900">
                    <tr>
                      {section.columns?.map((col, colIdx) => (
                        <th
                          key={colIdx}
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                        >
                          {col.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {[1, 2, 3, 4, 5].map((row) => (
                      <tr key={row}>
                        {section.columns?.map((col, colIdx) => (
                          <td
                            key={colIdx}
                            className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white"
                          >
                            Sample {col.key}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function getSampleValue(dataPath: string): string {
  const sampleValues: Record<string, string> = {
    'metrics.totalCalls': '284',
    'metrics.successRate': '63%',
    'metrics.avgDuration': '03:42',
    'metrics.costPerSuccess': '$7.84',
    'metrics.totalConversations': '1,247',
    'metrics.resolutionRate': '87%',
    'metrics.avgResponseTime': '1.2s',
    'metrics.satisfaction': '94%'
  };

  return sampleValues[dataPath] || '—';
}
