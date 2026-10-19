import React, { useMemo, useState } from 'react';
import { c, label, PRIORIDADE_COR } from '../theme.js';
import { Alerta, Botao, Campo, Chip, Modal, estiloInput } from '../components/ui.jsx';
import { brl, centavosParaTexto, dataBR, textoParaCentavos } from '../lib/formato.js';
import { diasEntre } from '../lib/periodo.js';
import { proximoCodigo, rotuloCodigo } from '../lib/codigo.js';
import { PRIORIDADES, STATUS_ORCAMENTO, TIPOS_ATIVIDADE } from '../data/catalogos.js';

const GRID = '96px minmax(0, 2.2fr) minmax(0, 1.3fr) 112px 104px minmax(0, 1.5fr) 150px';

const FILTROS = [
  { key: '', label: 'Todas' },
  { key: 'aprovado', label: 'Orçamento aprovado' },
  { key: 'pre_orcamento', label: 'Pré-orçamento' },
];

/**
 * Cadastro de atividades (tickets).
 * onSalvar(dados, id?) e onExcluir(id) devolvem Promise; em erro, rejeitam com mensagem amigável.
 */
export default function Atividades({ atividades, alocacoes, pessoas, hoje, onSalvar, onExcluir }) {
  const [editando, setEditando] = useState(null); // null = fechado; {} = nova; atividade = edição
  const [erro, setErro] = useState(null);
  const [aviso, setAviso] = useState(null);
  const [excluindo, setExcluindo] = useState(null);
  const [filtro, setFiltro] = useState('');
  const [busca, setBusca] = useState('');

  const nomePessoa = useMemo(() => Object.fromEntries(pessoas.map((p) => [p.id, p.nome])), [pessoas]);
  const alocacoesDe = useMemo(() => {
    const m = {};
    alocacoes.forEach((a) => { (m[a.atividadeId] = m[a.atividadeId] || []).push(a); });
    return m;
  }, [alocacoes]);

  const termo = busca.trim().toLowerCase();
  const visiveis = atividades
    .filter((a) => !filtro || a.statusOrcamento === filtro)
    .filter((a) => !termo || [a.codigo, a.titulo, a.solicitante, a.area].some((v) => v && v.toLowerCase().includes(termo)));

  function situacao(a) {
    const als = alocacoesDe[a.id] || [];
    const exec = als.find((x) => x.tipo === 'execucao');
    const orc = als.find((x) => x.tipo === 'orcamento');
    if (exec) return { texto: 'No Gantt · ' + (nomePessoa[exec.pessoaId] || '?'), cor: c.tealText };
    if (a.statusOrcamento === 'aprovado') return { texto: 'Na fila para planejar', cor: c.t4 };
    if (orc) return { texto: 'Orçamento com ' + (nomePessoa[orc.pessoaId] || '?'), cor: c.amberText };
    return { texto: 'Aguardando PO', cor: c.t4 };
  }

  async function excluir(a) {
    setErro(null); setAviso(null);
    const n = (alocacoesDe[a.id] || []).length;
    const cod = rotuloCodigo(a.codigo);
    const msg = n
      ? cod + ' está planejada no Gantt. Excluir a atividade apaga também ' + (n > 1 ? 'as ' + n + ' alocações dela' : 'a alocação dela') + '. Continuar?'
      : 'Excluir ' + cod + ' · ' + a.titulo + '? Essa ação não pode ser desfeita.';
    if (!window.confirm(msg)) return;
    setExcluindo(a.id);
    try {
      await onExcluir(a.id);
      setAviso(cod + ' excluída' + (n ? ' (e removida do Gantt).' : '.'));
    } catch (e) {
      setErro(e.message);
    } finally {
      setExcluindo(null);
    }
  }

  return (
    <div style={{ padding: '18px 24px 28px' }}>
      <div style={{ background: c.white, border: '1px solid ' + c.b1, borderRadius: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '13px 18px', borderBottom: '1px solid ' + c.b2, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13.5, fontWeight: 'bold' }}>Atividades</span>
            {atividades.length > 0 && (
              <>
                <div style={{ display: 'flex', gap: 6 }}>
                  {FILTROS.map((f) => <Chip key={f.key} ativo={filtro === f.key} onClick={() => setFiltro(f.key)}>{f.label}</Chip>)}
                </div>
                <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar código, título, solicitante…"
                  style={{ ...estiloInput, width: 240, fontSize: 12, padding: '6px 10px' }} />
              </>
            )}
          </div>
          {atividades.length > 0 && <Botao onClick={() => { setErro(null); setAviso(null); setEditando({}); }}>+ Nova atividade</Botao>}
        </div>

        {(erro || aviso) && (
          <div style={{ padding: '12px 18px 0' }}>
            {erro && <Alerta onFechar={() => setErro(null)}>{erro}</Alerta>}
            {aviso && <Alerta tipo="ok" onFechar={() => setAviso(null)}>{aviso}</Alerta>}
          </div>
        )}

        {atividades.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: 15, fontWeight: 'bold', color: c.t2 }}>Nenhuma atividade cadastrada ainda</div>
            <div style={{ fontSize: 12.5, color: c.t4, margin: '8px auto 18px', maxWidth: 440, lineHeight: 1.5 }}>
              Cadastre os tickets do time. Os de orçamento aprovado entram na fila para planejar no Gantt; os de pré-orçamento, na fila do PO.
            </div>
            <Botao onClick={() => setEditando({})}>Cadastrar a primeira atividade</Botao>
          </div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: GRID, alignItems: 'center', padding: '9px 18px', background: c.s1, borderBottom: '1px solid ' + c.b2, marginTop: erro || aviso ? 12 : 0 }}>
              <div style={label}>Código</div>
              <div style={label}>Título</div>
              <div style={label}>Solicitante</div>
              <div style={{ ...label, textAlign: 'right' }} title="Horas aprovadas no orçamento / horas planejadas no Gantt">Aprov. / Plan.</div>
              <div style={{ ...label, textAlign: 'right' }}>Prazo</div>
              <div style={{ ...label, paddingLeft: 16 }}>Situação</div>
              <div />
            </div>
            {visiveis.map((a) => {
              const s = situacao(a);
              const dias = a.prazo ? diasEntre(hoje, a.prazo) : null;
              return (
                <div key={a.id} style={{ display: 'grid', gridTemplateColumns: GRID, alignItems: 'center', padding: '10px 18px', borderBottom: '1px solid ' + c.b3 }}>
                  <div style={{ fontSize: 12, fontWeight: 'bold', color: c.tealDark }}>{rotuloCodigo(a.codigo)}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, paddingRight: 12 }}>
                    <div title={'Prioridade ' + a.prioridade} style={{ width: 3, height: 28, borderRadius: 2, background: PRIORIDADE_COR[a.prioridade] || c.b4, flex: 'none' }} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.titulo}</div>
                      <div style={{ fontSize: 10.5, color: c.t5, marginTop: 3 }}>
                        {a.tipo} · {a.prioridade} · <span style={{ color: a.statusOrcamento === 'aprovado' ? c.greenText : c.amberText }}>
                          {a.statusOrcamento === 'aprovado' ? 'Aprovado' + (a.valorAprovadoCentavos ? ' ' + brl(a.valorAprovadoCentavos) : '') : 'Pré-orçamento'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div style={{ minWidth: 0, paddingRight: 10 }}>
                    <div style={{ fontSize: 12, color: c.t2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.solicitante || '—'}</div>
                    <div style={{ fontSize: 10.5, color: c.t5, marginTop: 3 }}>{a.area}</div>
                  </div>
                  <HorasAtividade atividade={a} alocacoes={alocacoesDe[a.id] || []} />
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 12, color: c.t2 }}>{a.prazo ? dataBR(a.prazo) : '—'}</div>
                    {dias !== null && (
                      <div style={{ fontSize: 10.5, marginTop: 3, color: dias < 0 ? c.red : dias <= 10 ? c.red : c.t5 }}>
                        {dias < 0 ? 'atrasado ' + Math.abs(dias) + 'd' : dias + ' dias'}
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: s.cor, paddingLeft: 16, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.texto}</div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                    <Botao variante="secundario" style={{ padding: '6px 10px', fontSize: 12 }} onClick={() => { setErro(null); setAviso(null); setEditando(a); }}>Editar</Botao>
                    <Botao variante="perigo" style={{ padding: '6px 10px', fontSize: 12 }} disabled={excluindo === a.id} onClick={() => excluir(a)}>
                      {excluindo === a.id ? 'Excluindo…' : 'Excluir'}
                    </Botao>
                  </div>
                </div>
              );
            })}
            {!visiveis.length && (
              <div style={{ padding: 32, textAlign: 'center', fontSize: 12, color: c.t5 }}>Nenhuma atividade encontrada para esse filtro.</div>
            )}
          </>
        )}
      </div>

      {editando && (
        <FormAtividade
          atividade={editando.id ? editando : null}
          atividades={atividades}
          horasPlanejadas={((editando.id && alocacoesDe[editando.id]) || []).filter((x) => x.tipo === 'execucao').map((x) => x.horasEstimadas)[0] ?? null}
          hoje={hoje}
          onCancelar={() => setEditando(null)}
          onSalvar={async (dados) => {
            const salva = await onSalvar(dados, editando.id);
            setAviso('Atividade ' + rotuloCodigo(salva.codigo) + (editando.id ? ' atualizada.' : ' cadastrada.'));
            setEditando(null);
          }}
        />
      )}
    </div>
  );
}

