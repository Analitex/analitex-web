interface SparklineProps {
  data: number[];
  color: string;
  height?: number;
  width?: number;
  fill?: boolean;
}

export function Sparkline({ data, color, height = 36, width = 80, fill = true }: SparklineProps) {
  if (!data || data.length < 2) return null;

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  const getX = (i: number) => (i / (data.length - 1)) * width;
  const getY = (v: number) => height - ((v - min) / range) * (height - 4) - 2;

  const linePoints = data.map((v, i) => `${getX(i)},${getY(v)}`).join(' ');

  const areaPoints = [
    `0,${height}`,
    ...data.map((v, i) => `${getX(i)},${getY(v)}`),
    `${width},${height}`,
  ].join(' ');

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="overflow-visible"
      style={{ display: 'block' }}
    >
      {fill && (
        <polygon
          points={areaPoints}
          fill={color}
          opacity={0.1}
        />
      )}
      <polyline
        points={linePoints}
        fill="none"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx={getX(data.length - 1)}
        cy={getY(data[data.length - 1])}
        r="2.5"
        fill={color}
      />
    </svg>
  );
}
