export const POSITIONS = { FW: 'Forward', MF: 'Midfielder', DF: 'Defender', GK: 'Goalkeeper' };
export const POS_COLORS = { FW: '#ef4444', MF: '#f59e0b', DF: '#3b82f6', GK: '#22c55e' };
export const ATTRIBUTES = ['pace', 'finishing', 'dribbling', 'passing', 'physical', 'defending', 'gkReflexes'];
export const ATTR_LABELS = {
  pace: 'Pace', finishing: 'Finishing', dribbling: 'Dribbling',
  passing: 'Passing', physical: 'Physical', defending: 'Defending',
  gkReflexes: 'GK Reflexes',
};
export const ATTR_BASE = 75;
export const PLAYSTYLES = [
  'Tiki-Taka','Long Ball','Rapid','Technical','Trivela','Magician','Power Shot','Acrobatic','Finesse Shot',
  'Incisive Pass','Jockey','Block','Intercept','Bruiser','Anticipate','Quick Step','Relentless',
  'Whipped Pass','Chip Shot','First Touch','Aerial','Dead Ball','Press Proven','Slide Tackle',
  'Far Reach','Deflector',
];
export const MIN_RATING = 50;
export const MAX_RATING = 99;
export const DEFAULT_RATING = 75;