/**
 * Horas aprovadas (orçamento, guardadas na atividade) e, abaixo, as planejadas no Gantt
 * (soma dos turnos da alocação). Diferença fica em destaque; o orçamento original não muda.
 */
function HorasAtividade({ atividade, alocacoes }) {
  const exec = alocacoes.find((x) => x.tipo === 'execucao');
  const orc = alocacoes.find((x) => x.tipo === 'orcamento');
  const aprovadas = atividade.horasAprovadas;
  let linha2 = null;
  if (exec) {
    const dif = exec.horasEstimadas - aprovadas;
    const cor = dif === 0 ? c.t5 : c.amberText;
    linha2 = (
      <div style={{ fontSize: 10.5, marginTop: 3, color: cor, fontWeight: dif ? 'bold' : 'normal' }}
        title={dif ? 'Planejado no Gantt ' + (dif > 0 ? 'acima' : 'abaixo') + ' das horas aprovadas' : 'Planejado igual ao aprovado'}>
        plan. {exec.horasEstimadas} h{dif ? ' (' + (dif > 0 ? '+' : '') + dif + ')' : ''}
      </div>
    );
  } else if (orc) {
    linha2 = <div style={{ fontSize: 10.5, marginTop: 3, color: c.amberText }} title="Horas agendadas para o PO elaborar o pré-orçamento">PO: {orc.horasEstimadas} h</div>;
  }
  return (
    <div style={{ textAlign: 'right' }}>
      <div style={{ fontSize: 12.5, fontWeight: 'bold' }}>{aprovadas} h</div>
      {linha2}
    </div>
  );
}

