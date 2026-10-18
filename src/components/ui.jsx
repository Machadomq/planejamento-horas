import React, { useEffect, useRef, useState } from 'react';
import { c } from '../theme.js';

export function Chip({ ativo, onClick, children, corAtiva, style }) {
  return (
    <button type="button" onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer',
      font: 'inherit', fontSize: 11.5, fontWeight: 'bold',
      color: ativo ? (corAtiva ? corAtiva.fg : c.tealText) : c.t3,
      background: ativo ? (corAtiva ? corAtiva.bg : c.tealBg) : c.white,
      border: '1px solid ' + (ativo ? (corAtiva ? corAtiva.border : c.teal) : c.b1),
      borderRadius: 7, padding: '6px 11px', ...style,
    }}>{children}</button>
  );
}

export function Checkbox({ checked, onChange }) {
  return (
    <span role="checkbox" aria-checked={checked} tabIndex={0}
      onClick={(e) => { e.stopPropagation(); onChange(); }}
      onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); onChange(); } }}
      style={{
        width: 16, height: 16, borderRadius: 4, cursor: 'pointer',
        border: '1px solid ' + (checked ? c.teal : c.b4),
        background: checked ? c.teal : c.white, color: c.white, fontSize: 11,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      }}>{checked ? '✓' : ''}</span>
  );
}

export function Stepper({ valor, onChange, passo = 4, min = 4, sufixo = ' h' }) {
  const btn = {
    width: 30, height: 34, cursor: 'pointer', font: 'inherit', fontSize: 15,
    color: c.t3, background: c.white, border: 'none',
  };
  return (
    <div style={{ display: 'flex', alignItems: 'center', border: '1px solid ' + c.b1, borderRadius: 8, overflow: 'hidden', background: c.white }}>
      <button type="button" aria-label="Diminuir horas" onClick={() => onChange(Math.max(min, valor - passo))}
        style={{ ...btn, borderRight: '1px solid ' + c.b2 }}>−</button>
      <div style={{ minWidth: 60, textAlign: 'center', fontSize: 13, fontWeight: 'bold' }}>{valor + sufixo}</div>
      <button type="button" aria-label="Aumentar horas" onClick={() => onChange(valor + passo)}
        style={{ ...btn, borderLeft: '1px solid ' + c.b2 }}>+</button>
    </div>
  );
}

export function Barra({ pct, cor, altura = 4, fundo = c.b2, largura }) {
  return (
    <div style={{ width: largura || '100%', height: altura, borderRadius: altura / 2, background: fundo, overflow: 'hidden' }}>
      <div style={{ height: altura, borderRadius: altura / 2, background: cor, width: Math.min(100, Math.max(0, pct)) + '%' }} />
    </div>
  );
}

