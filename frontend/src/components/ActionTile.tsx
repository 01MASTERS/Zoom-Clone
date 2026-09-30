'use client';

import React from 'react';

interface ActionTileProps {
  icon: React.ReactNode;
  label: string;
  variant?: 'orange' | 'blue' | 'gray';
  onClick: () => void;
  disabled?: boolean;
  title?: string;
}

export default function ActionTile({
  icon,
  label,
  variant = 'blue',
  onClick,
  disabled = false,
  title
}: ActionTileProps) {
  const getBgColor = () => {
    if (disabled) return '#9CA3AF';
    switch (variant) {
      case 'orange':
        return '#F26D21';
      case 'blue':
        return '#0B5CFF';
      case 'gray':
        return '#4B5563';
      default:
        return '#0B5CFF';
    }
  };

  const getHoverColor = () => {
    if (disabled) return '#9CA3AF';
    switch (variant) {
      case 'orange':
        return '#D95A10';
      case 'blue':
        return '#004FD6';
      case 'gray':
        return '#374151';
      default:
        return '#004FD6';
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        title={title || label}
        style={{
          width: '64px',
          height: '64px',
          borderRadius: '20px',
          backgroundColor: getBgColor(),
          border: 'none',
          color: '#FFFFFF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: disabled ? 'not-allowed' : 'pointer',
          boxShadow: disabled ? 'none' : '0 4px 12px rgba(0, 0, 0, 0.12)',
          transition: 'transform 0.15s ease, background-color 0.15s ease',
          outline: 'none',
        }}
        onMouseEnter={(e) => {
          if (!disabled) {
            e.currentTarget.style.backgroundColor = getHoverColor();
            e.currentTarget.style.transform = 'translateY(-2px)';
          }
        }}
        onMouseLeave={(e) => {
          if (!disabled) {
            e.currentTarget.style.backgroundColor = getBgColor();
            e.currentTarget.style.transform = 'translateY(0)';
          }
        }}
      >
        {icon}
      </button>
      <span style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>
        {label}
      </span>
    </div>
  );
}
