import React, { useRef, useState, useCallback } from 'react';
import type { LucideIcon } from 'lucide-react';

interface CategoryTab3DProps {
  id: string;
  label: string;
  count: number;
  icon: LucideIcon;
  isActive: boolean;
  onClick: () => void;
  accent: {
    gradient: string;
    activeShadow: string;
    bottomLedge: string;
    iconActiveColor: string;
    iconInactiveColor: string;
    glowColor: string;
    badgeActive: string;
  };
}

export const CategoryTab3D: React.FC<CategoryTab3DProps> = ({
  label,
  count,
  icon: Icon,
  isActive,
  onClick,
  accent,
}) => {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [rotX, setRotX] = useState<number>(0);
  const [rotY, setRotY] = useState<number>(0);
  const [glarePos, setGlarePos] = useState<{ x: number; y: number; opacity: number }>({
    x: 50,
    y: 50,
    opacity: 0,
  });
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const [isPressed, setIsPressed] = useState<boolean>(false);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rX = -((y - centerY) / centerY) * 10;
    const rY = ((x - centerX) / centerX) * 10;

    setRotX(rX);
    setRotY(rY);

    setGlarePos({
      x: (x / rect.width) * 100,
      y: (y / rect.height) * 100,
      opacity: 0.6,
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
    setGlarePos((prev) => ({ ...prev, opacity: 0 }));
  };

  const handleTouchStart = () => {
    setIsPressed(true);
  };

  const handleTouchEnd = () => {
    setIsPressed(false);
  };

  return (
    <div
      style={{
        perspective: '800px',
      }}
      className="relative w-full h-full select-none"
    >
      <button
        ref={buttonRef}
        type="button"
        onClick={onClick}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="group relative w-full h-full py-1.5 sm:py-2 px-1 sm:px-2 rounded-lg sm:rounded-xl cursor-pointer transition-all duration-200 outline-none flex items-center justify-center gap-1 sm:gap-1.5"
        style={{
          transformStyle: 'preserve-3d',
          transform: isPressed
            ? 'scale(0.96) translateZ(-3px)'
            : isHovered
            ? `rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(2)}deg) translateY(-2px) translateZ(6px)`
            : isActive
            ? 'translateY(-1px) translateZ(4px)'
            : 'translateY(0px) translateZ(0px)',
          boxShadow: isActive
            ? `0 4px 0 ${accent.bottomLedge}, 0 8px 16px -3px ${accent.glowColor}, inset 0 1px 1px rgba(255,255,255,0.7)`
            : isHovered
            ? '0 4px 0 #94a3b8, 0 8px 14px -2px rgba(15,23,42,0.12), inset 0 1px 0 rgba(255,255,255,0.95)'
            : '0 3px 0 #cbd5e1, 0 3px 8px -2px rgba(15,23,42,0.06), inset 0 1px 0 rgba(255,255,255,0.9)',
          borderBottom: isActive
            ? `3px solid ${accent.bottomLedge}`
            : isHovered
            ? '3px solid var(--tab-inactive-ledge-hover, #94a3b8)'
            : '3px solid var(--tab-inactive-ledge, #cbd5e1)',
          background: isActive
            ? accent.gradient
            : isHovered
            ? 'var(--tab-inactive-hover-bg)'
            : 'var(--tab-inactive-bg)',
          color: isActive ? '#ffffff' : 'var(--tab-inactive-color, #1e293b)',
        }}
      >
        {/* Specular Interactive 3D Glare */}
        <div
          className="pointer-events-none absolute inset-0 rounded-lg sm:rounded-xl transition-opacity duration-200 overflow-hidden"
          style={{
            opacity: glarePos.opacity,
            background: `radial-gradient(circle 75px at ${glarePos.x}% ${glarePos.y}%, rgba(255, 255, 255, 0.45), transparent 75%)`,
            transform: 'translateZ(8px)',
          }}
        />

        {/* Ambient Animated Shimmer when active */}
        {isActive && (
          <div
            className="pointer-events-none absolute inset-0 rounded-lg sm:rounded-xl overflow-hidden"
            style={{ transform: 'translateZ(6px)' }}
          >
            <div className="w-full h-full bg-gradient-to-r from-transparent via-white/25 to-transparent -translate-x-full animate-[shimmer_2.6s_infinite]" />
          </div>
        )}

        {/* Top 3D Highlight Bevel Edge */}
        <div
          className="pointer-events-none absolute inset-x-1.5 top-0.5 h-[1px] rounded-t-lg bg-gradient-to-r from-transparent via-white/60 to-transparent"
          style={{ transform: 'translateZ(10px)' }}
        />

        {/* Icon with Pop-out 3D Depth */}
        <div
          className="shrink-0 transition-transform duration-200"
          style={{
            transform: isHovered ? 'translateZ(20px) scale(1.1)' : 'translateZ(12px)',
          }}
        >
          <div
            className={`w-4.5 h-4.5 sm:w-5 sm:h-5 rounded-md flex items-center justify-center transition-all shadow-2xs ${
              isActive
                ? 'bg-white/20 text-white border border-white/30 backdrop-blur-xs'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700 shadow-xs'
            }`}
          >
            <Icon
              className={`w-2.5 h-2.5 sm:w-3 sm:h-3 ${
                isActive ? 'text-white drop-shadow-md' : accent.iconInactiveColor
              }`}
            />
          </div>
        </div>

        {/* Menu Label: Réduit de 2px, parfaitement lisible et compact */}
        <div
          className="shrink-0 transition-transform duration-200"
          style={{
            transform: 'translateZ(14px)',
          }}
        >
          <span
            className={`block text-[9px] sm:text-[10px] font-bold tracking-tight whitespace-nowrap ${
              isActive ? 'text-white drop-shadow-sm' : 'text-slate-800 dark:text-slate-100'
            }`}
          >
            {label}
          </span>
        </div>

        {/* Floating 3D Count Badge positioned at top right */}
        <div
          className="absolute -top-1 -right-0.5 sm:-top-1.5 sm:-right-1 transition-transform duration-200 z-10"
          style={{
            transform: isHovered ? 'translateZ(22px) scale(1.08)' : 'translateZ(14px)',
          }}
        >
          <span
            className={`text-[7.5px] sm:text-[8px] font-mono font-bold px-1 py-0.2 rounded-full inline-block shadow-xs ${
              isActive
                ? 'bg-black/35 text-white border border-white/30 backdrop-blur-xs'
                : 'bg-slate-200 dark:bg-slate-750 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-650'
            }`}
          >
            {count}
          </span>
        </div>
      </button>

      {/* 3D Ground Shadow Reflection on surface */}
      <div
        className={`pointer-events-none absolute -bottom-1 inset-x-2 h-1.5 rounded-full transition-all duration-300 blur-[2px] -z-10 ${
          isActive
            ? 'opacity-70 scale-100'
            : isHovered
            ? 'opacity-40 scale-105'
            : 'opacity-15 scale-95'
        }`}
        style={{
          background: isActive ? accent.glowColor : 'rgba(0,0,0,0.2)',
        }}
      />
    </div>
  );
};
