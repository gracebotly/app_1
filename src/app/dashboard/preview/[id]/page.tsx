import { getSpec } from '@/app/lib/dashboard-tools/specStore';
import PreviewClient from './PreviewClient';

export default async function PreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  const spec = await getSpec(resolvedParams.id);
  return <PreviewClient id={resolvedParams.id} spec={spec} />;
}
