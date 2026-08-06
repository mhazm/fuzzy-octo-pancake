"use client";

import { useEffect, useRef, useState } from "react";

interface ScratchCardProps {
  width: number;
  height: number;
  revealContent: React.ReactNode;
  onScratchComplete?: () => void;
  brushSize?: number;
  coverImage?: string;
  completionThreshold?: number;
}

export default function ScratchCard({
  width,
  height,
  revealContent,
  onScratchComplete,
  brushSize = 30,
  coverImage,
  completionThreshold = 0.6,
}: ScratchCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const completedRef = useRef(false);
  const [isReady, setIsReady] = useState(false);
  const [targets, setTargets] = useState<{x: number, y: number, w: number, h: number, r: number}[] | null>(null);

  useEffect(() => {
    // Wait for DOM to render layout completely
    const timer = setTimeout(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const container = canvas.parentElement;
      if (!container) return;
      
      const canvasRect = canvas.getBoundingClientRect();
      const elements = container.querySelectorAll('[data-scratch-target="true"]');
      const newTargets: any[] = [];
      
      elements.forEach(el => {
        const rect = el.getBoundingClientRect();
        const computedStyle = window.getComputedStyle(el);
        const radius = parseInt(computedStyle.borderRadius) || 0;
        newTargets.push({
          x: rect.left - canvasRect.left,
          y: rect.top - canvasRect.top,
          w: rect.width,
          h: rect.height,
          r: radius
        });
      });
      
      if (newTargets.length > 0) {
        setTargets(newTargets);
      } else {
        // Full screen fallback
        setTargets([{ x: 0, y: 0, w: width, h: height, r: 0 }]);
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [width, height]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;
    if (!targets) return;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#cbd5e1";

    targets.forEach(t => {
      ctx.beginPath();
      if (t.r > 0 && ctx.roundRect) {
        ctx.roundRect(t.x, t.y, t.w, t.h, t.r);
      } else {
        ctx.rect(t.x, t.y, t.w, t.h);
      }
      ctx.fill();
    });

    if (coverImage) {
      ctx.globalCompositeOperation = "source-atop";
      const img = new Image();
      img.src = coverImage;
      img.onload = () => {
        ctx.drawImage(img, 0, 0, width, height);
        ctx.globalCompositeOperation = "source-over";
        setIsReady(true);
      };
    } else {
      const imgData = ctx.getImageData(0, 0, width, height);
      for (let i = 0; i < imgData.data.length; i += 4) {
        if (imgData.data[i + 3] > 0) {
          const noise = Math.random() * 50 - 25;
          imgData.data[i] = Math.max(0, Math.min(255, 192 + noise));
          imgData.data[i + 1] = Math.max(0, Math.min(255, 192 + noise));
          imgData.data[i + 2] = Math.max(0, Math.min(255, 192 + noise));
        }
      }
      ctx.putImageData(imgData, 0, 0);

      ctx.globalCompositeOperation = "source-atop";
      ctx.fillStyle = "rgba(0,0,0,0.1)";
      ctx.font = "bold 14px sans-serif";
      for (let i = 0; i < width; i += 80) {
        for (let j = 0; j < height; j += 40) {
          ctx.fillText("NISMARA", i, j);
        }
      }
      ctx.globalCompositeOperation = "source-over";
      setIsReady(true);
    }
  }, [width, height, coverImage, targets]);

  const scratch = (x: number, y: number) => {
    if (completedRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(x, y, brushSize, 0, Math.PI * 2, false);
    ctx.fill();
    
    checkCompletion();
  };

  const checkCompletion = () => {
    if (completedRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    const imgData = ctx.getImageData(0, 0, width, height);
    let transparentCount = 0;
    const checkPoints = 50;
    let checkedValidPoints = 0;

    if (targets && targets.length > 0 && targets[0].w !== width) {
      for (let i = 0; i < checkPoints; i++) {
        const t = targets[Math.floor(Math.random() * targets.length)];
        const x = Math.floor(t.x + Math.random() * t.w);
        const y = Math.floor(t.y + Math.random() * t.h);
        
        if (x >= 0 && x < width && y >= 0 && y < height) {
          const alpha = imgData.data[(y * width + x) * 4 + 3];
          if (alpha < 50) transparentCount++;
          checkedValidPoints++;
        }
      }
    } else {
      for (let i = 0; i < checkPoints; i++) {
        const x = Math.floor(Math.random() * width);
        const y = Math.floor(Math.random() * height);
        const alpha = imgData.data[(y * width + x) * 4 + 3];
        if (alpha < 50) transparentCount++;
        checkedValidPoints++;
      }
    }

    const completionRate = checkedValidPoints > 0 ? transparentCount / checkedValidPoints : 0;

    if (completionRate > completionThreshold) {
      completedRef.current = true;
      setIsCompleted(true);
      if (onScratchComplete) {
        onScratchComplete();
      }
      // Reveal the rest
      ctx.clearRect(0, 0, width, height);
    }
  };

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    
    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true);
    const { x, y } = getCoordinates(e);
    scratch(x, y);
  };

  const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const { x, y } = getCoordinates(e);
    scratch(x, y);
  };

  const handleEnd = () => {
    setIsDrawing(false);
  };

  return (
    <div 
      className="relative select-none overflow-hidden rounded-lg shadow-lg border-2 border-slate-300"
      style={{ width, height }}
    >
      <div 
        className="absolute inset-0 z-0 flex items-center justify-center bg-white"
        style={{ opacity: isReady ? 1 : 0 }}
      >
        {revealContent}
      </div>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="absolute inset-0 z-10 cursor-crosshair touch-none"
        onMouseDown={handleStart}
        onMouseMove={handleMove}
        onMouseUp={handleEnd}
        onMouseLeave={handleEnd}
        onTouchStart={handleStart}
        onTouchMove={handleMove}
        onTouchEnd={handleEnd}
      />
    </div>
  );
}
