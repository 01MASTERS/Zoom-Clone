'use client';

import React, { useState, useEffect } from 'react';
import { X, User, Mic, Video, CheckCircle2, ShieldCheck, Laptop } from 'lucide-react';

interface ProfileSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShowToast: (msg: string) => void;
}

export default function ProfileSettingsModal({
  isOpen,
  onClose,
  onShowToast,
}: ProfileSettingsModalProps) {
  const [displayName, setDisplayName] = useState('Alex Rivera');
  const [micDevice, setMicDevice] = useState<string>('Default Microphone');
  const [camDevice, setCamDevice] = useState<string>('Default Camera');
  const [deviceCheckComplete, setDeviceCheckComplete] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    // Load saved display name
    try {
      const saved = localStorage.getItem('zoom_display_name');
      if (saved) setDisplayName(saved);
    } catch {}

    // Check media devices
    if (typeof navigator !== 'undefined' && navigator.mediaDevices?.enumerateDevices) {
      navigator.mediaDevices.enumerateDevices().then((devices) => {
        const audioInput = devices.find((d) => d.kind === 'audioinput');
        const videoInput = devices.find((d) => d.kind === 'videoinput');

        if (audioInput?.label) setMicDevice(audioInput.label);
        else if (audioInput) setMicDevice('Microphone Connected');

        if (videoInput?.label) setCamDevice(videoInput.label);
        else if (videoInput) setCamDevice('Camera Connected');

        setDeviceCheckComplete(true);
      }).catch(() => {
        setDeviceCheckComplete(true);
      });
    } else {
      setDeviceCheckComplete(true);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = displayName.trim();
    if (!trimmed) return;

    try {
      localStorage.setItem('zoom_display_name', trimmed);
      window.dispatchEvent(new Event('zoom_name_updated'));
      onShowToast('Profile preferences saved successfully!');
    } catch {}

    onClose();
  };

  const initials = displayName
    .trim()
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('') || 'AR';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.55)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '16px',
        animation: 'zoomFadeIn 0.2s ease',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '520px',
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
          border: '1px solid #E5E7EB',
          overflow: 'hidden',
          animation: 'zoomPopIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '20px 24px',
            borderBottom: '1px solid #F3F4F6',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                backgroundColor: 'var(--zoom-blue-light)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--zoom-blue)',
              }}
            >
              <User size={18} />
            </div>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#111827' }}>
                Profile & Settings
              </h2>
              <span style={{ fontSize: '12px', color: '#6B7280' }}>
                Manage your conference identity and hardware preferences
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            title="Close"
            style={{
              padding: '6px',
              borderRadius: '8px',
              color: '#9CA3AF',
              transition: 'background-color 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F3F4F6')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body Form */}
        <form onSubmit={handleSave} style={{ padding: '24px' }}>
          {/* User Badge Section */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              padding: '16px',
              backgroundColor: '#F9FAFB',
              borderRadius: '12px',
              border: '1px solid #E5E7EB',
              marginBottom: '20px',
            }}
          >
            <div
              style={{
                width: '54px',
                height: '54px',
                borderRadius: '50%',
                backgroundColor: 'var(--zoom-blue)',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px',
                fontWeight: 700,
                boxShadow: '0 4px 10px rgba(14, 113, 235, 0.3)',
                flexShrink: 0,
              }}
            >
              {initials}
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '16px', fontWeight: 700, color: '#111827' }}>
                  {displayName}
                </span>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: '10px',
                    backgroundColor: '#ECFDF5',
                    color: '#059669',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <ShieldCheck size={11} />
                  Host
                </span>
              </div>
              <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '2px' }}>
                PMI: <strong>849 203 1192</strong> • Free Enterprise Plan
              </div>
            </div>
          </div>

          {/* Display Name Input */}
          <div style={{ marginBottom: '22px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 600,
                color: '#374151',
                marginBottom: '6px',
              }}
            >
              Your Display Name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Alex Rivera"
              maxLength={40}
              required
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '10px',
                border: '1.5px solid #D1D5DB',
                fontSize: '14px',
                color: '#111827',
                outline: 'none',
                transition: 'border-color 0.15s ease',
              }}
              onFocus={(e) => (e.target.style.borderColor = 'var(--zoom-blue)')}
              onBlur={(e) => (e.target.style.borderColor = '#D1D5DB')}
            />
            <span style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '4px', display: 'block' }}>
              This name will be displayed across upcoming meetings, waiting rooms, and in-room chat.
            </span>
          </div>

          {/* Hardware & System Status */}
          <div style={{ marginBottom: '24px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 600,
                color: '#374151',
                marginBottom: '10px',
              }}
            >
              Hardware & WebRTC Status
            </label>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {/* Microphone */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  backgroundColor: '#F9FAFB',
                  borderRadius: '10px',
                  border: '1px solid #E5E7EB',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Mic size={15} color="#4B5563" />
                  <span style={{ fontSize: '13px', color: '#374151', fontWeight: 500 }}>
                    {micDevice}
                  </span>
                </div>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: '#059669',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <CheckCircle2 size={12} />
                  Ready
                </span>
              </div>

              {/* Camera */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  backgroundColor: '#F9FAFB',
                  borderRadius: '10px',
                  border: '1px solid #E5E7EB',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Video size={15} color="#4B5563" />
                  <span style={{ fontSize: '13px', color: '#374151', fontWeight: 500 }}>
                    {camDevice}
                  </span>
                </div>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: '#059669',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <CheckCircle2 size={12} />
                  Ready
                </span>
              </div>

              {/* System WebRTC */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  backgroundColor: '#F9FAFB',
                  borderRadius: '10px',
                  border: '1px solid #E5E7EB',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Laptop size={15} color="#4B5563" />
                  <span style={{ fontSize: '13px', color: '#374151', fontWeight: 500 }}>
                    Native WebRTC Engine
                  </span>
                </div>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: '#059669',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <CheckCircle2 size={12} />
                  Supported
                </span>
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '12px',
              paddingTop: '16px',
              borderTop: '1px solid #F3F4F6',
            }}
          >
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '9px 18px',
                borderRadius: '8px',
                border: '1px solid #D1D5DB',
                backgroundColor: '#FFFFFF',
                color: '#374151',
                fontSize: '13px',
                fontWeight: 600,
              }}
            >
              Cancel
            </button>

            <button
              type="submit"
              style={{
                padding: '9px 22px',
                borderRadius: '8px',
                backgroundColor: 'var(--zoom-blue)',
                color: '#FFFFFF',
                fontSize: '13px',
                fontWeight: 600,
                boxShadow: '0 2px 6px rgba(14, 113, 235, 0.3)',
              }}
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
