import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

interface PieChartProps {
  consumed: number;
  target: number;
  label?: string;
  size?: number;
}

export default function PieChart({ consumed, target, label, size = 200 }: PieChartProps) {
  const isOver = consumed > target;
  const remaining = Math.max(0, target - consumed);
  const overflow = Math.max(0, consumed - target);

  let data;
  if (isOver) {
    data = [
      { name: 'Ziel', value: target, color: '#FDC800' },
      { name: 'Überschuss', value: overflow, color: '#DC2626' },
    ];
  } else {
    data = [
      { name: 'Verbraucht', value: consumed, color: '#FDC800' },
      { name: 'Verbleibend', value: remaining || 1, color: '#E5E5E5' },
    ];
  }

  // Don't render chart if no target
  if (target <= 0) {
    return (
      <div className="chart-container" style={{ minWidth: size, minHeight: size + 40 }}>
        {label && <div className="chart-container__title">{label}</div>}
        <div className="empty-state" style={{ width: '100%' }}>Kein Ziel festgelegt</div>
      </div>
    );
  }

  const centerLabel = `${consumed} / ${target}`;
  const percentage = target > 0 ? Math.min(100, Math.round((consumed / target) * 100)) : 0;

  return (
    <div className="chart-container" style={{ minWidth: size }}>
      {label && <div className="chart-container__title">{label}</div>}
      <div style={{ position: 'relative', width: size, height: size }}>
        <ResponsiveContainer width="100%" height="100%">
          <RechartsPieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={size * 0.3}
              outerRadius={size * 0.44}
              startAngle={90}
              endAngle={-270}
              dataKey="value"
              strokeWidth={0}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
          </RechartsPieChart>
        </ResponsiveContainer>
        {/* Center label */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: size < 150 ? '11px' : 'var(--text-sm)',
              fontWeight: 800,
              color: isOver ? 'var(--color-danger)' : 'var(--color-text)',
              whiteSpace: 'nowrap',
            }}
          >
            {centerLabel}
          </div>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: size < 150 ? '10px' : 'var(--text-xs)',
              fontWeight: 600,
              color: 'var(--color-muted)',
            }}
          >
            kcal ({percentage}%)
          </div>
        </div>
      </div>
    </div>
  );
}
