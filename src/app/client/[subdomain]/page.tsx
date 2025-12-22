import { createClient } from '@supabase/supabase-js';
import { DashboardRenderer } from '@/app/components/DashboardRenderer';
import { DashboardSpecification } from '@/app/lib/dashboard-tools/types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

export default async function ClientDashboardPage({
  params,
}: {
  params: Promise<{ subdomain: string }>;
}) {
  const resolvedParams = await params;

  const { data: clientRow } = await supabase
    .from('clients')
    .select('id, deployed_dashboard_id')
    .eq('subdomain', resolvedParams.subdomain)
    .single();

  if (!clientRow || !clientRow.deployed_dashboard_id) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-gray-600 dark:text-gray-400">No deployed dashboard found</div>
      </div>
    );
  }

  const { data: dashboardRow } = await supabase
    .from('dashboards')
    .select('spec')
    .eq('id', clientRow.deployed_dashboard_id)
    .single();

  if (!dashboardRow?.spec) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-gray-600 dark:text-gray-400">Deployed dashboard not found</div>
      </div>
    );
  }

  const spec = dashboardRow.spec as DashboardSpecification;

  return <DashboardRenderer spec={spec} />;
}
