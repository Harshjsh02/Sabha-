'use client';

import React, { useRef, useState, useEffect } from 'react';
import { X, Pen, Eraser, Trash2, Download, Circle } from 'lucide-react';

interface WhiteboardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function WhiteboardModal({ isOpen, onClose }: WhiteboardModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#f59e0b'); // amber
  const [lineWidth, setLineWidth] = useState(4);
  const [mode, setMode] = useState<'pen' | 'eraser'>('pen');

  const colors = [
    { name: 'Amber', hex: '#f59e0b' },
    { name: 'White', hex: '#ffffff' },
    { name: 'Cyan', hex: '#06b6d4' },
    { name: 'Emerald', hex: '#10b981' },
    { name: 'Rose', hex: '#f43f5e' },
    { name: 'Violet', hex: '#8b5cf6' },
  ];

  const strokeSizes = [
    { name: 'Fine', size: 2 },
    { name: 'Medium', size: 6 },
    { name: 'Thick', size: 14 },
  ];

  useEffect(() => {
    if (!isOpen) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set canvas dimensions to window size
    canvas.width = canvas.parentElement?.clientWidth || 1000;
    canvas.height = canvas.parentElement?.clientHeight || 650;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = mode === 'eraser' ? '#090d16' : color;

    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  const downloadDrawing = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `sabha-whiteboard-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col p-4">
      {/* Top Toolbar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 px-5 mb-3 flex flex-wrap items-center justify-between gap-3 text-slate-100 shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 pr-4 border-r border-slate-800">
            <span className="font-bold text-sm tracking-tight text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400" /> Sabha Whiteboard
            </span>
          </div>

          {/* Pen / Eraser toggles */}
          <div className="flex items-center gap-1 bg-slate-950/60 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setMode('pen')}
              className={`p-2 rounded-lg text-xs flex items-center gap-1.5 transition ${
                mode === 'pen' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Pen className="w-4 h-4" />
              <span className="hidden sm:inline">Pen</span>
            </button>
            <button
              onClick={() => setMode('eraser')}
              className={`p-2 rounded-lg text-xs flex items-center gap-1.5 transition ${
                mode === 'eraser' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Eraser className="w-4 h-4" />
              <span className="hidden sm:inline">Eraser</span>
            </button>
          </div>

          {/* Colors */}
          {mode === 'pen' && (
            <div className="flex items-center gap-1.5">
              {colors.map((c) => (
                <button
                  key={c.hex}
                  onClick={() => setColor(c.hex)}
                  className={`w-6 h-6 rounded-full border-2 transition-transform ${
                    color === c.hex ? 'scale-125 border-white shadow-md' : 'border-transparent hover:scale-110'
                  }`}
                  style={{ backgroundColor: c.hex }}
                  title={c.name}
                />
              ))}
            </div>
          )}

          {/* Stroke Widths */}
          <div className="hidden md:flex items-center gap-2 pl-2 border-l border-slate-800">
            {strokeSizes.map((s) => (
              <button
                key={s.size}
                onClick={() => setLineWidth(s.size)}
                className={`px-2.5 py-1 rounded-lg text-xs transition ${
                  lineWidth === s.size
                    ? 'bg-slate-800 text-amber-400 font-bold border border-amber-500/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {s.name}
              </button>
            ))}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={clearCanvas}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-400 text-xs font-semibold transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Clear</span>
          </button>
          <button
            onClick={downloadDrawing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Save Image</span>
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition ml-2"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Canvas Area */}
      <div className="flex-1 rounded-2xl overflow-hidden border border-slate-800 bg-[#090d16] shadow-2xl relative cursor-crosshair">
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="w-full h-full block"
        />
      </div>
    </div>
  );
}
