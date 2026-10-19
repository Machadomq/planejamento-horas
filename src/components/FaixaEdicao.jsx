// Faixa fixa no rodapé do Gantt para editar a alocação selecionada:
// status, horas apontadas, remarcar (abre o modal de planejamento) e excluir.
import React, { useEffect, useState } from 'react';
import { c, label, ORDEM_STATUS, STATUS } from '../theme.js';
import { Alerta, Avatar, Botao, Chip, Stepper } from './ui.jsx';
import { HORAS_TURNO, meioDia } from '../lib/turnos.js';
import { dataCurta } from '../lib/formato.js';
import { somarDias } from '../lib/periodo.js';

export const ALTURA_FAIXA = 96;

/**
 * onStatus(status), onApontadas(horas) e onExcluir() devolvem Promise (rejeitam com mensagem amigável).
 * onRemarcar() abre o modal de planejamento com a alocação.
 */
export default function FaixaEdicao({ aloc, pessoa, inicioPeriodo, onStatus, onApontadas, onRemarcar, onExcluir, onFechar }) {
  const [apontadas, setApontadas] = useState(aloc.horasApontadas);
  const [erro, setErro] = useState(null);
  const [excluindo, setExcluindo] = useState(false);

  // Trocou a seleção: recomeça com os valores da nova alocação.
  useEffect(() => { setApontadas(aloc.horasApontadas); setErro(null); }, [aloc.id]);

  // Horas apontadas: grava 0,6 s depois do último clique (evita uma gravação por clique).
  useEffect(() => {
    if (apontadas === aloc.horasApontadas) return undefined;
    const t = setTimeout(() => {
      onApontadas(apontadas).catch((e) => { setErro(e.message); setApontadas(aloc.horasApontadas); });
    }, 600);
    return () => clearTimeout(t);
  }, [apontadas]);

  function mudarStatus(s) {
    if (s === aloc.status) return;
    setErro(null);
    onStatus(s).catch((e) => setErro(e.message));
  }

  async function excluir() {
    const msg = 'Excluir a alocação de ' + aloc.ticketId + (pessoa ? ' (' + pessoa.nome + ')' : '') + '?\n\n'
      + (aloc.tipoAlocacao === 'orcamento'
        ? 'O ticket volta para a fila "Pré-orçamento a fazer".'
        : 'O ticket volta para a fila "Tickets a planejar".');
    if (!window.confirm(msg)) return;
    setExcluindo(true);
    setErro(null);
    try {
      await onExcluir();
    } catch (e) {
      setErro(e.message);
      setExcluindo(false);
    }
  }

  const ordenados = (aloc.turnos || []).slice().sort((a, b) => meioDia(a) - meioDia(b));
  const primeiro = ordenados[0];
  const ultimo = ordenados[ordenados.length - 1];
  const data = (t) => dataCurta(somarDias(inicioPeriodo, t.indice)) + (t.periodo === 'manha' ? ' manhã' : ' tarde');
  const st = STATUS[aloc.status];

  return (
    <div role="region" aria-label="Editar alocação" style={{
      position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 20, minHeight: ALTURA_FAIXA, boxSizing: 'border-box',
      background: c.white, borderTop: '2px solid ' + c.teal, boxShadow: '0 -8px 24px rgba(12,16,20,0.14)',
      padding: '12px 24px', display: 'flex', flexDirection: 'column', gap: 8,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 22, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 260, flex: '1 1 260px' }}>
          <div style={{ width: 4, height: 36, borderRadius: 2, background: st.color, flex: 'none' }} />
          {pessoa && <Avatar iniciais={pessoa.iniciais} bg={pessoa.tipo === 'po' ? c.amberText : c.ink} />}
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {aloc.ticketId} · {aloc.titulo}
            </div>
            <div style={{ fontSize: 11.5, color: c.t4, marginTop: 3 }}>
              {pessoa ? pessoa.nome : '—'}
              {aloc.tipoAlocacao === 'orcamento' ? ' · Pré-orçamento' : ''}
              {' · '}{aloc.horasEstimadas} h ({(aloc.turnos || []).length} turnos de {HORAS_TURNO} h)
              {primeiro && ' · ' + data(primeiro) + ' → ' + data(ultimo)}
            </div>
          </div>
        </div>

        <div>
          <div style={{ ...label, marginBottom: 5 }}>Status</div>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {ORDEM_STATUS.map((s) => (
              <Chip key={s} ativo={aloc.status === s} onClick={() => mudarStatus(s)} style={{ padding: '5px 9px', fontSize: 11 }}
                corAtiva={{ fg: STATUS[s].fg, bg: STATUS[s].bg, border: STATUS[s].color }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: STATUS[s].color }} />{STATUS[s].label}
              </Chip>
            ))}
          </div>
        </div>

        <div>
          <div style={{ ...label, marginBottom: 5 }}>Horas apontadas</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Stepper valor={apontadas} onChange={setApontadas} passo={1} min={0} />
            <span style={{ fontSize: 11, color: c.t5 }}>de {aloc.horasEstimadas} h</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
          <Botao onClick={onRemarcar}>Remarcar turnos / pessoa</Botao>
          <Botao variante="perigo" onClick={excluir} disabled={excluindo}>{excluindo ? 'Excluindo…' : 'Excluir'}</Botao>
          <button type="button" aria-label="Fechar edição" onClick={onFechar} style={{ font: 'inherit', width: 30, height: 30, borderRadius: 7, border: '1px solid ' + c.b1, background: c.white, color: c.t4, cursor: 'pointer' }}>✕</button>
        </div>
      </div>
      {erro && <Alerta onFechar={() => setErro(null)}>{erro}</Alerta>}
    </div>
  );
}
