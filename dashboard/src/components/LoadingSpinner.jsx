export default function LoadingSpinner({ message = 'Loading...', size = 'md' }) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12">
      <div className={`${sizeClasses[size]} border-2 border-green-900 border-t-mushroom-gold rounded-full animate-spin`} />
      <p className="text-sm text-green-700">{message}</p>
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="glass-card p-5 animate-pulse">
      <div className="flex justify-between mb-3">
        <div className="w-10 h-10 rounded-xl bg-green-900/40" />
        <div className="w-16 h-8 rounded bg-green-900/40" />
      </div>
      <div className="w-3/4 h-4 rounded bg-green-900/40 mb-2" />
      <div className="w-1/2 h-3 rounded bg-green-900/40 mb-3" />
      <div className="w-full h-8 rounded bg-green-900/40" />
    </div>
  );
}
