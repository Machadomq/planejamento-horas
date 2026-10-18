// Dados de exemplo no formato do contrato de API (ver API_SPEC.md).
// Substituir por fetch nos endpoints /planejamento/*.

const INICIO_PERIODO = '2026-08-31';
const DIAS_PERIODO = 84;

function gerarBucketsDias(inicioISO, dias) {
  const d0 = new Date(inicioISO + 'T12:00:00');
  return Array.from({ length: dias }, (_, i) => {
    const d = new Date(d0);
    d.setDate(d.getDate() + i);
    const id = String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0');
    return { indice: i, id, inicio: d.toISOString().slice(0, 10) };
  });
}

export const buckets = gerarBucketsDias(INICIO_PERIODO, DIAS_PERIODO);

// Índice do dia atual dentro do período (2026-09-23).
export const bucketAtual = 23;

function capacidadeDias(inicioISO, dias, horasDiaUtil) {
  const d0 = new Date(inicioISO + 'T12:00:00');
  return Array.from({ length: dias }, (_, i) => {
    const d = new Date(d0);
    d.setDate(d.getDate() + i);
    const dow = d.getDay();
    return dow === 0 || dow === 6 ? 0 : horasDiaUtil;
  });
}

const cap = { horasSemana: 40, horasMes: 180, porBucket: capacidadeDias(INICIO_PERIODO, DIAS_PERIODO, 8) };

export const devs = [
  { id: 'usr_112', nome: 'Ana Ribeiro',     iniciais: 'AR', papel: 'Backend · Fiscal',        squad: 'Fiscal & Tributos',     capacidade: cap },
  { id: 'usr_113', nome: 'Bruno Salles',    iniciais: 'BS', papel: 'Fullstack · Tickets',     squad: 'Tickets & Portal',      capacidade: cap },
  { id: 'usr_114', nome: 'Carla Menezes',   iniciais: 'CM', papel: 'Frontend · Portal',       squad: 'Tickets & Portal',      capacidade: cap },
  { id: 'usr_115', nome: 'Diego Fontes',    iniciais: 'DF', papel: 'Backend · Integrações',   squad: 'Integrações & Dados',   capacidade: cap },
  { id: 'usr_116', nome: 'Eduarda Lima',    iniciais: 'EL', papel: 'QA · Automação',          squad: 'Qualidade',             capacidade: cap },
  { id: 'usr_117', nome: 'Felipe Andrade',  iniciais: 'FA', papel: 'Dados · BI',              squad: 'Integrações & Dados',   capacidade: cap },
];

const a = (id, ticketId, titulo, tipo, devId, bucketInicio, duracaoBuckets, horasEstimadas, horasApontadas, status) =>
  ({ id, ticketId, titulo, tipo, devId, bucketInicio, duracaoBuckets, horasEstimadas, horasApontadas,
     status, distribuicao: 'linear', pesos: null, versao: 1 });

