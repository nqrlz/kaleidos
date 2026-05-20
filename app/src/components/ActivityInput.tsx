import { useState } from 'react';
import { useApi } from '../hooks/useApi';
import type { Meal } from '../types';

interface Props {
  date: string;
  onActivityAdded: (meal: Meal) => void;
}

export default function ActivityInput({ date, onActivityAdded }: Props) {
  const api = useApi();
  const [description, setDescription] = useState('');
  const [calories, setCalories] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const kcal = parseInt(calories);
    if (!description.trim() || !kcal || kcal <= 0) return;

    setLoading(true);
    setError(null);
    try {
      const meal = await api.addActivity(date, description.trim(), kcal);
      onActivityAdded(meal);
      setDescription('');
      setCalories('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Speichern');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="meal-input"
      style={{ borderColor: 'var(--color-success)', boxShadow: '4px 4px 0 var(--color-success)' }}
    >
      <h3 className="meal-input__title" style={{ color: 'var(--color-success)' }}>
        Aktivität / Sport
      </h3>
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
          <div style={{ flex: 2, minWidth: 160 }}>
            <label className="nb-label" htmlFor="activity-desc">Beschreibung</label>
            <input
              id="activity-desc"
              type="text"
              className="nb-input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="z.B. Joggen 30 Min."
              disabled={loading}
            />
          </div>
          <div style={{ flex: 1, minWidth: 100 }}>
            <label className="nb-label" htmlFor="activity-kcal">Verbrannte kcal</label>
            <input
              id="activity-kcal"
              type="number"
              className="nb-input"
              value={calories}
              onChange={(e) => setCalories(e.target.value)}
              placeholder="300"
              min={1}
              max={5000}
              disabled={loading}
            />
          </div>
        </div>
        <div className="meal-input__actions" style={{ marginTop: 'var(--space-3)' }}>
          <button
            type="submit"
            className="nb-btn nb-btn-success nb-btn-lg"
            disabled={loading || !description.trim() || !calories}
          >
            {loading ? 'Speichere…' : 'Aktivität eintragen'}
          </button>
        </div>
      </form>
      {error && (
        <div className="error-state" style={{ marginTop: 'var(--space-3)' }}>{error}</div>
      )}
    </div>
  );
}
