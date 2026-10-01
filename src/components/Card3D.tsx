import React, { useRef, useState, useCallback } from 'react';
import { ArrowRight, type LucideIcon } from 'lucide-react';
import type { ToolId } from '../types';

interface Card3DProps {
  id: ToolId;
  name: string;
  description: string;
  category: string;
  icon: LucideIcon;
  badge?: string;
  colorTheme: {
    text: string;
    bg: string;
    border: string;
    glow: string;
  };
  index: number;
  onSelect: (id: ToolId) => void;
}

export const Card3D: React.FC<Card3DProps> = ({
  id,
  name,
  description,
  category,
  icon: Icon,
  colorTheme,
  index,
  onSelect,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [rotX, setRotX] = useState<number>(0);
  const [rotY, setRotY] = useState<number>(0);
  const [glare, setGlare] = useState<{ x: number; y: number; opacity: number }>({
    x: 50,
    y: 50,
    opacity: 0,
  });
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const [isPressed, setIsPressed] = useState<boolean>(false);

  // Mouse move 3D tilt calculation
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    // Max tilt angles: 12 degrees
    const rX = -((y - centerY) / centerY) * 12;
    const rY = ((x - centerX) / centerX) * 12;

    setRotX(rX);
    setRotY(rY);

    // Specular light reflection
    setGlare({
      x: (x / rect.width) * 100,
      y: (y / rect.height) * 100,
      opacity: 0.65,
    });
  }, []);

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setIsPressed(false);
    setRotX(0);
    setRotY(0);
    setGlare((prev) => ({ ...prev, opacity: 0 }));
  };

  // Touch handling for mobile tactile experience
  const handleTouchStart = () => {
    setIsPressed(true);
  };

  const handleTouchEnd = () => {
    setIsPressed(false);
  };

  const handleMouseDown = () => {
    setIsPressed(true);
  };

  const handleMouseUp = () => {
    setIsPressed(false);
  };

  // Staggered delay for continuous ambient 3D floating animation
  const floatDelay = `${(index % 6) * 0.45}s`;
  const gleamDelay = `${(index % 4) * 1.3}s`;

  return (
    <div
      ref={cardRef}
      onClick={() => onSelect(id)}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      style={{
        perspective: '1000px',
      }}
      className="group relative h-full select-none cursor-pointer"
    >
      {/* 3D Physical Volumetric Card */}
      <div
        className="h-full rounded-2xl p-4 sm:p-5 lg:p-6 flex flex-col justify-between overflow-hidden relative transition-all duration-200"
        style={{
          transformStyle: 'preserve-3d',
          background: 'var(--card-bg)',
          border: '1px solid var(--card-border)',
          borderBottom: isPressed
            ? '1px solid var(--card-ledge-pressed)'
            : isHovered
            ? '6px solid var(--card-ledge-hover)'
            : '5px solid var(--card-ledge)',
          transform: isPressed
            ? 'scale(0.96) translateY(4px) translateZ(-4px)'
            : isHovered
            ? `rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(2)}deg) translateY(-6px) translateZ(10px)`
            : undefined,
          boxShadow: isPressed
            ? '0 1px 0 var(--card-ledge), 0 2px 4px rgba(0, 0, 0, 0.05), inset 0 2px 4px rgba(0, 0, 0, 0.04)'
            : isHovered
            ? `${-rotY * 1.5}px ${rotX * 1.5 + 16}px 28px -4px rgba(15, 23, 42, 0.2), 0 6px 0 var(--card-ledge-hover), inset 0 1.5px 0 rgba(255,255,255,0.4)`
            : undefined,
          animation: !isHovered && !isPressed ? `cardFloat3d 5s ease-in-out ${floatDelay} infinite` : 'none',
        }}
      >
        {/* Top 3D Bevel Highlight Edge */}
        <div
          className="pointer-events-none absolute inset-x-2 top-0.5 h-[1.5px] rounded-t-xl bg-gradient-to-r from-transparent via-white/80 dark:via-white/30 to-transparent"
          style={{ transform: 'translateZ(14px)' }}
        />

        {/* Ambient Corner Light Glow with theme color */}
        <div
          className="pointer-events-none absolute -top-10 -right-10 w-24 h-24 rounded-full blur-xl transition-opacity duration-300 opacity-25 group-hover:opacity-60"
          style={{ backgroundColor: colorTheme.glow }}
        />

        {/* Continuous Specular Sweep Gleam across 3D face */}
        <div
          className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl"
          style={{ transform: 'translateZ(12px)' }}
        >
          <div
            className="w-16 h-full bg-gradient-to-r from-transparent via-white/50 dark:via-white/20 to-transparent"
            style={{ animation: `sweepGleam 6.5s ease-in-out ${gleamDelay} infinite` }}
          />
        </div>

        {/* Dynamic Specular 3D Glare on hover/drag */}
        <div
          className="pointer-events-none absolute inset-0 rounded-2xl transition-opacity duration-200"
          style={{
            opacity: glare.opacity,
            background: `radial-gradient(circle 200px at ${glare.x}% ${glare.y}%, rgba(255, 255, 255, 0.75) 0%, rgba(255, 255, 255, 0) 75%)`,
            mixBlendMode: 'overlay',
            transform: 'translateZ(16px)',
          }}
        />

        {/* Card Content with real multi-plane 3D separation */}
        <div className="space-y-3 sm:space-y-4" style={{ transformStyle: 'preserve-3d' }}>
          {/* Top row: 3D Pop-out Icon + Arrow Action Button */}
          <div
            className="flex items-center justify-between"
            style={{ transform: 'translateZ(28px)' }}
          >
            {/* 3D Icon Block with physical extrusion ledge */}
            <div
              className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center transition-all duration-200 ${colorTheme.bg} ${colorTheme.border} ${colorTheme.text}`}
              style={{
                border: '1px solid rgba(0, 0, 0, 0.08)',
                borderBottom: '3px solid rgba(0, 0, 0, 0.15)',
                boxShadow: `0 3px 6px -1px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.7)`,
                transform: isHovered ? 'scale(1.1) translateZ(10px)' : 'scale(1) translateZ(0px)',
              }}
            >
              <Icon className="w-5 h-5 sm:w-6 sm:h-6 drop-shadow-2xs" />
            </div>

            {/* 3D Tactile Arrow Button */}
            <div
              className="flex items-center gap-1.5 text-slate-400 group-hover:text-slate-800 dark:group-hover:text-slate-200 transition-colors"
              style={{ transform: 'translateZ(24px)' }}
            >
              <span className="hidden sm:inline text-[11px] font-semibold text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors">
                {category}
              </span>
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 group-hover:bg-slate-50 dark:group-hover:bg-slate-750 transition-all duration-200"
                style={{
                  borderBottom: '2px solid var(--card-ledge)',
                  boxShadow: '0 2px 4px rgba(15,23,42,0.06)',
                  transform: isHovered ? 'scale(1.1) translateX(2px)' : 'scale(1)',
                }}
              >
                <ArrowRight className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
              </div>
            </div>
          </div>

          {/* Title & Description with 3D Elevation */}
          <div style={{ transform: 'translateZ(20px)' }}>
            <h3 className="text-xs sm:text-base font-bold text-slate-900 dark:text-slate-100 group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors tracking-tight line-clamp-1 sm:line-clamp-none">
              {name}
            </h3>

            <p
              className="mt-1 sm:mt-1.5 text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2 sm:line-clamp-3"
              style={{ transform: 'translateZ(12px)' }}
            >
              {description}
            </p>
          </div>
        </div>

        {/* Footer info: 3D Ground metadata */}
        <div
          className="mt-3 sm:mt-5 pt-2.5 sm:pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] sm:text-xs font-medium"
          style={{ transform: 'translateZ(16px)' }}
        >
          <span className="text-slate-600 dark:text-slate-300 group-hover:text-rose-600 dark:group-hover:text-rose-400 font-bold transition-colors inline-flex items-center gap-1">
            <span>Ouvrir l’outil</span>
            <span className="text-xs transition-transform group-hover:translate-x-0.5">→</span>
          </span>
          <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 bg-slate-100/80 dark:bg-slate-800 px-1.5 py-0.5 rounded-md">
            100% Local
          </span>
        </div>
      </div>
    </div>
  );
};
