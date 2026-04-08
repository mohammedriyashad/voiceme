// src/components/ui.jsx — Warm light theme UI components
import React from 'react'

// ── Card ─────────────────────────────────────────────────────
export function Card({ children, style, glow }) {
  return (
    <div style={{
      background: 'var(--card)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius)',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      boxShadow: glow ? 'var(--shadow-md)' : 'var(--shadow-sm)',
      ...style,
    }}>
      {children}
    </div>
  )
}

export function CardHeader({ icon, title, right }) {
  return (
    <div style={{
      padding: '10px 14px',
      borderBottom: '1px solid var(--border)',
      display: 'flex', alignItems: 'center', gap: 8,
      background: 'rgba(244,132,95,0.04)',
      flexShrink: 0,
    }}>
      {icon && <span style={{ fontSize: 16 }}>{icon}</span>}
      <span style={{
        fontSize: 10, fontWeight: 800,
        letterSpacing: '1.5px', textTransform: 'uppercase',
        color: 'var(--muted)', fontFamily: 'var(--font)',
      }}>{title}</span>
      {right && (
        <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>{right}</div>
      )}
    </div>
  )
}

export function CardBody({ children, style }) {
  return (
    <div style={{ flex: 1, overflow: 'hidden', padding: 12, ...style }}>
      {children}
    </div>
  )
}

// ── Button ────────────────────────────────────────────────────
const BTN_VARIANTS = {
  primary: {
    background: 'linear-gradient(135deg, var(--primary), var(--primary2))',
    color: 'white',
    border: 'none',
    boxShadow: '0 3px 10px rgba(244,132,95,0.35)',
  },
  secondary: {
    background: 'linear-gradient(135deg, var(--accent), #4A90C4)',
    color: 'white',
    border: 'none',
    boxShadow: '0 3px 10px rgba(91,164,207,0.3)',
  },
  ghost: {
    background: 'var(--surface)',
    border: '1.5px solid var(--border2)',
    color: 'var(--text2)',
  },
  danger: {
    background: 'rgba(224,82,82,0.1)',
    border: '1.5px solid rgba(224,82,82,0.3)',
    color: 'var(--red)',
  },
  green: {
    background: 'rgba(91,168,126,0.12)',
    border: '1.5px solid rgba(91,168,126,0.35)',
    color: 'var(--green)',
  },
  amber: {
    background: 'rgba(245,185,66,0.12)',
    border: '1.5px solid rgba(245,185,66,0.35)',
    color: '#B8860B',
  },
}

export function Btn({ children, variant = 'ghost', size = 'md', onClick, disabled, style }) {
  return (
    <button
      disabled={disabled}
      onClick={disabled ? undefined : onClick}
      style={{
        border: 'none',
        borderRadius: size === 'sm' ? 8 : 'var(--radius-sm)',
        padding: size === 'sm' ? '4px 10px' : '8px 16px',
        fontFamily: 'var(--font)',
        fontSize: size === 'sm' ? 11 : 12,
        fontWeight: 700,
        cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'inline-flex', alignItems: 'center', gap: 6,
        transition: 'all .2s',
        opacity: disabled ? .5 : 1,
        ...BTN_VARIANTS[variant],
        ...style,
      }}
      onMouseEnter={e => { if(!disabled) e.currentTarget.style.transform = 'translateY(-1px)' }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'none' }}
    >
      {children}
    </button>
  )
}

// ── Status Dot ────────────────────────────────────────────────
export function StatusDot({ active, warn }) {
  const color = warn ? 'var(--amber)' : active ? 'var(--green)' : 'var(--muted2)'
  return (
    <span style={{
      width: 7, height: 7, borderRadius: '50%',
      background: color, display: 'inline-block', flexShrink: 0,
      boxShadow: active || warn ? `0 0 6px ${color}` : 'none',
      animation: active || warn ? 'pulse 1.8s infinite' : 'none',
    }}/>
  )
}

export function StatusPill({ label, active, warn }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 5,
      background: 'var(--card)',
      border: '1.5px solid var(--border)',
      borderRadius: 20, padding: '4px 11px',
      fontSize: 10, fontWeight: 700,
      color: active ? 'var(--text2)' : 'var(--muted)',
      boxShadow: 'var(--shadow-sm)',
    }}>
      <StatusDot active={active} warn={warn}/>
      {label}
    </div>
  )
}

// ── Stat Card ─────────────────────────────────────────────────
export function StatCard({ value, label, color = 'var(--primary)', icon }) {
  return (
    <div style={{
      background: 'var(--card)',
      border: '1.5px solid var(--border)',
      borderRadius: 12, padding: '10px 12px',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', gap: 3,
      boxShadow: 'var(--shadow-sm)',
    }}>
      {icon && <span style={{ fontSize: 18 }}>{icon}</span>}
      <div style={{ fontSize: 20, fontWeight: 900, color }}>{value}</div>
      <div style={{ fontSize: 9, color: 'var(--muted)', letterSpacing: '.5px', textTransform: 'uppercase', fontWeight: 700 }}>
        {label}
      </div>
    </div>
  )
}

