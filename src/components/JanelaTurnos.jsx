// Peças compartilhadas pelos modais de planejamento (demanda e pré-orçamento):
//  - usePlanejamento: estado e regras (pessoa, horas, janela, turnos);
//  - JanelaTurnos: a faixa de dias com os turnos M | T para escolher.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { c } from '../theme.js';
import { Barra } from './ui.jsx';
import { corOcupacao, pessoaMaisLivre, primeiroDiaUtil, validarJanela } from '../lib/capacidade.js';
import {
  HORAS_TURNO, PERIODOS, arredondarTurno, chaveTurno, distribuirLinear, duracaoParaCaber,
  turnosDisponiveis, turnosOcupados,
} from '../lib/turnos.js';

const plural = (n, um, varios) => n + ' ' + (n === 1 ? um : varios);

/** Turnos livres suficientes para `horas`, preenchidos a partir de `inicio` (a janela cresce até caber). */
function sugerirTurnos(pessoa, alocacoes, buckets, inicio, horas, ignorarId) {
  const ocupados = turnosOcupados(alocacoes, pessoa.id, ignorarId);
  return distribuirLinear(pessoa, buckets, inicio, duracaoParaCaber(pessoa, buckets, inicio, horas, ocupados), horas, ocupados).turnos;
}

/** Dias corridos do início até o último turno (mínimo 1). */
const duracaoDe = (turnos, inicio) => (turnos.length ? Math.max(...turnos.map((t) => t.indice)) - inicio + 1 : 1);

/**
 * Estado do planejamento em turnos de 4 h.
 * Linear = preenche os turnos livres a partir do início da janela.
 * Manual = o usuário marca cada turno; a janela passa a ser do 1º ao último turno marcado.
 * `existente` (opcional) = alocação do Gantt sendo remarcada: abre com os turnos dela,
 * e esses turnos não contam como ocupados.
 */
