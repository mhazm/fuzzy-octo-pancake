"use client";

import { useEffect, useRef, useState } from "react";

interface ScratchCardProps {
  width: number;
  height: number;
  revealContent: React.ReactNode;
  onScratchComplete?: () => void;
  brushSize?: number;
  coverImage?: string;
}

export default function ScratchCard({
  width,
  height,
  revealContent,
  onScratchComplete,
  brushSize = 30,
  coverImage,
}: ScratchCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (coverImage) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        ctx.drawImage(img, 0, 0, width, height);
        setIsReady(true);
      };
      img.onerror = () => {
        // Fallback if image fails to load
        drawFallback(ctx);
        setIsReady(true);
      };
      img.src = coverImage;
    } else {
      drawFallback(ctx);
      setIsReady(true);
    }

    function drawFallback(context: CanvasRenderingContext2D) {
      // Fill the canvas with a silver "scratch" color
      context.fillStyle = "#c0c0c0";
      context.fillRect(0, 0, width, height);

      // Add some noise/texture to look like a real scratch card
      for (let i = 0; i < width; i += 5) {
        for (let j = 0; j < height; j += 5) {
          if (Math.random() > 0.5) {
            context.fillStyle = "#a0a0a0";
            context.fillRect(i, j, 5, 5);
          }
        }
      }
      
      // Add text overlay
      context.font = "bold 24px Inter, sans-serif";
      context.fillStyle = "#666";
      context.textAlign = "center";
      context.fillText("GOSOK DI SINI", width / 2, height / 2 + 8);
    }
  }, [width, height, coverImage]);

  const scratch = (x: number, y: number) => {
    if (isCompleted) return;
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
    if (isCompleted) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Simple heuristic: randomly check a few points to see if they are transparent
    // Full pixel scan can be expensive on high-res, but checking 50 random points is fast
    let transparentCount = 0;
    const checkPoints = 50;
    
    for (let i = 0; i < checkPoints; i++) {
      const rx = Math.random() * width;
      const ry = Math.random() * height;
      const p = ctx.getImageData(rx, ry, 1, 1).data;
      if (p[3] === 0) { // alpha channel is 0 (transparent)
        transparentCount++;
      }
    }

    // If more than ~60% of checked points are transparent, consider it done
    if (transparentCount / checkPoints > 0.6) {
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
