import React, { useMemo, useState } from 'react';
import { c, label, PRIORIDADE_COR } from '../theme.js';
import { Checkbox, Modal, Select } from '../components/ui.jsx';
import { brl, dataCurta } from '../lib/formato.js';

const GRID_COMPLETO = '44px minmax(0, 1fr) 170px 130px 146px 150px';
const GRID_SIMPLES = '44px minmax(0, 1fr) 220px 150px';

const MODOS = [
  {
    key: 'aprovado', status: 'aprovado', linkId: 'alocacaoId', mostrarHorasValor: true,
    label: 'Orçamento aprovado', corTexto: c.greenText, corFundo: c.greenBg, corBorda: c.greenBorder,
    descricaoOpcao: 'Fila para alocar o dev no Gantt',
    cardTickets: 'Tickets com orçamento aprovado sem alocação',
    cardHoras: 'Horas aprovadas a distribuir',
    cardValor: 'Valor aprovado na fila',
    colHoras: 'Horas aprov.', colValor: 'Orçamento', colPrazo: 'Prazo acordado',
    rotuloData: 'aprovado', rotuloVazio: 'Nenhum ticket aprovado nesta fila.',
    rotuloSelecao: 'Marque os tickets que entram no próximo ciclo de planejamento',
    botao: (n) => (n > 1 ? 'Planejar ' + n + ' tickets no Gantt' : 'Planejar no Gantt'),
  },
  {
    key: 'pre_orcamento', status: 'pre_orcamento', linkId: 'orcamentoPlanejadoId', mostrarHorasValor: false,
    label: 'Pré-orçamento a fazer', corTexto: c.amberText, corFundo: c.amberBg, corBorda: c.amberBorder,
    descricaoOpcao: 'Fila para o PO planejar a elaboração do orçamento',
    subtitulo: 'Tickets sem orçamento aprovado ainda. Selecione um ou mais para planejar a elaboração do pré-orçamento com um PO.',
    cardTickets: 'Tickets aguardando pré-orçamento',
    colPrazo: 'Prazo solicitado',
    rotuloData: 'aberto', rotuloVazio: 'Nenhum ticket aguardando pré-orçamento.',
    rotuloSelecao: 'Marque os tickets que precisam de pré-orçamento para o PO planejar',
    resumoSelecao: 'Horas e valor serão definidos depois — pelo PO no orçamento e pelo dev no planejamento do Gantt.',
    botao: (n) => (n > 1 ? 'Planejar orçamento de ' + n + ' tickets' : 'Planejar orçamento'),
  },
];

