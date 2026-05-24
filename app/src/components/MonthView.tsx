import { useState, useEffect } from 'react';
import {
  startOfMonth,
  endOfMonth,
  addMonths,
  subMonths,
  format,
  eachDayOfInterval,
  startOfWeek,
  endOfWeek,
  isToday,
  isSameMonth,
} from 'date-fns';
import { de } from 'date-fns/locale';
import { useApi } from '../hooks/useApi';
import { Meal, Settings } from '../types';
import PieChart from './PieChart';

interface MonthViewProps {
  settings: Settings;
  onDaySelect: (date: string) => void;
}

const WEEKDAY_LABELS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

export default function MonthView({ settings, onDaySelect }: MonthViewProps) {
  const api = useApi();
  const [currentMonth, setCurrentMonth] = useState<Date>(() => startOfMonth(new Date()));
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const targetCalories = settings.daily_calories - settings.deficit;
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);

  const monthLabel = format(currentMonth, 'MMMM yyyy', { locale: de });

  // Calendar grid: fill from Monday of the first week to Sunday of the last week
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const calendarDays = eachDayOfInterval({ start: gridStart, end: gridEnd });

  useEffect(() => {
    async function fetchMeals() {
      setLoading(true);
      setError(null);
      try {
        const start = format(monthStart, 'yyyy-MM-dd');
        const end = format(monthEnd, 'yyyy-MM-dd');
        const data = await api.getMealsRange(start, end);
        setMeals(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Fehler beim Laden der Daten');
      } finally {
        setLoading(false);
      }
    }
    fetchMeals();
  }, [currentMonth]); // eslint-disable-line react-hooks/exhaustive-deps

  function getDayCalories(day: Date): number {
    const dateStr = format(day, 'yyyy-MM-dd');
    return meals
      .filter((m) => m.date === dateStr)
      .reduce((sum, m) => sum + m.calories, 0);
  }

  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const totalConsumed = meals.reduce((sum, m) => sum + m.calories, 0);
  const totalTarget = targetCalories * daysInMonth.length;
  const daysWithMeals = daysInMonth.filter((d) => getDayCalories(d) > 0).length;

  function goToPreviousMonth() {
    setCurrentMonth((d) => subMonths(d, 1));
  }

  function goToNextMonth() {
    setCurrentMonth((d) => addMonths(d, 1));
  }

  if (loading) {
    return <div className="loading-state">Lade Monatsdaten...</div>;
  }

  if (error) {
    return <div className="error-state">{error}</div>;
  }

  return (
    <div>
      {/* Navigation */}
      <div className="period-nav">
        <button className="nb-btn" onClick={goToPreviousMonth} type="button">
          ← Vorheriger Monat
        </button>
        <span className="period-nav__title">{monthLabel}</span>
        <button className="nb-btn" onClick={goToNextMonth} type="button">
          Nächster Monat →
        </button>
      </div>

      {/* Month summary pie chart */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 'var(--space-6)' }}>
        <PieChart
          consumed={totalConsumed}
          target={totalTarget}
          label="Monatsübersicht"
          size={220}
        />
      </div>

      {/* Month stats */}
      <div className="stats-grid" style={{ marginBottom: 'var(--space-6)' }}>
        <div className="stat-box">
          <div className="stat-box__label">Gesamt verbraucht</div>
          <div className="stat-box__value">
            {totalConsumed}
            <span className="stat-box__unit">kcal</span>
          </div>
        </div>
        <div className="stat-box">
          <div className="stat-box__label">Tage erfasst</div>
          <div className="stat-box__value">
            {daysWithMeals}
            <span className="stat-box__unit">/{daysInMonth.length}</span>
          </div>
        </div>
        <div className="stat-box">
          <div className="stat-box__label">Ø pro Tag</div>
          <div className="stat-box__value">
            {daysWithMeals > 0 ? Math.round(totalConsumed / daysWithMeals) : 0}
            <span className="stat-box__unit">kcal</span>
          </div>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="calendar-grid">
        {/* Header row */}
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="calendar-header-cell">
            {label}
          </div>
        ))}

        {/* Day cells */}
        {calendarDays.map((day) => {
          const inCurrentMonth = isSameMonth(day, currentMonth);
          const today = isToday(day);
          const calories = inCurrentMonth ? getDayCalories(day) : 0;
          const isOver = calories > targetCalories;
          const pct = targetCalories > 0 && calories > 0
            ? Math.min(100, (calories / targetCalories) * 100)
            : 0;

          let barColor = 'var(--color-primary)';
          if (isOver) barColor = 'var(--color-danger)';
          else if (pct > 80) barColor = 'var(--color-warning)';
          else if (pct > 50) barColor = 'var(--color-success)';

          const dateStr = format(day, 'yyyy-MM-dd');
          return (
            <div
              key={dateStr}
              className={[
                'calendar-day',
                !inCurrentMonth ? 'calendar-day--empty' : '',
                today ? 'calendar-day--today' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => inCurrentMonth && onDaySelect(dateStr)}
              style={{ cursor: inCurrentMonth ? 'pointer' : undefined }}
            >
              <div className="calendar-day__number">{format(day, 'd')}</div>
              {inCurrentMonth && calories > 0 && (
                <>
                  <div
                    className="calendar-day__calories"
                    style={{ color: isOver ? 'var(--color-danger)' : 'var(--color-text)' }}
                  >
                    {calories}
                  </div>
                  <div className="calendar-day__bar">
                    <div
                      className="calendar-day__bar-fill"
                      style={{ width: `${pct}%`, background: barColor }}
                    />
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div
        style={{
          display: 'flex',
          gap: 'var(--space-4)',
          marginTop: 'var(--space-4)',
          fontSize: 'var(--text-xs)',
          fontWeight: 600,
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        <span style={{ color: 'var(--color-muted)' }}>Legende:</span>
        {[
          { color: 'var(--color-success)', label: '< 80% Ziel' },
          { color: 'var(--color-warning)', label: '80–100% Ziel' },
          { color: 'var(--color-primary)', label: '≥ 100% Ziel' },
          { color: 'var(--color-danger)', label: 'Überschritten' },
        ].map(({ color, label }) => (
          <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span
              style={{
                display: 'inline-block',
                width: 12,
                height: 12,
                background: color,
                border: '1px solid var(--color-border)',
              }}
            />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
