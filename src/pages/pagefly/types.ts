/* Core data model for the PageFly-style page editor. */

export type Device = 'desktop' | 'laptop' | 'tablet' | 'mobile';
export const DEVICES: Device[] = ['desktop', 'laptop', 'tablet', 'mobile'];
export const DEVICE_META: Record<Device, { label: string; width: number | null; hint: string }> = {
  desktop: { label: 'Desktop', width: null, hint: 'Default · 1280px and up' },
  laptop: { label: 'Laptop', width: 1024, hint: '1024px' },
  tablet: { label: 'Tablet', width: 768, hint: '768px' },
  mobile: { label: 'Mobile', width: 390, hint: '390px' },
};

export type StyleMap = Record<string, string>;
export type ResponsiveStyle = Partial<Record<Device, StyleMap>>;

export type PFType =
  // Containers
  | 'section' | 'row' | 'column' | 'block' | 'tabs' | 'tab' | 'accordion' | 'accordion-item' | 'popup' | 'slideshow' | 'slide' | 'content-list'
  // Media
  | 'image-comparison' | 'image' | 'youtube' | 'vimeo' | 'html-video' | 'soundcloud'
  // Basic
  | 'heading' | 'paragraph' | 'button' | 'list' | 'html' | 'icon' | 'divider' | 'spacer'
  // App blocks / third-party
  | 'app-block'
  // Advanced
  | 'qrcode' | 'table' | 'countdown' | 'google-map' | 'progress' | 'mc-form' | 'mc-field' | 'mc-button'
  // Social
  | 'instagram' | 'fb-like' | 'fb-feed' | 'x-feed'
  // Funnel
  | 'pricing' | 'testimonial' | 'booking' | 'checkout' | 'rating';

export type PFActionType = 'none' | 'link' | 'scroll' | 'popup' | 'email' | 'phone' | 'next-step';
export type PFAction = { type: PFActionType; url?: string; newTab?: boolean; target?: string };
export type PFAnimation = { appear?: string; hover?: string; duration?: string; delay?: string };
export type PFTracking = { fb?: string; ga?: string; tiktok?: string };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type PFProps = Record<string, any> & {
  hideOn?: Partial<Record<Device, boolean>>;
  action?: PFAction;
  tracking?: PFTracking;
  className?: string;
  cssId?: string;
  animation?: PFAnimation;
  customCss?: string;
  scrollEffect?: string;
};

export interface PFNode {
  id: string;
  type: PFType;
  name?: string;
  props: PFProps;
  style: ResponsiveStyle;
  children?: PFNode[];
}

export type PFMode = 'edit' | 'preview' | 'live' | 'thumb';

export type PFPageContext = {
  pageName: string;
  seoTitle: string;
  seoDescription: string;
  siteName: string;
};

export type PFTheme = { color: string; headingFont: string; bodyFont: string };

export type DragPayload = { kind: 'new'; elementType: PFType; variantId: string } | { kind: 'move'; id: string };

export type DropPlacement = { parentId: string | null; index: number };
