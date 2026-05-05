import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
} from 'recharts';
import { POS_COLORS, ATTR_LABELS } from '@/data/constants';

export default function PlayerRadarChart({ player }) {
  const data = Object.entries(player.attributes).map(([key, val]) => ({
    attribute: ATTR_LABELS[key] || key,
    value: val,
    fullMark: 99,
  }));
  const posColor = POS_COLORS[player.position];

  return (
    <ResponsiveContainer width="100%" height={280}>
      <RadarChart data={data}>
        <PolarGrid stroke="var(--gpl-border)" />
        <PolarAngleAxis
          dataKey="attribute"
          tick={{ fill: 'var(--gpl-text-muted)', fontSize: 11 }}
        />
        <PolarRadiusAxis angle={30} domain={[0, 99]} tick={false} axisLine={false} />
        <Radar
          dataKey="value"
          stroke={posColor}
          fill={posColor}
          fillOpacity={0.25}
          strokeWidth={2}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}
