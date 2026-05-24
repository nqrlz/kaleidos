import { useState, useEffect, useCallback } from 'react';
import { format, isToday, parseISO, addDays, subDays } from 'date-fns';
import { de } from 'date-fns/locale';
import { useApi } from '../hooks/useApi';
import { Meal, Settings } from '../types';
import PieChart from './PieChart';
import MealInput from './MealInput';
import ActivityInput from './ActivityInput';
import BarcodeInput from './BarcodeInput';

interface DayViewProps {
  date: string; // YYYY-MM-DD
  settings: Settings;
  onDateChange: (date: string) => void;
}

export default function DayView({ date, settings, onDateChange }: DayViewProps) {
  const api = useApi();
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ description: '', calories: 0, protein: 0, carbs: 0, fat: 0 });
  const [savingId, setSavingId] = useState<number | null>(null);

  const targetCalories = settings.daily_calories - settings.deficit;
  const foodCalories = meals.filter(m => m.calories > 0).reduce((sum, m) => sum + m.calories, 0);
  const activityCalories = Math.abs(meals.filter(m => m.calories < 0).reduce((sum, m) => sum + m.calories, 0));
  const netCalories = foodCalories - activityCalories;
  const remainingCalories = targetCalories - netCalories;
  const totalProtein = Math.round(meals.reduce((sum, m) => sum + (m.protein || 0), 0));
  const totalCarbs = Math.round(meals.reduce((sum, m) => sum + (m.carbs || 0), 0));
  const totalFat = Math.round(meals.reduce((sum, m) => sum + (m.fat || 0), 0));
  const proteinGoal = settings.protein_goal ?? 150;

  const parsedDate = parseISO(date);
  const isTodayDate = isToday(parsedDate);
  const dateLabel = format(parsedDate, "EEEE, d. MMMM yyyy", { locale: de });

  function goToPrevDay() {
    onDateChange(format(subDays(parsedDate, 1), 'yyyy-MM-dd'));
  }
  function goToNextDay() {
    onDateChange(format(addDays(parsedDate, 1), 'yyyy-MM-dd'));
  }
  function goToToday() {
    onDateChange(format(new Date(), 'yyyy-MM-dd'));
  }

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

  function startEdit(meal: Meal) {
    setEditingId(meal.id);
    setEditForm({ description: meal.description, calories: meal.calories, protein: meal.protein || 0, carbs: meal.carbs || 0, fat: meal.fat || 0 });
  }

  async function handleSaveEdit(id: number) {
    setSavingId(id);
    try {
      const updated = await api.updateMeal(id, editForm);
      setMeals((prev) => prev.map((m) => m.id === id ? { ...updated, items: m.items } : m));
      setEditingId(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Fehler beim Speichern');
    } finally {
      setSavingId(null);
    }
  }

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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
        <button className="nb-btn nb-btn-sm" onClick={goToPrevDay} type="button">←</button>
        <div style={{ textAlign: 'center' }}>
          <div className="day-view__date-header" style={{ marginBottom: 0 }}>{dateLabel}</div>
          {!isTodayDate && (
            <button className="nb-btn nb-btn-sm" onClick={goToToday} type="button" style={{ marginTop: 'var(--space-1)', fontSize: 'var(--text-xs)' }}>
              Heute
            </button>
          )}
        </div>
        <button className="nb-btn nb-btn-sm" onClick={goToNextDay} type="button" disabled={isTodayDate}>→</button>
      </div>

      {/* Stats row */}
      {activityCalories > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
          <div className="stat-box">
            <div className="stat-box__label">Gegessen</div>
            <div className="stat-box__value">{foodCalories}<span className="stat-box__unit">kcal</span></div>
          </div>
          <div className="stat-box" style={{ borderColor: 'var(--color-success)' }}>
            <div className="stat-box__label">⚡ Sport</div>
            <div className="stat-box__value" style={{ color: 'var(--color-success)' }}>−{activityCalories}<span className="stat-box__unit">kcal</span></div>
          </div>
          <div className="stat-box" style={{ background: 'var(--color-primary)' }}>
            <div className="stat-box__label">Budget</div>
            <div className="stat-box__value">{targetCalories + activityCalories}<span className="stat-box__unit">kcal</span></div>
          </div>
          <div className="stat-box" style={{ background: remainingCalories < 0 ? '#FEE2E2' : undefined }}>
            <div className="stat-box__label">Verbleibend</div>
            <div className="stat-box__value" style={{ color: remainingCalories < 0 ? 'var(--color-danger)' : undefined }}>
              {remainingCalories}<span className="stat-box__unit">kcal</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="stats-grid" style={{ marginBottom: 'var(--space-4)' }}>
          <div className="stat-box">
            <div className="stat-box__label">Gegessen</div>
            <div className="stat-box__value">{foodCalories}<span className="stat-box__unit">kcal</span></div>
          </div>
          <div className="stat-box">
            <div className="stat-box__label">Tagesziel</div>
            <div className="stat-box__value">{targetCalories}<span className="stat-box__unit">kcal</span></div>
          </div>
          <div className="stat-box" style={{ background: remainingCalories < 0 ? '#FEE2E2' : undefined }}>
            <div className="stat-box__label">Verbleibend</div>
            <div className="stat-box__value" style={{ color: remainingCalories < 0 ? 'var(--color-danger)' : undefined }}>
              {remainingCalories}<span className="stat-box__unit">kcal</span>
            </div>
          </div>
        </div>
      )}

      {/* Progress bar */}
      <div className="stats-bar" style={{ marginBottom: 'var(--space-4)' }}>
        <div
          className={`stats-bar__fill${netCalories > targetCalories ? ' stats-bar__fill--over' : ''}`}
          style={{ width: `${Math.min(100, (netCalories / Math.max(1, targetCalories)) * 100)}%` }}
        />
      </div>

      {/* Macros */}
      <div className="stats-grid" style={{ marginBottom: 'var(--space-4)' }}>
        <div className="stat-box" style={{ borderColor: '#3B82F6' }}>
          <div className="stat-box__label">Protein</div>
          <div className="stat-box__value" style={{ color: totalProtein >= proteinGoal ? '#16A34A' : undefined }}>
            {totalProtein}<span className="stat-box__unit">g</span>
          </div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-muted)', marginTop: 2 }}>
            Ziel: {proteinGoal} g
          </div>
          <div style={{ height: 4, background: 'var(--color-gray-200)', marginTop: 'var(--space-1)', border: '1px solid var(--color-border)' }}>
            <div style={{ height: '100%', width: `${Math.min(100, (totalProtein / Math.max(1, proteinGoal)) * 100)}%`, background: totalProtein >= proteinGoal ? '#16A34A' : '#3B82F6' }} />
          </div>
        </div>
        <div className="stat-box">
          <div className="stat-box__label">Kohlenhydrate</div>
          <div className="stat-box__value">{totalCarbs}<span className="stat-box__unit">g</span></div>
        </div>
        <div className="stat-box">
          <div className="stat-box__label">Fett</div>
          <div className="stat-box__value">{totalFat}<span className="stat-box__unit">g</span></div>
        </div>
      </div>

      {/* Pie chart */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 'var(--space-6)' }}>
        <PieChart consumed={netCalories} target={targetCalories} label="Tagesübersicht" />
      </div>

      <MealInput date={date} onMealAdded={handleMealAdded} />
      <BarcodeInput date={date} onMealAdded={handleMealAdded} />
      <ActivityInput date={date} onActivityAdded={handleMealAdded} />

      {/* Meals list */}
      <h2 style={{ marginBottom: 'var(--space-3)', fontSize: 'var(--text-lg)', marginTop: 'var(--space-6)' }}>
        Mahlzeiten & Aktivitäten ({meals.length})
      </h2>

      {meals.length === 0 ? (
        <div className="empty-state">Noch keine Einträge für diesen Tag.</div>
      ) : (
        <div>
          {meals.map((meal) => {
            const isActivity = meal.calories < 0;
            return (
              <div
                key={meal.id}
                className="meal-card"
                style={isActivity ? { borderColor: 'var(--color-success)' } : undefined}
              >
                {editingId === meal.id ? (
                  <div style={{ padding: 'var(--space-3)' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
                      <div style={{ gridColumn: '1 / -1' }}>
                        <label style={{ fontSize: 'var(--text-xs)', fontWeight: 700, display: 'block', marginBottom: 2 }}>Beschreibung</label>
                        <input className="nb-input" value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} />
                      </div>
                      {[
                        { key: 'calories', label: 'kcal' },
                        { key: 'protein', label: 'Protein (g)' },
                        { key: 'carbs', label: 'Kohlenhydrate (g)' },
                        { key: 'fat', label: 'Fett (g)' },
                      ].map(({ key, label }) => (
                        <div key={key}>
                          <label style={{ fontSize: 'var(--text-xs)', fontWeight: 700, display: 'block', marginBottom: 2 }}>{label}</label>
                          <input className="nb-input" type="number" value={editForm[key as keyof typeof editForm]} onChange={e => setEditForm(f => ({ ...f, [key]: Number(e.target.value) }))} />
                        </div>
                      ))}
                    </div>
                    <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                      <button className="nb-btn nb-btn-primary nb-btn-sm" onClick={() => handleSaveEdit(meal.id)} disabled={savingId === meal.id} type="button">
                        {savingId === meal.id ? '...' : 'Speichern'}
                      </button>
                      <button className="nb-btn nb-btn-sm" onClick={() => setEditingId(null)} type="button">Abbrechen</button>
                    </div>
                  </div>
                ) : (
                <div
                  className="meal-card__header"
                  style={isActivity ? { background: '#F0FDF4' } : undefined}
                >
                  <div className="meal-card__description" title={meal.description}>
                    {isActivity && (
                      <span style={{ color: 'var(--color-success)', marginRight: 6 }}>⚡</span>
                    )}
                    {meal.description}
                  </div>
                  <span
                    className="meal-card__calories"
                    style={isActivity ? { background: '#16A34A', color: 'white', borderColor: '#16A34A' } : undefined}
                  >
                    {isActivity ? `−${Math.abs(meal.calories)}` : meal.calories} kcal
                  </span>
                  <button className="nb-btn nb-btn-sm" onClick={() => startEdit(meal)} type="button">✎</button>
                  <button
                    className="nb-btn nb-btn-danger nb-btn-sm"
                    onClick={() => handleDelete(meal.id)}
                    disabled={deletingId === meal.id}
                    type="button"
                  >
                    {deletingId === meal.id ? '...' : 'Löschen'}
                  </button>
                </div>
                )}
                {(meal.protein > 0 || meal.carbs > 0 || meal.fat > 0) && (
                  <div style={{ display: 'flex', gap: 'var(--space-3)', padding: 'var(--space-2) var(--space-3)', fontSize: 'var(--text-xs)', color: 'var(--color-muted)', borderBottom: meal.items.length > 0 ? 'var(--border)' : undefined }}>
                    <span style={{ color: '#3B82F6', fontWeight: 700 }}>P {Math.round(meal.protein)}g</span>
                    <span>K {Math.round(meal.carbs)}g</span>
                    <span>F {Math.round(meal.fat)}g</span>
                  </div>
                )}
                {meal.items.length > 0 && (
                  <div className="meal-card__items">
                    {meal.items.map((item, i) => (
                      <div key={i} className="meal-item">
                        <span>{item.name}</span>
                        <span className="meal-item__calories">{item.calories} kcal{item.protein ? ` · P ${Math.round(item.protein)}g` : ''}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
