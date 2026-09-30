'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Send, MessageSquare, Shield } from 'lucide-react';
import { ChatMessage } from '@/hooks/useWebRTC';

interface ChatDrawerProps {
  messages: ChatMessage[];
  currentUserName: string;
  onSendMessage: (text: string) => void;
}

export default function ChatDrawer({
  messages,
  currentUserName,
  onSendMessage,
}: ChatDrawerProps) {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed) return;
    onSendMessage(trimmed);
    setInputText('');
    inputRef.current?.focus();
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: '#23272B',
        color: '#FFFFFF',
      }}
    >
      {/* Notice Pill */}
      <div
        style={{
          padding: '10px 16px',
          backgroundColor: 'rgba(0, 0, 0, 0.25)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '11px',
          color: 'rgba(255, 255, 255, 0.65)',
        }}
      >
        <Shield size={12} color="var(--zoom-blue)" />
        <span>Messages are end-to-end encrypted across room peers.</span>
      </div>

      {/* Messages Scroll Area */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
        }}
      >
        {messages.length === 0 ? (
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'rgba(255, 255, 255, 0.45)',
              textAlign: 'center',
              padding: '24px',
              gap: '10px',
            }}
          >
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                backgroundColor: 'rgba(255, 255, 255, 0.06)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'rgba(255, 255, 255, 0.4)',
              }}
            >
              <MessageSquare size={20} />
            </div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: 'rgba(255, 255, 255, 0.7)' }}>
              No messages yet
            </div>
            <div style={{ fontSize: '12px', lineHeight: 1.4 }}>
              Send a message to everyone in the meeting.
            </div>
          </div>
        ) : (
          messages.map((msg, idx) => {
            const isMe = msg.sender === currentUserName;
            return (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: isMe ? 'flex-end' : 'flex-start',
                  maxWidth: '92%',
                  alignSelf: isMe ? 'flex-end' : 'flex-start',
                }}
              >
                {/* Header (Sender & Timestamp) */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    marginBottom: '4px',
                    fontSize: '11px',
                    color: 'rgba(255, 255, 255, 0.55)',
                  }}
                >
                  <span
                    style={{
                      fontWeight: 600,
                      color: isMe ? 'var(--zoom-blue)' : '#FFFFFF',
                    }}
                  >
                    {isMe ? 'You' : msg.sender}
                  </span>
                  <span>•</span>
                  <span>{msg.timestamp}</span>
                </div>

                {/* Message Bubble */}
                <div
                  style={{
                    padding: '9px 14px',
                    borderRadius: isMe ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                    backgroundColor: isMe ? 'var(--zoom-blue)' : '#1A1A1A',
                    color: '#FFFFFF',
                    fontSize: '13px',
                    lineHeight: 1.45,
                    wordBreak: 'break-word',
                    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.25)',
                    border: isMe ? 'none' : '1px solid rgba(255, 255, 255, 0.08)',
                  }}
                >
                  {msg.text}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <form
        onSubmit={handleSubmit}
        autoComplete="off"
        data-lpignore="true"
        style={{
          padding: '12px 16px',
          backgroundColor: '#1F2228',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <input
          ref={inputRef}
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Type a message to everyone..."
          autoComplete="off"
          data-lpignore="true"
          style={{
            flex: 1,
            padding: '10px 14px',
            backgroundColor: '#1A1A1A',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: 'var(--zoom-radius-pill)',
            color: '#FFFFFF',
            fontSize: '13px',
            outline: 'none',
            transition: 'border-color 0.15s ease',
          }}
          onFocus={(e) => (e.target.style.borderColor = 'var(--zoom-blue)')}
          onBlur={(e) => (e.target.style.borderColor = 'rgba(255, 255, 255, 0.15)')}
        />

        <button
          type="submit"
          disabled={!inputText.trim()}
          title="Send message"
          style={{
            width: '38px',
            height: '38px',
            borderRadius: '50%',
            backgroundColor: inputText.trim() ? 'var(--zoom-blue)' : 'rgba(255, 255, 255, 0.1)',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: 'none',
            cursor: inputText.trim() ? 'pointer' : 'default',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            if (inputText.trim()) e.currentTarget.style.backgroundColor = 'var(--zoom-blue-hover)';
          }}
          onMouseLeave={(e) => {
            if (inputText.trim()) e.currentTarget.style.backgroundColor = 'var(--zoom-blue)';
          }}
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}
