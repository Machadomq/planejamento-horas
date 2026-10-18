import React, { useState } from 'react';
import GanttHoras from './screens/GanttHoras.jsx';
import TicketsAPlanejar from './screens/TicketsAPlanejar.jsx';
import PlanejarDemanda from './screens/PlanejarDemanda.jsx';
import PlanejarOrcamento from './screens/PlanejarOrcamento.jsx';
import * as mock from './data/mock.js';
import { restaurarExemplos } from './data/api.js';

let seq = 1;

// PROVISÓRIO (etapa c): testa a gravação dos exemplos no banco. Sai na etapa d.
function BotaoCarregarExemplos() {
  const [ocupado, setOcupado] = useState(false);
  async function carregar() {
    if (!window.confirm('Isso APAGA tudo que estiver no banco e grava os dados de exemplo. Continuar?')) return;
    setOcupado(true);
    try {
      const n = await restaurarExemplos();
      window.alert('Exemplos gravados: ' + n.pessoas + ' pessoas, ' + n.atividades + ' atividades, ' + n.alocacoes + ' alocações.');
    } catch (e) {
      window.alert(e.message);
    } finally {
      setOcupado(false);
    }
  }
  return (
    <button type="button" onClick={carregar} disabled={ocupado} style={{
      position: 'fixed', right: 20, bottom: 20, zIndex: 30, font: 'inherit', fontSize: 12, fontWeight: 'bold',
      color: '#fff', background: '#12161A', border: 'none', borderRadius: 8, padding: '10px 14px', cursor: 'pointer',
      boxShadow: '0 6px 18px rgba(0,0,0,0.25)',
    }}>{ocupado ? 'Gravando…' : 'Carregar exemplos no banco (provisório)'}</button>
  );
}
let seqOrcamento = 1;

export default function App() {
  // Substituir por dados de /planejamento/gantt e /planejamento/tickets (aprovados + pré-orçamento).
  const [alocacoes, setAlocacoes] = useState(mock.alocacoes);
  const [tickets, setTickets] = useState(mock.tickets);
  const [alocacoesOrcamento, setAlocacoesOrcamento] = useState([]);
  const [fila, setFila] = useState(false);
  const [pendentes, setPendentes] = useState([]);
  const [orcamentosPendentes, setOrcamentosPendentes] = useState([]);

  // PATCH /planejamento/alocacoes/:id — otimista, com rollback em erro.
  const patch = (id, campos) =>
    setAlocacoes((as) => as.map((a) => (a.id === id ? { ...a, ...campos, versao: a.versao + 1 } : a)));

  // POST /planejamento/alocacoes
  function confirmar(payload) {
    const ticket = tickets.find((t) => t.id === payload.ticketId);
    const id = 'alc_novo_' + seq++;
    setAlocacoes((as) => as.concat({
      id, ticketId: ticket.id, titulo: ticket.titulo, tipo: payload.tipo, devId: payload.devId,
      bucketInicio: payload.bucketInicio, duracaoBuckets: payload.duracaoBuckets,
      horasEstimadas: payload.horasEstimadas, horasApontadas: 0,
      distribuicao: payload.distribuicao, pesos: payload.pesos, status: payload.status, versao: 1,
    }));
    setTickets((ts) => ts.map((t) => (t.id === ticket.id ? { ...t, alocacaoId: id } : t)));
    setPendentes((p) => p.slice(1));
  }

  // POST /planejamento/orcamentos — agenda o PO para elaborar o pré-orçamento do ticket.
  function confirmarOrcamento(payload) {
    const id = 'orc_' + seqOrcamento++;
    setAlocacoesOrcamento((as) => as.concat({
      id, devId: payload.poId, bucketInicio: payload.bucketInicio, duracaoBuckets: payload.duracaoBuckets,
      horasEstimadas: payload.horasEstimadas, distribuicao: payload.distribuicao, pesos: payload.pesos, versao: 1,
    }));
    setTickets((ts) => ts.map((t) => (t.id === payload.ticketId ? { ...t, orcamentoPlanejadoId: id } : t)));
    setOrcamentosPendentes((p) => p.slice(1));
  }

  return (
    <>
      <BotaoCarregarExemplos />
      <GanttHoras
        buckets={mock.buckets}
        bucketAtual={mock.bucketAtual}
        devs={mock.devs}
        alocacoes={alocacoes}
        onPatch={patch}
        onAbrirFila={() => setFila(true)}
      />

      {fila && !pendentes.length && !orcamentosPendentes.length && (
        <TicketsAPlanejar
          tickets={tickets}
          onFechar={() => setFila(false)}
          onPlanejar={(sel) => { setPendentes(sel.map((t) => t.id)); setFila(false); }}
          onPlanejarOrcamento={(sel) => { setOrcamentosPendentes(sel.map((t) => t.id)); setFila(false); }}
        />
      )}

      {pendentes.length > 0 && (
        <PlanejarDemanda
          key={pendentes[0]}
          ticket={tickets.find((t) => t.id === pendentes[0])}
          devs={mock.devs}
          buckets={mock.buckets}
          alocacoes={alocacoes}
          onCancelar={() => setPendentes((p) => p.slice(1))}
          onConfirmar={confirmar}
        />
      )}

      {orcamentosPendentes.length > 0 && (
        <PlanejarOrcamento
          key={orcamentosPendentes[0]}
          ticket={tickets.find((t) => t.id === orcamentosPendentes[0])}
          pos={mock.pos}
          buckets={mock.buckets}
          alocacoesOrcamento={alocacoesOrcamento}
          onCancelar={() => setOrcamentosPendentes((p) => p.slice(1))}
          onConfirmar={confirmarOrcamento}
        />
      )}
    </>
  );
}
