'use client';

import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, Lock, Loader2, AlertCircle, Pencil } from 'lucide-react';
import { updateMeeting, Meeting, MeetingUpdatePayload } from '@/lib/api';

interface EditMeetingModalProps {
  meeting: Meeting | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdated: (updatedTitle: string) => void;
}

export default function EditMeetingModal({
  meeting,
  isOpen,
  onClose,
  onUpdated
}: EditMeetingModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('10:00');
  const [duration, setDuration] = useState('30');
  const [passcode, setPasscode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (meeting && isOpen) {
      setTitle(meeting.title || '');
      setDescription(meeting.description || '');
      setDuration((meeting.duration_minutes || 30).toString());
      setPasscode(meeting.passcode || '');
      setError(null);
      setLoading(false);

      if (meeting.scheduled_at) {
        try {
          const dt = new Date(meeting.scheduled_at);
          const y = dt.getFullYear();
          const m = String(dt.getMonth() + 1).padStart(2, '0');
          const d = String(dt.getDate()).padStart(2, '0');
          setDate(`${y}-${m}-${d}`);
          const hh = String(dt.getHours()).padStart(2, '0');
          const mm = String(dt.getMinutes()).padStart(2, '0');
          setTime(`${hh}:${mm}`);
        } catch {
          setDate(new Date().toISOString().split('T')[0]);
          setTime('10:00');
        }
      } else {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        setDate(tomorrow.toISOString().split('T')[0]);
        setTime('10:00');
      }
    }
  }, [meeting, isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !meeting) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError('Please provide a meeting topic.');
      return;
    }

    const durNum = parseInt(duration, 10);
    if (isNaN(durNum) || durNum <= 0) {
      setError('Duration must be greater than 0 minutes.');
      return;
    }

    const scheduledDateTime = new Date(`${date}T${time}:00`);
    const now = new Date();
    if (scheduledDateTime.getTime() < now.getTime() - 5 * 60 * 1000) {
      setError('Scheduled date and time cannot be in the past.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const payload: MeetingUpdatePayload = {
        title: trimmedTitle,
        description: description.trim() || undefined,
        scheduled_at: `${date}T${time}:00`,
        duration_minutes: durNum,
        passcode: passcode.trim() || undefined,
      };

      const code = meeting.meeting_code || meeting.meeting_id;
      await updateMeeting(code, payload);
      onUpdated(trimmedTitle);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update meeting. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.55)',
        backdropFilter: 'blur(3px)',
        padding: '16px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
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
          borderRadius: '12px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          animation: 'zoomFadeIn 0.15s ease-out'
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '18px 24px',
            borderBottom: '1px solid #E5E7EB'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Pencil size={18} style={{ color: '#0B5CFF' }} />
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#111827', margin: 0 }}>
              Edit Scheduled Meeting
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              padding: '6px',
              borderRadius: '50%',
              color: '#6B7280',
              background: 'none',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
          {error && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 14px',
              backgroundColor: '#FEF2F2',
              border: '1px solid #FCA5A5',
              borderRadius: '8px',
              color: '#DC2626',
              fontSize: '13px',
              marginBottom: '18px'
            }}>
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {/* Topic */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
              Topic <span style={{ color: '#DC2626' }}>*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={loading}
              required
              style={{
                width: '100%',
                padding: '9px 12px',
                fontSize: '14px',
                borderRadius: '8px',
                border: '1px solid #D1D5DB',
                backgroundColor: '#FFFFFF',
                color: '#111827',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Description */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={loading}
              rows={2}
              placeholder="Meeting agenda, notes..."
              style={{
                width: '100%',
                padding: '9px 12px',
                fontSize: '13px',
                borderRadius: '8px',
                border: '1px solid #D1D5DB',
                backgroundColor: '#FFFFFF',
                color: '#111827',
                outline: 'none',
                boxSizing: 'border-box',
                resize: 'vertical'
              }}
            />
          </div>

          {/* Date & Time Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                disabled={loading}
                min={new Date().toISOString().split('T')[0]}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  fontSize: '13px',
                  borderRadius: '8px',
                  border: '1px solid #D1D5DB',
                  backgroundColor: '#FFFFFF',
                  color: '#111827',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                Time
              </label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  fontSize: '13px',
                  borderRadius: '8px',
                  border: '1px solid #D1D5DB',
                  backgroundColor: '#FFFFFF',
                  color: '#111827',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          {/* Duration & Passcode Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '24px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                Duration
              </label>
              <select
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  fontSize: '13px',
                  borderRadius: '8px',
                  border: '1px solid #D1D5DB',
                  backgroundColor: '#FFFFFF',
                  color: '#111827',
                  outline: 'none',
                  boxSizing: 'border-box'
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
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                Passcode
              </label>
              <input
                type="text"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  fontSize: '13px',
                  borderRadius: '8px',
                  border: '1px solid #D1D5DB',
                  backgroundColor: '#FFFFFF',
                  color: '#111827',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              style={{
                padding: '9px 18px',
                borderRadius: '9999px',
                border: '1px solid #D1D5DB',
                backgroundColor: '#FFFFFF',
                color: '#374151',
                fontSize: '13px',
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer'
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
                borderRadius: '9999px',
                backgroundColor: '#0B5CFF',
                color: '#FFFFFF',
                fontSize: '13px',
                fontWeight: 600,
                border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: '0 2px 6px rgba(11, 92, 255, 0.3)'
              }}
            >
              {loading ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
