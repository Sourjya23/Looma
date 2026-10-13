interface SpinnerProps {
  size?: number | string;
  color?: string;
  className?: string;
}

/**
 * Ultra-smooth, mathematically balanced vector spinner (Linear / Vercel grade).
 * Constant, rock-solid linear rotation with zero easing stutter, zero wobble, and zero SMIL conflicts.
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
        transformOrigin: 'center',
        animation: 'spin 0.75s linear infinite',
        WebkitAnimation: 'spin 0.75s linear infinite',
      }}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Loading"
      role="status"
    >
      {/* Background track circle - subtle hairline */}
      <circle
        cx="12"
        cy="12"
        r="9.5"
        stroke={color}
        strokeWidth="2.25"
        strokeLinecap="round"
        style={{ opacity: 0.18 }}
      />
      {/* Active rotating arc - mathematically precise 90-degree quadrant arc */}
      <path
        d="M12 2.5A9.5 9.5 0 0 1 21.5 12"
        stroke={color}
        strokeWidth="2.25"
        strokeLinecap="round"
        style={{ opacity: 1 }}
      />
    </svg>
  );
}