export function usePlanejamento({ pessoas, alocacoes, buckets, bucketAtual, horasIniciais, existente }) {
  const n = buckets.length;
  const ignorarId = existente ? existente.id : undefined;
  // Sugestão inicial: pessoa mais livre nos próximos 30 dias, a partir do primeiro dia útil
  // de hoje em diante, com a menor janela que tenha turnos livres para as horas.
  const [inicial] = useState(() => {
    if (existente) {
      return { pessoaId: existente.devId, inicio: existente.bucketInicio, horas: existente.horasEstimadas, turnos: existente.turnos };
    }
    const ini = primeiroDiaUtil(buckets, bucketAtual);
    const p = pessoaMaisLivre(pessoas, alocacoes, buckets, ini, Math.min(n, ini + 30));
    const h = arredondarTurno(horasIniciais);
    return { pessoaId: p.id, inicio: ini, horas: h, turnos: sugerirTurnos(p, alocacoes, buckets, ini, h) };
  });
  const [pessoaId, setPessoaId] = useState(inicial.pessoaId);
  const [horas, setHoras] = useState(inicial.horas);
  // Padrão: Manual, já com a sugestão automática marcada (o usuário só ajusta os turnos).
  const [distribuicao, setDistribuicao] = useState('manual');
  const [janela, setJanela] = useState({ inicio: inicial.inicio, duracao: duracaoDe(inicial.turnos, inicial.inicio) });
  const [ancora, setAncora] = useState(null);
  const [manual, setManual] = useState(inicial.turnos);

  const pessoa = pessoas.find((p) => p.id === pessoaId) || pessoas[0];
  const ocupados = useMemo(() => turnosOcupados(alocacoes, pessoaId, ignorarId), [alocacoes, pessoaId, ignorarId]);
  const linear = useMemo(() => distribuirLinear(pessoa, buckets, janela.inicio, janela.duracao, horas, ocupados),
    [pessoa, buckets, janela, horas, ocupados]);

  const turnos = distribuicao === 'linear' ? linear.turnos : manual;
  // No manual, a janela é do primeiro ao último turno marcado.
  const indices = manual.map((t) => t.indice);
  const bucketInicio = distribuicao === 'manual' && manual.length ? Math.min(...indices) : janela.inicio;
  const duracao = distribuicao === 'manual' && manual.length ? Math.max(...indices) - bucketInicio + 1 : janela.duracao;

  // Com o mesmo id da existente, validarJanela não conta os turnos antigos dela duas vezes.
  const candidata = { id: ignorarId || '__nova', devId: pessoaId, bucketInicio, duracaoBuckets: duracao, horasEstimadas: turnos.length * HORAS_TURNO, turnos };
  const v = useMemo(() => validarJanela(pessoa, alocacoes, buckets, candidata),
    [pessoa, alocacoes, buckets, turnos, bucketInicio, duracao]);

  let pendencia = null;
  if (distribuicao === 'linear' && linear.faltam > 0) {
    pendencia = 'Faltam ' + plural(linear.faltam, 'turno livre', 'turnos livres') + ' nessa janela para ' + horas + ' h. Aumente a janela ou escolha outra pessoa.';
  }
  if (distribuicao === 'manual') {
    const saldo = horas - manual.length * HORAS_TURNO;
    if (saldo > 0) pendencia = 'Marque mais ' + plural(saldo / HORAS_TURNO, 'turno', 'turnos') + ' (' + saldo + ' h).';
    else if (saldo < 0) pendencia = 'Há ' + plural(-saldo / HORAS_TURNO, 'turno', 'turnos') + ' a mais: desmarque ou aumente as horas.';
  }

  function escolherPessoa(id) {
    const p = pessoas.find((x) => x.id === id);
    setPessoaId(id);
    setAncora(null);
    if (distribuicao === 'manual') {
      // Refaz a sugestão para a nova pessoa, a partir do mesmo início.
      const sugestao = sugerirTurnos(p, alocacoes, buckets, Math.max(0, bucketInicio), horas, ignorarId);
      setManual(sugestao);
      setJanela({ inicio: Math.max(0, bucketInicio), duracao: duracaoDe(sugestao, Math.max(0, bucketInicio)) });
    } else {
      setManual([]); // a seleção manual era da outra pessoa
    }
  }

  /** Linear: 1º clique = início, 2º clique = fim da janela. */
  function clicarDia(i) {
    if (distribuicao !== 'linear' || !turnosDisponiveis(pessoa, buckets[i]).length) return;
    if (ancora === null) { setAncora(i); setJanela({ inicio: i, duracao: 1 }); }
    else {
      const a = Math.min(ancora, i), b = Math.max(ancora, i);
      setAncora(null); setJanela({ inicio: a, duracao: b - a + 1 });
    }
  }

  /** Manual: liga/desliga um turno livre. */
  function alternarTurno(i, periodo) {
    if (distribuicao !== 'manual') return;
    if (!turnosDisponiveis(pessoa, buckets[i]).includes(periodo) || ocupados.has(chaveTurno(i, periodo))) return;
    setManual((m) => (m.some((t) => t.indice === i && t.periodo === periodo)
      ? m.filter((t) => !(t.indice === i && t.periodo === periodo))
      : m.concat({ indice: i, periodo })));
  }

  function mudarDistribuicao(d) {
    // Ao entrar no manual, parte da sugestão linear: basta ajustar os turnos.
    if (d === 'manual' && !manual.length) setManual(linear.turnos);
    if (d === 'linear' && manual.length) setJanela({ inicio: bucketInicio, duracao });
    setAncora(null);
    setDistribuicao(d);
  }

  function estenderJanela() {
    setJanela((j) => ({ ...j, duracao: duracaoParaCaber(pessoa, buckets, j.inicio, horas, ocupados) }));
  }

  // Rótulo da janela, preso às bordas do período (uma remarcação pode começar antes dele).
  const iniLabel = buckets[Math.max(0, Math.min(n - 1, bucketInicio))];
  const fimLabel = buckets[Math.max(0, Math.min(n - 1, bucketInicio + duracao - 1))];
  const janelaLabel = duracao === 1 ? iniLabel.id : iniLabel.id + ' → ' + fimLabel.id + ' · ' + duracao + ' dias';

  return {
    inicial, pessoa, pessoaId, escolherPessoa, horas, setHoras, distribuicao, mudarDistribuicao,
    bucketInicio, duracao, ancora, clicarDia, alternarTurno, estenderJanela,
    turnos, ocupados, v, pendencia, faltamLinear: distribuicao === 'linear' ? linear.faltam : 0,
    pronto: !pendencia && turnos.length > 0, janelaLabel,
  };
}

const LARGURA_DIA = 50;

