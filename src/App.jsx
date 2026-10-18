import React, { useEffect, useMemo, useState } from 'react';
import GanttHoras from './screens/GanttHoras.jsx';
import TicketsAPlanejar from './screens/TicketsAPlanejar.jsx';
import PlanejarDemanda from './screens/PlanejarDemanda.jsx';
import PlanejarOrcamento from './screens/PlanejarOrcamento.jsx';
import { c } from './theme.js';
import Pessoas from './screens/Pessoas.jsx';
import Atividades from './screens/Atividades.jsx';
import {
  atualizarAtividade, atualizarPessoa, carregarTudo, criarAlocacao, criarAtividade, criarPessoa, excluirAtividade,
  excluirPessoa,
} from './data/api.js';
import { alocacaoParaGantt, atividadeParaFila, pessoaParaGantt } from './data/adaptadores.js';
import { bucketsParaDatas, periodoAtual, somarDias } from './lib/periodo.js';

const ABAS = [
  { key: 'gantt', label: 'Gantt' },
  { key: 'pessoas', label: 'Pessoas' },
  { key: 'atividades', label: 'Atividades' },
];

export default function App() {
  const periodo = useMemo(() => periodoAtual(), []);
  const [aba, setAba] = useState('gantt');
  // Dados como vêm de api.js (datas reais). As telas recebem a versão adaptada abaixo.
  const [dados, setDados] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [fila, setFila] = useState(false);
  const [pendentes, setPendentes] = useState([]);
  const [orcamentosPendentes, setOrcamentosPendentes] = useState([]);

  async function carregar() {
    setCarregando(true);
    setErro(null);
    try {
      setDados(await carregarTudo());
    } catch (e) {
      setErro(e.message);
    } finally {
      setCarregando(false);
    }
  }
  useEffect(() => { carregar(); }, []);

  const visao = useMemo(() => {
    if (!dados) return null;
    const atividadesPorId = Object.fromEntries(dados.atividades.map((a) => [a.id, a]));
    // Devs primeiro, depois POs; dentro de cada grupo, por nome (já vem ordenado do banco).
    const pessoas = dados.pessoas.slice().sort((a, b) => (a.tipo === b.tipo ? 0 : a.tipo === 'dev' ? -1 : 1))
      .map((p) => pessoaParaGantt(p, periodo));
    return {
      pessoas,
      devs: pessoas.filter((p) => p.tipo === 'dev'),
      pos: pessoas.filter((p) => p.tipo === 'po'),
      alocacoes: dados.alocacoes.map((a) => alocacaoParaGantt(a, atividadesPorId, periodo)),
      tickets: dados.atividades.map((at) => atividadeParaFila(at, dados.alocacoes, periodo.hoje)),
    };
  }, [dados, periodo]);

  const alocacoesPorPessoa = useMemo(() => {
    const n = {};
    if (dados) dados.alocacoes.forEach((a) => { n[a.pessoaId] = (n[a.pessoaId] || 0) + 1; });
    return n;
  }, [dados]);

  // Grava no banco primeiro; a tela só muda se deu certo (em erro, o formulário continua aberto).
  async function salvarPessoa(campos, id) {
    const salva = id ? await atualizarPessoa(id, campos) : await criarPessoa(campos);
    setDados((d) => ({
      ...d,
      pessoas: (id ? d.pessoas.map((p) => (p.id === id ? salva : p)) : d.pessoas.concat(salva))
        .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
    }));
  }

  async function removerPessoa(id) {
    await excluirPessoa(id);
    setDados((d) => ({ ...d, pessoas: d.pessoas.filter((p) => p.id !== id) }));
  }

  async function salvarAtividade(campos, id) {
    const salva = id ? await atualizarAtividade(id, campos) : await criarAtividade(campos);
    setDados((d) => ({
      ...d,
      atividades: (id ? d.atividades.map((a) => (a.id === id ? salva : a)) : d.atividades.concat(salva))
        .sort((a, b) => a.codigo.localeCompare(b.codigo, 'pt-BR')),
    }));
  }

  /** O banco apaga junto as alocações (ON DELETE CASCADE); a tela faz o mesmo. */
  async function removerAtividade(id) {
    await excluirAtividade(id);
    setDados((d) => ({
      ...d,
      atividades: d.atividades.filter((a) => a.id !== id),
      alocacoes: d.alocacoes.filter((a) => a.atividadeId !== id),
    }));
  }

  /** Grava a alocação no banco; só então ela entra na tela. Em erro, o modal continua aberto. */
  async function adicionarAlocacao(payload, tipo, pessoaId) {
    try {
      const nova = await criarAlocacao({
        atividadeId: payload.ticketId, pessoaId, tipo,
        ...bucketsParaDatas(payload.bucketInicio, payload.duracaoBuckets, periodo.inicio),
        turnos: payload.turnos.map((t) => ({ data: somarDias(periodo.inicio, t.indice), periodo: t.periodo })),
        horasApontadas: 0, distribuicao: payload.distribuicao, status: payload.status || 'planejada',
      });
      setDados((d) => ({ ...d, alocacoes: d.alocacoes.concat(nova) }));
    } catch (e) {
      // UNIQUE(atividade_id, tipo): o ticket já foi planejado (ex.: em outra aba do navegador).
      if (e.codigo === 'duplicado') {
        throw new Error('Este ticket já foi planejado. Recarregue a página (F5) para ver a versão atual.');
      }
      throw e;
    }
  }

  async function confirmar(payload) {
    await adicionarAlocacao(payload, 'execucao', payload.devId);
    setPendentes((p) => p.slice(1));
  }

  async function confirmarOrcamento(payload) {
    await adicionarAlocacao(payload, 'orcamento', payload.poId);
    setOrcamentosPendentes((p) => p.slice(1));
  }

  return (
    <div style={{ minHeight: '100vh', background: c.s2 }}>
      <header style={{ background: c.ink, padding: '0 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24, padding: '14px 0 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 30, height: 30, borderRadius: 7, background: c.teal, color: '#0B2223', fontSize: 14, fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>S</div>
            <div style={{ fontSize: 17, fontWeight: 'bold', color: c.white, letterSpacing: -0.2 }}>Alocação de horas · Demandas dos devs</div>
          </div>
          {aba === 'gantt' && visao && (
            <button type="button" onClick={() => setFila(true)} style={{ font: 'inherit', fontSize: 12, fontWeight: 'bold', color: '#0B2223', background: c.teal, border: 'none', borderRadius: 7, padding: '9px 14px', cursor: 'pointer' }}>Tickets a planejar</button>
          )}
        </div>
        <nav style={{ display: 'flex', gap: 4, marginTop: 10 }}>
          {ABAS.map((a) => {
            const on = a.key === aba;
            return (
              <button key={a.key} type="button" onClick={() => setAba(a.key)} style={{
                font: 'inherit', fontSize: 13, fontWeight: 'bold', cursor: 'pointer', background: 'none', border: 'none',
                color: on ? c.white : c.t5, padding: '10px 14px 11px',
                borderBottom: '3px solid ' + (on ? c.teal : 'transparent'),
              }}>{a.label}</button>
            );
          })}
        </nav>
      </header>

      {carregando && !visao && <Aviso texto="Carregando dados do banco…" />}

      {erro && !visao && (
        <Aviso texto={erro} cor={c.redText}>
          <button type="button" onClick={carregar} style={{ font: 'inherit', fontSize: 12, fontWeight: 'bold', color: '#0B2223', background: c.teal, border: 'none', borderRadius: 7, padding: '9px 14px', cursor: 'pointer', marginTop: 14 }}>Tentar de novo</button>
        </Aviso>
      )}

      {visao && aba === 'gantt' && (
        <GanttHoras
          buckets={periodo.buckets}
          bucketAtual={periodo.bucketAtual}
          devs={visao.pessoas}
          alocacoes={visao.alocacoes}
        />
      )}

      {visao && aba === 'pessoas' && (
        <Pessoas
          pessoas={visao.pessoas}
          alocacoesPorPessoa={alocacoesPorPessoa}
          onSalvar={salvarPessoa}
          onExcluir={removerPessoa}
        />
      )}

      {visao && aba === 'atividades' && (
        <Atividades
          atividades={dados.atividades}
          alocacoes={dados.alocacoes}
          pessoas={dados.pessoas}
          hoje={periodo.hoje}
          onSalvar={salvarAtividade}
          onExcluir={removerAtividade}
        />
      )}

      {visao && fila && !pendentes.length && !orcamentosPendentes.length && (
        <TicketsAPlanejar
          tickets={visao.tickets}
          onFechar={() => setFila(false)}
          onPlanejar={(sel) => { setPendentes(sel.map((t) => t.id)); setFila(false); }}
          onPlanejarOrcamento={(sel) => { setOrcamentosPendentes(sel.map((t) => t.id)); setFila(false); }}
        />
      )}

      {visao && pendentes.length > 0 && (
        <PlanejarDemanda
          key={pendentes[0]}
          ticket={visao.tickets.find((t) => t.id === pendentes[0])}
          devs={visao.devs}
          buckets={periodo.buckets}
          bucketAtual={periodo.bucketAtual}
          alocacoes={visao.alocacoes}
          onCancelar={() => setPendentes((p) => p.slice(1))}
          onConfirmar={confirmar}
        />
      )}

      {visao && orcamentosPendentes.length > 0 && (
        <PlanejarOrcamento
          key={orcamentosPendentes[0]}
          ticket={visao.tickets.find((t) => t.id === orcamentosPendentes[0])}
          pos={visao.pos}
          buckets={periodo.buckets}
          bucketAtual={periodo.bucketAtual}
          alocacoesOrcamento={visao.alocacoes}
          onCancelar={() => setOrcamentosPendentes((p) => p.slice(1))}
          onConfirmar={confirmarOrcamento}
        />
      )}
    </div>
  );
}

function Aviso({ texto, cor = c.t3, children }) {
  return (
    <div style={{ padding: '60px 24px', textAlign: 'center' }}>
      <div style={{ fontSize: 14, color: cor, maxWidth: 560, margin: '0 auto', lineHeight: 1.5 }}>{texto}</div>
      {children}
    </div>
  );
}
