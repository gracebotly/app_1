import { getSpec } from '@/app/lib/dashboard-tools/specStore';
import PreviewClient from './PreviewClient';

export default async function PreviewPage({
  params,
}: {
  params: { id: string };
}) {
  const spec = await getSpec(params.id);
  return <PreviewClient id={params.id} spec={spec} />;
}
