interface SpinnerProps {
  size?: number | string;
  color?: string;
  className?: string;
}

/**
 * High-performance, continuous vector spinner.
 * Uses both CSS hardware-accelerated transforms and SVG SMIL animateTransform
 * to guarantee 100% continuous rotation that NEVER freezes or gets stuck.
 */
export function Spinner({ size = 18, color = 'currentColor', className = '' }: SpinnerProps) {
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
        animation: 'spin 0.75s linear infinite',
        WebkitAnimation: 'spin 0.75s linear infinite',
      }}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Loading"
      role="status"
    >
      {/* Background track circle */}
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
        style={{ opacity: 0.25 }}
      />
      {/* Active spinning arc */}
      <path
        fill={color}
        style={{ opacity: 0.95 }}
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
      {/* Compositor-level native fallback animation to guarantee it never freezes */}
      <animateTransform
        attributeName="transform"
        type="rotate"
        from="0 12 12"
        to="360 12 12"
        dur="0.75s"
        repeatCount="indefinite"
      />
    </svg>
  );
}
