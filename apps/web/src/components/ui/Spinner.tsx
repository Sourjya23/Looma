interface SpinnerProps {
  size?: number | string;
  color?: string;
  className?: string;
}

/**
 * Ultra-refined hairline vector spinner (Linear / Vercel style).
 * Continuous, smooth 60fps rotation that never freezes or looks chunky.
 */
export function Spinner({ size = 16, color = 'currentColor', className = '' }: SpinnerProps) {
  const pixelSize = typeof size === 'number' ? `${size}px` : size;

  return (
    <svg
      className={`animate-spin ${className}`}
      style={{
        width: pixelSize,
        height: pixelSize,
        display: 'inline-block',
        verticalAlign: 'middle',
        flexShrink: 0,
        willChange: 'transform',
        animation: 'spin 0.7s cubic-bezier(0.4, 0, 0.2, 1) infinite',
        WebkitAnimation: 'spin 0.7s cubic-bezier(0.4, 0, 0.2, 1) infinite',
      }}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Loading"
      role="status"
    >
      {/* Background track circle - delicate hairline */}
      <circle
        cx="12"
        cy="12"
        r="9.5"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        style={{ opacity: 0.18 }}
      />
      {/* Active spinning arc - sleek tapered gradient stroke */}
      <path
        d="M12 2.5C6.75329 2.5 2.5 6.75329 2.5 12C2.5 14.3647 3.36444 16.5273 4.8 18.2"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        style={{ opacity: 0.95 }}
      />
      {/* Compositor-level SMIL animation fallback */}
      <animateTransform
        attributeName="transform"
        type="rotate"
        from="0 12 12"
        to="360 12 12"
        dur="0.7s"
        repeatCount="indefinite"
      />
    </svg>
  );
}
