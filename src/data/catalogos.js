// Listas fixas usadas nos formulários (ver API_SPEC.md §7).
export const TIPOS_ATIVIDADE = ['Projeto', 'Melhoria', 'Sustentação', 'Qualidade', 'Débito técnico'];
export const PRIORIDADES = ['Baixa', 'Média', 'Alta', 'Crítica'];
export const STATUS_ORCAMENTO = [
  { valor: 'aprovado', rotulo: 'Orçamento aprovado' },
  { valor: 'pre_orcamento', rotulo: 'Pré-orçamento a fazer' },
];
export const TIPOS_PESSOA = [
  { valor: 'dev', rotulo: 'Dev' },
  { valor: 'po', rotulo: 'PO' },
];
// Jornada em turnos de 4 h (ver lib/turnos.js).
export const JORNADAS = [
  { valor: 'integral', rotulo: 'Integral', descricao: 'Manhã e tarde · 8 h/dia', horas: 8 },
  { valor: 'manha', rotulo: 'Só manhã', descricao: '4 h/dia', horas: 4 },
  { valor: 'tarde', rotulo: 'Só tarde', descricao: '4 h/dia', horas: 4 },
];
export const JORNADA_PADRAO = 'integral';
