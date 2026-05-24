export interface Settings {
  daily_calories: number;
  deficit: number;
  protein_goal: number;
}

export interface MealItem {
  name: string;
  calories: number;
  protein?: number;
  carbs?: number;
  fat?: number;
}

export interface Meal {
  id: number;
  date: string; // YYYY-MM-DD
  description: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  items: MealItem[];
  created_at: string;
}

export interface DayData {
  date: string;
  meals: Meal[];
  totalCalories: number;
  targetCalories: number;
  remainingCalories: number;
}
