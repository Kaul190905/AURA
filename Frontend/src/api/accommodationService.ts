import { apiFetch, DEV_USER_ID } from './config';

export interface Accommodation {
  id: string;
  user_id: string;
  text: string;
  time: string;
  created_at: string;
  updated_at: string;
}

export interface AccommodationCreate {
  text: string;
  time?: string;
}

export interface AccommodationUpdate {
  text?: string;
  time?: string;
}

export async function getAccommodations(
  userId: string = DEV_USER_ID,
): Promise<Accommodation[]> {
  return apiFetch<Accommodation[]>(`/accommodations/${userId}`) ?? [];
}

export async function createAccommodation(
  accommodation: AccommodationCreate,
  userId: string = DEV_USER_ID,
): Promise<Accommodation | null> {
  return apiFetch<Accommodation>(`/accommodations/${userId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(accommodation),
  });
}

export async function updateAccommodation(
  accommodationId: string,
  update: AccommodationUpdate,
  userId: string = DEV_USER_ID,
): Promise<Accommodation | null> {
  return apiFetch<Accommodation>(`/accommodations/${userId}/${accommodationId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(update),
  });
}

export async function deleteAccommodation(
  accommodationId: string,
  userId: string = DEV_USER_ID,
): Promise<void> {
  await apiFetch<void>(`/accommodations/${userId}/${accommodationId}`, {
    method: 'DELETE',
  });
}