// ── Signal Box ────────────────────────────────────────────────
export function SignalBox({ title, icon, name, meaning, hints = [] }) {
  return (
    <div style={{
      background: 'var(--card)',
      border: '1.5px solid var(--border)',
      borderRadius: 14, padding: 12,
      boxShadow: 'var(--shadow-sm)',
    }}>
      <div style={{
        fontSize: 9, fontWeight: 800, letterSpacing: '1.5px',
        textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 8,
      }}>{title}</div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        background: 'linear-gradient(135deg,rgba(244,132,95,.06),rgba(91,164,207,.06))',
        border: '1.5px solid var(--border)',
        borderRadius: 10, padding: '9px 11px', marginBottom: 8,
      }}>
        <span style={{ fontSize: 26 }}>{icon}</span>
        <div>
          <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--primary)' }}>{name}</div>
          <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 1 }}>{meaning}</div>
        </div>
      </div>
      {hints.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
          {hints.map((h, i) => (
            <div key={i} style={{
              fontSize: 9, color: 'var(--muted2)',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 6, padding: '3px 7px',
            }}>
              {h.icon} → <span style={{ color: 'var(--text2)', fontWeight: 700 }}>{h.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Fusion Row ────────────────────────────────────────────────
export function FusionRow({ label, value, active }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 7,
      padding: '5px 0', borderBottom: '1px solid var(--border)',
      fontSize: 11,
    }}>
      <div style={{
        color: 'var(--muted)', width: 64, fontSize: 9,
        flexShrink: 0, paddingTop: 2, letterSpacing: '.5px',
        textTransform: 'uppercase', fontWeight: 700,
      }}>{label}</div>
      <div style={{
        color: active ? 'var(--primary)' : 'var(--text2)',
        fontWeight: active ? 700 : 500,
        flex: 1, wordBreak: 'break-word', fontSize: 10,
      }}>{value || '—'}</div>
    </div>
  )
}

// ── Toast ─────────────────────────────────────────────────────
export function Toast({ message, type = 'success', onClose }) {
  React.useEffect(() => {
    const t = setTimeout(onClose, 3500)
    return () => clearTimeout(t)
  }, [onClose])

  const colors = {
    success: { bg: 'rgba(91,168,126,.12)', border: 'rgba(91,168,126,.4)', text: 'var(--green)' },
    error:   { bg: 'rgba(224,82,82,.10)',  border: 'rgba(224,82,82,.4)',  text: 'var(--red)'   },
    warning: { bg: 'rgba(245,185,66,.12)', border: 'rgba(245,185,66,.4)', text: '#B8860B'      },
  }
  const c = colors[type] || colors.success

  return (
    <div style={{
      position: 'fixed', bottom: 20, right: 20, zIndex: 999,
      background: c.bg, border: `1.5px solid ${c.border}`,
      borderRadius: 12, padding: '10px 18px',
      fontSize: 12, fontWeight: 700, color: c.text,
      animation: 'slideUp .3s ease',
      boxShadow: 'var(--shadow-lg)',
    }}>{message}</div>
  )
}

// ── Modal ─────────────────────────────────────────────────────
export function Modal({ show, onClose, title, children }) {
  if (!show) return null
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0,
      background: 'rgba(61,43,31,0.4)',
      zIndex: 100, display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      backdropFilter: 'blur(6px)',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'var(--card)',
        border: '2px solid var(--border)',
        borderRadius: 20, padding: 26,
        width: 440, maxWidth: '95vw',
        maxHeight: '85vh', overflowY: 'auto',
        animation: 'slideUp .25s ease',
        boxShadow: 'var(--shadow-lg)',
      }}>
        <div style={{ fontSize: 17, fontWeight: 900, marginBottom: 18, color: 'var(--text)' }}>
          {title}
        </div>
        {children}
      </div>
    </div>
  )
}

// ── Input ─────────────────────────────────────────────────────
export function Input({ label, ...props }) {
  return (
    <div style={{ marginBottom: 14 }}>
      {label && (
        <label style={{
          fontSize: 10, fontWeight: 800, letterSpacing: '.8px',
          textTransform: 'uppercase', color: 'var(--muted)',
          display: 'block', marginBottom: 6,
        }}>{label}</label>
      )}
      <input style={{
        background: 'var(--surface)',
        border: '1.5px solid var(--border2)',
        borderRadius: 'var(--radius-sm)',
        padding: '9px 13px',
        color: 'var(--text)',
        fontFamily: 'var(--font)',
        fontSize: 13, outline: 'none', width: '100%',
        transition: 'border .2s',
      }}
      onFocus={e => e.target.style.borderColor = 'var(--primary)'}
      onBlur={e => e.target.style.borderColor = 'var(--border2)'}
      {...props}/>
    </div>
  )
}

// ── Skeleton ──────────────────────────────────────────────────
export function Skeleton({ w = '100%', h = 40, r = 8 }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: r,
      background: 'linear-gradient(90deg,var(--surface) 25%,var(--border) 50%,var(--surface) 75%)',
      backgroundSize: '400px 100%',
      animation: 'shimmer 1.4s infinite',
    }}/>
  )
}

// ── Typing Indicator ─────────────────────────────────────────
export function TypingIndicator() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '8px 12px' }}>
      {[0, 1, 2].map(i => (
        <span key={i} style={{
          width: 8, height: 8, borderRadius: '50%',
          background: 'var(--primary)',
          display: 'inline-block',
          animation: `typingDot .8s ease ${i * 0.15}s infinite`,
        }}/>
      ))}
    </div>
  )
}