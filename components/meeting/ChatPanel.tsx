'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, Participant } from '@/lib/types';
import { X, Send, Users, Lock, MessageSquare } from 'lucide-react';

interface ChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  messages: ChatMessage[];
  participants: Participant[];
  currentUserId: string;
  onSendMessage: (text: string, to: string) => void;
  allowChat: boolean;
  isHost: boolean;
}

export function ChatPanel({
  isOpen,
  onClose,
  messages,
  participants,
  currentUserId,
  onSendMessage,
  allowChat,
  isHost,
}: ChatPanelProps) {
  const [inputText, setInputText] = useState('');
  const [recipient, setRecipient] = useState('everyone');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  if (!isOpen) return null;

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    if (!allowChat && !isHost) {
      alert('The host has disabled in-meeting chat.');
      return;
    }
    onSendMessage(inputText.trim(), recipient);
    setInputText('');
  };

  const filteredMessages = messages.filter((msg) => {
    if (!msg.to || msg.to === 'everyone') return true;
    return msg.senderId === currentUserId || msg.to === currentUserId;
  });

  return (
    <div className="fixed inset-y-0 right-0 sm:relative w-full sm:w-80 md:w-96 bg-slate-900 border-l border-slate-800 flex flex-col h-full z-40 text-slate-100 shadow-2xl">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-amber-400" />
          <h3 className="font-bold text-sm">Meeting Chat</h3>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Recipient Selector */}
      <div className="px-4 py-2 bg-slate-950/20 border-b border-slate-800/80 flex items-center justify-between text-xs">
        <span className="text-slate-400 font-medium">To:</span>
        <select
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
          className="bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-amber-500"
        >
          <option value="everyone">Everyone (Public)</option>
          {participants
            .filter((p) => p.id !== currentUserId)
            .map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} (Direct)
              </option>
            ))}
        </select>
      </div>

      {/* Message List */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3 text-xs">
        {filteredMessages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-slate-500">
            <MessageSquare className="w-8 h-8 mb-2 opacity-30" />
            <p>No messages yet.</p>
            <p className="text-[11px] text-slate-600 mt-1">Say hello to the Sabha assembly!</p>
          </div>
        ) : (
          filteredMessages.map((msg) => {
            const isMe = msg.senderId === currentUserId;
            const isDirect = msg.to && msg.to !== 'everyone';

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
              >
                <div className="flex items-center gap-1.5 mb-1 text-[11px] text-slate-400">
                  <span className="font-semibold text-slate-300">
                    {isMe ? 'You' : msg.senderName}
                  </span>
                  {isDirect && (
                    <span className="flex items-center gap-0.5 text-amber-400 text-[10px] bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/20">
                      <Lock className="w-2.5 h-2.5" /> Direct
                    </span>
                  )}
                  <span className="text-[10px] text-slate-500">
                    {new Date(msg.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>

                <div
                  className={`px-3 py-2 rounded-2xl max-w-[85%] break-words leading-relaxed ${
                    isMe
                      ? 'bg-amber-500 text-slate-950 rounded-tr-none font-medium'
                      : 'bg-slate-800 text-slate-100 rounded-tl-none border border-slate-700/60'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Chat Disabled Warning */}
      {!allowChat && !isHost && (
        <div className="px-4 py-2 bg-rose-500/10 border-t border-rose-500/20 text-rose-300 text-[11px] text-center">
          Chat has been disabled by the Sabha host.
        </div>
      )}

      {/* Input area */}
      <form onSubmit={handleSend} className="p-3 border-t border-slate-800 bg-slate-950/60 flex items-center gap-2">
        <input
          type="text"
          disabled={!allowChat && !isHost}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={!allowChat && !isHost ? 'Chat is disabled' : 'Type a message...'}
          className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={(!allowChat && !isHost) || !inputText.trim()}
          className="p-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:bg-slate-800 text-slate-950 disabled:text-slate-600 transition"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
