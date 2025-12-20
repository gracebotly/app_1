
import { createClient } from '@supabase/supabase-js';
import { DashboardSpecification } from './types';

interface DashboardSpec extends DashboardSpecification {
  sampleData?: Record<string, unknown>;
  createdAt: number;
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

export async function saveSpec(id: string, spec: DashboardSpec): Promise<void> {
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24);

  await supabase
    .from('dashboard_specs')
    .upsert({
      id,
      spec,
      created_at: new Date().toISOString(),
      expires_at: expiresAt.toISOString()
    });
}

export async function getSpec(id: string): Promise<DashboardSpec | null> {
  const { data, error } = await supabase
    .from('dashboard_specs')
    .select('spec')
    .eq('id', id)
    .gt('expires_at', new Date().toISOString())
    .single();

  if (error || !data) {
    return null;
  }

  return data.spec as DashboardSpec;
}

export async function deleteSpec(id: string): Promise<void> {
  await supabase
    .from('dashboard_specs')
    .delete()
    .eq('id', id);
}

export async function listSpecs(): Promise<Array<{ id: string; spec: DashboardSpec }>> {
  const { data, error } = await supabase
    .from('dashboard_specs')
    .select('id, spec')
    .gt('expires_at', new Date().toISOString());

  if (error || !data) {
    return [];
  }

  return data.map(row => ({
    id: row.id,
    spec: row.spec as DashboardSpec
  }));
}
