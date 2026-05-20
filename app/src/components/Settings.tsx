import { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import { Settings as SettingsType } from '../types';

interface SettingsProps {
  settings: SettingsType;
  onSettingsUpdate: (settings: SettingsType) => void;
}

export default function Settings({ settings, onSettingsUpdate }: SettingsProps) {
  const api = useApi();
  const [dailyCalories, setDailyCalories] = useState(settings.daily_calories);
  const [deficit, setDeficit] = useState(settings.deficit);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const targetCalories = dailyCalories - deficit;

  // Sync if parent settings change
  useEffect(() => {
    setDailyCalories(settings.daily_calories);
    setDeficit(settings.deficit);
  }, [settings]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);

    try {
      const updated = await api.updateSettings({
        daily_calories: dailyCalories,
        deficit,
      });
      onSettingsUpdate(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h1 style={{ marginBottom: 'var(--space-6)' }}>Einstellungen</h1>

      <form className="settings-form" onSubmit={handleSubmit}>
        <div className="nb-card" style={{ marginBottom: 'var(--space-6)' }}>
          <h2 style={{ marginBottom: 'var(--space-4)', fontSize: 'var(--text-lg)' }}>
            Kalorienziele
          </h2>

          <div className="settings-form__group">
            <label className="nb-label" htmlFor="daily-calories">
              Täglicher Kalorienbedarf
            </label>
            <input
              id="daily-calories"
              type="number"
              className="nb-input"
              value={dailyCalories}
              min={500}
              max={10000}
              onChange={(e) => setDailyCalories(Number(e.target.value))}
              disabled={saving}
            />
            <p className="settings-form__hint">
              Ihr täglicher Gesamtkalorienbedarf (TDEE).
            </p>
          </div>

          <div className="settings-form__group">
            <label className="nb-label" htmlFor="deficit">
              Gewünschtes Defizit
            </label>
            <input
              id="deficit"
              type="number"
              className="nb-input"
              value={deficit}
              min={0}
              max={2000}
              onChange={(e) => setDeficit(Number(e.target.value))}
              disabled={saving}
            />
            <p className="settings-form__hint">
              Kaloriendefizit pro Tag für Gewichtsabnahme (z.B. 500 kcal ≈ 0,5 kg/Woche).
            </p>
          </div>

          {/* Target display */}
          <div
            style={{
              border: 'var(--border)',
              background: 'var(--color-primary)',
              padding: 'var(--space-3) var(--space-4)',
              marginBottom: 'var(--space-4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span style={{ fontWeight: 700, fontSize: 'var(--text-sm)' }}>
              Zielkalorien pro Tag:
            </span>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontWeight: 800,
                fontSize: 'var(--text-lg)',
              }}
            >
              {targetCalories} kcal
            </span>
          </div>

          {error && (
            <div className="error-state" style={{ marginBottom: 'var(--space-3)' }}>
              {error}
            </div>
          )}

          {saved && (
            <div
              style={{
                border: 'var(--border)',
                background: '#F0FDF4',
                color: 'var(--color-success)',
                padding: 'var(--space-2) var(--space-3)',
                fontWeight: 700,
                fontSize: 'var(--text-sm)',
                marginBottom: 'var(--space-3)',
              }}
            >
              Einstellungen gespeichert!
            </div>
          )}

          <button
            type="submit"
            className="nb-btn nb-btn-primary nb-btn-lg"
            disabled={saving}
          >
            {saving ? 'Wird gespeichert...' : 'Einstellungen speichern'}
          </button>
        </div>
      </form>

      {/* API Key note */}
      <div className="settings-note">
        <div className="settings-note__title">Anthropic API-Schlüssel einrichten</div>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text)', lineHeight: 1.6 }}>
          Der Anthropic API-Schlüssel wird für die automatische Kalorienberechnung benötigt.
          Er muss direkt im Worker als Umgebungsvariable gesetzt werden — nicht im Frontend.
        </p>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-muted)', marginTop: 'var(--space-2)' }}>
          Setzen Sie den Schlüssel in <code style={{ fontFamily: 'var(--font-mono)', background: 'var(--color-gray-200)', padding: '1px 4px' }}>worker/wrangler.toml</code>:
        </p>
        <code className="settings-note__code">{`[vars]\nANTHROPIC_API_KEY = "sk-ant-..."`}</code>
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-muted)', marginTop: 'var(--space-2)' }}>
          Für die lokale Entwicklung können Sie auch eine <code style={{ fontFamily: 'var(--font-mono)', background: 'var(--color-gray-200)', padding: '1px 4px' }}>.dev.vars</code> Datei im <code style={{ fontFamily: 'var(--font-mono)', background: 'var(--color-gray-200)', padding: '1px 4px' }}>worker/</code> Verzeichnis verwenden.
        </p>
      </div>
    </div>
  );
}
