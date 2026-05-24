import { Meal, Settings } from '../types';

const BASE_URL = import.meta.env.VITE_API_URL || '';

function getProfileId(): string {
  const key = 'kaleidos_profile_id';
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}

export function getStoredProfileId(): string {
  return getProfileId();
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      'x-profile-id': getProfileId(),
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unbekannter Fehler' }));
    throw new Error(
      (errorData as { error?: string }).error || `HTTP ${response.status}`
    );
  }

  return response.json() as Promise<T>;
}

export function useApi() {
  function getSettings(): Promise<Settings> {
    return request<Settings>('/api/settings');
  }

  function updateSettings(settings: Settings): Promise<Settings> {
    return request<Settings>('/api/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  }

  function getMeals(date: string): Promise<Meal[]> {
    return request<Meal[]>(`/api/meals?date=${encodeURIComponent(date)}`);
  }

  function getMealsRange(start: string, end: string): Promise<Meal[]> {
    return request<Meal[]>(
      `/api/meals?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`
    );
  }

  function addMeal(date: string, description: string): Promise<Meal> {
    return request<Meal>('/api/meals', {
      method: 'POST',
      body: JSON.stringify({ date, description }),
    });
  }

  function addMealFromImage(date: string, imageBase64: string, mediaType: string): Promise<Meal> {
    return request<Meal>('/api/meals', {
      method: 'POST',
      body: JSON.stringify({ date, description: 'Foto-Analyse', imageBase64, mediaType }),
    });
  }

  function addMealManual(date: string, description: string, calories: number, protein: number, carbs: number, fat: number): Promise<Meal> {
    return request<Meal>('/api/meals', {
      method: 'POST',
      body: JSON.stringify({ date, description, calories, protein, carbs, fat }),
    });
  }

  function addActivity(date: string, description: string, calories: number): Promise<Meal> {
    return request<Meal>('/api/meals', {
      method: 'POST',
      body: JSON.stringify({ date, description, calories: -Math.abs(calories) }),
    });
  }

  function updateMeal(id: number, data: { description?: string; calories?: number; protein?: number; carbs?: number; fat?: number }): Promise<Meal> {
    return request<Meal>(`/api/meals/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  function deleteMeal(id: number): Promise<{ success: boolean; id: number }> {
    return request<{ success: boolean; id: number }>(`/api/meals/${id}`, {
      method: 'DELETE',
    });
  }

  return {
    getSettings,
    updateSettings,
    getMeals,
    getMealsRange,
    addMeal,
    addMealFromImage,
    addMealManual,
    addActivity,
    updateMeal,
    deleteMeal,
  };
}
