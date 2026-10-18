// Tokens do design system usado nos protótipos. Trocar por CSS vars / tema do codebase.
export const c = {
  ink: '#12161A', inkSoft: '#1F242A', inkBorder: '#2E353D',
  teal: '#17A9AE', tealDark: '#12878B', tealText: '#0E5F62', tealBg: '#E4F5F6', tealBorder: '#9FDCDE',
  green: '#2E9E4F', greenBg: '#E6F4EA', greenText: '#1F6B36', greenBorder: '#B6E0C2',
  amber: '#E8B400', amberBg: '#FCF3D4', amberText: '#7A5E00', amberBorder: '#EBD68A',
  red: '#D93A3A', redBg: '#FBE8E8', redText: '#8F2222', redBorder: '#F0B4B4',
  t1: '#1A1D21', t2: '#374151', t3: '#4B5563', t4: '#6B7280', t5: '#9CA3AF',
  white: '#FFFFFF', s1: '#FAFAFB', s2: '#F3F4F6', s3: '#F8F9FA',
  b1: '#D8DBDF', b2: '#E5E7EB', b3: '#F1F2F4', b4: '#C7CBD1',
  heatFree: '#BFE7E9', heatEmpty: '#F1F2F4',
};

export const label = {
  fontSize: 10.5, fontWeight: 'bold', color: c.t4,
  textTransform: 'uppercase', letterSpacing: 0.7,
};

export const STATUS = {
  andamento:  { label: 'Em andamento', color: c.teal,  bg: c.tealBg,  border: c.tealBorder,  fg: c.tealText },
  planejada:  { label: 'Planejada',    color: c.t5,    bg: c.s2,      border: c.b1,          fg: c.t3 },
  monitorada: { label: 'Monitorada',   color: c.amber, bg: c.amberBg, border: c.amberBorder, fg: c.amberText },
  risco:      { label: 'Em risco',     color: c.red,   bg: c.redBg,   border: c.redBorder,   fg: c.redText },
  concluida:  { label: 'Concluída',    color: c.green, bg: c.greenBg, border: c.greenBorder, fg: c.greenText },
};
export const ORDEM_STATUS = ['andamento', 'planejada', 'monitorada', 'risco', 'concluida'];

export const PRIORIDADE_COR = { 'Crítica': c.red, Alta: c.amber, 'Média': c.teal, Baixa: c.t5 };
