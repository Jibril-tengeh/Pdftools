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

  // Mouse move 3D tilt calculation
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    // Responsive 3D tilt
    const rX = -((y - centerY) / centerY) * 12;
    const rY = ((x - centerX) / centerX) * 12;

    setRotX(rX);
    setRotY(rY);

    setGlarePos({
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
        perspective: '900px',
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
        className="group relative w-full h-full py-2.5 sm:py-3 px-2 sm:px-3 rounded-xl sm:rounded-2xl cursor-pointer transition-all duration-200 outline-none flex items-center justify-center gap-1.5 sm:gap-2"
        style={{
          transformStyle: 'preserve-3d',
          transform: isPressed
            ? 'scale(0.96) translateZ(-4px)'
            : isHovered
            ? `rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(2)}deg) translateY(-4px) translateZ(8px)`
            : isActive
            ? 'translateY(-2px) translateZ(6px) rotateX(1deg)'
            : 'translateY(0px) translateZ(0px)',
          boxShadow: isActive
            ? `0 6px 0 ${accent.bottomLedge}, 0 12px 24px -4px ${accent.glowColor}, inset 0 1px 1px rgba(255,255,255,0.7)`
            : isHovered
            ? '0 6px 0 #94a3b8, 0 12px 20px -3px rgba(15,23,42,0.12), inset 0 1px 0 rgba(255,255,255,0.95)'
            : '0 4px 0 #cbd5e1, 0 4px 10px -2px rgba(15,23,42,0.06), inset 0 1px 0 rgba(255,255,255,0.9)',
          borderBottom: isActive
            ? `4px solid ${accent.bottomLedge}`
            : isHovered
            ? '4px solid var(--tab-inactive-ledge-hover, #94a3b8)'
            : '4px solid var(--tab-inactive-ledge, #cbd5e1)',
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
          className="pointer-events-none absolute inset-0 rounded-xl sm:rounded-2xl transition-opacity duration-200 overflow-hidden"
          style={{
            opacity: glarePos.opacity,
            background: `radial-gradient(circle 90px at ${glarePos.x}% ${glarePos.y}%, rgba(255, 255, 255, 0.45), transparent 75%)`,
            transform: 'translateZ(10px)',
          }}
        />

        {/* Ambient Animated Shimmer when active */}
        {isActive && (
          <div
            className="pointer-events-none absolute inset-0 rounded-xl sm:rounded-2xl overflow-hidden"
            style={{ transform: 'translateZ(8px)' }}
          >
            <div className="w-full h-full bg-gradient-to-r from-transparent via-white/25 to-transparent -translate-x-full animate-[shimmer_2.6s_infinite]" />
          </div>
        )}

        {/* Top 3D Highlight Bevel Edge */}
        <div
          className="pointer-events-none absolute inset-x-2 top-0.5 h-[1.5px] rounded-t-lg bg-gradient-to-r from-transparent via-white/60 to-transparent"
          style={{ transform: 'translateZ(12px)' }}
        />

        {/* Icon with Pop-out 3D Depth */}
        <div
          className="shrink-0 transition-transform duration-200"
          style={{
            transform: isHovered ? 'translateZ(24px) scale(1.12)' : 'translateZ(16px)',
          }}
        >
          <div
            className={`w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center transition-all shadow-2xs ${
              isActive
                ? 'bg-white/20 text-white border border-white/30 backdrop-blur-xs'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700 shadow-xs'
            }`}
          >
            <Icon
              className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${
                isActive ? 'text-white drop-shadow-md' : accent.iconInactiveColor
              }`}
            />
          </div>
        </div>

        {/* Menu Label: Large, Bold, Always Clearly Visible */}
        <div
          className="shrink-0 transition-transform duration-200"
          style={{
            transform: 'translateZ(18px)',
          }}
        >
          <span
            className={`block text-xs sm:text-sm font-black tracking-normal whitespace-nowrap ${
              isActive ? 'text-white drop-shadow-sm' : 'text-slate-900 dark:text-slate-100'
            }`}
          >
            {label}
          </span>
        </div>

        {/* Floating 3D Count Badge positioned at top right */}
        <div
          className="absolute -top-1.5 -right-1 sm:-top-2 sm:-right-1.5 transition-transform duration-200 z-10"
          style={{
            transform: isHovered ? 'translateZ(26px) scale(1.1)' : 'translateZ(18px)',
          }}
        >
          <span
            className={`text-[9px] sm:text-[10px] font-mono font-black px-1.5 py-0.5 rounded-full inline-block shadow-xs ${
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
        className={`pointer-events-none absolute -bottom-1 inset-x-3 h-2 rounded-full transition-all duration-300 blur-[3px] -z-10 ${
          isActive
            ? 'opacity-80 scale-100'
            : isHovered
            ? 'opacity-50 scale-105'
            : 'opacity-20 scale-95'
        }`}
        style={{
          background: isActive ? accent.glowColor : 'rgba(0,0,0,0.2)',
        }}
      />
    </div>
  );
};
