import { Component, Suspense } from 'react';
import type { PropsWithChildren } from 'react';
import { RouteLoading } from './ProtectedRoute';
import { reloadForChunkError } from './chunkRecovery';
export class RouteErrorBoundary extends Component<PropsWithChildren, { failed: boolean }> {
 state = { failed: false };
 static getDerivedStateFromError() { return { failed: true }; }
 componentDidCatch(error: Error) { console.error('Page failed to load:', error); reloadForChunkError(error); }
 render() {
  if (this.state.failed) return <section className="route-error-panel" role="alert"><h1>This page could not load</h1><p>Reload to get the latest version. If the issue continues, return to your dashboard and try again.</p><div><button onClick={() => { if (typeof window !== 'undefined') window.location.reload(); }}>Reload page</button><a href="/dashboard">Back to dashboard</a></div></section>;
  return this.props.children;
 }
}
export function Suspended({ children }: PropsWithChildren) {
 return <RouteErrorBoundary><Suspense fallback={<RouteLoading/>}>{children}</Suspense></RouteErrorBoundary>;
}
