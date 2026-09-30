'use client';

import React, { useEffect, useRef } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

interface ToastProps {
  message: string;
  onClose: () => void;
  duration?: number;
  type?: 'success' | 'error' | 'warning' | 'info';
}

export default function Toast({ message, onClose, duration = 15000, type = 'success' }: ToastProps) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (duration <= 0) return;
    const timer = setTimeout(() => {
      onCloseRef.current();
    }, duration);
    return () => clearTimeout(timer);
  }, [duration]);

  const renderIcon = () => {
    switch (type) {
      case 'error':
        return <AlertCircle size={18} color="#EF4444" style={{ flexShrink: 0 }} />;
      case 'warning':
        return <AlertTriangle size={18} color="#F59E0B" style={{ flexShrink: 0 }} />;
      case 'info':
        return <Info size={18} color="#0E71EB" style={{ flexShrink: 0 }} />;
      case 'success':
      default:
        return <CheckCircle2 size={18} color="#10B981" style={{ flexShrink: 0 }} />;
    }
  };

  const getBorderColor = () => {
    switch (type) {
      case 'error':
        return 'rgba(239, 68, 68, 0.4)';
      case 'warning':
        return 'rgba(245, 158, 11, 0.4)';
      case 'info':
        return 'rgba(14, 113, 235, 0.4)';
      case 'success':
      default:
        return 'rgba(16, 185, 129, 0.3)';
    }
  };

  return (
    <div
      className="zoom-toast-container"
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        backgroundColor: '#1E2228',
        color: '#FFFFFF',
        padding: '12px 18px',
        borderRadius: '10px',
        boxShadow: '0 12px 32px rgba(0, 0, 0, 0.45)',
        border: `1px solid ${getBorderColor()}`,
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        zIndex: 9999,
        animation: 'zoomFadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        fontSize: '13px',
        fontWeight: 500,
        maxWidth: '420px',
      }}
    >
      {renderIcon()}
      <span style={{ flex: 1, lineHeight: 1.4 }}>{message}</span>
      <button
        type="button"
        onClick={onClose}
        title="Dismiss"
        style={{
          color: 'rgba(255, 255, 255, 0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '4px',
          borderRadius: '4px',
          marginLeft: '4px',
          cursor: 'pointer',
          flexShrink: 0,
          transition: 'all 0.15s ease',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = '#FFFFFF')}
        onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255, 255, 255, 0.6)')}
      >
        <X size={15} />
      </button>
    </div>
  );
}
