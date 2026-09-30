'use client';

import React, { useState, useEffect } from 'react';
import { X, Calendar, Loader2, AlertCircle } from 'lucide-react';
import { scheduleMeeting, SchedulePayload } from '@/lib/api';

interface ScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScheduleSuccess: (title: string) => void;
  onShowToast: (msg: string) => void;
}

export default function ScheduleModal({
  isOpen,
  onClose,
  onScheduleSuccess,
  onShowToast,
}: ScheduleModalProps) {
  // Compute default date (tomorrow) in user's local timezone
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const year = tomorrow.getFullYear();
  const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
  const day = String(tomorrow.getDate()).padStart(2, '0');
  const defaultDateStr = `${year}-${month}-${day}`;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(defaultDateStr);
  const [time, setTime] = useState('10:00');
  const [duration, setDuration] = useState('30');
  const [passcode, setPasscode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setTitle("Alex Rivera's Zoom Meeting");
      setDescription('');
      setDate(defaultDateStr);
      setTime('10:00');
      setDuration('30');
      setPasscode(Math.floor(100000 + Math.random() * 900000).toString());
      setError(null);
      setLoading(false);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Please provide a meeting topic.');
      return;
    }

    const durNum = parseInt(duration, 10);
    if (isNaN(durNum) || durNum <= 0) {
      setError('Duration must be greater than 0 minutes.');
      return;
    }

    const scheduledDateTimeObj = new Date(`${date}T${time}:00`);
    const now = new Date();
    if (scheduledDateTimeObj.getTime() < now.getTime() - 5 * 60 * 1000) {
      setError('Scheduled date and time cannot be in the past.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Preserve exact local date & time without UTC skew
      const scheduledDateTime = `${date}T${time}:00`;

      const payload: SchedulePayload = {
        title: title.trim(),
        description: description.trim() || undefined,
        scheduled_at: scheduledDateTime,
        duration_minutes: parseInt(duration, 10) || 30,
        passcode: passcode.trim() || undefined,
        host_name: 'Alex Rivera (Host)',
      };

      await scheduleMeeting(payload);
      onShowToast(`Meeting "${payload.title}" scheduled successfully!`);
      onScheduleSuccess(payload.title);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to schedule meeting. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.55)',
        backdropFilter: 'blur(3px)',
        padding: '16px',
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
          borderRadius: 'var(--zoom-radius-lg)',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          animation: 'zoomFadeIn 0.15s ease-out',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '18px 24px',
            borderBottom: '1px solid var(--zoom-border-subtle)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={18} color="var(--zoom-blue)" />
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--zoom-text-primary)' }}>
              Schedule Meeting
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              padding: '6px',
              borderRadius: '50%',
              color: 'var(--zoom-text-secondary)',
              transition: 'background-color 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--zoom-input-bg)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body (Scrollable if viewport is small) */}
        <form onSubmit={handleSubmit} autoComplete="off" data-lpignore="true" style={{ padding: '24px', overflowY: 'auto' }}>
          {error && (
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                padding: '12px 14px',
                borderRadius: 'var(--zoom-radius-md)',
                backgroundColor: 'var(--zoom-red-light)',
                border: '1px solid rgba(224, 32, 32, 0.25)',
                color: 'var(--zoom-red)',
                fontSize: '13px',
                marginBottom: '18px',
              }}
            >
              <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '1px' }} />
              <div>{error}</div>
            </div>
          )}

          {/* Topic */}
          <div style={{ marginBottom: '16px' }}>
            <label
              htmlFor="schedule-title"
              style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 600,
                color: 'var(--zoom-text-primary)',
                marginBottom: '6px',
              }}
            >
              Topic <span style={{ color: 'var(--zoom-red)' }}>*</span>
            </label>
            <input
              id="schedule-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Weekly Engineering Sync"
              required
              autoComplete="off"
              data-lpignore="true"
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 'var(--zoom-radius-md)',
                border: '1px solid var(--zoom-border)',
                backgroundColor: '#FFFFFF',
                color: 'var(--zoom-text-primary)',
                fontSize: '14px',
                outline: 'none',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'var(--zoom-blue)';
                e.target.style.boxShadow = '0 0 0 2px var(--zoom-blue-light)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'var(--zoom-border)';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>

          {/* Description */}
          <div style={{ marginBottom: '16px' }}>
            <label
              htmlFor="schedule-desc"
              style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 600,
                color: 'var(--zoom-text-primary)',
                marginBottom: '6px',
              }}
            >
              Description (Optional)
            </label>
            <textarea
              id="schedule-desc"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add agenda or conference notes..."
              autoComplete="off"
              data-lpignore="true"
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 'var(--zoom-radius-md)',
                border: '1px solid var(--zoom-border)',
                backgroundColor: '#FFFFFF',
                color: 'var(--zoom-text-primary)',
                fontSize: '13px',
                outline: 'none',
                resize: 'none',
                fontFamily: 'inherit',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'var(--zoom-blue)';
                e.target.style.boxShadow = '0 0 0 2px var(--zoom-blue-light)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'var(--zoom-border)';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>

          {/* Date & Time Row */}
          <div className="modal-datetime-grid" style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '14px', marginBottom: '16px' }}>
            <div>
              <label
                htmlFor="schedule-date"
                style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'var(--zoom-text-primary)',
                  marginBottom: '6px',
                }}
              >
                Date
              </label>
              <input
                id="schedule-date"
                type="date"
                value={date}
                autoComplete="off"
                data-lpignore="true"
                onChange={(e) => setDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 'var(--zoom-radius-md)',
                  border: '1px solid var(--zoom-border)',
                  backgroundColor: '#FFFFFF',
                  color: 'var(--zoom-text-primary)',
                  fontSize: '13px',
                  outline: 'none',
                }}
              />
            </div>

            <div>
              <label
                htmlFor="schedule-time"
                style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'var(--zoom-text-primary)',
                  marginBottom: '6px',
                }}
              >
                Time
              </label>
              <input
                id="schedule-time"
                type="time"
                value={time}
                autoComplete="off"
                data-lpignore="true"
                onChange={(e) => setTime(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 'var(--zoom-radius-md)',
                  border: '1px solid var(--zoom-border)',
                  backgroundColor: '#FFFFFF',
                  color: 'var(--zoom-text-primary)',
                  fontSize: '13px',
                  outline: 'none',
                }}
              />
            </div>
          </div>

          {/* Duration & Security Row */}
          <div className="modal-datetime-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '24px' }}>
            <div>
              <label
                htmlFor="schedule-duration"
                style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'var(--zoom-text-primary)',
                  marginBottom: '6px',
                }}
              >
                Duration
              </label>
              <select
                id="schedule-duration"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 'var(--zoom-radius-md)',
                  border: '1px solid var(--zoom-border)',
                  backgroundColor: '#FFFFFF',
                  color: 'var(--zoom-text-primary)',
                  fontSize: '13px',
                  outline: 'none',
                }}
              >
                <option value="15">15 minutes</option>
                <option value="30">30 minutes</option>
                <option value="45">45 minutes</option>
                <option value="60">1 hour</option>
                <option value="90">1.5 hours</option>
                <option value="120">2 hours</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="schedule-passcode"
                style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'var(--zoom-text-primary)',
                  marginBottom: '6px',
                }}
              >
                Passcode
              </label>
              <input
                id="schedule-passcode"
                type="text"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder="Passcode"
                autoComplete="off"
                data-lpignore="true"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 'var(--zoom-radius-md)',
                  border: '1px solid var(--zoom-border)',
                  backgroundColor: '#FFFFFF',
                  color: 'var(--zoom-text-primary)',
                  fontSize: '13px',
                  outline: 'none',
                }}
              />
            </div>
          </div>

          {/* Actions Footer */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              style={{
                padding: '9px 18px',
                borderRadius: 'var(--zoom-radius-pill)',
                border: '1px solid var(--zoom-border)',
                backgroundColor: '#FFFFFF',
                color: 'var(--zoom-text-primary)',
                fontSize: '13px',
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 24px',
                borderRadius: 'var(--zoom-radius-pill)',
                backgroundColor: 'var(--zoom-blue)',
                color: '#FFFFFF',
                fontSize: '13px',
                fontWeight: 600,
                border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: '0 2px 6px rgba(14, 113, 235, 0.3)',
                opacity: loading ? 0.75 : 1,
              }}
            >
              {loading ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  <span>Scheduling...</span>
                </>
              ) : (
                <span>Save Meeting</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
