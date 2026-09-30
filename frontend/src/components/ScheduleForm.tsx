'use client';

import React, { useState } from 'react';
import { SchedulePayload } from '@/types/meeting';
import { Calendar, Clock, Lock, Loader2, AlertCircle } from 'lucide-react';

interface ScheduleFormProps {
  onSuccess: (meetingTitle: string) => void;
  onCancel?: () => void;
  onSubmitPayload: (payload: SchedulePayload) => Promise<any>;
}

export default function ScheduleForm({
  onSuccess,
  onCancel,
  onSubmitPayload
}: ScheduleFormProps) {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const defaultDateStr = tomorrow.toISOString().split('T')[0];

  const [title, setTitle] = useState("Alex Rivera's Zoom Meeting");
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(defaultDateStr);
  const [time, setTime] = useState('10:00');
  const [duration, setDuration] = useState('30');
  const [passcode, setPasscode] = useState(() =>
    Math.floor(100000 + Math.random() * 900000).toString()
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

      const payload: SchedulePayload = {
        title: trimmedTitle,
        description: description.trim() || undefined,
        scheduled_at: `${date}T${time}:00`,
        duration_minutes: durNum,
        passcode: passcode.trim() || undefined,
        host_name: 'Alex Rivera',
      };

      await onSubmitPayload(payload);
      onSuccess(trimmedTitle);
    } catch (err: any) {
      setError(err.message || 'Failed to schedule meeting. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '10px 12px',
          backgroundColor: '#FEF2F2',
          border: '1px solid #FCA5A5',
          borderRadius: '8px',
          color: '#DC2626',
          fontSize: '13px',
          marginBottom: '16px'
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
          onChange={(e) => {
            setTitle(e.target.value);
            setError(null);
          }}
          disabled={loading}
          required
          style={{
            width: '100%',
            padding: '9px 12px',
            fontSize: '13px',
            borderRadius: '6px',
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
          Description (Optional)
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={loading}
          rows={2}
          placeholder="Agenda or notes..."
          style={{
            width: '100%',
            padding: '9px 12px',
            fontSize: '13px',
            borderRadius: '6px',
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
            onChange={(e) => {
              setDate(e.target.value);
              setError(null);
            }}
            disabled={loading}
            min={new Date().toISOString().split('T')[0]}
            style={{
              width: '100%',
              padding: '8px 10px',
              fontSize: '13px',
              borderRadius: '6px',
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
            onChange={(e) => {
              setTime(e.target.value);
              setError(null);
            }}
            disabled={loading}
            style={{
              width: '100%',
              padding: '8px 10px',
              fontSize: '13px',
              borderRadius: '6px',
              border: '1px solid #D1D5DB',
              backgroundColor: '#FFFFFF',
              color: '#111827',
              outline: 'none',
              boxSizing: 'border-box'
            }}
          />
        </div>
      </div>

      {/* Duration & Passcode */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '20px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
            Duration
          </label>
          <select
            value={duration}
            onChange={(e) => {
              setDuration(e.target.value);
              setError(null);
            }}
            disabled={loading}
            style={{
              width: '100%',
              padding: '8px 10px',
              fontSize: '13px',
              borderRadius: '6px',
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
              borderRadius: '6px',
              border: '1px solid #D1D5DB',
              backgroundColor: '#FFFFFF',
              color: '#111827',
              outline: 'none',
              boxSizing: 'border-box'
            }}
          />
        </div>
      </div>

      {/* Buttons */}
      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: '1px solid #D1D5DB',
              backgroundColor: '#FFFFFF',
              color: '#374151',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            padding: '8px 20px',
            borderRadius: '6px',
            backgroundColor: '#0B5CFF',
            color: '#FFFFFF',
            fontSize: '13px',
            fontWeight: 600,
            border: 'none',
            cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '0 2px 6px rgba(11, 92, 255, 0.3)'
          }}
        >
          {loading ? (
            <>
              <Loader2 size={15} className="animate-spin" />
              <span>Saving...</span>
            </>
          ) : (
            'Save'
          )}
        </button>
      </div>
    </form>
  );
}
