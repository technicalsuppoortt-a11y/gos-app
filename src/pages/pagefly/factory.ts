import { uid } from './tree';
import type { PFNode, PFProps, PFType, ResponsiveStyle, StyleMap } from './types';

/** Build a node. `style` may be a flat desktop style map or a responsive style object. */
export function node(type: PFType, props: PFProps = {}, style: StyleMap | ResponsiveStyle = {}, children?: PFNode[]): PFNode {
  const responsive = isResponsive(style) ? style as ResponsiveStyle : { desktop: style as StyleMap };
  return { id: uid(type), type, props, style: responsive, ...(children ? { children } : {}) };
}
const isResponsive = (style: object) => ['desktop', 'laptop', 'tablet', 'mobile'].some(key => key in style);

type S = StyleMap | ResponsiveStyle;

export const el = {
  section: (children: PFNode[], style: S = {}, props: PFProps = {}) => node('section', { container: 'boxed', maxWidth: '1200', ...props }, merge({ paddingTop: '56px', paddingBottom: '56px', paddingLeft: '20px', paddingRight: '20px' }, style), children),
  row: (columns: PFNode[], style: S = {}, props: PFProps = {}) => node('row', props, merge({ columnGap: '24px', rowGap: '24px' }, style), columns),
  col: (children: PFNode[], span = 6, opts: { tablet?: number; mobile?: number; laptop?: number } = {}, style: S = {}) => node('column', { span, spanLaptop: opts.laptop, spanTablet: opts.tablet, spanMobile: opts.mobile ?? 12 }, merge({ display: 'flex', flexDirection: 'column', gap: '14px' }, style), children),
  block: (children: PFNode[], style: S = {}, props: PFProps = {}) => node('block', props, merge({ display: 'flex', flexDirection: 'column', gap: '12px' }, style), children),
  heading: (text: string, tag = 'h2', style: S = {}, props: PFProps = {}) => node('heading', { text, tag, source: 'static', ...props }, style),
  paragraph: (text: string, style: S = {}, props: PFProps = {}) => node('paragraph', { text, source: 'static', ...props }, style),
  button: (label: string, style: S = {}, props: PFProps = {}) => node('button', { label, action: { type: 'none' }, ...props }, merge({ backgroundColor: 'var(--pf-accent)', color: '#ffffff', paddingTop: '13px', paddingBottom: '13px', paddingLeft: '26px', paddingRight: '26px', borderRadius: '6px', fontWeight: '600', fontSize: '15px' }, style)),
  image: (src: string, alt = '', style: S = {}, props: PFProps = {}) => node('image', { src, alt, ratio: 'auto', fit: 'cover', ...props }, merge({ width: '100%' }, style)),
  list: (items: string[], props: PFProps = {}, style: S = {}) => node('list', { items, marker: 'bullet', icon: 'check', ...props }, style),
  icon: (icon: string, props: PFProps = {}, style: S = {}) => node('icon', { icon, size: '32', color: 'var(--pf-accent)', ...props }, style),
  divider: (props: PFProps = {}, style: S = {}) => node('divider', { lineStyle: 'solid', thickness: '1', color: '#e3e3e3', ...props }, merge({ marginTop: '8px', marginBottom: '8px' }, style)),
  contentList: (items: { icon: string; title: string; text: string }[], props: PFProps = {}, style: S = {}) => node('content-list', { items, layout: 'vertical', iconColor: 'var(--pf-accent)', ...props }, style),
  tabs: (tabs: { label: string; children: PFNode[] }[], props: PFProps = {}, style: S = {}) => node('tabs', { variant: 'underline', ...props }, style, tabs.map(tab => node('tab', { label: tab.label }, { paddingTop: '18px', display: 'flex', flexDirection: 'column', gap: '12px' }, tab.children))),
  accordion: (items: { title: string; children: PFNode[] }[], props: PFProps = {}, style: S = {}) => node('accordion', { firstOpen: true, allowMultiple: false, icon: 'chevron', ...props }, style, items.map(item => node('accordion-item', { title: item.title }, { display: 'flex', flexDirection: 'column', gap: '10px' }, item.children))),
  slideshow: (slides: PFNode[][], props: PFProps = {}, style: S = {}) => node('slideshow', { autoplay: true, interval: '5', arrows: true, dots: true, height: '420', ...props }, style, slides.map(children => node('slide', {}, { display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '14px', padding: '40px', backgroundColor: '#111827', color: '#ffffff' }, children))),
  slide: (children: PFNode[], style: S = {}) => node('slide', {}, merge({ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '14px', padding: '40px' }, style), children),
  popup: (children: PFNode[], props: PFProps = {}, style: S = {}) => node('popup', { trigger: 'button', buttonLabel: 'Open popup', delay: '3', width: '520', closeOnOverlay: true, ...props }, merge({ padding: '32px', backgroundColor: '#ffffff', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }, style), children),
  youtube: (url: string, props: PFProps = {}, style: S = {}) => node('youtube', { url, autoplay: false, mute: false, controls: true, loop: false, ratio: '16:9', ...props }, style),
  vimeo: (url: string, props: PFProps = {}, style: S = {}) => node('vimeo', { url, autoplay: false, mute: false, loop: false, ratio: '16:9', ...props }, style),
  video: (src: string, props: PFProps = {}, style: S = {}) => node('html-video', { src, poster: '', autoplay: false, muted: true, loop: false, controls: true, ratio: '16:9', ...props }, style),
  soundcloud: (url: string, props: PFProps = {}, style: S = {}) => node('soundcloud', { url, color: '#ff5500', visual: false, height: '166', ...props }, style),
  comparison: (before: string, after: string, props: PFProps = {}, style: S = {}) => node('image-comparison', { before, after, beforeLabel: 'Before', afterLabel: 'After', start: 50, ratio: '16:9', ...props }, merge({ borderRadius: '10px' }, style)),
  html: (code: string, style: S = {}) => node('html', { code }, style),
  qrcode: (data: string, props: PFProps = {}, style: S = {}) => node('qrcode', { data, size: '180', color: '#111111', bg: '#ffffff', ...props }, style),
  table: (rows: string[][], props: PFProps = {}, style: S = {}) => node('table', { rows, header: true, striped: true, bordered: true, ...props }, style),
  countdown: (props: PFProps = {}, style: S = {}) => node('countdown', { mode: 'date', date: inDays(3), minutes: '15', showLabels: true, variant: 'boxes', expiredText: 'This offer has ended.', ...props }, style),
  map: (address: string, props: PFProps = {}, style: S = {}) => node('google-map', { address, zoom: '14', height: '360', mapType: 'roadmap', ...props }, merge({ borderRadius: '10px', overflow: 'hidden' }, style)),
  progress: (value: number, label: string, props: PFProps = {}, style: S = {}) => node('progress', { value, label, showValue: true, color: 'var(--pf-accent)', track: '#e9eaee', height: '12', striped: false, ...props }, style),
  form: (children: PFNode[], props: PFProps = {}, style: S = {}) => node('mc-form', { actionUrl: '', successMessage: 'Thanks! Please check your inbox to confirm your subscription.', redirectUrl: '', listName: 'Newsletter', ...props }, merge({ display: 'flex', flexDirection: 'column', gap: '12px' }, style), children),
  field: (label: string, type = 'text', props: PFProps = {}, style: S = {}) => node('mc-field', { label, type, name: label.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 10) || 'FIELD', placeholder: label, required: false, showLabel: false, options: 'Option 1\nOption 2', ...props }, style),
  submit: (label: string, style: S = {}) => node('mc-button', { label }, merge({ backgroundColor: 'var(--pf-accent)', color: '#ffffff', paddingTop: '13px', paddingBottom: '13px', paddingLeft: '24px', paddingRight: '24px', borderRadius: '6px', fontWeight: '600', fontSize: '15px' }, style)),
  instagram: (username: string, props: PFProps = {}, style: S = {}) => node('instagram', { username, columns: '3', count: '6', images: [], ...props }, style),
  fbLike: (url: string, props: PFProps = {}, style: S = {}) => node('fb-like', { url, layout: 'button_count', likeAction: 'like', share: true, size: 'large', ...props }, style),
  fbFeed: (url: string, props: PFProps = {}, style: S = {}) => node('fb-feed', { url, height: '500', smallHeader: false, hideCover: false, ...props }, style),
  xFeed: (username: string, props: PFProps = {}, style: S = {}) => node('x-feed', { username, height: '500', theme: 'light', ...props }, style),
  pricing: (plans: { name: string; price: string; period?: string; description?: string; features: string[]; button?: string; highlighted?: boolean; badge?: string }[], props: PFProps = {}, style: S = {}) => node('pricing', { plans, currency: '$', ...props }, style),
  testimonials: (items: { quote: string; name: string; role?: string; avatar?: string; rating?: number }[], props: PFProps = {}, style: S = {}) => node('testimonial', { items, columns: '3', ...props }, style),
  booking: (props: PFProps = {}, style: S = {}) => node('booking', { title: 'Book your appointment', service: 'Consultation', duration: '30', times: '09:00, 10:30, 13:00, 15:30, 17:00', button: 'Confirm booking', successMessage: 'You are booked! A confirmation email is on its way.', ...props }, style),
  checkout: (props: PFProps = {}, style: S = {}) => node('checkout', { product: 'Product name', price: '49', comparePrice: '79', currency: '$', image: '', button: 'Buy now', features: ['Free shipping', '30-day guarantee'], gateway: 'Stripe', ...props }, style),
  rating: (value: number, count: string, props: PFProps = {}, style: S = {}) => node('rating', { value, count, color: '#f5a623', size: '18', ...props }, style),
  appBlock: (app: string, props: PFProps = {}, style: S = {}) => node('app-block', { app, ...props }, style),
};

