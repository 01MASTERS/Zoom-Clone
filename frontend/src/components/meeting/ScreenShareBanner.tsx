'use client';

import React from 'react';
import { Share2 } from 'lucide-react';

interface ScreenShareBannerProps {
  onStopShare: () => void;
}

export default function ScreenShareBanner({ onStopShare }: ScreenShareBannerProps) {
  return (
    <div
      style={{
        position: 'absolute',
        top: '16px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 80,
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '6px 16px',
        borderRadius: 'var(--zoom-radius-pill)',
        backgroundColor: '#10B981',
        color: '#FFFFFF',
        boxShadow: '0 4px 16px rgba(16, 185, 129, 0.4)',
        animation: 'zoomFadeIn 0.2s ease-out',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Share2 size={16} />
        <span style={{ fontSize: '13px', fontWeight: 600 }}>
          You are sharing your screen
        </span>
      </div>

      <button
        type="button"
        onClick={onStopShare}
        style={{
          padding: '4px 12px',
          borderRadius: 'var(--zoom-radius-pill)',
          backgroundColor: 'var(--zoom-red)',
          color: '#FFFFFF',
          fontSize: '12px',
          fontWeight: 700,
          border: 'none',
          boxShadow: '0 2px 6px rgba(0, 0, 0, 0.25)',
          transition: 'background-color 0.15s ease',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--zoom-red-hover)')}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--zoom-red)')}
      >
        Stop Share
      </button>
    </div>
  );
}