export default function TicketsAPlanejar({ tickets, onFechar, onPlanejar, onPlanejarOrcamento }) {
  const [modoKey, setModoKey] = useState('aprovado');
  const [sel, setSel] = useState([]);

  const modo = MODOS.find((m) => m.key === modoKey);

  function trocarModo(key) {
    setModoKey(key); setSel([]);
  }

  // Fila = status do modo selecionado e ainda sem planejamento. O back-end também aplica a regra.
  const fila = useMemo(() => tickets
    .filter((t) => t.statusOrcamento === modo.status && !t[modo.linkId]), [tickets, modo]);

  // Sem prazo vai para o fim da lista.
  const visiveis = useMemo(() => fila.slice().sort((a, b) => (a.diasParaPrazo ?? Infinity) - (b.diasParaPrazo ?? Infinity)), [fila]);

  const urgente = (t) => t.diasParaPrazo !== null && t.diasParaPrazo <= 10;
  const totais = useMemo(() => ({
    tickets: fila.length,
    horas: fila.reduce((s, t) => s + t.orcamento.horasAprovadas, 0),
    valor: fila.reduce((s, t) => s + t.orcamento.valorAprovadoCentavos, 0),
    urgentes: fila.filter(urgente).length,
  }), [fila]);

  const cards = modo.mostrarHorasValor
    ? [
        { v: String(totais.tickets), l: modo.cardTickets, cor: c.t1 },
        { v: totais.horas + ' h', l: modo.cardHoras, cor: c.t1 },
        { v: brl(totais.valor), l: modo.cardValor, cor: modo.corTexto },
        { v: String(totais.urgentes), l: 'Com prazo em até 10 dias', cor: totais.urgentes ? c.red : c.green },
      ]
    : [
        { v: String(totais.tickets), l: modo.cardTickets, cor: c.t1 },
        { v: String(totais.urgentes), l: 'Com prazo em até 10 dias', cor: totais.urgentes ? c.red : c.green },
      ];

  const grid = modo.mostrarHorasValor ? GRID_COMPLETO : GRID_SIMPLES;

  const selObjs = fila.filter((t) => sel.includes(t.id));
  const horasSel = selObjs.reduce((s, t) => s + t.orcamento.horasAprovadas, 0);
  const valorSel = selObjs.reduce((s, t) => s + t.orcamento.valorAprovadoCentavos, 0);
  const todos = visiveis.length > 0 && visiveis.every((t) => sel.includes(t.id));

  const toggle = (id) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : s.concat(id)));
  const toggleTodos = () => setSel((s) => (todos
    ? s.filter((id) => !visiveis.some((t) => t.id === id))
    : Array.from(new Set(s.concat(visiveis.map((t) => t.id))))));

  const cabecalho = { ...label, textAlign: 'right', paddingRight: 10 };

  return (
    <Modal largura={1280}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24, padding: '18px 22px 16px', borderBottom: '1px solid ' + c.b2 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <span style={{ fontSize: 16.5, fontWeight: 'bold', letterSpacing: -0.2 }}>Tickets a planejar</span>
            <Select
              value={modoKey}
              onChange={trocarModo}
              options={MODOS.map((m) => ({ key: m.key, label: m.label, corTexto: m.corTexto, corFundo: m.corFundo, corBorda: m.corBorda, descricao: m.descricaoOpcao }))}
            />
          </div>
          <div style={{ fontSize: 11.5, color: c.t4, marginTop: 5 }}>{modo.subtitulo}</div>
        </div>
        <button type="button" aria-label="Fechar" onClick={onFechar} style={{ font: 'inherit', width: 28, height: 28, borderRadius: 7, border: '1px solid ' + c.b1, background: c.white, color: c.t4, cursor: 'pointer' }}>✕</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(' + cards.length + ', minmax(0, 1fr))', background: c.s1, borderBottom: '1px solid ' + c.b2 }}>
        {cards.map((x) => (
          <div key={x.l} style={{ padding: '13px 18px', borderRight: '1px solid ' + c.b2 }}>
            <div style={{ fontSize: 19, fontWeight: 'bold', color: x.cor, letterSpacing: -0.4 }}>{x.v}</div>
            <div style={{ fontSize: 11, color: c.t4, marginTop: 4 }}>{x.l}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: grid, alignItems: 'center', padding: '9px 18px', background: c.s1, borderBottom: '1px solid ' + c.b2 }}>
        <Checkbox checked={todos} onChange={toggleTodos} />
        <div style={label}>Ticket / demanda</div>
        <div style={label}>Solicitante</div>
        {modo.mostrarHorasValor && <div style={cabecalho}>{modo.colHoras}</div>}
        {modo.mostrarHorasValor && <div style={cabecalho}>{modo.colValor}</div>}
        <div style={cabecalho}>{modo.colPrazo}</div>
      </div>

      <div style={{ maxHeight: 460, overflowY: 'auto' }}>
        {visiveis.map((t) => {
          const on = sel.includes(t.id);
          const corPrazo = t.diasParaPrazo === null ? c.t5 : t.diasParaPrazo <= 10 ? c.red : t.diasParaPrazo <= 25 ? c.amberText : c.t3;
          return (
            <div key={t.id} onClick={() => toggle(t.id)} style={{
              display: 'grid', gridTemplateColumns: grid, alignItems: 'center', padding: '12px 18px', cursor: 'pointer',
              borderBottom: '1px solid ' + c.b3, background: on ? '#F7FCFC' : c.white,
              boxShadow: on ? 'inset 3px 0 0 ' + c.teal : 'none',
            }}>
              <Checkbox checked={on} onChange={() => toggle(t.id)} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 0, paddingRight: 14 }}>
                <div style={{ width: 3, height: 30, borderRadius: 2, background: PRIORIDADE_COR[t.prioridade], flex: 'none' }} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.titulo}</div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                    <span style={{ fontSize: 11, fontWeight: 'bold', color: c.tealDark }}>{t.codigo}</span>
                    <span style={{ fontSize: 11, color: c.t5 }}>{t.tipo}</span>
                    {!modo.mostrarHorasValor && t.orcamento.aprovadoEm && <span style={{ fontSize: 11, color: c.t5 }}>· {modo.rotuloData} {dataCurta(t.orcamento.aprovadoEm)}</span>}
                  </div>
                </div>
              </div>
              <div style={{ minWidth: 0, paddingRight: 10 }}>
                <div style={{ fontSize: 12, color: c.t2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.solicitante.nome}</div>
                <div style={{ fontSize: 10.5, color: c.t5, marginTop: 3 }}>{t.solicitante.area}</div>
              </div>
              {modo.mostrarHorasValor && (
                <div style={{ textAlign: 'right', paddingRight: 10 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 'bold' }}>{t.orcamento.horasAprovadas} h</div>
                  <div style={{ fontSize: 10.5, color: c.t5, marginTop: 3 }}>≈ {Math.max(1, Math.ceil(t.orcamento.horasAprovadas / 8))} dias úteis</div>
                </div>
              )}
              {modo.mostrarHorasValor && (
                <div style={{ textAlign: 'right', paddingRight: 10 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 'bold', color: modo.corTexto }}>{brl(t.orcamento.valorAprovadoCentavos)}</div>
                  {t.orcamento.aprovadoEm && <div style={{ fontSize: 10.5, color: c.t5, marginTop: 3 }}>{modo.rotuloData} {dataCurta(t.orcamento.aprovadoEm)}</div>}
                </div>
              )}
              <div style={{ textAlign: 'right', paddingRight: 10 }}>
                <div style={{ fontSize: 12.5, fontWeight: 'bold', color: corPrazo }}>{t.prazoAcordado ? dataCurta(t.prazoAcordado) : '—'}</div>
                <div style={{ fontSize: 10.5, color: corPrazo, marginTop: 3 }}>
                  {t.diasParaPrazo === null ? 'sem prazo' : t.diasParaPrazo < 0 ? 'atrasado ' + Math.abs(t.diasParaPrazo) + ' dias' : t.diasParaPrazo + ' dias'}
                </div>
              </div>
            </div>
          );
        })}
        {!visiveis.length && (
          <div style={{ padding: 32, textAlign: 'center', fontSize: 12, color: c.t5 }}>{modo.rotuloVazio}</div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20, padding: '14px 18px', background: c.s1, borderTop: '1px solid ' + c.b2, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontSize: 12.5, fontWeight: 'bold', color: selObjs.length ? c.t1 : c.t5 }}>
            {selObjs.length ? selObjs.length + (selObjs.length > 1 ? ' tickets selecionados' : ' ticket selecionado') : 'Nenhum ticket selecionado'}
          </span>
          <span style={{ fontSize: 11.5, color: c.t4 }}>
            {selObjs.length
              ? (modo.mostrarHorasValor
                  ? horasSel + ' h · ' + brl(valorSel) + ' · ' + (horasSel / 40).toFixed(1) + ' semanas-dev de capacidade'
                  : modo.resumoSelecao)
              : modo.rotuloSelecao}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button type="button" onClick={() => setSel([])} style={{ font: 'inherit', fontSize: 12, fontWeight: 'bold', color: c.t4, background: c.white, border: '1px solid ' + c.b1, borderRadius: 8, padding: '9px 13px', cursor: 'pointer' }}>Limpar seleção</button>
          <button type="button" disabled={!selObjs.length} onClick={() => (modo.key === 'aprovado' ? onPlanejar(selObjs) : onPlanejarOrcamento(selObjs))} style={{
            font: 'inherit', fontSize: 13, fontWeight: 'bold', border: 'none', borderRadius: 8, padding: '10px 18px',
            cursor: selObjs.length ? 'pointer' : 'default',
            color: selObjs.length ? (modo.key === 'aprovado' ? '#0B2223' : '#3D2F00') : c.t5,
            background: selObjs.length ? (modo.key === 'aprovado' ? c.teal : c.amber) : c.b2,
          }}>{modo.botao(selObjs.length)}</button>
        </div>
      </div>
    </Modal>
  );
}
