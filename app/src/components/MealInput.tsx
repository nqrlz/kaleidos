import { useState } from 'react';
import { useApi } from '../hooks/useApi';
import { Meal } from '../types';

interface MealInputProps {
  date: string;
  onMealAdded: (meal: Meal) => void;
}

export default function MealInput({ date, onMealAdded }: MealInputProps) {
  const api = useApi();
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastMeal, setLastMeal] = useState<Meal | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!description.trim()) return;

    setLoading(true);
    setError(null);
    setLastMeal(null);

    try {
      const meal = await api.addMeal(date, description.trim());
      setLastMeal(meal);
      setDescription('');
      onMealAdded(meal);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Hinzufügen der Mahlzeit');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="meal-input">
      <h3 className="meal-input__title">Mahlzeit hinzufügen</h3>
      <form onSubmit={handleSubmit}>
        <textarea
          className="nb-textarea"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="2 Eier; 300g Reis; 200g Hühnchenfleisch"
          disabled={loading}
          rows={3}
        />
        <div className="meal-input__actions">
          <button
            type="submit"
            className="nb-btn nb-btn-primary nb-btn-lg"
            disabled={loading || !description.trim()}
          >
            {loading ? 'Berechne Kalorien...' : 'Kalorien berechnen'}
          </button>
          {loading && (
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-muted)', fontWeight: 600 }}>
              Claude analysiert deine Mahlzeit...
            </span>
          )}
        </div>
      </form>

      {error && (
        <div className="error-state" style={{ marginTop: 'var(--space-3)' }}>
          Fehler: {error}
        </div>
      )}

      {lastMeal && (
        <div className="meal-result">
          <div className="meal-result__title">Mahlzeit hinzugefügt</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
            <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>{lastMeal.description}</span>
            <span className="nb-badge nb-badge-primary">{lastMeal.calories} kcal</span>
          </div>
          {lastMeal.items.length > 0 && (
            <div>
              {lastMeal.items.map((item, i) => (
                <div key={i} className="meal-item">
                  <span>{item.name}</span>
                  <span className="meal-item__calories">{item.calories} kcal</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
