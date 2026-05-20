import { useState, useEffect } from 'react';
import {
  startOfWeek,
  endOfWeek,
  addWeeks,
  subWeeks,
  format,
  eachDayOfInterval,
  isToday,
} from 'date-fns';
import { de } from 'date-fns/locale';
import { useApi } from '../hooks/useApi';
import { Meal, Settings } from '../types';
import PieChart from './PieChart';

interface WeekViewProps {
  settings: Settings;
}

interface DayStats {
  date: string;
  calories: number;
}

export default function WeekView({ settings }: WeekViewProps) {
  const api = useApi();
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const targetCalories = settings.daily_calories - settings.deficit;
  const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });

  const days = eachDayOfInterval({ start: currentWeekStart, end: weekEnd });

  const weekLabel = `${format(currentWeekStart, "d. MMM", { locale: de })} – ${format(weekEnd, "d. MMM yyyy", { locale: de })}`;

  useEffect(() => {
    async function fetchMeals() {
      setLoading(true);
      setError(null);
      try {
        const start = format(currentWeekStart, 'yyyy-MM-dd');
        const end = format(weekEnd, 'yyyy-MM-dd');
        const data = await api.getMealsRange(start, end);
        setMeals(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Fehler beim Laden der Daten');
      } finally {
        setLoading(false);
      }
    }
    fetchMeals();
  }, [currentWeekStart]); // eslint-disable-line react-hooks/exhaustive-deps

  function getDayStats(day: Date): DayStats {
    const dateStr = format(day, 'yyyy-MM-dd');
    const dayMeals = meals.filter((m) => m.date === dateStr);
    const calories = dayMeals.reduce((sum, m) => sum + m.calories, 0);
    return { date: dateStr, calories };
  }

  const totalConsumed = meals.reduce((sum, m) => sum + m.calories, 0);
  const totalTarget = targetCalories * 7;

  function goToPreviousWeek() {
    setCurrentWeekStart((d) => subWeeks(d, 1));
  }

  function goToNextWeek() {
    setCurrentWeekStart((d) => addWeeks(d, 1));
  }

  if (loading) {
    return <div className="loading-state">Lade Wochendaten...</div>;
  }

  if (error) {
    return <div className="error-state">{error}</div>;
  }

  return (
    <div>
      {/* Navigation */}
      <div className="period-nav">
        <button className="nb-btn" onClick={goToPreviousWeek} type="button">
          ← Vorherige Woche
        </button>
        <span className="period-nav__title">{weekLabel}</span>
        <button className="nb-btn" onClick={goToNextWeek} type="button">
          Nächste Woche →
        </button>
      </div>

      {/* Week summary pie chart */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 'var(--space-6)' }}>
        <PieChart
          consumed={totalConsumed}
          target={totalTarget}
          label="Wochenübersicht"
          size={220}
        />
      </div>

      {/* Week stats */}
      <div className="stats-grid" style={{ marginBottom: 'var(--space-6)' }}>
        <div className="stat-box">
          <div className="stat-box__label">Gesamt verbraucht</div>
          <div className="stat-box__value">
            {totalConsumed}
            <span className="stat-box__unit">kcal</span>
          </div>
        </div>
        <div className="stat-box">
          <div className="stat-box__label">Wochenziel</div>
          <div className="stat-box__value">
            {totalTarget}
            <span className="stat-box__unit">kcal</span>
          </div>
        </div>
        <div className="stat-box">
          <div className="stat-box__label">Durchschnitt/Tag</div>
          <div className="stat-box__value">
            {Math.round(totalConsumed / 7)}
            <span className="stat-box__unit">kcal</span>
          </div>
        </div>
      </div>

      {/* Day strip */}
      <div className="week-strip">
        {days.map((day) => {
          const stats = getDayStats(day);
          const pct = targetCalories > 0
            ? Math.min(100, (stats.calories / targetCalories) * 100)
            : 0;
          const isOver = stats.calories > targetCalories;
          const today = isToday(day);

          return (
            <div
              key={stats.date}
              className={`week-day-card${today ? ' week-day-card--today' : ''}`}
            >
              <div className="week-day-card__name">
                {format(day, 'EEE', { locale: de })}
              </div>
              <div className="week-day-card__date">
                {format(day, 'd.')}
              </div>
              <div
                className="week-day-card__kcal"
                style={{ color: isOver ? 'var(--color-danger)' : stats.calories > 0 ? 'var(--color-text)' : 'var(--color-muted)' }}
              >
                {stats.calories > 0 ? `${stats.calories}` : '—'}
              </div>
              {/* Mini bar */}
              <div style={{ height: 4, background: 'var(--color-gray-200)', marginTop: 'var(--space-1)', border: '1px solid var(--color-border)' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${pct}%`,
                    background: isOver ? 'var(--color-danger)' : 'var(--color-primary)',
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Daily breakdown */}
      <h2 style={{ marginBottom: 'var(--space-3)', fontSize: 'var(--text-lg)' }}>Tagesdetails</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        {days.map((day) => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const dayMeals = meals.filter((m) => m.date === dateStr);
          const dayCalories = dayMeals.reduce((sum, m) => sum + m.calories, 0);
          const isOver = dayCalories > targetCalories;
          const today = isToday(day);

          return (
            <div
              key={dateStr}
              className="nb-card-white"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-3)',
                padding: 'var(--space-3) var(--space-4)',
                background: today ? '#FFFBEB' : undefined,
              }}
            >
              <div style={{ minWidth: 80 }}>
                <div style={{ fontWeight: 800, fontSize: 'var(--text-sm)' }}>
                  {format(day, 'EEEE', { locale: de })}
                </div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-muted)' }}>
                  {format(day, 'd. MMM', { locale: de })}
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <div className="stats-bar">
                  <div
                    className={`stats-bar__fill${isOver ? ' stats-bar__fill--over' : ''}`}
                    style={{ width: `${Math.min(100, (dayCalories / Math.max(1, targetCalories)) * 100)}%` }}
                  />
                </div>
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 700,
                  fontSize: 'var(--text-sm)',
                  minWidth: 80,
                  textAlign: 'right',
                  color: isOver ? 'var(--color-danger)' : dayCalories > 0 ? 'var(--color-text)' : 'var(--color-muted)',
                }}
              >
                {dayCalories > 0 ? `${dayCalories} kcal` : '—'}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
