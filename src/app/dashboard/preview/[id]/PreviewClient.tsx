'use client';

import { useState } from 'react';
import { DashboardRenderer } from '@/app/components/DashboardRenderer';
import { DashboardSpecification } from '@/app/lib/dashboard-tools/types';

export default function PreviewClient({
  id,
  spec,
}: {
  id: string;
  spec: DashboardSpecification | null;
}) {
  const [deviceView, setDeviceView] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [deploying, setDeploying] = useState(false);
  const [deployError, setDeployError] = useState<string | null>(null);
  const [deployedUrl, setDeployedUrl] = useState<string | null>(null);

  async function onDeploy() {
    try {
      setDeploying(true);
      setDeployError(null);
      setDeployedUrl(null);

      const res = await fetch(`/api/deploy/${id}`, {
        method: 'POST',
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Deploy failed');
      }

      const data = (await res.json()) as { deployedUrl?: string };
      setDeployedUrl(data.deployedUrl ?? null);
    } catch (e) {
      setDeployError(e instanceof Error ? e.message : 'Deploy failed');
    } finally {
      setDeploying(false);
    }
  }

  if (!spec) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-gray-600 dark:text-gray-400">Dashboard not found</div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gray-50 dark:bg-gray-900 ${isFullscreen ? 'fixed inset-0 z-50 bg-white' : ''}`}>
      <div className={`border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 sticky top-0 z-10 ${isFullscreen ? 'hidden' : ''}`}>
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Dashboard Preview
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {spec.templateName}
              </p>
              {deployedUrl ? (
                <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                  Deployed: {deployedUrl}
                </p>
              ) : null}
              {deployError ? (
                <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                  {deployError}
                </p>
              ) : null}
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
                <label className="px-2 text-sm font-medium text-gray-600 dark:text-gray-400">
                  Device:
                </label>
                <select
                  value={deviceView === 'desktop' ? 'Current' : deviceView}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === 'Current') setDeviceView('desktop');
                    else setDeviceView(value as 'mobile' | 'tablet');
                  }}
                  className="px-3 py-1.5 text-sm font-medium bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="Current">Current</option>
                  <option value="mobile">Mobile</option>
                  <option value="tablet">Tablet</option>
                </select>

                <button
                  onClick={() => setOrientation(orientation === 'portrait' ? 'landscape' : 'portrait')}
                  className="px-3 py-1.5 text-sm font-medium bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                  title="Toggle orientation"
                >
                  🔄
                </button>

                <button
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  className="px-3 py-1.5 text-sm font-medium bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                  title="Toggle fullscreen"
                >
                  ⛶
                </button>
              </div>

              <div className="flex gap-3">
                <button className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700">
                  Edit
                </button>
                <button
                  onClick={onDeploy}
                  disabled={deploying}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md disabled:opacity-60"
                >
                  {deploying ? 'Deploying...' : 'Deploy'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <DashboardRenderer spec={spec} deviceView={deviceView} orientation={orientation} />
    </div>
  );
}
