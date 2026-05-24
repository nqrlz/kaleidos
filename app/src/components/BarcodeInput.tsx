import { useState, useRef } from 'react';
import { useApi } from '../hooks/useApi';
import { Meal } from '../types';

interface BarcodeInputProps {
  date: string;
  onMealAdded: (meal: Meal) => void;
}

interface OFFProduct {
  product_name: string;
  nutriments: {
    'energy-kcal_100g'?: number;
    proteins_100g?: number;
    carbohydrates_100g?: number;
    fat_100g?: number;
  };
  serving_quantity?: number;
}

export default function BarcodeInput({ date, onMealAdded }: BarcodeInputProps) {
  const api = useApi();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [barcode, setBarcode] = useState('');
  const [product, setProduct] = useState<OFFProduct | null>(null);
  const [grams, setGrams] = useState(100);
  const [scanning, setScanning] = useState(false);
  const [looking, setLooking] = useState(false);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canScan = 'BarcodeDetector' in window;

  async function fetchProduct(code: string) {
    setLooking(true);
    setError(null);
    setProduct(null);
    try {
      const res = await fetch(
        `https://world.openfoodfacts.org/api/v2/product/${code}.json?fields=product_name,nutriments,serving_quantity`
      );
      const data = await res.json() as { status: number; product?: OFFProduct };
      if (data.status === 1 && data.product?.product_name) {
        setProduct(data.product);
        setGrams(Math.round(data.product.serving_quantity || 100));
      } else {
        setError('Produkt nicht gefunden. Barcode korrekt?');
      }
    } catch {
      setError('Netzwerkfehler beim Abrufen der Produktdaten.');
    } finally {
      setLooking(false);
    }
  }

  async function handleScan(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setScanning(true);
    setError(null);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const detector = new (window as any).BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e'] });
      const bitmap = await createImageBitmap(file);
      const results = await detector.detect(bitmap);
      if (results.length > 0) {
        const code = results[0].rawValue as string;
        setBarcode(code);
        await fetchProduct(code);
      } else {
        setError('Kein Barcode erkannt — bitte manuell eingeben.');
      }
    } catch {
      setError('Scan fehlgeschlagen — bitte manuell eingeben.');
    } finally {
      setScanning(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  const factor = grams / 100;
  const kcal = Math.round((product?.nutriments['energy-kcal_100g'] ?? 0) * factor);
  const protein = Math.round((product?.nutriments.proteins_100g ?? 0) * factor);
  const carbs = Math.round((product?.nutriments.carbohydrates_100g ?? 0) * factor);
  const fat = Math.round((product?.nutriments.fat_100g ?? 0) * factor);

  async function handleAdd() {
    if (!product) return;
    setAdding(true);
    setError(null);
    try {
      const meal = await api.addMealManual(
        date,
        `${product.product_name} (${grams}g)`,
        kcal, protein, carbs, fat,
      );
      onMealAdded(meal);
      setProduct(null);
      setBarcode('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Hinzufügen');
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="meal-input" style={{ marginTop: 'var(--space-4)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-3)', paddingBottom: 'var(--space-2)', borderBottom: 'var(--border)' }}>
        <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 800 }}>Barcode / Produkt</h3>
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-muted)' }}>Open Food Facts</span>
      </div>

      <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
        <input
          className="nb-input"
          style={{ flex: 1 }}
          placeholder="Barcode-Nummer eingeben…"
          value={barcode}
          onChange={e => setBarcode(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && barcode && fetchProduct(barcode)}
        />
        <button
          className="nb-btn nb-btn-primary"
          onClick={() => barcode && fetchProduct(barcode)}
          disabled={!barcode || looking}
          type="button"
        >
          {looking ? '…' : 'Suchen'}
        </button>
        {canScan && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleScan}
              style={{ display: 'none' }}
            />
            <button
              className="nb-btn"
              onClick={() => fileInputRef.current?.click()}
              disabled={scanning}
              title="Barcode fotografieren"
              type="button"
            >
              {scanning ? '…' : '📷'}
            </button>
          </>
        )}
      </div>

      {error && <div className="error-state" style={{ marginBottom: 'var(--space-3)' }}>{error}</div>}

      {product && (
        <div>
          <div style={{ fontWeight: 800, fontSize: 'var(--text-sm)', marginBottom: 'var(--space-3)' }}>
            {product.product_name}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
            <label style={{ fontSize: 'var(--text-sm)', fontWeight: 700 }}>Menge:</label>
            <input
              className="nb-input"
              type="number"
              value={grams}
              min={1}
              onChange={e => setGrams(Number(e.target.value))}
              style={{ width: 80 }}
            />
            <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>g</span>
          </div>

          <div className="stats-grid" style={{ marginBottom: 'var(--space-3)' }}>
            <div className="stat-box">
              <div className="stat-box__label">Kalorien</div>
              <div className="stat-box__value">{kcal}<span className="stat-box__unit">kcal</span></div>
            </div>
            <div className="stat-box" style={{ borderColor: '#3B82F6' }}>
              <div className="stat-box__label">Protein</div>
              <div className="stat-box__value">{protein}<span className="stat-box__unit">g</span></div>
            </div>
            <div className="stat-box">
              <div className="stat-box__label">Kohlenhydrate</div>
              <div className="stat-box__value">{carbs}<span className="stat-box__unit">g</span></div>
            </div>
          </div>

          <button
            className="nb-btn nb-btn-primary nb-btn-lg"
            onClick={handleAdd}
            disabled={adding}
            style={{ width: '100%' }}
            type="button"
          >
            {adding ? 'Wird hinzugefügt…' : 'Mahlzeit hinzufügen'}
          </button>
        </div>
      )}
    </div>
  );
}
