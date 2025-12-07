export default function Col({ size = 12, children, className, style }) {
  return (
    <div
      className={className}
      style={{ width: `${(size / 12) * 100}%`, ...style }}
    >
      {children}
    </div>
  );
}