// bucketInicio/duracaoBuckets em dias corridos. Tickets próximos uns dos outros
// (gaps curtos) para deixar o Gantt mais preenchido/apresentável.
export const alocacoes = [
  a('alc_9001', 'TCK-4187', 'Integração fiscal · NF-e lote 2',       'Projeto',        'usr_112',  0,  9, 24, 24, 'concluida'),
  a('alc_9002', 'TCK-4402', 'Emissão de NF-e complementar',          'Sustentação',    'usr_112', 13,  7, 16, 16, 'concluida'),
  a('alc_9003', 'TCK-4231', 'Refactor serviço de tributos',          'Débito técnico', 'usr_112', 23, 11, 28, 16, 'risco'),
  a('alc_9004', 'TCK-4408', 'Ajuste de alíquota ICMS por UF',        'Melhoria',       'usr_112', 39,  8, 20,  0, 'planejada'),
  a('alc_9005', 'TCK-4415', 'Auditoria de lançamentos fiscais',      'Qualidade',      'usr_112', 50, 10, 24,  0, 'monitorada'),

  a('alc_9006', 'TCK-4102', 'Painel de apontamentos v2',             'Projeto',        'usr_113',  3,  9, 24, 24, 'concluida'),
  a('alc_9007', 'TCK-4256', 'Fila de aprovação de horas',            'Melhoria',       'usr_113', 16,  7, 16, 10, 'andamento'),
  a('alc_9008', 'TCK-4420', 'Exportação de relatório em PDF',        'Melhoria',       'usr_113', 26, 11, 28,  0, 'planejada'),
  a('alc_9009', 'TCK-4426', 'Webhook de status do ticket',           'Projeto',        'usr_113', 42,  8, 20,  0, 'planejada'),
  a('alc_9010', 'TCK-4433', 'Correção de paginação na fila',         'Sustentação',    'usr_113', 53, 10, 24,  0, 'monitorada'),

  a('alc_9011', 'TCK-4090', 'Redesign da timeline de tickets',       'Projeto',        'usr_114',  0,  9, 24, 24, 'concluida'),
  a('alc_9012', 'TCK-4274', 'Acessibilidade do formulário',          'Melhoria',       'usr_114', 13,  7, 16, 16, 'concluida'),
  a('alc_9013', 'TCK-4288', 'Componentes de gráfico',                'Projeto',        'usr_114', 23, 11, 28, 12, 'andamento'),
  a('alc_9014', 'TCK-4440', 'Tema escuro do portal',                 'Melhoria',       'usr_114', 39,  8, 20,  0, 'planejada'),
  a('alc_9015', 'TCK-4446', 'Testes visuais de regressão',           'Qualidade',      'usr_114', 50, 10, 24,  0, 'monitorada'),

  a('alc_9016', 'TCK-4155', 'API de horas — v3',                     'Projeto',        'usr_115',  3,  9, 24, 24, 'concluida'),
  a('alc_9017', 'TCK-4211', 'Sustentação · chamados P1',             'Sustentação',    'usr_115', 16,  7, 16, 10, 'risco'),
  a('alc_9018', 'TCK-4452', 'Integração com ERP de terceiros',       'Projeto',        'usr_115', 26, 11, 28,  0, 'planejada'),
  a('alc_9019', 'TCK-4458', 'Rate limit da API pública',             'Melhoria',       'usr_115', 42,  8, 20,  0, 'planejada'),
  a('alc_9020', 'TCK-4465', 'Chamado P1 · timeout de sincronização', 'Sustentação',    'usr_115', 53, 10, 24,  0, 'monitorada'),

  a('alc_9021', 'TCK-4198', 'Suíte E2E do módulo de horas',          'Qualidade',      'usr_116',  0,  9, 24, 24, 'concluida'),
  a('alc_9022', 'TCK-4301', 'Regressão release 26.9',                'Qualidade',      'usr_116', 13,  7, 16, 10, 'andamento'),
  a('alc_9023', 'TCK-4471', 'Cobertura de testes do módulo fiscal',  'Qualidade',      'usr_116', 23, 11, 28,  0, 'planejada'),
  a('alc_9024', 'TCK-4478', 'Automação de smoke tests',              'Qualidade',      'usr_116', 39,  8, 20,  0, 'planejada'),
  a('alc_9025', 'TCK-4485', 'Plano de testes da v27',                'Projeto',        'usr_116', 50, 10, 24,  0, 'monitorada'),

  a('alc_9026', 'TCK-4143', 'Cubo de horas apontadas',               'Projeto',        'usr_117',  3,  9, 24, 24, 'concluida'),
  a('alc_9027', 'TCK-4264', 'Dashboard de ocupação',                 'Projeto',        'usr_117', 16,  7, 16, 10, 'andamento'),
  a('alc_9028', 'TCK-4491', 'Pipeline de ETL noturno',               'Projeto',        'usr_117', 26, 11, 28,  0, 'planejada'),
  a('alc_9029', 'TCK-4497', 'Alertas de anomalia em métricas',       'Melhoria',       'usr_117', 42,  8, 20,  0, 'planejada'),
  a('alc_9030', 'TCK-4503', 'Modelo de previsão de capacidade',      'Projeto',        'usr_117', 53, 10, 24,  0, 'monitorada'),
];

