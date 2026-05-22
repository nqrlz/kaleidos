import { useRef, useState } from 'react';
import { useApi } from '../hooks/useApi';
import { Meal } from '../types';

interface MealInputProps {
  date: string;
  onMealAdded: (meal: Meal) => void;
}

async function compressImage(file: File): Promise<{ base64: string; mediaType: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const MAX = 1024;
      const scale = Math.min(1, MAX / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      const base64 = canvas.toDataURL('image/jpeg', 0.85).split(',')[1];
      resolve({ base64, mediaType: 'image/jpeg' });
    };
    img.onerror = reject;
    img.src = url;
  });
}

type Mode = 'text' | 'image';

export default function MealInput({ date, onMealAdded }: MealInputProps) {
  const api = useApi();
  const [mode, setMode] = useState<Mode>(
    () => (localStorage.getItem('kaleidos_input_mode') as Mode | null) ?? 'text'
  );

  function switchMode(m: Mode) {
    setMode(m);
    localStorage.setItem('kaleidos_input_mode', m);
  }
  const [description, setDescription] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastMeal, setLastMeal] = useState<Meal | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setLastMeal(null);
    setError(null);
  }

  function clearImage() {
    setImageFile(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setLastMeal(null);

    try {
      let meal: Meal;
      if (mode === 'image' && imageFile) {
        const { base64, mediaType } = await compressImage(imageFile);
        meal = await api.addMealFromImage(date, base64, mediaType);
        clearImage();
      } else {
        if (!description.trim()) return;
        meal = await api.addMeal(date, description.trim());
        setDescription('');
      }
      setLastMeal(meal);
      onMealAdded(meal);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Hinzufügen der Mahlzeit');
    } finally {
      setLoading(false);
    }
  }

  const canSubmit = mode === 'text' ? description.trim().length > 0 : imageFile !== null;

  return (
    <div className="meal-input">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-3)', paddingBottom: 'var(--space-2)', borderBottom: 'var(--border)' }}>
        <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 800 }}>Mahlzeit hinzufügen</h3>
        <div style={{ display: 'flex', gap: 0 }}>
          <button
            type="button"
            onClick={() => switchMode('text')}
            className="nb-btn nb-btn-sm"
            style={{ background: mode === 'text' ? 'var(--color-text)' : 'var(--color-surface)', color: mode === 'text' ? 'var(--color-primary)' : 'var(--color-text)', boxShadow: 'none' }}
          >
            Text
          </button>
          <button
            type="button"
            onClick={() => switchMode('image')}
            className="nb-btn nb-btn-sm"
            style={{ background: mode === 'image' ? 'var(--color-text)' : 'var(--color-surface)', color: mode === 'image' ? 'var(--color-primary)' : 'var(--color-text)', borderLeft: 'none', boxShadow: 'none' }}
          >
            Foto
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {mode === 'text' ? (
          <textarea
            className="nb-textarea"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="2 Eier; 300g Reis; 200g Hühnchenfleisch"
            disabled={loading}
            rows={3}
          />
        ) : (
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleImageChange}
              style={{ display: 'none' }}
            />
            {imagePreview ? (
              <div style={{ position: 'relative', display: 'inline-block', width: '100%' }}>
                <img
                  src={imagePreview}
                  alt="Vorschau"
                  style={{ width: '100%', maxHeight: 240, objectFit: 'cover', border: 'var(--border)', display: 'block' }}
                />
                <button
                  type="button"
                  className="nb-btn nb-btn-danger nb-btn-sm"
                  onClick={clearImage}
                  style={{ position: 'absolute', top: 8, right: 8 }}
                >
                  ✕
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="nb-btn"
                onClick={() => fileInputRef.current?.click()}
                style={{ width: '100%', height: 120, fontSize: 'var(--text-base)', flexDirection: 'column', gap: 'var(--space-2)' }}
              >
                <span style={{ fontSize: 32 }}>📷</span>
                <span>Foto aufnehmen oder auswählen</span>
              </button>
            )}
          </div>
        )}

        <div className="meal-input__actions">
          <button
            type="submit"
            className="nb-btn nb-btn-primary nb-btn-lg"
            disabled={loading || !canSubmit}
          >
            {loading ? 'Claude analysiert...' : 'Kalorien berechnen'}
          </button>
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
