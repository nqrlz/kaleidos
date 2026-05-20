export interface Settings {
  daily_calories: number;
  deficit: number;
}

export interface MealItem {
  name: string;
  calories: number;
}

export interface Meal {
  id: number;
  date: string; // YYYY-MM-DD
  description: string;
  calories: number;
  items: MealItem[];
  created_at: string;
}

export interface DayData {
  date: string;
  meals: Meal[];
  totalCalories: number;
  targetCalories: number; // daily_calories - deficit
  remainingCalories: number;
}
