import React, { useMemo, useState } from 'react';
import { c, label, STATUS } from '../theme.js';
import { Avatar, Barra, Select } from '../components/ui.jsx';
import { cargaDev, capacidadeBucket, capacidadeJanela, corOcupacao, ehFimDeSemana } from '../lib/capacidade.js';
import { trechos } from '../lib/turnos.js';
import FaixaEdicao, { ALTURA_FAIXA } from '../components/FaixaEdicao.jsx';
const ESCALAS = ['Dia', 'Semana', 'Mês'];

/**
 * onAtualizar(id, campos) e onExcluir(id) devolvem Promise; onRemarcar(alocacao) abre o modal.
 */
export default function GanttHoras({ buckets, bucketAtual, devs, alocacoes, onAtualizar, onRemarcar, onExcluir }) {
  const n = buckets.length;
  const [selId, setSelId] = useState(null);
  // Clicar de novo na mesma atividade fecha a edição.
  const selecionar = (id) => setSelId((atual) => (atual === id ? null : id));
  const selecionada = alocacoes.find((a) => a.id === selId) || null;
  const [escala, setEscala] = useState('Dia');
  const [filtroSquad, setFiltroSquad] = useState('');
  const [buscaRecurso, setBuscaRecurso] = useState('');

  const squads = useMemo(() => Array.from(new Set(devs.map((d) => d.squad))), [devs]);
  const opcoesSquad = useMemo(() => [
    { key: '', label: 'Todos os squads', corTexto: c.t3, corFundo: c.s2, corBorda: c.b1 },
    ...squads.map((s) => ({ key: s, label: s, corTexto: c.tealText, corFundo: c.tealBg, corBorda: c.tealBorder })),
  ], [squads]);

  const termoBusca = buscaRecurso.trim().toLowerCase();
  const devsVisiveis = useMemo(() => devs
    .filter((d) => !filtroSquad || d.squad === filtroSquad)
    .filter((d) => !termoBusca || d.nome.toLowerCase().includes(termoBusca)), [devs, filtroSquad, termoBusca]);

  const JANELA_MES = 30;
  const fimJanelaMes = Math.min(n, bucketAtual + JANELA_MES);

  const porDev = useMemo(() => devsVisiveis.map((dev) => {
    const carga = cargaDev(alocacoes, dev.id, buckets);
    // Só lista as barras que aparecem (ao menos um dia) dentro do período.
    const itens = alocacoes.filter((a) => a.devId === dev.id && a.bucketInicio < n && a.bucketInicio + a.duracaoBuckets > 0);
    const horas = carga.slice(bucketAtual, fimJanelaMes).reduce((s, h) => s + h, 0);
    const capPeriodo = capacidadeJanela(dev, bucketAtual, fimJanelaMes);
    return { dev, carga, itens, horas, capPeriodo, pct: horas / capPeriodo };
  }), [devsVisiveis, alocacoes, buckets, n, bucketAtual, fimJanelaMes]);

  const kpis = useMemo(() => {
    const idsVisiveis = new Set(devsVisiveis.map((d) => d.id));
    const alocacoesVisiveis = alocacoes.filter((a) => idsVisiveis.has(a.devId));
    const horas = porDev.reduce((s, x) => s + x.horas, 0);
    const cap = porDev.reduce((s, x) => s + x.capPeriodo, 0);
    // Com turnos, um dia cheio (8/8 h) é normal; o aperto é medido nos próximos 30 dias.
    const apertados = porDev.filter((x) => x.pct > 0.85).length;
    const risco = alocacoesVisiveis.filter((a) => a.status === 'risco').length;
    return [
      { v: Math.round(horas) + ' h', l: 'Horas estimadas nos próximos 30 dias', cor: c.t1 },
      { v: cap + ' h', l: 'Capacidade nos próximos 30 dias (' + devsVisiveis.length + (devsVisiveis.length === 1 ? ' pessoa)' : ' pessoas)'), cor: c.t1 },
      { v: (cap ? Math.round((horas / cap) * 100) : 0) + ' %', l: 'Ocupação vs. capacidade (30 dias)', cor: corOcupacao(cap ? horas / cap : 0) },
      { v: String(apertados), l: 'Pessoas acima de 85% nos próximos 30 dias', cor: apertados ? c.amber : c.green },
      { v: String(risco), l: 'Demandas em risco', cor: risco ? c.red : c.green },
    ];
  }, [alocacoes, porDev, devsVisiveis]);

  const LARGURA_COL = 64;
  const colGrid = { display: 'grid', gridTemplateColumns: 'repeat(' + n + ', minmax(' + LARGURA_COL + 'px, 1fr))', minWidth: n * LARGURA_COL };
  const fds = useMemo(() => buckets.map(ehFimDeSemana), [buckets]);
  const fundoCol = (i) => (i === bucketAtual ? 'rgba(23,169,174,0.06)' : fds[i] ? 'rgba(17,24,39,0.045)' : i % 2 ? '#FCFCFD' : 'transparent');
  // Trechos de turnos cortados nas bordas do período (em meios-dias: 0 … 2n-1).
  const trechosVisiveis = (turnos) => trechos(turnos || [])
    .map(([a, b]) => [Math.max(0, a), Math.min(2 * n - 1, b)])
    .filter(([a, b]) => a <= b);
  const DivisorTurno = () => (
    <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, borderLeft: '1px dashed ' + c.b4, pointerEvents: 'none' }} />
  );

  return (
    <div style={{ background: c.s2, paddingBottom: selecionada ? ALTURA_FAIXA + 40 : 28, minHeight: '100%' }}>
      <div style={{ padding: '18px 24px 0', display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 12 }}>
        {kpis.map((k) => (
          <div key={k.l} style={{ background: c.white, border: '1px solid ' + c.b1, borderRadius: 10, padding: '14px 16px' }}>
            <div style={{ fontSize: 23, fontWeight: 'bold', color: k.cor, letterSpacing: -0.5 }}>{k.v}</div>
            <div style={{ fontSize: 11.5, color: c.t4, marginTop: 5, lineHeight: 1.35 }}>{k.l}</div>
          </div>
        ))}
      </div>

      <div style={{ padding: '16px 24px 0' }}>
        <div style={{ background: c.white, border: '1px solid ' + c.b1, borderRadius: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '13px 18px', borderBottom: '1px solid ' + c.b2, borderRadius: '12px 12px 0 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 18, flex: 'none' }}>
              <span style={{ fontSize: 13.5, fontWeight: 'bold', whiteSpace: 'nowrap' }}>Gantt de demandas</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ ...label, marginRight: 2, whiteSpace: 'nowrap' }}>Squad</span>
                <Select value={filtroSquad} onChange={setFiltroSquad} options={opcoesSquad} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ ...label, marginRight: 2, whiteSpace: 'nowrap' }}>Recurso</span>
                <div style={{ position: 'relative' }}>
                  <svg width="13" height="13" viewBox="0 0 20 20" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                    <circle cx="8.5" cy="8.5" r="6.5" stroke={c.t5} strokeWidth="1.6" fill="none" />
                    <path d="M13.2 13.2L18 18" stroke={c.t5} strokeWidth="1.6" strokeLinecap="round" />
                  </svg>
                  <input
                    type="text"
                    value={buscaRecurso}
                    onChange={(e) => setBuscaRecurso(e.target.value)}
                    placeholder="Buscar por nome"
                    style={{
                      font: 'inherit', fontSize: 12, color: c.t1, background: c.white, width: 150,
                      border: '1px solid ' + c.b1, borderRadius: 8, padding: '6px 10px 6px 30px',
                    }}
                  />
                  {buscaRecurso && (
                    <button type="button" aria-label="Limpar busca" onClick={() => setBuscaRecurso('')} style={{
                      font: 'inherit', position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)',
                      width: 18, height: 18, borderRadius: '50%', border: 'none', background: c.s2, color: c.t4,
                      fontSize: 11, lineHeight: 1, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>✕</button>
                  )}
                </div>
              </div>
              {(filtroSquad || buscaRecurso) && (
                <button type="button" onClick={() => { setFiltroSquad(''); setBuscaRecurso(''); }} style={{ font: 'inherit', fontSize: 12, fontWeight: 'bold', color: c.tealDark, background: 'none', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}>Limpar</button>
              )}
            </div>
            <div style={{ display: 'flex', gap: 6, background: c.s2, border: '1px solid ' + c.b1, borderRadius: 8, padding: 3, flex: 'none' }}>
              {ESCALAS.map((e) => (
                <button key={e} type="button" onClick={() => setEscala(e)} style={{
                  font: 'inherit', fontSize: 12, fontWeight: 'bold', cursor: 'pointer', borderRadius: 6, padding: '5px 12px',
                  color: escala === e ? c.t1 : c.t4, background: escala === e ? c.white : 'transparent',
                  border: '1px solid ' + (escala === e ? c.b1 : 'transparent'), whiteSpace: 'nowrap',
                }}>{e}</button>
              ))}
            </div>
          </div>

          <div style={{ overflowX: 'auto', borderRadius: '0 0 12px 12px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '340px auto', background: c.s1, borderBottom: '1px solid ' + c.b2 }}>
              <div style={{ ...label, padding: '10px 16px', borderRight: '1px solid ' + c.b2, position: 'sticky', left: 0, background: c.s1, zIndex: 2 }}>Pessoa / demanda</div>
              <div style={colGrid}>
                {buckets.map((b, i) => (
                  <div key={b.id} style={{ position: 'relative', padding: '8px 0 7px', textAlign: 'center', borderLeft: '1px solid #EFF0F2', background: i === bucketAtual ? c.tealBg : fds[i] ? c.b2 : 'transparent' }}>
                    <div style={{ fontSize: 10, fontWeight: 'bold', color: i === bucketAtual ? c.tealText : fds[i] ? c.t5 : c.t3 }}>{b.id}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: 1 }}>
                      <span style={{ fontSize: 7.5, fontWeight: 'bold', color: c.t5 }}>M</span>
                      <span style={{ fontSize: 7.5, fontWeight: 'bold', color: c.t5 }}>T</span>
                    </div>
                    <DivisorTurno />
                  </div>
                ))}
              </div>
            </div>

            {porDev.map(({ dev, itens, horas, capPeriodo, pct }) => (
              <div key={dev.id}>
                <div style={{ display: 'grid', gridTemplateColumns: '340px auto', borderBottom: '1px solid ' + c.b3, background: c.s1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 16px', borderRight: '1px solid ' + c.b2, minHeight: 48, position: 'sticky', left: 0, background: c.s1, zIndex: 2 }}>
                    <Avatar iniciais={dev.iniciais} bg={dev.tipo === 'po' ? c.amberText : c.ink} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 'bold' }}>{dev.nome}</div>
                      <div style={{ fontSize: 10.5, color: c.t5, marginTop: 2 }}>{dev.tipo === 'po' ? 'PO · ' : ''}{dev.papel}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 11, fontWeight: 'bold', color: corOcupacao(pct), marginBottom: 3 }}>{horas.toFixed(0)} / {capPeriodo} h</div>
                      <Barra pct={pct * 100} cor={corOcupacao(pct)} largura={66} />
                    </div>
                  </div>
                  <div style={{ position: 'relative', ...colGrid, minHeight: 48 }}>
                    {buckets.map((b, i) => <div key={b.id} style={{ position: 'relative', borderLeft: '1px solid ' + c.b3, background: fundoCol(i) }}><DivisorTurno /></div>)}
                    {/* Resumo da pessoa: faixa fina nos turnos já ocupados (vazio = turno livre). */}
                    {trechosVisiveis(alocacoes.filter((a) => a.devId === dev.id).flatMap((a) => a.turnos || [])).map(([a, b]) => (
                      <div key={a} style={{
                        position: 'absolute', top: '50%', height: 8, transform: 'translateY(-50%)', pointerEvents: 'none', borderRadius: 3,
                        left: 'calc(' + (a / (2 * n)) * 100 + '% + 2px)', width: 'calc(' + ((b - a + 1) / (2 * n)) * 100 + '% - 4px)',
                        background: c.heatFree,
                      }} />
                    ))}
                  </div>
                </div>

                {itens.map((aloc) => {
                  const st = STATUS[aloc.status];
                  const ativa = aloc.id === selId;
                  const orcamento = aloc.tipoAlocacao === 'orcamento';
                  // Barra cortada nas bordas do período (pode começar antes ou terminar depois).
                  const ini = Math.max(0, aloc.bucketInicio);
                  const fim = Math.min(n, aloc.bucketInicio + aloc.duracaoBuckets);
                  const fundoLinha = ativa ? '#F7FCFC' : c.white;
                  return (
                    <div key={aloc.id} style={{ display: 'grid', gridTemplateColumns: '340px auto', borderBottom: '1px solid ' + c.b3, background: fundoLinha }}>
                      <div onClick={() => selecionar(aloc.id)} title="Clique para editar" style={{
                        display: 'flex', alignItems: 'center', gap: 10, padding: '9px 16px 9px 20px', minHeight: 44, cursor: 'pointer',
                        borderRight: '1px solid ' + c.b2, boxShadow: ativa ? 'inset 3px 0 0 ' + c.teal : 'none',
                        position: 'sticky', left: 0, background: fundoLinha, zIndex: 2,
                      }}>
                        <div style={{ width: 3, height: 20, borderRadius: 2, background: st.color, flex: 'none' }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: ativa ? 'bold' : 'normal', color: c.t2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{aloc.titulo}</div>
                          <div style={{ fontSize: 10.5, color: c.t5, marginTop: 2 }}>{aloc.ticketId} · {orcamento ? 'Pré-orçamento' : aloc.tipo}</div>
                        </div>
                        <div style={{ textAlign: 'right' }} title={aloc.horasApontadas + ' h apontadas de ' + aloc.horasEstimadas + ' h'}>
                          <div style={{ fontSize: 11, fontWeight: 'bold', color: c.t3 }}>{aloc.horasEstimadas} h</div>
                          <div style={{ marginTop: 3 }}>
                            <Barra pct={aloc.horasEstimadas ? (aloc.horasApontadas / aloc.horasEstimadas) * 100 : 0} cor={st.border} altura={3} largura={34} />
                          </div>
                        </div>
                      </div>
                      <div onClick={() => selecionar(aloc.id)} style={{ position: 'relative', ...colGrid, minHeight: 44, cursor: 'pointer' }}>
                        {buckets.map((b, i) => (
                          <div key={b.id} style={{
                            position: 'relative',
                            borderLeft: '1px solid ' + c.b3,
                            background: ativa
                              ? (i >= ini && i < fim ? 'rgba(23,169,174,0.10)' : '#FBFEFE')
                              : fundoCol(i),
                          }}><DivisorTurno /></div>
                        ))}
                        {/* Uma barra por trecho contínuo de turnos: cada turno ocupa a sua metade do dia (M | T). */}
                        {trechosVisiveis(aloc.turnos).map(([a, b], k) => (
                          <div key={a} style={{
                            position: 'absolute', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none',
                            left: (a / (2 * n)) * 100 + '%', width: ((b - a + 1) / (2 * n)) * 100 + '%', padding: '0 2px', boxSizing: 'border-box',
                          }}>
                            <div style={{
                              height: 24, borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center',
                              padding: '0 5px', boxSizing: 'border-box', overflow: 'hidden',
                              background: st.bg,
                              border: (ativa ? 2 : 1) + 'px ' + (orcamento ? 'dashed ' : 'solid ') + st.border,
                              boxShadow: ativa ? '0 2px 8px rgba(23,169,174,0.35)' : 'none',
                            }}>
                              {(k === 0 || b - a >= 2) && (
                                <span style={{ fontSize: 10, fontWeight: 'bold', color: st.fg, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{aloc.ticketId}</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
            {!porDev.length && (
              <div style={{ padding: 32, textAlign: 'center', fontSize: 12, color: c.t5 }}>Nenhum recurso encontrado para esse filtro.</div>
            )}
          </div>

        </div>
      </div>

      {selecionada && (
        <FaixaEdicao
          aloc={selecionada}
          pessoa={devs.find((d) => d.id === selecionada.devId)}
          inicioPeriodo={buckets[0].inicio}
          onStatus={(status) => onAtualizar(selecionada.id, { status })}
          onApontadas={(horasApontadas) => onAtualizar(selecionada.id, { horasApontadas })}
          onRemarcar={() => onRemarcar(selecionada)}
          onExcluir={async () => { await onExcluir(selecionada.id); setSelId(null); }}
          onFechar={() => setSelId(null)}
        />
      )}
    </div>
  );
}
