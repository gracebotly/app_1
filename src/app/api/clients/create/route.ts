import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
    .slice(0, 40);
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as {
    agencyId?: string;
    name?: string;
    subdomain?: string;
  };

  const agencyId = body.agencyId;
  if (!agencyId) {
    return NextResponse.json({ error: 'agencyId is required' }, { status: 400 });
  }

  const name = (body.name && body.name.trim()) ? body.name.trim() : 'Untitled Client';

  let subdomain =
    (body.subdomain && body.subdomain.trim()) ? slugify(body.subdomain) : slugify(name);

  if (!subdomain) subdomain = `client-${Date.now()}`;

  // Ensure uniqueness by appending a short suffix if needed
  for (let i = 0; i < 5; i++) {
    // Check if exists
    const { data: existing } = await supabase
      .from('clients')
      .select('id')
      .eq('subdomain', subdomain)
      .maybeSingle();

    if (!existing) break;
    subdomain = `${subdomain}-${Math.random().toString(36).slice(2, 6)}`;
  }

  const { data, error } = await supabase
    .from('clients')
    .insert({
      agency_id: agencyId,
      name,
      subdomain,
      status: 'not-connected',
    })
    .select('id, subdomain')
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: 'Failed to create client', details: error?.message ?? null },
      { status: 500 }
    );
  }

  return NextResponse.json({
    clientId: data.id,
    subdomain: data.subdomain,
  });
}