const t = (id, titulo, tipo, nome, area, h, valor, aprovadoEm, prazo, dias, prioridade, status = 'aprovado') => ({
  id, titulo, tipo, prioridade,
  solicitante: { nome, area },
  orcamento: { horasAprovadas: h, valorAprovadoCentavos: valor, aprovadoEm },
  prazoAcordado: prazo, diasParaPrazo: dias,
  statusOrcamento: status, alocacaoId: null, orcamentoPlanejadoId: null,
});

export const ticketsAprovados = [
  t('TCK-4312', 'Migração do apontamento móvel — fase 1',  'Projeto',     'Marina Duarte', 'Operações',     48, 2160000, '2026-09-15', '2026-10-30', 42, 'Alta'),
  t('TCK-4318', 'Relatório de horas por centro de custo',  'Melhoria',    'Rogério Pinto', 'Controladoria', 24, 1080000, '2026-09-15', '2026-10-10', 22, 'Média'),
  t('TCK-4295', 'Integração WMS · expedição parcial',      'Projeto',     'Helena Braga',  'Logística',     80, 3600000, '2026-09-09', '2026-09-25',  7, 'Crítica'),
  t('TCK-4287', 'Bloqueio de apontamento retroativo',      'Melhoria',    'Caio Severino', 'RH',            16,  720000, '2026-09-08', '2026-10-02', 14, 'Média'),
  t('TCK-4276', 'Portal do cliente · segunda via de NF',   'Projeto',     'Tatiana Rios',  'Comercial',     56, 2520000, '2026-09-05', '2026-11-14', 57, 'Média'),
  t('TCK-4268', 'Alerta de estouro de horas por ticket',   'Melhoria',    'Sérgio Nakano', 'PMO',           20,  900000, '2026-09-03', '2026-10-20', 32, 'Baixa'),
  t('TCK-4255', 'Correção do cálculo de horas noturnas',   'Sustentação', 'Paula Khoury',  'Folha',         12,  540000, '2026-09-01', '2026-09-22',  4, 'Crítica'),
  t('TCK-4240', 'Auditoria de apontamentos · log completo','Qualidade',   'Ivan Mattos',   'Compliance',    36, 1620000, '2026-08-28', '2026-11-07', 50, 'Média'),
];

// Pedidos abertos ainda sem orçamento — entram na fila de pré-orçamento para o PO estimar e planejar.
export const ticketsPreOrcamento = [
  t('TCK-4329', 'Exportação de férias para a folha',       'Melhoria',    'Renata Assis',  'RH',            20, 0, '2026-09-20', '2026-10-15', 21, 'Média',   'pre_orcamento'),
  t('TCK-4324', 'Integração com gateway de pagamento PIX',  'Projeto',     'Otávio Lemos',  'Financeiro',    60, 0, '2026-09-19', '2026-10-05', 11, 'Alta',    'pre_orcamento'),
  t('TCK-4306', 'Revisão de permissões do portal do cliente','Qualidade', 'Bianca Neri',   'Comercial',     18, 0, '2026-09-12', '2026-11-01', 38, 'Baixa',   'pre_orcamento'),
  t('TCK-4299', 'Chamado P1 recorrente · timeout no fechamento','Sustentação','Marcelo Vaz','Operações',    10, 0, '2026-09-10', '2026-09-24',  1, 'Crítica', 'pre_orcamento'),
];

export const tickets = ticketsAprovados.concat(ticketsPreOrcamento);

export const pos = [
  { id: 'usr_201', nome: 'Juliana Prado',  iniciais: 'JP', papel: 'PO · Financeiro/RH', capacidade: cap },
  { id: 'usr_202', nome: 'Renato Cabral',  iniciais: 'RC', papel: 'PO · Comercial/Logística', capacidade: cap },
  { id: 'usr_203', nome: 'Camila Duque',   iniciais: 'CD', papel: 'PO · Operações/Sustentação', capacidade: cap },
];