/** Faixa de dias com os turnos M | T. `cor` = { forte, fundo, texto }. */
export function JanelaTurnos({ buckets, plan, cor }) {
  const { pessoa, ocupados, turnos, bucketInicio, duracao, ancora, distribuicao, v, inicial } = plan;
  const n = buckets.length;
  const ref = useRef(null);
  const marcados = useMemo(() => new Set(turnos.map((t) => chaveTurno(t.indice, t.periodo))), [turnos]);

  // Rola até a janela sugerida (com 2 dias de folga à esquerda).
  useEffect(() => {
    if (ref.current) ref.current.scrollLeft = Math.max(0, inicial.inicio - 2) * LARGURA_DIA;
  }, [inicial]);

  const colunas = { display: 'grid', gridTemplateColumns: 'repeat(' + n + ', minmax(' + LARGURA_DIA + 'px, 1fr))', minWidth: n * LARGURA_DIA };

  return (
    <div ref={ref} style={{ border: '1px solid ' + c.b1, borderRadius: 10, overflow: 'auto', marginTop: 9 }}>
      <div style={{ ...colunas, background: c.s1, borderBottom: '1px solid ' + c.b2 }}>
        {buckets.map((b, i) => {
          const util = turnosDisponiveis(pessoa, b).length > 0;
          const dentro = i >= bucketInicio && i < bucketInicio + duracao;
          return (
            <div key={b.id} onClick={() => plan.clicarDia(i)} style={{
              padding: '8px 0 6px', textAlign: 'center', borderLeft: '1px solid #EFF0F2',
              cursor: distribuicao === 'linear' && util ? 'pointer' : 'default',
              background: !util ? c.b2 : ancora === i ? c.amberBg : dentro ? cor.fundo : 'transparent',
            }}>
              <div style={{ fontSize: 11.5, fontWeight: 'bold', color: !util ? c.t5 : dentro ? cor.texto : c.t3 }}>{b.id}</div>
              <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: 2 }}>
                <span style={{ fontSize: 8, fontWeight: 'bold', color: c.t5 }}>M</span>
                <span style={{ fontSize: 8, fontWeight: 'bold', color: c.t5 }}>T</span>
              </div>
            </div>
          );
        })}
      </div>
      <div style={colunas}>
        {buckets.map((b, i) => {
          const dentro = i >= bucketInicio && i < bucketInicio + duracao;
          const disp = turnosDisponiveis(pessoa, b);
          const cap = disp.length * HORAS_TURNO;
          const total = v.total[i];
          const pct = cap ? total / cap : 0;
          return (
            <div key={b.id} style={{
              borderLeft: '1px solid ' + c.b3, padding: '8px 4px 9px',
              borderTop: '2px solid ' + (dentro ? cor.forte : 'transparent'), borderBottom: '2px solid ' + (dentro ? cor.forte : 'transparent'),
              background: dentro ? 'rgba(23,169,174,0.05)' : c.white,
              display: 'flex', flexDirection: 'column', gap: 7, alignItems: 'stretch',
            }}>
              <div style={{ display: 'flex', gap: 2, height: 30 }}>
                {PERIODOS.map((p) => {
                  const k = chaveTurno(i, p);
                  const indisponivel = !disp.includes(p);
                  const outra = ocupados.get(k);
                  const meu = marcados.has(k);
                  const clicavel = distribuicao === 'manual' && !indisponivel && !outra;
                  let fundo = c.white, borda = c.b2, texto = c.b4;
                  if (indisponivel) { fundo = 'repeating-linear-gradient(135deg, ' + c.s2 + ', ' + c.s2 + ' 4px, ' + c.b3 + ' 4px, ' + c.b3 + ' 8px)'; }
                  else if (outra) { fundo = c.b2; borda = c.b1; texto = c.t4; }
                  else if (meu) { fundo = cor.forte; borda = cor.forte; texto = c.white; }
                  else if (clicavel) { borda = cor.forte; texto = cor.texto; }
                  return (
                    <div key={p} onClick={() => plan.alternarTurno(i, p)}
                      title={indisponivel ? 'Sem expediente' : outra ? 'Ocupado: ' + (outra.ticketId || 'outra atividade') : meu ? 'Turno desta atividade' : 'Livre'}
                      style={{
                        flex: 1, borderRadius: 5, background: fundo, border: '1px ' + (clicavel && !meu ? 'dashed ' : 'solid ') + borda,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 9.5, fontWeight: 'bold', color: texto, cursor: clicavel ? 'pointer' : 'default',
                      }}>{indisponivel ? '' : p === 'manha' ? 'M' : 'T'}</div>
                  );
                })}
              </div>
              {cap > 0 ? (
                <>
                  <Barra pct={pct * 100} cor={total ? corOcupacao(pct) : c.b3} altura={5} fundo={c.b3} />
                  <div style={{ fontSize: 10, fontWeight: 'bold', textAlign: 'center', color: pct > 1 ? c.red : c.t5 }}>{total}/{cap} h</div>
                </>
              ) : <div style={{ fontSize: 10, textAlign: 'center', color: c.b4 }}>—</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
