import { apiFetch, DEV_USER_ID } from './config';

export interface Strategy {
  id: string;
  user_id: string;
  title: string;
  trigger: string;
  helped: number;
  tried: number;
  created_at: string;
  updated_at: string;
}

export interface StrategyCreate {
  title: string;
  trigger: string;
  helped?: number;
  tried?: number;
}

export interface StrategyUpdate {
  title?: string;
  trigger?: string;
  helped?: number;
  tried?: number;
}

export async function getStrategies(
  userId: string = DEV_USER_ID,
): Promise<Strategy[]> {
  return apiFetch<Strategy[]>(`/strategies/${userId}`) ?? [];
}

export async function createStrategy(
  strategy: StrategyCreate,
  userId: string = DEV_USER_ID,
): Promise<Strategy | null> {
  return apiFetch<Strategy>(`/strategies/${userId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(strategy),
  });
}

export async function updateStrategy(
  strategyId: string,
  update: StrategyUpdate,
  userId: string = DEV_USER_ID,
): Promise<Strategy | null> {
  return apiFetch<Strategy>(`/strategies/${userId}/${strategyId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(update),
  });
}

export async function deleteStrategy(
  strategyId: string,
  userId: string = DEV_USER_ID,
): Promise<void> {
  await apiFetch<void>(`/strategies/${userId}/${strategyId}`, {
    method: 'DELETE',
  });
}
