/**
 * Suspense fallback shown while a lazy-loaded route is resolving.
 */
export default function PageFallback() {
  return (
    <div className="page-fallback" role="status" aria-live="polite">
      <div className="fallback-spinner" aria-hidden="true" />
      <span>Loading workspace…</span>
    </div>
  );
}