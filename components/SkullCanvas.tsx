'use client';
import { useEffect, useRef } from 'react';

interface Props {
  jawOpen: number; // 0 = closed, 1 = fully open
}

export function SkullCanvas({ jawOpen }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const cx = W / 2;
    const cy = 200; // skull centre Y

    // === Green aura ===
    const aura = ctx.createRadialGradient(cx, cy, 10, cx, cy, 200);
    aura.addColorStop(0, 'rgba(0,255,80,0.12)');
    aura.addColorStop(1, 'rgba(0,255,80,0)');
    ctx.fillStyle = aura;
    ctx.fillRect(0, 0, W, H);

    // Shared glow style for skull surfaces
    ctx.shadowColor = '#00ff50';
    ctx.shadowBlur = 18;

    // === Cranium ===
    ctx.beginPath();
    ctx.ellipse(cx, cy - 30, 95, 110, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#e8e2d4';
    ctx.fill();
    ctx.strokeStyle = '#a09080';
    ctx.lineWidth = 2;
    ctx.stroke();

    // === Eye sockets ===
    const drawEye = (ex: number, ey: number) => {
      // Dark socket
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.ellipse(ex, ey, 22, 24, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#0d0d1a';
      ctx.fill();
      // Green glow inside
      const g = ctx.createRadialGradient(ex, ey + 4, 0, ex, ey, 16);
      g.addColorStop(0, 'rgba(0,255,80,0.85)');
      g.addColorStop(0.5, 'rgba(0,255,80,0.3)');
      g.addColorStop(1, 'rgba(0,255,80,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(ex, ey, 16, 18, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 18;
    };
    drawEye(cx - 30, cy - 38);
    drawEye(cx + 30, cy - 38);

    // === Nose cavity ===
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.moveTo(cx, cy + 5);
    ctx.lineTo(cx - 13, cy + 26);
    ctx.quadraticCurveTo(cx, cy + 22, cx + 13, cy + 26);
    ctx.closePath();
    ctx.fillStyle = '#0d0d1a';
    ctx.fill();
    ctx.shadowBlur = 18;

    // === Upper jaw / cheek area ===
    ctx.beginPath();
    ctx.ellipse(cx, cy + 70, 78, 38, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#ddd6c5';
    ctx.fill();
    ctx.strokeStyle = '#a09080';
    ctx.lineWidth = 2;
    ctx.stroke();

    // === Upper teeth ===
    ctx.shadowBlur = 0;
    const toothW = 15;
    const toothH = 18;
    const teethCount = 8;
    const teethStartX = cx - (teethCount / 2) * toothW + toothW / 2;
    const upperTeethY = cy + 62;

    ctx.fillStyle = '#f4efe4';
    ctx.strokeStyle = '#bbb0a0';
    ctx.lineWidth = 1;
    for (let i = 0; i < teethCount; i++) {
      const tx = teethStartX + i * toothW - toothW / 2 + 1;
      ctx.beginPath();
      ctx.roundRect(tx, upperTeethY, toothW - 2, toothH, [0, 0, 5, 5]);
      ctx.fill();
      ctx.stroke();
    }

    // === Lower jaw (hinged — drops with jawOpen) ===
    const drop = jawOpen * 48; // max 48px
    const jawCY = cy + 100 + drop;

    ctx.shadowBlur = 15;
    ctx.shadowColor = '#00ff50';

    ctx.beginPath();
    ctx.ellipse(cx, jawCY, 70, 30, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#d4cdb8';
    ctx.fill();
    ctx.strokeStyle = '#a09080';
    ctx.lineWidth = 2;
    ctx.stroke();

    // === Lower teeth (point up) ===
    ctx.shadowBlur = 0;
    const lowerTeethY = jawCY - 18;
    ctx.fillStyle = '#f4efe4';
    ctx.strokeStyle = '#bbb0a0';
    ctx.lineWidth = 1;
    for (let i = 0; i < teethCount; i++) {
      const tx = teethStartX + i * toothW - toothW / 2 + 1;
      ctx.beginPath();
      ctx.roundRect(tx, lowerTeethY - toothH, toothW - 2, toothH, [5, 5, 0, 0]);
      ctx.fill();
      ctx.stroke();
    }

    // === Skull sutures (decorative cracks) ===
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#c0b8a8';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 4]);
    ctx.beginPath();
    ctx.moveTo(cx, cy - 130);
    ctx.lineTo(cx, cy - 40);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - 60, cy - 70);
    ctx.lineTo(cx + 60, cy - 70);
    ctx.stroke();
    ctx.setLineDash([]);
  }, [jawOpen]);

  return (
    <canvas
      ref={canvasRef}
      width={400}
      height={420}
      className="rounded-2xl"
      style={{ background: 'transparent' }}
    />
  );
}
