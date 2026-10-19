import React, { useState } from 'react';
import { c, label } from '../theme.js';
import { Alerta, Avatar, Barra, Chip, Modal, Stepper } from '../components/ui.jsx';
import { JanelaTurnos, usePlanejamento } from '../components/JanelaTurnos.jsx';
import { capacidadeBucket, corOcupacao, cargaDev } from '../lib/capacidade.js';

const DISTRIBUICOES = [
  { key: 'manual', label: 'Manual' },
  { key: 'linear', label: 'Linear' },
];

const COR = { forte: c.teal, fundo: c.tealBg, texto: c.tealText };

export default function PlanejarDemanda({ ticket, devs, buckets, bucketAtual, alocacoes, onCancelar, onConfirmar }) {
  const plan = usePlanejamento({ pessoas: devs, alocacoes, buckets, bucketAtual, horasIniciais: ticket.orcamento.horasAprovadas });
  const [salvando, setSalvando] = useState(false);
  const [erroSalvar, setErroSalvar] = useState(null);

  async function confirmar() {
    setSalvando(true);
    setErroSalvar(null);
    try {
      await onConfirmar({
        ticketId: ticket.id, devId: plan.pessoaId, bucketInicio: plan.bucketInicio, duracaoBuckets: plan.duracao,
        turnos: plan.turnos, distribuicao: plan.distribuicao, tipo: ticket.tipo, prioridade: ticket.prioridade, status: 'planejada',
      });
    } catch (e) {
      // O modal continua aberto, com tudo preenchido, para tentar de novo.
      setErroSalvar(e.message);
      setSalvando(false);
    }
  }

  return (
    <Modal largura={800}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24, padding: '18px 22px 16px', borderBottom: '1px solid ' + c.b2 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <span style={{ fontSize: 16.5, fontWeight: 'bold', letterSpacing: -0.2 }}>Planejar demanda no Gantt</span>
            <span style={{ fontSize: 10.5, fontWeight: 'bold', color: c.tealText, background: c.tealBg, border: '1px solid ' + c.tealBorder, borderRadius: 20, padding: '3px 9px' }}>{ticket.codigo}</span>
          </div>
          <div style={{ fontSize: 11.5, color: c.t4, marginTop: 5 }}>Defina responsável, janela e horas. O planejamento é feito em turnos de 4 h (manhã e tarde).</div>
        </div>
        <button type="button" aria-label="Fechar" onClick={onCancelar} style={{ font: 'inherit', width: 28, height: 28, borderRadius: 7, border: '1px solid ' + c.b1, background: c.white, color: c.t4, cursor: 'pointer' }}>✕</button>
      </div>

      <div style={{ padding: '18px 22px 22px', display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div>
          <div style={label}>Título da demanda</div>
          <div style={{ marginTop: 7, border: '1px solid ' + c.b1, borderRadius: 8, padding: '10px 12px', fontSize: 13.5 }}>{ticket.titulo}</div>
        </div>

        <div>
          <div style={label}>Responsável</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8, marginTop: 9 }}>
            {devs.map((d) => {
              const on = d.id === plan.pessoaId;
              const carga = cargaDev(alocacoes, d.id, buckets);
              const capPeriodo = buckets.reduce((s, b, i) => s + capacidadeBucket(d, i), 0);
              const pct = capPeriodo ? carga.reduce((s, h) => s + h, 0) / capPeriodo : 0;
              return (
                <button key={d.id} type="button" onClick={() => plan.escolherPessoa(d.id)} style={{
                  font: 'inherit', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
                  border: '1px solid ' + (on ? c.teal : c.b1), background: on ? c.tealBg : c.white,
                  borderRadius: 9, padding: '10px 11px',
                }}>
                  <Avatar iniciais={d.iniciais} tamanho={28} bg={on ? c.tealText : c.ink} />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: 12, fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.nome}</span>
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

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'end' }}>
          <div>
            <div style={label}>Horas estimadas</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 7 }}>
              <Stepper valor={plan.horas} onChange={plan.setHoras} />
              <span style={{ fontSize: 11, color: c.t5 }}>= {plan.horas / 4} turnos de 4 h</span>
            </div>
          </div>
          <div>
            <div style={label}>Distribuição das horas</div>
            <div style={{ display: 'flex', gap: 6, marginTop: 7 }}>
              {DISTRIBUICOES.map((d) => <Chip key={d.key} ativo={plan.distribuicao === d.key} onClick={() => plan.mudarDistribuicao(d.key)}>{d.label}</Chip>)}
            </div>
          </div>
        </div>

        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
            <div style={label}>Janela de planejamento</div>
            <div style={{ fontSize: 11.5, color: c.t3, textAlign: 'right' }}>
              {plan.distribuicao === 'manual'
                ? 'Clique nos turnos M / T para marcar ou desmarcar'
                : plan.ancora !== null ? 'Agora clique no dia final' : 'Clique na data de início e depois na de fim'}
              {' · '}<strong style={{ color: c.tealText }}>{plan.janelaLabel}</strong>
            </div>
          </div>
          <JanelaTurnos buckets={buckets} plan={plan} cor={COR} />
          <div style={{ fontSize: 11, color: c.t5, marginTop: 6 }}>
            Linear preenche os turnos livres a partir do início da janela. Turnos cinza já estão ocupados por outra atividade.
          </div>
        </div>
      </div>

      {erroSalvar && <div style={{ padding: '0 22px 14px' }}><Alerta onFechar={() => setErroSalvar(null)}>{erroSalvar}</Alerta></div>}

      <div style={{ borderTop: '1px solid ' + c.b2, background: c.s1, padding: '14px 22px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10 }}>
        {plan.pendencia && (
          <span style={{ fontSize: 11.5, color: c.amberText, marginRight: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
            {plan.pendencia}
            {plan.faltamLinear > 0 && (
              <button type="button" onClick={plan.estenderJanela} style={{ font: 'inherit', fontSize: 11.5, fontWeight: 'bold', color: c.tealDark, background: 'none', border: 'none', cursor: 'pointer', padding: 0, whiteSpace: 'nowrap' }}>Aumentar janela</button>
            )}
          </span>
        )}
        <button type="button" onClick={onCancelar} style={{ font: 'inherit', fontSize: 12, fontWeight: 'bold', color: c.t4, background: 'none', border: 'none', borderRadius: 8, padding: '10px 14px', cursor: 'pointer' }}>Cancelar</button>
        <button type="button" onClick={confirmar} disabled={salvando || !plan.pronto} style={{
          font: 'inherit', fontSize: 13, fontWeight: 'bold', color: '#0B2223', background: c.teal, border: 'none', borderRadius: 8, padding: '10px 18px',
          cursor: salvando || !plan.pronto ? 'default' : 'pointer', opacity: salvando || !plan.pronto ? 0.55 : 1,
        }}>
          {salvando ? 'Salvando…' : 'Planejar demanda'}
        </button>
      </div>
    </Modal>
  );
}