export function Avatar({ iniciais, tamanho = 26, bg = c.ink }) {
  return (
    <div style={{
      width: tamanho, height: tamanho, borderRadius: '50%', background: bg, color: c.white,
      fontSize: tamanho * 0.4, fontWeight: 'bold', flex: 'none',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>{iniciais}</div>
  );
}

export function Select({ value, options, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    function aoClicarFora(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    function aoTeclarEsc(e) { if (e.key === 'Escape') setOpen(false); }
    document.addEventListener('mousedown', aoClicarFora);
    document.addEventListener('keydown', aoTeclarEsc);
    return () => { document.removeEventListener('mousedown', aoClicarFora); document.removeEventListener('keydown', aoTeclarEsc); };
  }, [open]);

  const atual = options.find((o) => o.key === value) || options[0];

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-haspopup="listbox" aria-expanded={open} style={{
        display: 'inline-flex', alignItems: 'center', gap: 7, font: 'inherit', fontSize: 11, fontWeight: 'bold',
        color: atual.corTexto, background: atual.corFundo, border: '1px solid ' + atual.corBorda,
        borderRadius: 20, padding: '4px 10px 4px 11px', cursor: 'pointer', lineHeight: 1.5,
      }}>
        {atual.label}
        <svg width="9" height="9" viewBox="0 0 12 12" style={{ flex: 'none', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }}>
          <path d="M2.5 4.5L6 8l3.5-3.5" stroke={atual.corTexto} strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div role="listbox" style={{
          position: 'absolute', top: 'calc(100% + 7px)', left: 0, minWidth: 300, zIndex: 50,
          background: c.white, border: '1px solid ' + c.b1, borderRadius: 11,
          boxShadow: '0 16px 32px rgba(12,16,20,0.18)', overflow: 'hidden',
        }}>
          {options.map((o, i) => {
            const on = o.key === value;
            return (
              <div key={o.key} role="option" aria-selected={on} onClick={() => { onChange(o.key); setOpen(false); }} style={{
                display: 'flex', alignItems: 'flex-start', gap: 10, padding: '11px 13px', cursor: 'pointer',
                background: on ? o.corFundo : c.white,
                borderTop: i === 0 ? 'none' : '1px solid ' + c.b3,
              }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: o.corTexto, marginTop: 4, flex: 'none' }} />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 12.5, fontWeight: 'bold', color: on ? o.corTexto : c.t1 }}>{o.label}</span>
                  {o.descricao && <span style={{ display: 'block', fontSize: 11, color: c.t4, marginTop: 2, lineHeight: 1.4 }}>{o.descricao}</span>}
                </span>
                {on && <span style={{ fontSize: 12, fontWeight: 'bold', color: o.corTexto, flex: 'none' }}>✓</span>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------ Formulários

export const estiloInput = {
  font: 'inherit', fontSize: 13, color: c.t1, background: c.white, width: '100%', boxSizing: 'border-box',
  border: '1px solid ' + c.b1, borderRadius: 8, padding: '8px 10px',
};

export function Campo({ rotulo, obrigatorio, ajuda, erro, children, style }) {
  return (
    <label style={{ display: 'block', ...style }}>
      <span style={{ display: 'block', fontSize: 10.5, fontWeight: 'bold', color: c.t4, textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 6 }}>
        {rotulo}{obrigatorio && <span style={{ color: c.red }}> *</span>}
      </span>
      {children}
      {erro
        ? <span style={{ display: 'block', fontSize: 11, color: c.red, marginTop: 4 }}>{erro}</span>
        : ajuda && <span style={{ display: 'block', fontSize: 11, color: c.t5, marginTop: 4 }}>{ajuda}</span>}
    </label>
  );
}

export function Botao({ variante = 'primario', children, style, ...props }) {
  const v = {
    primario: { color: '#0B2223', background: c.teal, border: '1px solid ' + c.teal },
    secundario: { color: c.t3, background: c.white, border: '1px solid ' + c.b1 },
    perigo: { color: c.redText, background: c.white, border: '1px solid ' + c.redBorder },
    texto: { color: c.t4, background: 'none', border: '1px solid transparent' },
  }[variante];
  return (
    <button type="button" {...props} style={{
      font: 'inherit', fontSize: 12.5, fontWeight: 'bold', borderRadius: 8, padding: '9px 14px',
      cursor: props.disabled ? 'default' : 'pointer', opacity: props.disabled ? 0.6 : 1, whiteSpace: 'nowrap',
      ...v, ...style,
    }}>{children}</button>
  );
}

/** Caixa de aviso. tipo: 'erro' | 'ok' | 'info'. */
export function Alerta({ tipo = 'erro', children, onFechar }) {
  const t = {
    erro: { fg: c.redText, bg: c.redBg, border: c.redBorder },
    ok: { fg: c.greenText, bg: c.greenBg, border: c.greenBorder },
    info: { fg: c.tealText, bg: c.tealBg, border: c.tealBorder },
  }[tipo];
  return (
    <div role={tipo === 'erro' ? 'alert' : 'status'} style={{
      display: 'flex', alignItems: 'flex-start', gap: 12, fontSize: 12.5, lineHeight: 1.45,
      color: t.fg, background: t.bg, border: '1px solid ' + t.border, borderRadius: 9, padding: '10px 12px',
    }}>
      <div style={{ flex: 1 }}>{children}</div>
      {onFechar && (
        <button type="button" aria-label="Fechar aviso" onClick={onFechar} style={{ font: 'inherit', background: 'none', border: 'none', color: t.fg, cursor: 'pointer', fontSize: 12, padding: 0 }}>✕</button>
      )}
    </div>
  );
}

export function Modal({ largura, children }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(18,22,26,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, zIndex: 40 }}>
      <div role="dialog" aria-modal="true" style={{
        width: largura, maxWidth: '100%', maxHeight: '100%', overflow: 'auto',
        background: c.white, borderRadius: 14, boxShadow: '0 24px 64px rgba(12,16,20,0.38)',
      }}>{children}</div>
    </div>
  );
}
