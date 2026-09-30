'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Video, Search, Settings } from 'lucide-react';
import ProfileSettingsModal from './ProfileSettingsModal';
import Toast from '@/components/common/Toast';

interface WorkplaceNavbarProps {
  onShowToast?: (msg: string) => void;
}

export default function WorkplaceNavbar({ onShowToast }: WorkplaceNavbarProps) {
  const [userName, setUserName] = useState('Alex Rivera');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [localToast, setLocalToast] = useState<string | null>(null);

  useEffect(() => {
    const loadName = () => {
      if (typeof window !== 'undefined') {
        try {
          const saved = localStorage.getItem('zoom_display_name');
          if (saved) setUserName(saved);
        } catch {}
      }
    };

    loadName();
    window.addEventListener('zoom_name_updated', loadName);
    window.addEventListener('storage', loadName);
    return () => {
      window.removeEventListener('zoom_name_updated', loadName);
      window.removeEventListener('storage', loadName);
    };
  }, []);

  const handleShowToast = (msg: string) => {
    if (onShowToast) {
      onShowToast(msg);
    } else {
      setLocalToast(msg);
    }
  };

  const initials = userName
    .trim()
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('') || 'AR';

  return (
    <>
      <header
        className="workplace-navbar"
        style={{
          height: '60px',
          backgroundColor: '#FFFFFF',
          borderBottom: '1px solid #EBECEF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 28px',
          position: 'sticky',
          top: 0,
          zIndex: 50,
        }}
      >
        {/* Left: Zoom Brand Logo */}
        <Link
          href="/"
          title="Zoom Home"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            textDecoration: 'none',
            cursor: 'pointer',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '34px',
              height: '34px',
              borderRadius: '10px',
              backgroundColor: '#0E71EB',
              color: '#FFFFFF',
              boxShadow: '0 2px 6px rgba(14, 113, 235, 0.3)',
            }}
          >
            <Video size={18} fill="#FFFFFF" />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '5px' }}>
            <span
              style={{
                fontSize: '24px',
                fontWeight: 800,
                color: '#0E71EB',
                letterSpacing: '-0.8px',
                lineHeight: 1,
              }}
            >
              zoom
            </span>
            <span
              style={{
                fontSize: '16px',
                fontWeight: 600,
                color: '#1F2937',
                letterSpacing: '-0.2px',
              }}
            >
              Workplace
            </span>
          </div>
        </Link>

        {/* Center: Search meetings placeholder */}
        <div
          className="navbar-search-box"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            backgroundColor: '#F3F4F6',
            borderRadius: 'var(--zoom-radius-pill)',
            padding: '7px 18px',
            width: '340px',
            border: '1px solid #E5E7EB',
          }}
        >
          <Search size={15} color="#9CA3AF" />
          <input
            type="text"
            placeholder="Search meetings, contacts..."
            style={{
              border: 'none',
              outline: 'none',
              background: 'transparent',
              width: '100%',
              fontSize: '13px',
              color: '#1F2937',
            }}
          />
        </div>

        {/* Right: Settings & Profile Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Settings button */}
          <button
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            title="Settings & Hardware Preferences"
            style={{
              background: 'none',
              border: 'none',
              color: '#4B5563',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#F3F4F6';
              e.currentTarget.style.color = '#0E71EB';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#4B5563';
            }}
          >
            <Settings size={20} />
          </button>

          {/* Profile Avatar & Name Button */}
          <button
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            title="Account Profile & Settings"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              cursor: 'pointer',
              padding: '4px 10px',
              borderRadius: '24px',
              transition: 'background-color 0.15s ease',
              border: 'none',
              background: 'transparent',
              textAlign: 'left',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F3F4F6')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <div style={{ position: 'relative' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  backgroundColor: '#0E71EB',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '13px',
                  fontWeight: 700,
                  boxShadow: '0 2px 6px rgba(14, 113, 235, 0.25)',
                }}
              >
                {initials}
              </div>
              {/* Green Online Status Indicator Dot */}
              <span
                style={{
                  position: 'absolute',
                  bottom: '0px',
                  right: '0px',
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  backgroundColor: '#10B981',
                  border: '2px solid #FFFFFF',
                }}
              />
            </div>

            <div className="navbar-profile-text" style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#1F2937', lineHeight: 1.2 }}>
                {userName}
              </span>
              <span style={{ fontSize: '11px', color: '#6B7280' }}>
                Host Account
              </span>
            </div>
          </button>
        </div>
      </header>

      {/* Profile & Settings Modal */}
      <ProfileSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onShowToast={handleShowToast}
      />

      {/* Local Toast if needed */}
      {localToast && (
        <Toast
          message={localToast}
          type="success"
          onClose={() => setLocalToast(null)}
        />
      )}
    </>
  );
}
