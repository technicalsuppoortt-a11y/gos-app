import { useCallback, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { doc, onSnapshot } from 'firebase/firestore';
import { db, callBackend, backendError } from './firebase';
import type { RootState } from '../store';
import { normalizeTrackingConfig, trackingDefaults } from '../../functions/marketing-tracking-model.js';

export interface TrackingConfig { schemaVersion?: number; metaId: string; googleId: string; enabled: boolean; customEvents: string[]; advancedMode: boolean; webhookUrl: string }
export const emptyTracking: TrackingConfig = { ...trackingDefaults, customEvents: [] };
export const validMeta = (id: string) => /^\d{10,16}$/.test(id);
export const validGoogle = (id: string) => /^G-[A-Z0-9]{4,20}$/i.test(id);
export function validateTracking(c: TrackingConfig) { normalizeTrackingConfig(c); }
export function useTrackingConfig(global = false) {
  const auth = useSelector((s: RootState) => s.auth);
  const uid = auth.user?.id, tenantId = auth.tenant?.id;
  const scope = global ? 'platform' : uid && tenantId ? tenantId : '';
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState({ scope: '', config: emptyTracking, loading: true, error: '', canManage: false });
  const publish = useCallback((config: TrackingConfig, canManage?: boolean) => setState(previous => ({ scope, config: previous.scope === scope && JSON.stringify(previous.config) === JSON.stringify(config) ? previous.config : config, loading: false, error: '', canManage: canManage ?? (previous.scope === scope && previous.canManage) })), [scope]);
  useEffect(() => {
    if (!scope) return;
    let active = true, sawSnapshot = false, hasCanonical = false, snapshotError = false, backendRead: Promise<void> | undefined;
    const load = () => backendRead ??= callBackend<{ config: TrackingConfig; canManage: boolean }>('marketingTrackingConfiguration', { operation: 'get', scope: global ? 'platform' : 'workspace', ...(!global ? { tenantId } : {}) }).then(result => { if (active) { if (sawSnapshot && hasCanonical && !snapshotError) setState(previous => ({ ...previous, canManage: result.canManage, error: '' })); else publish(normalizeTrackingConfig(result.config), result.canManage); } }).catch(error => { if (active) setState(previous => ({ ...previous, scope, loading: false, error: backendError(error) })); });
    const ref = global ? doc(db, 'settings', 'marketingTracking') : doc(db, 'tenants', tenantId!, 'preferences', 'marketingTracking');
    const unsubscribe = onSnapshot(ref, snapshot => {
      if (!active) return;
      sawSnapshot = true; hasCanonical = snapshot.data() !== undefined; snapshotError = false;
      try { publish(normalizeTrackingConfig(snapshot.data() ?? emptyTracking)); } catch (error) { setState(previous => ({ ...previous, scope, loading: false, error: backendError(error) })); }
    }, error => { snapshotError = true; if (uid) void load(); else if (active) setState(previous => ({ ...previous, scope, loading: false, error: backendError(error) })); });
    if (uid) void load();
    return () => { active = false; unsubscribe(); };
  }, [uid, tenantId, global, scope, publish, attempt]);
  const current = !scope ? { config: emptyTracking, loading: false, error: '', canManage: false } : state.scope === scope ? state : { config: emptyTracking, loading: true, error: '', canManage: false };
  return { ...current, refresh: () => setAttempt(n => n + 1), save: async (config: TrackingConfig) => {
    const normalized = normalizeTrackingConfig(config);
    if (!uid || !scope) throw new Error('Sign in to save tracking settings.');
    const result = await callBackend<{ config: TrackingConfig; canManage: boolean }>('marketingTrackingConfiguration', { operation: 'save', scope: global ? 'platform' : 'workspace', ...(!global ? { tenantId } : {}), config: normalized });
    publish(normalizeTrackingConfig(result.config), result.canManage);
  } };
}

type Tracker = ((...args: unknown[]) => void) & { queue?: unknown[][]; callMethod?: (...args: unknown[]) => void; loaded?: boolean; version?: string; push?: Tracker };
declare global { interface Window { fbq?: Tracker; _fbq?: Tracker; gtag?: Tracker; dataLayer?: unknown[] } }
export interface TrackingEvent { id: string; event: string; payload: Record<string, unknown>; at: string; test: boolean; destinations: string[] }
const listeners = new Set<() => void>();
let events: TrackingEvent[] = [];
let activeMeta: string[] = [], activeGoogle: string[] = [];
let lastTrackedPath = '';
let eventOwner: string | undefined;
const initializedMeta = new Set<string>();
const initializedGoogle = new Set<string>();
export const trackingSnapshot = () => events;
export const subscribeTracking = (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; };
const mappings: Record<string, [string, string]> = { PageView: ['PageView', 'page_view'], Lead: ['Lead', 'generate_lead'], Purchase: ['Purchase', 'purchase'], BookMeeting: ['Schedule', 'book_meeting'], Signup: ['CompleteRegistration', 'sign_up'], Login: ['Login', 'login'], InitiateCheckout: ['InitiateCheckout', 'begin_checkout'], ViewContent: ['ViewContent', 'view_item'], AddToCart: ['AddToCart', 'add_to_cart'], AddToWishlist: ['AddToWishlist', 'add_to_wishlist'], Search: ['Search', 'search'], Contact: ['Contact', 'contact'], Subscribe: ['Subscribe', 'subscribe'], StartTrial: ['StartTrial', 'start_trial'], CompleteRegistration: ['CompleteRegistration', 'sign_up'], AddPaymentInfo: ['AddPaymentInfo', 'add_payment_info'], SubmitApplication: ['SubmitApplication', 'submit_application'], Donate: ['Donate', 'donate'], FindLocation: ['FindLocation', 'find_location'], CustomizeProduct: ['CustomizeProduct', 'customize_product'], Schedule: ['Schedule', 'book_meeting'], ViewCart: ['ViewCart', 'view_cart'], RemoveFromCart: ['RemoveFromCart', 'remove_from_cart'], Refund: ['Refund', 'refund'], Share: ['Share', 'share'], Download: ['Download', 'download'] };
const metaStandardEvents = new Set(['PageView','Lead','Purchase','Schedule','CompleteRegistration','InitiateCheckout','ViewContent','AddToCart','AddToWishlist','Search','Contact','Subscribe','StartTrial','AddPaymentInfo','SubmitApplication','Donate','FindLocation','CustomizeProduct']);
export function track(event: string, payload: Record<string, unknown> = {}, test = false) {
  const [meta, google] = mappings[event] ?? [event, event];
  const destinations: string[] = [];
  // Test events remain local and cannot inflate production conversions.
  if (!test) {
    try { for (const id of activeMeta) { window.fbq?.(metaStandardEvents.has(meta) ? 'trackSingle' : 'trackSingleCustom', id, meta, payload); destinations.push(`Meta ${id}`); } } catch { /* Tracking cannot interrupt the user's action. */ }
    try { if (activeGoogle.length) { window.gtag?.('event', google, { ...payload, send_to: activeGoogle }); destinations.push('GA4'); } } catch { /* Ad blockers are supported. */ }
  }
  const detail: TrackingEvent = { id: crypto.randomUUID(), event, payload, at: new Date().toISOString(), test, destinations };
  events = [detail, ...events].slice(0, 200); listeners.forEach(fn => fn());
  window.dispatchEvent(new CustomEvent('gos_track', { detail }));
}
export const Tracking = { track, page: (path = location.pathname) => track('PageView', { page_path: path }), lead: (p = {}) => track('Lead', p), purchase: (value: number, currency = 'USD', p = {}) => track('Purchase', { ...p, value, currency }), bookMeeting: (p = {}) => track('BookMeeting', p), identify: (id: string, traits: Record<string, unknown> = {}) => { try { if (activeGoogle.length) window.gtag?.('set', 'user_properties', { ...traits, user_id: id }); } catch { /* Identification is optional. */ } track('Identify', { ...traits, user_id: id }, true); }, custom: track };
function script(id: string, src: string) {
  if (document.getElementById(id)) return;
  const node = document.createElement('script'); node.id = id; node.async = true; node.src = src; document.head.appendChild(node);
}
export function TrackingRuntime() {
  const platform = useTrackingConfig(true), personal = useTrackingConfig();
  const uid = useSelector((s: RootState) => s.auth.user?.id);
  useEffect(() => { if (eventOwner !== uid) { eventOwner = uid; events = []; lastTrackedPath = ''; listeners.forEach(fn => fn()); } }, [uid]);
  useEffect(() => {
    if (platform.loading || personal.loading) return;
    const configs = [platform.config, personal.config].filter(c => c.enabled);
    activeMeta = [...new Set(configs.map(c => c.metaId).filter(validMeta))];
    activeGoogle = [...new Set(configs.map(c => c.googleId.toUpperCase()).filter(validGoogle))];
    if (activeMeta.length) {
      if (!window.fbq) {
        const fbq: Tracker = (...args) => { if (fbq.callMethod) fbq.callMethod(...args); else fbq.queue!.push(args); };
        fbq.queue = []; fbq.loaded = true; fbq.version = '2.0'; fbq.push = fbq; window.fbq = fbq; window._fbq = fbq;
      }
      script('gos-meta-pixel', 'https://connect.facebook.net/en_US/fbevents.js');
      activeMeta.forEach(id => { if (!initializedMeta.has(id)) { window.fbq?.('set', 'autoConfig', false, id); window.fbq?.('init', id); initializedMeta.add(id); } });
    }
    if (activeGoogle.length) {
      window.dataLayer ??= [];
      window.gtag ??= function() { window.dataLayer!.push(arguments); } as Tracker;
      script('gos-ga4', `https://www.googletagmanager.com/gtag/js?id=${activeGoogle[0]}`);
      if (!initializedGoogle.size) window.gtag('js', new Date());
      activeGoogle.forEach(id => { if (!initializedGoogle.has(id)) { window.gtag?.('config', id, { send_page_view: false }); initializedGoogle.add(id); } });
    }
    const page = () => { const path = location.pathname; if (path !== lastTrackedPath) { lastTrackedPath = path; Tracking.page(path); } };
    page(); const unsubscribe = subscribeTrackingRoute(page);
    return () => { unsubscribe(); activeMeta = []; activeGoogle = []; };
  }, [platform.config, platform.loading, personal.config, personal.loading, uid]);
  return null;
}
// Router subscription is supplied by App, keeping this runtime outside route layouts.
let routeSubscribe: ((fn: () => void) => () => void) | undefined;
export function setTrackingRouteSubscription(subscribe: (fn: () => void) => () => void) { routeSubscribe = subscribe; }
function subscribeTrackingRoute(fn: () => void) { return routeSubscribe?.(fn) ?? (() => {}); }
