
import { NextRequest, NextResponse } from 'next/server';

const webhookStore = new Map<string, any[]>();

export async function GET(
  request: NextRequest,
  { params }: { params: { clientId: string } }
) {
  const clientId = params.clientId;
  const events = webhookStore.get(clientId) || [];
  
  return NextResponse.json({
    clientId,
    eventCount: events.length,
    lastEvent: events[events.length - 1] || null,
    dashboardReady: events.length > 0,
    previewUrl: events.length > 0 ? `https://getflowetic.com/dashboard/preview/${clientId}` : null
  });
}
