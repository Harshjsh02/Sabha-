'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { X, Pen, Eraser, Trash2, Download, Users } from 'lucide-react';

export interface WhiteboardDrawEvent {
  type: 'draw' | 'clear';
  prevX?: number;
  prevY?: number;
  currX?: number;
  currY?: number;
  color?: string;
  lineWidth?: number;
}

interface WhiteboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBroadcastDraw?: (event: WhiteboardDrawEvent) => void;
  incomingDrawEvent?: WhiteboardDrawEvent | null;
}

export function WhiteboardModal({
  isOpen,
  onClose,
  onBroadcastDraw,
  incomingDrawEvent,
}: WhiteboardModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#f59e0b'); // amber
  const [lineWidth, setLineWidth] = useState(4);
  const [mode, setMode] = useState<'pen' | 'eraser'>('pen');
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);

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

  // Initialize canvas size
  useEffect(() => {
    if (!isOpen) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const width = rect.width || 1000;
    const height = rect.height || 650;

    // Only resize if not matching to avoid clearing canvas on minor re-renders
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#090d16';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    }
  }, [isOpen]);

  // Execute drawing a segment
  const drawSegment = useCallback(
    (
      prevX: number,
      prevY: number,
      currX: number,
      currY: number,
      strokeColor: string,
      strokeWidth: number
    ) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = strokeWidth;
      ctx.strokeStyle = strokeColor;

      ctx.beginPath();
      ctx.moveTo(prevX, prevY);
      ctx.lineTo(currX, currY);
      ctx.stroke();
      ctx.restore();
    },
    []
  );

  // Clear canvas helper
  const performClear = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  // Handle incoming remote drawings from other participants
  useEffect(() => {
    if (!incomingDrawEvent) return;

    if (incomingDrawEvent.type === 'clear') {
      performClear();
    } else if (
      incomingDrawEvent.type === 'draw' &&
      incomingDrawEvent.prevX !== undefined &&
      incomingDrawEvent.prevY !== undefined &&
      incomingDrawEvent.currX !== undefined &&
      incomingDrawEvent.currY !== undefined
    ) {
      drawSegment(
        incomingDrawEvent.prevX,
        incomingDrawEvent.prevY,
        incomingDrawEvent.currX,
        incomingDrawEvent.currY,
        incomingDrawEvent.color || '#f59e0b',
        incomingDrawEvent.lineWidth || 4
      );
    }
  }, [incomingDrawEvent, performClear, drawSegment]);

  if (!isOpen) return null;

  const getCanvasCoords = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const startDrawing = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    if ('touches' in e && e.cancelable) {
      e.preventDefault();
    }

    const pos = getCanvasCoords(e);
    lastPosRef.current = pos;
    setIsDrawing(true);
  };

  const draw = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    if (!isDrawing || !lastPosRef.current) return;
    if ('touches' in e && e.cancelable) {
      e.preventDefault();
    }

    const currPos = getCanvasCoords(e);
    const prevPos = lastPosRef.current;
    const strokeColor = mode === 'eraser' ? '#090d16' : color;

    // Draw locally
    drawSegment(prevPos.x, prevPos.y, currPos.x, currPos.y, strokeColor, lineWidth);

    // Broadcast stroke to everyone in the room
    onBroadcastDraw?.({
      type: 'draw',
      prevX: prevPos.x,
      prevY: prevPos.y,
      currX: currPos.x,
      currY: currPos.y,
      color: strokeColor,
      lineWidth,
    });

    lastPosRef.current = currPos;
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    lastPosRef.current = null;
  };

  const handleClear = () => {
    performClear();
    onBroadcastDraw?.({ type: 'clear' });
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
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col p-2 sm:p-4">
      {/* Top Toolbar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-2.5 sm:p-3 px-3 sm:px-5 mb-2 sm:mb-3 flex flex-wrap items-center justify-between gap-2 sm:gap-3 text-slate-100 shadow-2xl">
        <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
          <div className="flex items-center gap-2 pr-2 sm:pr-4 border-r border-slate-800">
            <span className="font-bold text-xs sm:text-sm tracking-tight text-white flex items-center gap-1.5 sm:gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span>Sabha Board</span>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/30 font-semibold hidden md:inline-flex items-center gap-1">
                <Users className="w-2.5 h-2.5" /> Live Sync
              </span>
            </span>
          </div>

          {/* Pen / Eraser toggles */}
          <div className="flex items-center gap-1 bg-slate-950/60 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setMode('pen')}
              className={`p-1.5 sm:p-2 rounded-lg text-xs flex items-center gap-1.5 transition ${
                mode === 'pen'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Pen className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Pen</span>
            </button>
            <button
              onClick={() => setMode('eraser')}
              className={`p-1.5 sm:p-2 rounded-lg text-xs flex items-center gap-1.5 transition ${
                mode === 'eraser'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Eraser className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
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
                  className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 transition-transform ${
                    color === c.hex
                      ? 'scale-125 border-white shadow-md'
                      : 'border-transparent hover:scale-110'
                  }`}
                  style={{ backgroundColor: c.hex }}
                  title={c.name}
                />
              ))}
            </div>
          )}

          {/* Stroke Widths */}
          <div className="hidden sm:flex items-center gap-1.5 pl-2 border-l border-slate-800">
            {strokeSizes.map((s) => (
              <button
                key={s.size}
                onClick={() => setLineWidth(s.size)}
                className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg text-xs transition ${
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
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            onClick={handleClear}
            className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-400 text-xs font-semibold transition"
            title="Clear canvas for everyone"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Clear</span>
          </button>
          <button
            onClick={downloadDrawing}
            className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
            title="Export drawing as PNG"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Save</span>
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition ml-1"
            title="Close Whiteboard"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </div>

      {/* Canvas Area */}
      <div className="flex-1 rounded-2xl overflow-hidden border border-slate-800 bg-[#090d16] shadow-2xl relative cursor-crosshair touch-none">
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
          style={{ touchAction: 'none' }}
        />
      </div>
    </div>
  );
}
