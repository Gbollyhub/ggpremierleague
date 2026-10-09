import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
} from 'recharts';
import { POS_COLORS, ATTR_LABELS, ATTRIBUTES } from '@/data/constants';
import { getAttributeStatus } from '@/utils/players';

export default function PlayerRadarChart({ player }) {
  // Only attributes backed by data — untracked/no-sample ones would show a misleading 75
  const data = ATTRIBUTES
    .filter((key) => player.attributes?.[key] !== undefined && getAttributeStatus(player, key) === 'ok')
    .map((key) => ({ attribute: ATTR_LABELS[key] || key, value: player.attributes[key], fullMark: 99 }));
  const posColor = POS_COLORS[player.position];

  if (data.length < 3) {
    return <div className="h-[280px] flex items-center justify-center text-sm text-gpl-muted">Not enough filmed games yet to chart attributes.</div>;
  }

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
