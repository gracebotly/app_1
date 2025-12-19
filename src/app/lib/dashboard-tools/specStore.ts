
import { DashboardSpecification } from './types';

interface DashboardSpec extends DashboardSpecification {
  sampleData?: Record<string, unknown>;
  createdAt: number;
}

const specStore: Record<string, DashboardSpec> = {};

export function saveSpec(id: string, spec: DashboardSpec): void {
  specStore[id] = {
    ...spec,
    createdAt: Date.now()
  };
}

export function getSpec(id: string): DashboardSpec | null {
  return specStore[id] || null;
}

export function deleteSpec(id: string): void {
  delete specStore[id];
}

export function listSpecs(): Array<{ id: string; spec: DashboardSpec }> {
  return Object.entries(specStore).map(([id, spec]) => ({ id, spec }));
}
