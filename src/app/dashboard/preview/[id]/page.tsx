
import { getSpec } from '@/app/lib/dashboard-tools/specStore';
import { DashboardRenderer } from '@/app/components/DashboardRenderer';
import { notFound } from 'next/navigation';
import { DashboardSpecification } from '@/app/lib/dashboard-tools/types';

export default async function PreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const spec = getSpec(resolvedParams.id);

  if (!spec) {
    notFound();
  }

  const dashboardSpec: DashboardSpecification = {
    templateId: spec.templateId,
    templateName: spec.templateName,
    structure: spec.structure,
    fieldMappings: spec.fieldMappings,
    theme: spec.theme
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Dashboard Preview
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {spec.templateName}
              </p>
            </div>
            <div className="flex gap-3">
              <button className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700">
                Edit
              </button>
              <button className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md">
                Deploy
              </button>
            </div>
          </div>
        </div>
      </div>

      <DashboardRenderer spec={dashboardSpec} deviceView="desktop" />
    </div>
  );
}