function FormAtividade({ atividade, atividades, horasPlanejadas, hoje, onCancelar, onSalvar }) {
  const planejada = horasPlanejadas !== null;
  const a = atividade || {};
  // Código: gerado automaticamente ao salvar (aqui só a prévia do próximo número); não é editável.
  const codigoExibido = atividade ? rotuloCodigo(a.codigo) : rotuloCodigo(proximoCodigo(atividades.map((x) => x.codigo)));
  const [titulo, setTitulo] = useState(a.titulo || '');
  const [tipo, setTipo] = useState(a.tipo || TIPOS_ATIVIDADE[0]);
  const [prioridade, setPrioridade] = useState(a.prioridade || 'Média');
  const [statusOrcamento, setStatusOrcamento] = useState(a.statusOrcamento || 'aprovado');
  const [solicitante, setSolicitante] = useState(a.solicitante || '');
  const [area, setArea] = useState(a.area || '');
  const [horas, setHoras] = useState(atividade ? String(a.horasAprovadas) : '');
  const [valor, setValor] = useState(centavosParaTexto(a.valorAprovadoCentavos));
  const [dataAprovacao, setDataAprovacao] = useState(a.dataAprovacao || hoje);
  const [prazo, setPrazo] = useState(a.prazo || '');
  const [tentou, setTentou] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState(null);

  const aprovado = statusOrcamento === 'aprovado';
  const horasNum = horas.trim() === '' ? 0 : Number(horas.replace(',', '.'));
  const valorCent = aprovado ? textoParaCentavos(valor) : null;
  const erros = {
    titulo: !titulo.trim() ? 'Informe o título.' : null,
    horas: !Number.isFinite(horasNum) || horasNum < 0 ? 'Use um número de horas válido.'
      : aprovado && horasNum <= 0 ? 'Informe as horas aprovadas.' : null,
    valor: Number.isNaN(valorCent) ? 'Valor inválido. Ex.: 21.600,00' : null,
  };
  const valido = !Object.values(erros).some(Boolean);

  async function salvar() {
    setTentou(true);
    if (!valido) return;
    setSalvando(true);
    setErro(null);
    try {
      await onSalvar({
        titulo: titulo.trim(), tipo, prioridade, statusOrcamento,
        solicitante: solicitante.trim(), area: area.trim(), horasAprovadas: horasNum,
        valorAprovadoCentavos: aprovado ? valorCent : null,
        dataAprovacao: aprovado ? dataAprovacao || null : null,
        prazo: prazo || null,
      });
    } catch (e) {
      // Mantém o formulário preenchido para tentar de novo.
      setErro(e.message);
      setSalvando(false);
    }
  }

  const select = { ...estiloInput, padding: '7px 8px' };

  return (
    <Modal largura={620}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px 16px', borderBottom: '1px solid ' + c.b2 }}>
        <span style={{ fontSize: 16.5, fontWeight: 'bold' }}>{atividade ? 'Editar atividade' : 'Nova atividade'}</span>
        <button type="button" aria-label="Fechar" onClick={onCancelar} style={{ font: 'inherit', width: 28, height: 28, borderRadius: 7, border: '1px solid ' + c.b1, background: c.white, color: c.t4, cursor: 'pointer' }}>✕</button>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); salvar(); }} style={{ padding: '18px 22px 22px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {erro && <Alerta>{erro}</Alerta>}

        <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: 12 }}>
          <Campo rotulo="Código" ajuda={atividade ? 'Não muda.' : 'Gerado ao salvar.'}>
            <div style={{ ...estiloInput, background: c.s2, color: c.tealDark, fontWeight: 'bold' }} title="Número sequencial gerado automaticamente">{codigoExibido}</div>
          </Campo>
          <Campo rotulo="Título" obrigatorio erro={tentou && erros.titulo}>
            <input autoFocus style={estiloInput} value={titulo} onChange={(e) => setTitulo(e.target.value)} maxLength={200} />
          </Campo>
        </div>

        <div>
          <div style={{ ...label, marginBottom: 6 }}>Status do orçamento <span style={{ color: c.red }}>*</span></div>
          <div style={{ display: 'flex', gap: 6 }}>
            {STATUS_ORCAMENTO.map((s) => (
              <Chip key={s.valor} ativo={statusOrcamento === s.valor} onClick={() => setStatusOrcamento(s.valor)}
                corAtiva={s.valor === 'aprovado'
                  ? { fg: c.greenText, bg: c.greenBg, border: c.green }
                  : { fg: c.amberText, bg: c.amberBg, border: c.amber }}>{s.rotulo}</Chip>
            ))}
          </div>
          {planejada && !aprovado && (
            <div style={{ fontSize: 11, color: c.amberText, marginTop: 6 }}>
              Esta atividade já está planejada no Gantt; mudar para pré-orçamento não remove a barra.
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Campo rotulo="Tipo" obrigatorio>
            <select style={select} value={tipo} onChange={(e) => setTipo(e.target.value)}>
              {TIPOS_ATIVIDADE.map((t) => <option key={t}>{t}</option>)}
            </select>
          </Campo>
          <Campo rotulo="Prioridade" obrigatorio>
            <select style={select} value={prioridade} onChange={(e) => setPrioridade(e.target.value)}>
              {PRIORIDADES.map((p) => <option key={p}>{p}</option>)}
            </select>
          </Campo>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Campo rotulo="Solicitante">
            <input style={estiloInput} value={solicitante} onChange={(e) => setSolicitante(e.target.value)} maxLength={120} />
          </Campo>
          <Campo rotulo="Área">
            <input style={estiloInput} value={area} onChange={(e) => setArea(e.target.value)} maxLength={80} />
          </Campo>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Campo rotulo={aprovado ? 'Horas aprovadas' : 'Horas estimadas'} obrigatorio={aprovado} erro={tentou && erros.horas}
            ajuda={planejada ? 'Planejado no Gantt: ' + horasPlanejadas + ' h (muda só pela remarcação no Gantt).'
              : aprovado ? null : 'Opcional: uma primeira estimativa.'}>
            <input style={estiloInput} inputMode="decimal" value={horas} onChange={(e) => setHoras(e.target.value)} placeholder="Ex.: 48" />
          </Campo>
          {aprovado && (
            <Campo rotulo="Valor aprovado (R$)" erro={tentou && erros.valor} ajuda="Opcional.">
              <input style={estiloInput} inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="Ex.: 21.600,00" />
            </Campo>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {aprovado ? (
            <Campo rotulo="Data de aprovação">
              <input type="date" style={estiloInput} value={dataAprovacao || ''} onChange={(e) => setDataAprovacao(e.target.value)} />
            </Campo>
          ) : <div />}
          <Campo rotulo="Prazo" ajuda="Opcional.">
            <input type="date" style={estiloInput} value={prazo} onChange={(e) => setPrazo(e.target.value)} />
          </Campo>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
          <Botao variante="texto" onClick={onCancelar}>Cancelar</Botao>
          <Botao type="submit" disabled={salvando}>{salvando ? 'Salvando…' : atividade ? 'Salvar alterações' : 'Cadastrar atividade'}</Botao>
        </div>
      </form>
    </Modal>
  );
}