function merge(base: StyleMap, style: S): ResponsiveStyle {
  if (isResponsive(style)) { const responsive = style as ResponsiveStyle; return { ...responsive, desktop: { ...base, ...(responsive.desktop ?? {}) } }; }
  return { desktop: { ...base, ...(style as StyleMap) } };
}

export function inDays(days: number) {
  const date = new Date(Date.now() + days * 86400000);
  date.setMinutes(0, 0, 0);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Shared demo images (generated assets live in /public/pagefly). */
export const IMG = {
  toothache: '/pagefly/dental-toothache.png',
  bacteria: '/pagefly/dental-bacteria.png',
  smile: '/pagefly/dental-smile.png',
  toothbrush: '/pagefly/toothbrush-product.png',
  clinic: '/pagefly/dental-clinic.png',
  headphones: '/pagefly/headphones-product.png',
  smartwatch: '/pagefly/smartwatch-launch.png',
  saas: '/pagefly/saas-dashboard.png',
  coach: '/pagefly/coach-portrait.png',
  fitness: '/dashboard/funnel-fitness.png',
  nutrition: '/dashboard/product-nutrition.png',
  workout: '/dashboard/product-workout.png',
  consultation: '/dashboard/product-consultation.png',
  coaching: '/dashboard/product-coaching.png',
  webinar: '/dashboard/funnel-webinar.png',
  landscape: '/dashboard/hero-landscape.png',
};
