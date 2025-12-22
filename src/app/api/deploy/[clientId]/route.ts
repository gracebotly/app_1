import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSpec } from '@/app/lib/dashboard-tools/specStore';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ clientId: string }> }
) {
  const { clientId } = await context.params;

  const previewSpec = await getSpec(clientId);
  if (!previewSpec) {
    return NextResponse.json({ error: 'No preview spec found to deploy' }, { status: 400 });
  }

  const { data: clientRow, error: clientErr } = await supabase
    .from('clients')
    .select('id, agency_id, subdomain')
    .eq('id', clientId)
    .single();

  if (clientErr || !clientRow) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  }

  const { data: latest, error: latestErr } = await supabase
    .from('dashboards')
    .select('version')
    .eq('client_id', clientRow.id)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestErr) {
    return NextResponse.json({ error: 'Failed to determine next version' }, { status: 500 });
  }

  const nextVersion = (latest?.version ?? 0) + 1;

  const { data: inserted, error: insertErr } = await supabase
    .from('dashboards')
    .insert({
      client_id: clientRow.id,
      agency_id: clientRow.agency_id,
      name: previewSpec.templateName ?? `Dashboard v${nextVersion}`,
      spec: previewSpec,
      status: 'deployed',
      version: nextVersion,
      deployed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (insertErr || !inserted) {
    return NextResponse.json({ error: 'Failed to deploy dashboard' }, { status: 500 });
  }

  const { error: updateClientErr } = await supabase
    .from('clients')
    .update({ deployed_dashboard_id: inserted.id })
    .eq('id', clientRow.id);

  if (updateClientErr) {
    return NextResponse.json({ error: 'Failed to set deployed dashboard pointer' }, { status: 500 });
  }

  const deployedUrl = `https://${clientRow.subdomain}.getflowetic.com`;

  return NextResponse.json({
    success: true,
    deployedDashboardId: inserted.id,
    deployedUrl,
  });
}
