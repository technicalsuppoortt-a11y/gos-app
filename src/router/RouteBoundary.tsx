import { translateText, useUILanguage, localizeNode } from '../i18n/display';
import { Component, Suspense } from 'react';
import type { PropsWithChildren } from 'react';
import { RouteLoading } from './ProtectedRoute';
import { reloadForChunkError } from './chunkRecovery';
export class RouteErrorBoundary extends Component<PropsWithChildren, { failed: boolean }> {
 state = { failed: false };
 static getDerivedStateFromError() { return { failed: true }; }
 componentDidCatch(error: Error) { console.error('Page failed to load:', error); reloadForChunkError(error); }
 render() {
  if (this.state.failed) return <section className="route-error-panel" role="alert"><h1>{translateText("This page could not load")}</h1><p>{translateText("Reload to get the latest version. If the issue continues, return to your dashboard and try again.")}</p><div><button onClick={() => { if (typeof window !== 'undefined') window.location.reload(); }}>{translateText("Reload page")}</button><a href="/dashboard">{translateText("Back to dashboard")}</a></div></section>;
  return this.props.children;
 }
}
export function Suspended({ children }: PropsWithChildren) {
  useUILanguage();
 return <RouteErrorBoundary><Suspense fallback={<RouteLoading/>}>{localizeNode(children)}</Suspense></RouteErrorBoundary>;
}
