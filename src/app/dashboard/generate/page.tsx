'use client';

import { useSearchParams } from 'next/navigation';
import { DashboardGenerationForm } from '@/app/components/DashboardGenerationForm';

export default function GenerateDashboardPage() {
  const searchParams = useSearchParams();
  const agent = searchParams.get('agent');
  
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-3xl font-bold mb-2">
            Generate Dashboard
          </h1>
          {agent && (
            <p className="text-gray-600 mb-6">
              Creating dashboard for: <span className="font-semibold">{agent}</span>
            </p>
          )}
          <DashboardGenerationForm agent={agent} />
        </div>
      </div>
    </div>
  );
}