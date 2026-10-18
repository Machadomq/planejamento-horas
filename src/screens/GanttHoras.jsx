import React, { useMemo, useState } from 'react';
import { c, label, STATUS } from '../theme.js';
import { Avatar, Barra, Select } from '../components/ui.jsx';
import { cargaDev, capacidadeBucket, capacidadeMensal, corOcupacao, ehFimDeSemana } from '../lib/capacidade.js';
const ESCALAS = ['Dia', 'Semana', 'Mês'];

export default function GanttHoras({ buckets, bucketAtual, devs, alocacoes, onPatch, onAbrirFila }) {
  const n = buckets.length;
  const [selId, setSelId] = useState(alocacoes[8] ? alocacoes[8].id : null);
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
    const itens = alocacoes.filter((a) => a.devId === dev.id);
    const horas = carga.slice(bucketAtual, fimJanelaMes).reduce((s, h) => s + h, 0);
    const capPeriodo = capacidadeMensal(dev);
    return { dev, carga, itens, horas, capPeriodo, pct: horas / capPeriodo };
  }), [devsVisiveis, alocacoes, buckets, n, bucketAtual, fimJanelaMes]);

  const kpis = useMemo(() => {
    const idsVisiveis = new Set(devsVisiveis.map((d) => d.id));
    const alocacoesVisiveis = alocacoes.filter((a) => idsVisiveis.has(a.devId));
    const horas = porDev.reduce((s, x) => s + x.horas, 0);
    const cap = porDev.reduce((s, x) => s + x.capPeriodo, 0);
    const apertados = porDev.filter((x) => x.carga.some((h, i) => h / capacidadeBucket(x.dev, i) > 0.85)).length;
    const risco = alocacoesVisiveis.filter((a) => a.status === 'risco').length;
    return [
      { v: Math.round(horas) + ' h', l: 'Horas estimadas nos próximos 30 dias', cor: c.t1 },
      { v: cap + ' h', l: 'Capacidade mensal selecionada (' + devsVisiveis.length + ' devs)', cor: c.t1 },
      { v: (cap ? Math.round((horas / cap) * 100) : 0) + ' %', l: 'Ocupação vs. capacidade mensal', cor: corOcupacao(cap ? horas / cap : 0) },
      { v: String(apertados), l: 'Devs acima de 85% em algum dia', cor: apertados ? c.amber : c.green },
      { v: String(risco), l: 'Demandas em risco', cor: risco ? c.red : c.green },
    ];
  }, [alocacoes, porDev, devsVisiveis]);

  const LARGURA_COL = 64;
  const colGrid = { display: 'grid', gridTemplateColumns: 'repeat(' + n + ', minmax(' + LARGURA_COL + 'px, 1fr))', minWidth: n * LARGURA_COL };
  const fds = useMemo(() => buckets.map(ehFimDeSemana), [buckets]);
  const fundoCol = (i) => (i === bucketAtual ? 'rgba(23,169,174,0.06)' : fds[i] ? 'rgba(17,24,39,0.045)' : i % 2 ? '#FCFCFD' : 'transparent');
  const DivisorTurno = () => (
    <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, borderLeft: '1px dashed ' + c.b4, pointerEvents: 'none' }} />
  );

  return (
    <div style={{ background: c.s2, paddingBottom: 28, minHeight: '100%' }}>
      <header style={{ background: c.ink, padding: '0 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24, padding: '16px 0 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 30, height: 30, borderRadius: 7, background: c.teal, color: '#0B2223', fontSize: 14, fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>S</div>
            <div>
              <div style={{ fontSize: 17, fontWeight: 'bold', color: c.white, letterSpacing: -0.2 }}>Alocação de horas · Demandas dos devs</div>
            </div>
          </div>
          <button type="button" onClick={onAbrirFila} style={{ font: 'inherit', fontSize: 12, fontWeight: 'bold', color: '#0B2223', background: c.teal, border: 'none', borderRadius: 7, padding: '9px 14px', cursor: 'pointer' }}>Tickets a planejar</button>
        </div>
      </header>

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
              <div style={{ ...label, padding: '10px 16px', borderRight: '1px solid ' + c.b2, position: 'sticky', left: 0, background: c.s1, zIndex: 2 }}>Dev / demanda</div>
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
                    <Avatar iniciais={dev.iniciais} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 'bold' }}>{dev.nome}</div>
                      <div style={{ fontSize: 10.5, color: c.t5, marginTop: 2 }}>{dev.papel}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 11, fontWeight: 'bold', color: corOcupacao(pct), marginBottom: 3 }}>{horas.toFixed(0)} / {capPeriodo} h</div>
                      <Barra pct={pct * 100} cor={corOcupacao(pct)} largura={66} />
                    </div>
                  </div>
                  <div style={{ position: 'relative', ...colGrid, minHeight: 48 }}>
                    {buckets.map((b, i) => <div key={b.id} style={{ position: 'relative', borderLeft: '1px solid ' + c.b3, background: fundoCol(i) }}><DivisorTurno /></div>)}
                  </div>
                </div>

                {itens.map((aloc) => {
                  const st = STATUS[aloc.status];
                  const ativa = aloc.id === selId;
                  const fim = Math.min(n, aloc.bucketInicio + aloc.duracaoBuckets);
                  const fundoLinha = ativa ? '#F7FCFC' : c.white;
                  return (
                    <div key={aloc.id} style={{ display: 'grid', gridTemplateColumns: '340px auto', borderBottom: '1px solid ' + c.b3, background: fundoLinha }}>
                      <div onClick={() => setSelId(aloc.id)} style={{
                        display: 'flex', alignItems: 'center', gap: 10, padding: '9px 16px 9px 20px', minHeight: 44, cursor: 'pointer',
                        borderRight: '1px solid ' + c.b2, boxShadow: ativa ? 'inset 3px 0 0 ' + c.teal : 'none',
                        position: 'sticky', left: 0, background: fundoLinha, zIndex: 2,
                      }}>
                        <div style={{ width: 3, height: 20, borderRadius: 2, background: st.color, flex: 'none' }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: ativa ? 'bold' : 'normal', color: c.t2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{aloc.titulo}</div>
                          <div style={{ fontSize: 10.5, color: c.t5, marginTop: 2 }}>{aloc.ticketId} · {aloc.tipo}</div>
                        </div>
                        <div style={{ fontSize: 11, fontWeight: 'bold', color: c.t3 }}>{aloc.horasEstimadas} h</div>
                      </div>
                      <div style={{ position: 'relative', ...colGrid, minHeight: 44 }}>
                        {buckets.map((b, i) => (
                          <div key={b.id} style={{
                            position: 'relative',
                            borderLeft: '1px solid ' + c.b3,
                            background: ativa
                              ? (i >= aloc.bucketInicio && i < fim ? 'rgba(23,169,174,0.10)' : '#FBFEFE')
                              : fundoCol(i),
                          }}><DivisorTurno /></div>
                        ))}
                        <div style={{
                          position: 'absolute', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none',
                          left: (aloc.bucketInicio / n) * 100 + '%', width: (aloc.duracaoBuckets / n) * 100 + '%', padding: '0 4px', boxSizing: 'border-box',
                        }}>
                          <div style={{
                            height: 24, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            gap: 6, padding: '0 8px', boxSizing: 'border-box', overflow: 'hidden',
                            background: st.bg,
                            border: (ativa ? 2 : 1) + 'px solid ' + st.border,
                            boxShadow: ativa ? '0 2px 8px rgba(23,169,174,0.35)' : 'none',
                          }}>
                            <span style={{ fontSize: 10.5, fontWeight: 'bold', color: st.fg, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{aloc.ticketId}</span>
                            <span style={{ fontSize: 10, color: st.fg, opacity: 0.8, whiteSpace: 'nowrap' }}>{aloc.horasEstimadas} h</span>
                          </div>
                          <div style={{ marginTop: 2 }}>
                            <Barra pct={(aloc.horasApontadas / aloc.horasEstimadas) * 100} cor={st.border} altura={3} />
                          </div>
                        </div>
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
    </div>
  );
}
