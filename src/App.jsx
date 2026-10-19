import React, { useEffect, useMemo, useRef, useState } from 'react';
import GanttHoras from './screens/GanttHoras.jsx';
import TicketsAPlanejar from './screens/TicketsAPlanejar.jsx';
import PlanejarDemanda from './screens/PlanejarDemanda.jsx';
import PlanejarOrcamento from './screens/PlanejarOrcamento.jsx';
import { c } from './theme.js';
import { Alerta, Botao, ConfirmacaoModal, Toast } from './components/ui.jsx';
import Pessoas from './screens/Pessoas.jsx';
import Atividades from './screens/Atividades.jsx';
import {
  atualizarAlocacao, atualizarAtividade, atualizarPessoa, carregarTudo, criarAlocacao, criarAtividade, criarPessoa,
  excluirAlocacao, excluirAtividade, excluirPessoa, limparTudo, restaurarExemplos,
} from './data/api.js';
import { alocacaoParaGantt, atividadeParaFila, pessoaParaGantt } from './data/adaptadores.js';
import { bucketsParaDatas, periodoAtual, somarDias } from './lib/periodo.js';
import { compararCodigos } from './lib/codigo.js';

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
  const [remarcando, setRemarcando] = useState(null); // alocação do Gantt aberta no modal
  const [confirmando, setConfirmando] = useState(null); // 'limpar' | 'restaurar'
  const [toast, setToast] = useState(null); // { tipo, texto }

  // Avisos de sucesso somem sozinhos; os de erro ficam até o usuário fechar.
  useEffect(() => {
    if (!toast || toast.tipo !== 'ok') return undefined;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

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

  /** Fecha modais abertos e recarrega tudo do banco (usado depois de limpar/restaurar). */
  async function recarregarDepois(acao, mensagem) {
    await acao();
    setFila(false); setPendentes([]); setOrcamentosPendentes([]); setRemarcando(null);
    setDados(await carregarTudo());
    setConfirmando(null);
    setToast({ tipo: 'ok', texto: mensagem });
  }

  // Sem pessoa do tipo certo, o modal de planejamento não tem quem escolher: avisa em vez de abrir.
  function planejar(sel) {
    if (!visao.devs.length) { setToast({ tipo: 'erro', texto: 'Cadastre pelo menos um Dev na aba Pessoas antes de planejar demandas.' }); return; }
    setPendentes(sel.map((t) => t.id)); setFila(false);
  }
  function planejarOrcamento(sel) {
    if (!visao.pos.length) { setToast({ tipo: 'erro', texto: 'Cadastre pelo menos um PO na aba Pessoas antes de planejar pré-orçamentos.' }); return; }
    setOrcamentosPendentes(sel.map((t) => t.id)); setFila(false);
  }

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
        .sort((a, b) => compararCodigos(a.codigo, b.codigo)),
    }));
    return salva;
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

  const trocarAlocacao = (salva) => setDados((d) => ({ ...d, alocacoes: d.alocacoes.map((a) => (a.id === salva.id ? salva : a)) }));

  /**
   * Edição rápida no Gantt (status, horas apontadas): a tela muda na hora e,
   * se o banco recusar, volta ao valor anterior e o erro aparece na faixa.
   */
  async function atualizarNoGantt(id, campos) {
    const antes = dados.alocacoes.find((a) => a.id === id);
    trocarAlocacao({ ...antes, ...campos });
    try {
      trocarAlocacao(await atualizarAlocacao(id, campos, antes.versao));
    } catch (e) {
      trocarAlocacao(antes);
      throw e;
    }
  }

  /** Desplanejar: a alocação some e o ticket volta para a fila. */
  async function excluirNoGantt(id) {
    await excluirAlocacao(id);
    setDados((d) => ({ ...d, alocacoes: d.alocacoes.filter((a) => a.id !== id) }));
  }

  /** Salva a remarcação feita no modal (turnos, horas, pessoa). Em erro, o modal continua aberto. */
  async function salvarRemarcacao(payload) {
    const antes = dados.alocacoes.find((a) => a.id === remarcando.id);
    const salva = await atualizarAlocacao(antes.id, {
      pessoaId: payload.devId || payload.poId,
      ...bucketsParaDatas(payload.bucketInicio, payload.duracaoBuckets, periodo.inicio),
      turnos: payload.turnos.map((t) => ({ data: somarDias(periodo.inicio, t.indice), periodo: t.periodo })),
      distribuicao: payload.distribuicao,
    }, antes.versao);
    trocarAlocacao(salva);
    setRemarcando(null);
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {aba === 'gantt' && visao && visao.pessoas.length > 0 && (
              <button type="button" onClick={() => setFila(true)} style={{ font: 'inherit', fontSize: 12, fontWeight: 'bold', color: '#0B2223', background: c.teal, border: 'none', borderRadius: 7, padding: '9px 14px', cursor: 'pointer' }}>Tickets a planejar</button>
            )}
            {visao && <MenuDados onLimpar={() => setConfirmando('limpar')} onRestaurar={() => setConfirmando('restaurar')} />}
          </div>
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

      {visao && aba === 'gantt' && visao.pessoas.length === 0 && (
        <EstadoVazio
          titulo="O Gantt ainda está vazio"
          texto="Cada pessoa do time vira uma linha do Gantt. Comece cadastrando os devs e POs; depois cadastre as atividades e planeje."
          botao="Cadastre a primeira pessoa"
          onClick={() => setAba('pessoas')}
        />
      )}

      {visao && aba === 'gantt' && visao.pessoas.length > 0 && visao.alocacoes.length === 0 && (
        <div style={{ padding: '18px 24px 0' }}>
          <Alerta tipo="info">
            Nenhuma atividade planejada ainda.{' '}
            {visao.tickets.length
              ? <>Clique em <strong>Tickets a planejar</strong> (no topo) para alocar as atividades nas pessoas.</>
              : <>Cadastre as atividades na aba <strong>Atividades</strong> e depois clique em <strong>Tickets a planejar</strong>.</>}
          </Alerta>
        </div>
      )}

      {visao && aba === 'gantt' && visao.pessoas.length > 0 && (
        <GanttHoras
          buckets={periodo.buckets}
          bucketAtual={periodo.bucketAtual}
          devs={visao.pessoas}
          alocacoes={visao.alocacoes}
          onAtualizar={atualizarNoGantt}
          onRemarcar={setRemarcando}
          onExcluir={excluirNoGantt}
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
          onPlanejar={planejar}
          onPlanejarOrcamento={planejarOrcamento}
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

      {visao && remarcando && remarcando.tipoAlocacao === 'execucao' && (
        <PlanejarDemanda
          key={'remarcar-' + remarcando.id}
          ticket={visao.tickets.find((t) => t.id === remarcando.atividadeId)}
          devs={visao.devs}
          buckets={periodo.buckets}
          bucketAtual={periodo.bucketAtual}
          alocacoes={visao.alocacoes}
          existente={remarcando}
          onCancelar={() => setRemarcando(null)}
          onConfirmar={salvarRemarcacao}
        />
      )}

      {visao && remarcando && remarcando.tipoAlocacao === 'orcamento' && (
        <PlanejarOrcamento
          key={'remarcar-' + remarcando.id}
          ticket={visao.tickets.find((t) => t.id === remarcando.atividadeId)}
          pos={visao.pos}
          buckets={periodo.buckets}
          bucketAtual={periodo.bucketAtual}
          alocacoesOrcamento={visao.alocacoes}
          existente={remarcando}
          onCancelar={() => setRemarcando(null)}
          onConfirmar={salvarRemarcacao}
        />
      )}

      {confirmando === 'limpar' && (
        <ConfirmacaoModal
          titulo="Limpar tudo?"
          palavra="LIMPAR"
          rotuloBotao="Apagar todos os dados"
          onCancelar={() => setConfirmando(null)}
          onConfirmar={() => recarregarDepois(limparTudo, 'Tudo apagado. Comece cadastrando as pessoas na aba Pessoas.')}
        >
          Isso <strong>apaga do banco</strong> todas as {dados.pessoas.length} pessoas, {dados.atividades.length} atividades
          e {dados.alocacoes.length} alocações. <strong>Não dá para desfazer.</strong>
          <br />Use para começar do zero e cadastrar os dados reais.
        </ConfirmacaoModal>
      )}

      {confirmando === 'restaurar' && (
        <ConfirmacaoModal
          titulo="Restaurar os dados de exemplo?"
          rotuloBotao="Apagar e restaurar exemplos"
          onCancelar={() => setConfirmando(null)}
          onConfirmar={() => recarregarDepois(restaurarExemplos, 'Dados de exemplo restaurados, com datas a partir desta semana.')}
        >
          Isso <strong>apaga tudo que está no banco hoje</strong> ({dados.pessoas.length} pessoas, {dados.atividades.length} atividades,
          {' '}{dados.alocacoes.length} alocações) e grava de novo os dados de exemplo da demo, com datas em volta de hoje.
          <strong> Não dá para desfazer.</strong>
        </ConfirmacaoModal>
      )}

      {toast && <Toast tipo={toast.tipo} onFechar={() => setToast(null)}>{toast.texto}</Toast>}
    </div>
  );
}

/** Menu "Dados" do cabeçalho: ações que apagam dados ficam escondidas aqui, longe de cliques acidentais. */
function MenuDados({ onLimpar, onRestaurar }) {
  const [aberto, setAberto] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!aberto) return undefined;
    const fora = (e) => { if (ref.current && !ref.current.contains(e.target)) setAberto(false); };
    const esc = (e) => { if (e.key === 'Escape') setAberto(false); };
    document.addEventListener('mousedown', fora);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', fora); document.removeEventListener('keydown', esc); };
  }, [aberto]);
  const item = (rotulo, descricao, cor, onClick) => (
    <button type="button" onClick={() => { setAberto(false); onClick(); }} style={{
      font: 'inherit', display: 'block', width: '100%', textAlign: 'left', background: c.white, border: 'none',
      borderTop: '1px solid ' + c.b3, padding: '11px 14px', cursor: 'pointer',
    }}>
      <span style={{ display: 'block', fontSize: 12.5, fontWeight: 'bold', color: cor }}>{rotulo}</span>
      <span style={{ display: 'block', fontSize: 11, color: c.t4, marginTop: 2 }}>{descricao}</span>
    </button>
  );
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button type="button" onClick={() => setAberto((a) => !a)} aria-haspopup="menu" aria-expanded={aberto} style={{
        font: 'inherit', fontSize: 12, fontWeight: 'bold', color: c.white, background: 'transparent',
        border: '1px solid ' + c.inkBorder, borderRadius: 7, padding: '8px 12px', cursor: 'pointer',
      }}>Dados ▾</button>
      {aberto && (
        <div role="menu" style={{
          position: 'absolute', right: 0, top: 'calc(100% + 6px)', width: 280, zIndex: 50, overflow: 'hidden',
          background: c.white, border: '1px solid ' + c.b1, borderRadius: 10, boxShadow: '0 16px 32px rgba(12,16,20,0.22)',
        }}>
          {item('Restaurar exemplos', 'Apaga tudo e grava os dados de exemplo da demo.', c.t1, onRestaurar)}
          {item('Limpar tudo', 'Apaga todos os dados para começar do zero.', c.redText, onLimpar)}
        </div>
      )}
    </div>
  );
}

function EstadoVazio({ titulo, texto, botao, onClick }) {
  return (
    <div style={{ padding: '18px 24px' }}>
      <div style={{ background: c.white, border: '1px solid ' + c.b1, borderRadius: 12, padding: '56px 24px', textAlign: 'center' }}>
        <div style={{ fontSize: 16, fontWeight: 'bold', color: c.t2 }}>{titulo}</div>
        <div style={{ fontSize: 13, color: c.t4, margin: '8px auto 20px', maxWidth: 460, lineHeight: 1.5 }}>{texto}</div>
        <Botao onClick={onClick}>{botao}</Botao>
      </div>
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
