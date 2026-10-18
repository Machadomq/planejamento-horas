import React, { useMemo, useState } from 'react';
import { c, label, PRIORIDADE_COR } from '../theme.js';
import { Avatar, Barra, Chip, Modal, Stepper } from '../components/ui.jsx';
import { capacidadeBucket, corOcupacao, validarJanela, cargaDev, ehFimDeSemana } from '../lib/capacidade.js';

const DISTRIBUICOES = [
  { key: 'linear', label: 'Linear' },
  { key: 'manual', label: 'Manual' },
];

const PASSO_MANUAL = 4;

export default function PlanejarOrcamento({ ticket, pos, buckets, alocacoesOrcamento, onCancelar, onConfirmar }) {
  const n = buckets.length;
  const [poId, setPoId] = useState(pos[0].id);
  const [distribuicao, setDistribuicao] = useState('linear');
  const [horas, setHoras] = useState(8);
  const [bucketInicio, setBucketInicio] = useState(0);
  const [duracao, setDuracao] = useState(3);
  const [ancora, setAncora] = useState(null);
  const [manualHoras, setManualHoras] = useState(() => Array(duracao).fill(0));

  const po = pos.find((p) => p.id === poId);
  const somaManual = manualHoras.reduce((a, h) => a + h, 0);
  const saldoManual = horas - somaManual;
  const candidata = { id: '__nova', devId: poId, bucketInicio, duracaoBuckets: duracao, horasEstimadas: horas, distribuicao, pesos: distribuicao === 'manual' ? manualHoras : null };
  const v = useMemo(() => validarJanela(po, alocacoesOrcamento, buckets, candidata),
    [po, alocacoesOrcamento, buckets, poId, bucketInicio, duracao, horas, distribuicao, manualHoras]);

  function clicarSemana(i) {
    if (ehFimDeSemana(buckets[i])) return;
    if (ancora === null) { setAncora(i); setBucketInicio(i); setDuracao(1); setManualHoras([0]); }
    else {
      const a = Math.min(ancora, i), b = Math.max(ancora, i);
      setAncora(null); setBucketInicio(a); setDuracao(b - a + 1); setManualHoras(Array(b - a + 1).fill(0));
    }
  }

  function ajustarManual(indiceAbs, delta) {
    const rel = indiceAbs - bucketInicio;
    setManualHoras((prev) => {
      const atual = prev[rel] || 0;
      if (delta > 0 && somaManual + delta > horas) return prev;
      const novo = [...prev];
      novo[rel] = Math.max(0, atual + delta);
      return novo;
    });
  }

  const colWidth = 42;

  const janelaLabel = duracao === 1
    ? buckets[bucketInicio].id
    : buckets[bucketInicio].id + ' → ' + buckets[Math.min(n - 1, bucketInicio + duracao - 1)].id + ' · ' + duracao + ' dias';

  return (
    <Modal largura={760}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24, padding: '18px 22px 16px', borderBottom: '1px solid ' + c.b2 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <span style={{ fontSize: 16.5, fontWeight: 'bold', letterSpacing: -0.2 }}>Planejar orçamento</span>
            <span style={{ fontSize: 10.5, fontWeight: 'bold', color: c.amberText, background: c.amberBg, border: '1px solid ' + c.amberBorder, borderRadius: 20, padding: '3px 9px' }}>{ticket.codigo}</span>
          </div>
        </div>
        <button type="button" aria-label="Fechar" onClick={onCancelar} style={{ font: 'inherit', width: 28, height: 28, borderRadius: 7, border: '1px solid ' + c.b1, background: c.white, color: c.t4, cursor: 'pointer' }}>✕</button>
      </div>

      <div>
        <div style={{ padding: '18px 22px 22px', display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div>
            <div style={label}>Título da demanda</div>
            <div style={{ marginTop: 7, border: '1px solid ' + c.b1, borderRadius: 8, padding: '10px 12px', fontSize: 13.5, display: 'flex', alignItems: 'center', gap: 9 }}>
              <span style={{ width: 3, height: 16, borderRadius: 2, background: PRIORIDADE_COR[ticket.prioridade], flex: 'none' }} />
              {ticket.titulo}
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <div style={label}>PO responsável</div>
              <div style={{ fontSize: 11, color: c.t5 }}>Agenda já planejada em {buckets[0].id}–{buckets[n - 1].id}</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8, marginTop: 9 }}>
              {pos.map((p) => {
                const on = p.id === poId;
                const carga = cargaDev(alocacoesOrcamento, p.id, buckets);
                const capPeriodo = buckets.reduce((s, b, i) => s + capacidadeBucket(p, i), 0);
                const pct = carga.reduce((s, h) => s + h, 0) / capPeriodo;
                return (
                  <button key={p.id} type="button" onClick={() => setPoId(p.id)} style={{
                    font: 'inherit', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
                    border: '1px solid ' + (on ? c.amber : c.b1), background: on ? c.amberBg : c.white,
                    borderRadius: 9, padding: '10px 11px',
                  }}>
                    <Avatar iniciais={p.iniciais} tamanho={28} bg={on ? c.amberText : c.ink} />
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: 'block', fontSize: 12, fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.nome}</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                        <Barra pct={pct * 100} cor={corOcupacao(pct)} />
                        <span style={{ fontSize: 10.5, fontWeight: 'bold', color: corOcupacao(pct) }}>{Math.round(pct * 100)}%</span>
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <div style={label}>Janela para elaborar o orçamento</div>
              <div style={{ fontSize: 11.5, color: c.t3 }}>
                {ancora !== null ? 'Agora clique no dia final' : 'Clique em um dia para o início e em outro para o fim'} · <strong style={{ color: c.amberText }}>{janelaLabel}</strong>
              </div>
            </div>
            <div style={{ border: '1px solid ' + c.b1, borderRadius: 10, overflow: 'auto', marginTop: 9 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(' + n + ', minmax(' + colWidth + 'px, 1fr))', minWidth: n * colWidth, background: c.s1, borderBottom: '1px solid ' + c.b2 }}>
                {buckets.map((b, i) => {
                  const dentro = i >= bucketInicio && i < bucketInicio + duracao;
                  const fds = ehFimDeSemana(b);
                  return (
                    <div key={b.id} onClick={() => clicarSemana(i)} style={{ padding: '10px 0 9px', textAlign: 'center', borderLeft: '1px solid #EFF0F2', cursor: fds ? 'not-allowed' : 'pointer', background: fds ? c.b2 : dentro ? c.amberBg : ancora === i ? c.tealBg : 'transparent' }}>
                      <div style={{ fontSize: 11.5, fontWeight: 'bold', color: fds ? c.t5 : dentro ? c.amberText : c.t3 }}>{b.id}</div>
                    </div>
                  );
                })}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(' + n + ', minmax(' + colWidth + 'px, 1fr))', minWidth: n * colWidth }}>
                {buckets.map((b, i) => {
                  const dentro = i >= bucketInicio && i < bucketInicio + duracao;
                  const inicioSel = dentro && i === bucketInicio;
                  const fimSel = dentro && i === bucketInicio + duracao - 1;
                  const fds = ehFimDeSemana(b);
                  const cap = capacidadeBucket(po, i);
                  const total = v.total[i];
                  const pct = total / cap;
                  return (
                    <div key={b.id} onClick={() => clicarSemana(i)} style={{
                      borderLeft: '1px solid ' + c.b3, borderTop: dentro ? '2px solid ' + c.amber : '2px solid transparent',
                      borderBottom: dentro ? '2px solid ' + c.amber : '2px solid transparent',
                      padding: '10px 6px 11px', cursor: fds ? 'not-allowed' : 'pointer',
                      display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center', justifyContent: fds ? 'center' : 'flex-start',
                      background: fds ? 'repeating-linear-gradient(135deg, ' + c.s2 + ', ' + c.s2 + ' 6px, ' + c.b3 + ' 6px, ' + c.b3 + ' 12px)' : dentro ? 'rgba(232,180,0,0.09)' : c.white,
                      borderTopLeftRadius: inicioSel ? 8 : 0, borderBottomLeftRadius: inicioSel ? 8 : 0,
                      borderTopRightRadius: fimSel ? 8 : 0, borderBottomRightRadius: fimSel ? 8 : 0,
                    }}>
                      {fds ? (
                        <span style={{ fontSize: 13, fontWeight: 'bold', color: c.b4 }}>—</span>
                      ) : dentro && distribuicao === 'manual' ? (
                        <>
                          <div style={{ width: '100%', borderRadius: 7, display: 'flex', flexDirection: 'column', alignItems: 'stretch', background: c.amberBg, border: '1px solid ' + c.amber, overflow: 'hidden' }}>
                            <button type="button" onClick={(e) => { e.stopPropagation(); ajustarManual(i, PASSO_MANUAL); }} disabled={saldoManual < PASSO_MANUAL} style={{ font: 'inherit', width: '100%', height: 22, borderRadius: 0, border: 'none', borderBottom: '1px solid ' + c.amberBorder, background: c.white, color: c.amberText, fontWeight: 'bold', fontSize: 14, lineHeight: '20px', cursor: 'pointer', padding: 0 }}>+</button>
                            <span style={{ fontSize: 12.5, fontWeight: 'bold', color: c.amberText, textAlign: 'center', padding: '4px 0' }}>{manualHoras[i - bucketInicio] || 0}h</span>
                            <button type="button" onClick={(e) => { e.stopPropagation(); ajustarManual(i, -PASSO_MANUAL); }} disabled={!manualHoras[i - bucketInicio]} style={{ font: 'inherit', width: '100%', height: 22, borderRadius: 0, border: 'none', borderTop: '1px solid ' + c.amberBorder, background: c.white, color: c.amberText, fontWeight: 'bold', fontSize: 14, lineHeight: '20px', cursor: 'pointer', padding: 0 }}>−</button>
                          </div>
                          <Barra pct={pct * 100} cor={total ? corOcupacao(pct) : c.b3} altura={6} fundo={c.b3} />
                          <div style={{ fontSize: 10.5, fontWeight: 'bold', color: pct > 1 ? c.red : c.t5 }}>{total.toFixed(0)}/{cap} h</div>
                        </>
                      ) : (
                        <>
                          <div style={{ width: '100%', height: 30, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', background: dentro ? c.amberBg : c.s3, border: '1px solid ' + (dentro ? c.amber : c.b2) }}>
                            <span style={{ fontSize: 11, fontWeight: 'bold', color: dentro ? c.amberText : c.b4 }}>{dentro ? v.nova[i].toFixed(0) + ' h' : '—'}</span>
                          </div>
                          <Barra pct={pct * 100} cor={total ? corOcupacao(pct) : c.b3} altura={6} fundo={c.b3} />
                          <div style={{ fontSize: 10.5, fontWeight: 'bold', color: pct > 1 ? c.red : c.t5 }}>{total.toFixed(0)}/{cap} h</div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'end' }}>
            <div>
              <div style={label}>Horas para elaborar o orçamento</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 7, flexWrap: 'wrap' }}>
                <Stepper valor={horas} onChange={setHoras} />
              </div>
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                <div style={label}>Distribuição das horas</div>
                {distribuicao === 'manual' && (
                  <span style={{ fontSize: 11, fontWeight: 'bold', color: saldoManual === 0 ? c.green : saldoManual < 0 ? c.red : c.t4 }}>
                    {saldoManual === 0 ? 'Tudo distribuído' : saldoManual < 0 ? 'Excedeu em ' + Math.abs(saldoManual) + ' h' : 'Faltam ' + saldoManual + ' h'}
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', gap: 6, marginTop: 7 }}>
                {DISTRIBUICOES.map((d) => <Chip key={d.key} ativo={distribuicao === d.key} onClick={() => setDistribuicao(d.key)}>{d.label}</Chip>)}
              </div>
            </div>
          </div>
        </div>

        <div style={{ borderTop: '1px solid ' + c.b2, background: c.s1, padding: '14px 22px', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button type="button" onClick={onCancelar} style={{ font: 'inherit', fontSize: 12, fontWeight: 'bold', color: c.t4, background: 'none', border: 'none', borderRadius: 8, padding: '10px 14px', cursor: 'pointer' }}>Cancelar</button>
          <button type="button" onClick={() => onConfirmar({
            ticketId: ticket.id, poId, bucketInicio, duracaoBuckets: duracao, horasEstimadas: horas,
            distribuicao, pesos: distribuicao === 'manual' ? manualHoras : null,
            notificarEnvolvidos: false, confirmarEstouro: v.nivel === 'estouro',
          })} style={{ font: 'inherit', fontSize: 13, fontWeight: 'bold', color: '#3D2F00', background: c.amber, border: 'none', borderRadius: 8, padding: '10px 18px', cursor: 'pointer' }}>
            {v.nivel === 'estouro' ? 'Planejar mesmo com estouro' : 'Planejar orçamento'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
