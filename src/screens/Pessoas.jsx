import React, { useMemo, useState } from 'react';
import { c, label } from '../theme.js';
import { Alerta, Avatar, Botao, Campo, Chip, Modal, estiloInput } from '../components/ui.jsx';
import { gerarIniciais } from '../lib/formato.js';
import { JORNADAS, JORNADA_PADRAO, TIPOS_PESSOA } from '../data/catalogos.js';

const GRID = '44px minmax(0, 1.6fr) minmax(0, 1.4fr) minmax(0, 1.2fr) 70px 110px 90px 170px';
const rotuloJornada = (j) => (JORNADAS.find((x) => x.valor === j) || JORNADAS[0]).rotulo;

/**
 * Cadastro de pessoas (devs e POs).
 * onSalvar(dados, id?) e onExcluir(id) devolvem Promise; em erro, rejeitam com mensagem amigável.
 */
export default function Pessoas({ pessoas, alocacoesPorPessoa, onSalvar, onExcluir }) {
  const [editando, setEditando] = useState(null); // null = fechado; {} = nova; pessoa = edição
  const [erro, setErro] = useState(null);
  const [aviso, setAviso] = useState(null);
  const [excluindo, setExcluindo] = useState(null);

  const squads = useMemo(() => Array.from(new Set(pessoas.map((p) => p.squad).filter(Boolean))).sort(), [pessoas]);

  async function excluir(p) {
    setErro(null); setAviso(null);
    const n = alocacoesPorPessoa[p.id] || 0;
    if (n) {
      setErro(p.nome + ' tem ' + n + (n > 1 ? ' alocações' : ' alocação') + ' no Gantt. Exclua ou passe para outra pessoa antes de excluir o cadastro.');
      return;
    }
    if (!window.confirm('Excluir ' + p.nome + '? Essa ação não pode ser desfeita.')) return;
    setExcluindo(p.id);
    try {
      await onExcluir(p.id);
      setAviso('Cadastro de ' + p.nome + ' excluído.');
    } catch (e) {
      setErro(e.codigo === 'em_uso' ? p.nome + ' ainda tem alocações no banco. Recarregue a página e tente de novo.' : e.message);
    } finally {
      setExcluindo(null);
    }
  }

  return (
    <div style={{ padding: '18px 24px 28px' }}>
      <div style={{ background: c.white, border: '1px solid ' + c.b1, borderRadius: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '13px 18px', borderBottom: '1px solid ' + c.b2 }}>
          <div>
            <span style={{ fontSize: 13.5, fontWeight: 'bold' }}>Pessoas</span>
            <span style={{ fontSize: 12, color: c.t5, marginLeft: 10 }}>
              {pessoas.filter((p) => p.tipo === 'dev').length} devs · {pessoas.filter((p) => p.tipo === 'po').length} POs
            </span>
          </div>
          {pessoas.length > 0 && <Botao onClick={() => { setErro(null); setAviso(null); setEditando({}); }}>+ Nova pessoa</Botao>}
        </div>

        {(erro || aviso) && (
          <div style={{ padding: '12px 18px 0' }}>
            {erro && <Alerta onFechar={() => setErro(null)}>{erro}</Alerta>}
            {aviso && <Alerta tipo="ok" onFechar={() => setAviso(null)}>{aviso}</Alerta>}
          </div>
        )}

        {pessoas.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: 15, fontWeight: 'bold', color: c.t2 }}>Nenhuma pessoa cadastrada ainda</div>
            <div style={{ fontSize: 12.5, color: c.t4, margin: '8px auto 18px', maxWidth: 420, lineHeight: 1.5 }}>
              Cadastre os devs e POs do time. Cada pessoa vira uma linha no Gantt, com a capacidade de horas por dia útil.
            </div>
            <Botao onClick={() => setEditando({})}>Cadastrar a primeira pessoa</Botao>
          </div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: GRID, alignItems: 'center', padding: '9px 18px', background: c.s1, borderBottom: '1px solid ' + c.b2, marginTop: erro || aviso ? 12 : 0 }}>
              <div />
              <div style={label}>Nome</div>
              <div style={label}>Papel</div>
              <div style={label}>Squad</div>
              <div style={label}>Tipo</div>
              <div style={label}>Jornada</div>
              <div style={{ ...label, textAlign: 'right' }}>Alocações</div>
              <div />
            </div>
            {pessoas.map((p) => (
              <div key={p.id} style={{ display: 'grid', gridTemplateColumns: GRID, alignItems: 'center', padding: '10px 18px', borderBottom: '1px solid ' + c.b3 }}>
                <Avatar iniciais={p.iniciais} bg={p.tipo === 'po' ? c.amberText : c.ink} />
                <div style={{ fontSize: 12.5, fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 10 }}>{p.nome}</div>
                <div style={{ fontSize: 12, color: c.t3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 10 }}>{p.papel || '—'}</div>
                <div style={{ fontSize: 12, color: c.t3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 10 }}>{p.squad || '—'}</div>
                <div>
                  <span style={{
                    fontSize: 10.5, fontWeight: 'bold', borderRadius: 20, padding: '2px 8px',
                    color: p.tipo === 'po' ? c.amberText : c.tealText, background: p.tipo === 'po' ? c.amberBg : c.tealBg,
                    border: '1px solid ' + (p.tipo === 'po' ? c.amberBorder : c.tealBorder),
                  }}>{p.tipo === 'po' ? 'PO' : 'Dev'}</span>
                </div>
                <div style={{ fontSize: 12, color: c.t2 }}>{rotuloJornada(p.jornada)} <span style={{ color: c.t5 }}>· {p.horasDiaUtil} h</span></div>
                <div style={{ fontSize: 12.5, textAlign: 'right', color: c.t3 }}>{alocacoesPorPessoa[p.id] || 0}</div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                  <Botao variante="secundario" style={{ padding: '6px 10px', fontSize: 12 }} onClick={() => { setErro(null); setAviso(null); setEditando(p); }}>Editar</Botao>
                  <Botao variante="perigo" style={{ padding: '6px 10px', fontSize: 12 }} disabled={excluindo === p.id} onClick={() => excluir(p)}>
                    {excluindo === p.id ? 'Excluindo…' : 'Excluir'}
                  </Botao>
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {editando && (
        <FormPessoa
          pessoa={editando.id ? editando : null}
          squads={squads}
          onCancelar={() => setEditando(null)}
          onSalvar={async (dados) => {
            await onSalvar(dados, editando.id);
            setAviso('Cadastro de ' + dados.nome + (editando.id ? ' atualizado.' : ' criado.'));
            setEditando(null);
          }}
        />
      )}
    </div>
  );
}

function FormPessoa({ pessoa, squads, onCancelar, onSalvar }) {
  const [nome, setNome] = useState(pessoa ? pessoa.nome : '');
  const [iniciais, setIniciais] = useState(pessoa ? pessoa.iniciais : '');
  // Enquanto o usuário não mexer nas iniciais, elas acompanham o nome.
  const [iniciaisManuais, setIniciaisManuais] = useState(Boolean(pessoa));
  const [tipo, setTipo] = useState(pessoa ? pessoa.tipo : 'dev');
  const [papel, setPapel] = useState(pessoa ? pessoa.papel || '' : '');
  const [squad, setSquad] = useState(pessoa ? pessoa.squad || '' : '');
  const [jornada, setJornada] = useState(pessoa ? pessoa.jornada : JORNADA_PADRAO);
  const [tentou, setTentou] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState(null);

  const erros = {
    nome: !nome.trim() ? 'Informe o nome.' : null,
    iniciais: !iniciais.trim() ? 'Informe as iniciais.' : null,
  };
  const valido = !erros.nome && !erros.iniciais;

  function mudarNome(v) {
    setNome(v);
    if (!iniciaisManuais) setIniciais(gerarIniciais(v));
  }

  async function salvar() {
    setTentou(true);
    if (!valido) return;
    setSalvando(true);
    setErro(null);
    try {
      await onSalvar({
        nome: nome.trim(), iniciais: iniciais.trim().toUpperCase(), tipo,
        papel: papel.trim(), squad: squad.trim(), jornada,
      });
    } catch (e) {
      // Mantém o formulário preenchido para tentar de novo.
      setErro(e.message);
      setSalvando(false);
    }
  }

  return (
    <Modal largura={560}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px 16px', borderBottom: '1px solid ' + c.b2 }}>
        <span style={{ fontSize: 16.5, fontWeight: 'bold' }}>{pessoa ? 'Editar pessoa' : 'Nova pessoa'}</span>
        <button type="button" aria-label="Fechar" onClick={onCancelar} style={{ font: 'inherit', width: 28, height: 28, borderRadius: 7, border: '1px solid ' + c.b1, background: c.white, color: c.t4, cursor: 'pointer' }}>✕</button>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); salvar(); }} style={{ padding: '18px 22px 22px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {erro && <Alerta>{erro}</Alerta>}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 110px', gap: 12 }}>
          <Campo rotulo="Nome" obrigatorio erro={tentou && erros.nome}>
            <input autoFocus style={estiloInput} value={nome} onChange={(e) => mudarNome(e.target.value)} placeholder="Ex.: Ana Ribeiro" maxLength={120} />
          </Campo>
          <Campo rotulo="Iniciais" obrigatorio erro={tentou && erros.iniciais}>
            <input style={{ ...estiloInput, textTransform: 'uppercase' }} value={iniciais} maxLength={4}
              onChange={(e) => { setIniciais(e.target.value); setIniciaisManuais(true); }} />
          </Campo>
        </div>

        <div>
          <div style={{ ...label, marginBottom: 6 }}>Tipo <span style={{ color: c.red }}>*</span></div>
          <div style={{ display: 'flex', gap: 6 }}>
            {TIPOS_PESSOA.map((t) => <Chip key={t.valor} ativo={tipo === t.valor} onClick={() => setTipo(t.valor)}>{t.rotulo}</Chip>)}
          </div>
          <div style={{ fontSize: 11, color: c.t5, marginTop: 5 }}>
            Devs aparecem no planejamento de demandas; POs, no planejamento de pré-orçamentos.
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Campo rotulo="Papel" ajuda="Ex.: Backend · Fiscal">
            <input style={estiloInput} value={papel} onChange={(e) => setPapel(e.target.value)} maxLength={120} />
          </Campo>
          <Campo rotulo="Squad" ajuda="Escolha um existente ou digite um novo">
            <input style={estiloInput} value={squad} onChange={(e) => setSquad(e.target.value)} list="lista-squads" maxLength={80} />
            <datalist id="lista-squads">{squads.map((s) => <option key={s} value={s} />)}</datalist>
          </Campo>
        </div>

        <div>
          <div style={{ ...label, marginBottom: 6 }}>Jornada <span style={{ color: c.red }}>*</span></div>
          <div style={{ display: 'flex', gap: 6 }}>
            {JORNADAS.map((j) => <Chip key={j.valor} ativo={jornada === j.valor} onClick={() => setJornada(j.valor)}>{j.rotulo}</Chip>)}
          </div>
          <div style={{ fontSize: 11, color: c.t5, marginTop: 5 }}>
            {JORNADAS.find((j) => j.valor === jornada).descricao}. O planejamento é feito em turnos de 4 h; fins de semana não contam.
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
          <Botao variante="texto" onClick={onCancelar}>Cancelar</Botao>
          <Botao type="submit" disabled={salvando}>{salvando ? 'Salvando…' : pessoa ? 'Salvar alterações' : 'Cadastrar pessoa'}</Botao>
        </div>
      </form>
    </Modal>
  );
}
