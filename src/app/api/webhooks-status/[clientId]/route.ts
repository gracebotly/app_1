
import { NextRequest, NextResponse } from 'next/server';
import { getSpec } from '@/app/lib/dashboard-tools/specStore';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ clientId: string }> }
) {
  const { clientId } = await context.params;
  
  const spec = await getSpec(clientId);
  
  return NextResponse.json({
    clientId,
    dashboardReady: spec !== null,
    previewUrl: spec ? `/dashboard/preview/${clientId}` : null,
    templateName: spec?.templateName || null
  });
}
