import React from 'react';

const palette = {
  success: { bg: '#ecfdf5', border: '#a7f3d0', text: '#065f46' },
  error: { bg: '#fef2f2', border: '#fee2e2', text: '#991b1b' },
  warning: { bg: '#fff7ed', border: '#ffedd5', text: '#9a3412' }
};

export default function InlineNotice({ type = 'success', children, actionLabel, onAction }) {
  const colors = palette[type] || palette.success;
  return (
    <div
      role="alert"
      aria-live="polite"
      style={{
        background: colors.bg,
        border: `1px solid ${colors.border}`,
        color: colors.text,
        borderRadius: '12px',
        padding: '10px 12px',
        fontSize: 13,
        display: 'flex',
        alignItems: 'center',
        gap: 12
      }}
    >
      <span style={{ lineHeight: 1.4 }}>{children}</span>
      {actionLabel && (
        <button
          onClick={onAction}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#4f46e5',
            cursor: 'pointer',
            fontWeight: 600,
            padding: 0
          }}
          aria-label={actionLabel}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}


