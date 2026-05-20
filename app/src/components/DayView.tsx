import { useState, useEffect, useCallback } from 'react';
import { format, isToday, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import { useApi } from '../hooks/useApi';
import { Meal, Settings } from '../types';
import PieChart from './PieChart';
import MealInput from './MealInput';

interface DayViewProps {
  date: string; // YYYY-MM-DD
  settings: Settings;
}

export default function DayView({ date, settings }: DayViewProps) {
  const api = useApi();
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const targetCalories = settings.daily_calories - settings.deficit;
  const totalCalories = meals.reduce((sum, m) => sum + m.calories, 0);
  const remainingCalories = targetCalories - totalCalories;

  const parsedDate = parseISO(date);
  const isTodayDate = isToday(parsedDate);

  const dateLabel = format(parsedDate, "EEEE, d. MMMM yyyy", { locale: de });

  const fetchMeals = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getMeals(date);
      setMeals(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden der Mahlzeiten');
    } finally {
      setLoading(false);
    }
  }, [date]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchMeals();
  }, [fetchMeals]);

  async function handleDelete(id: number) {
    setDeletingId(id);
    try {
      await api.deleteMeal(id);
      setMeals((prev) => prev.filter((m) => m.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Fehler beim Löschen');
    } finally {
      setDeletingId(null);
    }
  }

  function handleMealAdded(meal: Meal) {
    setMeals((prev) => [...prev, meal]);
  }

  if (loading) {
    return <div className="loading-state">Lade Mahlzeiten...</div>;
  }

  if (error) {
    return (
      <div>
        <div className="error-state">{error}</div>
        <button className="nb-btn nb-btn-primary" onClick={fetchMeals} style={{ marginTop: 'var(--space-3)' }}>
          Erneut versuchen
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="day-view__date-header">{dateLabel}</div>

      {/* Stats row */}
      <div className="stats-grid" style={{ marginBottom: 'var(--space-4)' }}>
        <div className="stat-box">
          <div className="stat-box__label">Verbraucht</div>
          <div className="stat-box__value">
            {totalCalories}
            <span className="stat-box__unit">kcal</span>
          </div>
        </div>
        <div className="stat-box">
          <div className="stat-box__label">Tagesziel</div>
          <div className="stat-box__value">
            {targetCalories}
            <span className="stat-box__unit">kcal</span>
          </div>
        </div>
        <div className="stat-box" style={{ background: remainingCalories < 0 ? '#FEE2E2' : undefined }}>
          <div className="stat-box__label">Verbleibend</div>
          <div
            className="stat-box__value"
            style={{ color: remainingCalories < 0 ? 'var(--color-danger)' : undefined }}
          >
            {remainingCalories}
            <span className="stat-box__unit">kcal</span>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="stats-bar" style={{ marginBottom: 'var(--space-4)' }}>
        <div
          className={`stats-bar__fill${totalCalories > targetCalories ? ' stats-bar__fill--over' : ''}`}
          style={{ width: `${Math.min(100, (totalCalories / Math.max(1, targetCalories)) * 100)}%` }}
        />
      </div>

      {/* Pie chart */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 'var(--space-6)' }}>
        <PieChart consumed={totalCalories} target={targetCalories} label="Tagesübersicht" />
      </div>

      {/* Meals list */}
      <h2 style={{ marginBottom: 'var(--space-3)', fontSize: 'var(--text-lg)' }}>
        Mahlzeiten ({meals.length})
      </h2>

      {meals.length === 0 ? (
        <div className="empty-state">Noch keine Mahlzeiten eingetragen.</div>
      ) : (
        <div>
          {meals.map((meal) => (
            <div key={meal.id} className="meal-card">
              <div className="meal-card__header">
                <div className="meal-card__description" title={meal.description}>
                  {meal.description}
                </div>
                <span className="meal-card__calories">{meal.calories} kcal</span>
                <button
                  className="nb-btn nb-btn-danger nb-btn-sm"
                  onClick={() => handleDelete(meal.id)}
                  disabled={deletingId === meal.id}
                  type="button"
                >
                  {deletingId === meal.id ? '...' : 'Löschen'}
                </button>
              </div>
              {meal.items.length > 0 && (
                <div className="meal-card__items">
                  {meal.items.map((item, i) => (
                    <div key={i} className="meal-item">
                      <span>{item.name}</span>
                      <span className="meal-item__calories">{item.calories} kcal</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Meal input - only for today */}
      {isTodayDate && (
        <MealInput date={date} onMealAdded={handleMealAdded} />
      )}
    </div>
  );
}
