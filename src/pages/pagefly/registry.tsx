import type { ElementType } from 'react';
import {
  AppWindow, Blocks, CalendarDays, ChartNoAxesColumn, Code, Columns3, CreditCard, Film, GalleryHorizontal, Heading, Image, Images, LayoutList, ListChecks, ListTree,
  Mail, Map as MapIcon, Minus, MousePointerClick, PanelTop, Pilcrow, Play, QrCode, Quote, Rows3, SquareMousePointer, SquareSplitHorizontal, Star, Table, TextCursorInput, Timer,
  BadgeDollarSign, Sparkles, Square,
} from 'lucide-react';
import { el, IMG, node } from './factory';
import { FacebookIcon, InstagramIcon, SoundcloudIcon, VimeoIcon, XIcon, YoutubeIcon } from './icons';
import type { PFNode, PFProps, PFType } from './types';

export type Option = string | { value: string; label: string };
type Base = { key: string; label: string; help?: string; showIf?: (props: PFProps) => boolean };
export type FieldDef =
  | (Base & { type: 'text' | 'textarea' | 'url' | 'number' | 'color' | 'datetime' | 'code'; placeholder?: string })
  | (Base & { type: 'select'; options: Option[] })
  | (Base & { type: 'segmented'; options: { value: string; label: string }[] })
  | (Base & { type: 'toggle' })
  | (Base & { type: 'range'; min: number; max: number; step?: number; unit?: string })
  | (Base & { type: 'richtext'; tagKey?: string })
  | (Base & { type: 'image' })
  | (Base & { type: 'icon' })
  | (Base & { type: 'strings'; addLabel: string; placeholder?: string; image?: boolean })
  | (Base & { type: 'objects'; addLabel: string; itemTitle: string; titleKey: string; fields: FieldDef[]; create: () => Record<string, unknown> })
  | (Base & { type: 'table' })
  | (Base & { type: 'note'; text: string });

export type Variant = { id: string; label: string; create: () => PFNode; layout?: string[][] };
export type CategoryId = 'containers' | 'media' | 'basic' | 'app' | 'advanced' | 'social' | 'funnel';
export type ElementDef = { type: PFType; label: string; icon: ElementType; category: CategoryId | 'hidden'; badge?: string; clickable?: boolean; variants: Variant[]; fields: FieldDef[]; catalogKey?: string };

export const CATEGORIES: { id: CategoryId; label: string; tab: 'core' | 'funnel' }[] = [
  { id: 'containers', label: 'Containers', tab: 'core' },
  { id: 'media', label: 'Media', tab: 'core' },
  { id: 'basic', label: 'Basic', tab: 'core' },
  { id: 'app', label: 'App blocks', tab: 'core' },
  { id: 'advanced', label: 'Advanced', tab: 'core' },
  { id: 'social', label: 'Social', tab: 'core' },
  { id: 'funnel', label: 'Conversion', tab: 'funnel' },
];

const v = (id: string, label: string, create: () => PFNode, layout?: string[][]): Variant => ({ id, label, create, layout });
const textStyleOptions = [{ value: 'static', label: 'Static content' }, { value: 'page-title', label: 'Page title' }, { value: 'seo-title', label: 'SEO title' }, { value: 'seo-description', label: 'SEO description' }];
const ratioOptions: Option[] = [{ value: 'auto', label: 'Original' }, '1:1', '4:3', '3:2', '16:9', '3:4', '21:9'];
const col = (fraction: string) => { const [a, b] = fraction.split('/').map(Number); return Math.round((a / b) * 12); };
const layoutVariant = (rows: string[][], label: string) => v('layout-' + rows.map(r => r.join('+')).join('|'), label, () => {
  const columns = rows.flat().map(fraction => el.col([], col(fraction), { tablet: col(fraction) >= 6 ? 12 : 6 }));
  return el.row(columns);
}, rows);

const sampleParagraph = 'Discover the pros and cons of manual vs. electric toothbrushes, including cost, effectiveness and eco-friendliness, so you can make the right choice.';

export const ELEMENTS: ElementDef[] = [
  /* ---------------- Containers ---------------- */
  { type: 'row', catalogKey: 'layout', label: 'Layout', icon: Columns3, category: 'containers', variants: [
    v('blank-section', 'Blank section', () => el.section([])),
    v('blank-block', 'Blank block', () => el.block([], { minHeight: '80px' })),
    layoutVariant([['1/1']], '1 column'), layoutVariant([['1/2', '1/2']], '2 columns'), layoutVariant([['1/3', '1/3', '1/3']], '3 columns'), layoutVariant([['1/4', '1/4', '1/4', '1/4']], '4 columns'),
    layoutVariant([['2/3', '1/3']], '2/3 + 1/3'), layoutVariant([['1/3', '2/3']], '1/3 + 2/3'), layoutVariant([['1/2', '1/2'], ['1/2', '1/2']], '2 × 2 grid'), layoutVariant([['1/3', '1/3', '1/3'], ['1/3', '1/3', '1/3']], '3 × 2 grid'),
  ], fields: [
    { key: 'note', label: 'Columns', type: 'note', text: 'Select a column to change its width per device. Use the Styling tab to adjust the gap between columns.' },
    { key: 'reverseMobile', label: 'Reverse column order on mobile', type: 'toggle' },
    { key: 'verticalAlign', label: 'Vertical alignment', type: 'segmented', options: [{ value: 'stretch', label: 'Stretch' }, { value: 'start', label: 'Top' }, { value: 'center', label: 'Middle' }, { value: 'end', label: 'Bottom' }] },
  ] },
  { type: 'tabs', label: 'Tabs', icon: PanelTop, category: 'containers', variants: [
    v('tabs-underline', 'Underline tabs', () => el.tabs([{ label: 'Description', children: [el.paragraph(sampleParagraph)] }, { label: 'Specifications', children: [el.list(['Battery: 30 days', 'Modes: 5 cleaning modes', 'Charging: USB-C fast charge'])] }, { label: 'Shipping', children: [el.paragraph('Free shipping on all orders over $50. Easy 30-day returns.')] }])),
    v('tabs-pills', 'Pill tabs', () => el.tabs([{ label: 'Monthly', children: [el.heading('$29 / month', 'h3')] }, { label: 'Yearly', children: [el.heading('$290 / year', 'h3'), el.paragraph('Save two months with annual billing.')] }], { variant: 'pills' })),
    v('tabs-boxed', 'Boxed tabs', () => el.tabs([{ label: 'Overview', children: [el.paragraph(sampleParagraph)] }, { label: 'Reviews', children: [el.rating(4.8, '1,284 reviews')] }], { variant: 'boxed' })),
  ], fields: [
    { key: 'variant', label: 'Tab style', type: 'segmented', options: [{ value: 'underline', label: 'Underline' }, { value: 'pills', label: 'Pills' }, { value: 'boxed', label: 'Boxed' }] },
    { key: 'align', label: 'Tab alignment', type: 'segmented', options: [{ value: 'start', label: 'Left' }, { value: 'center', label: 'Center' }, { value: 'stretch', label: 'Full' }] },
    { key: 'note', label: 'Tabs', type: 'note', text: 'Select a tab pane in the Page content tree to rename it, or add tabs with the button below.' },
  ] },
  { type: 'accordion', label: 'Accordion', icon: Rows3, category: 'containers', variants: [
    v('accordion-simple', 'Simple accordion', () => el.accordion([{ title: 'How long does shipping take?', children: [el.paragraph('Orders ship within 24 hours and arrive in 2–5 business days.')] }, { title: 'What is your return policy?', children: [el.paragraph('Return any unused product within 30 days for a full refund.')] }, { title: 'Do you ship internationally?', children: [el.paragraph('Yes, we ship to more than 40 countries worldwide.')] }])),
    v('accordion-cards', 'Bordered cards', () => el.accordion([{ title: 'Is the consultation free?', children: [el.paragraph('Yes, your first 20-minute consultation is completely free.')] }, { title: 'Can I reschedule?', children: [el.paragraph('You can reschedule up to 24 hours before your appointment.')] }], { variant: 'cards' })),
    v('accordion-plus', 'FAQ with plus icons', () => el.accordion([{ title: 'Who is this program for?', children: [el.paragraph('Professionals who want a proven system to grow with clarity.')] }, { title: 'What if it is not for me?', children: [el.paragraph('Every plan includes a 14-day money-back guarantee.')] }], { icon: 'plus' })),
  ], fields: [
    { key: 'variant', label: 'Style', type: 'segmented', options: [{ value: 'lines', label: 'Lines' }, { value: 'cards', label: 'Cards' }] },
    { key: 'icon', label: 'Icon', type: 'segmented', options: [{ value: 'chevron', label: 'Chevron' }, { value: 'plus', label: 'Plus' }] },
    { key: 'firstOpen', label: 'Open first item by default', type: 'toggle' },
    { key: 'allowMultiple', label: 'Allow multiple items open', type: 'toggle' },
  ] },
  { type: 'popup', label: 'Popup', icon: AppWindow, category: 'containers', variants: [
    v('popup-button', 'Button trigger', () => el.popup([el.heading('Get 10% off your first order', 'h3', { textAlign: 'center' }), el.paragraph('Join our list and receive your code instantly.', { textAlign: 'center', color: '#5b6170' }), el.form([el.field('Email', 'email', { name: 'EMAIL', required: true, placeholder: 'Your email address' }), el.submit('Unlock my discount')])], { buttonLabel: 'Claim 10% off' })),
    v('popup-load', 'Newsletter (on page load)', () => el.popup([el.heading('Before you go…', 'h3', { textAlign: 'center' }), el.paragraph('Subscribe for weekly tips and exclusive offers.', { textAlign: 'center' }), el.form([el.field('Email', 'email', { name: 'EMAIL', required: true, placeholder: 'you@example.com' }), el.submit('Subscribe')])], { trigger: 'delay', delay: '4' })),
    v('popup-exit', 'Exit-intent offer', () => el.popup([el.heading('Wait! Free shipping today', 'h3', { textAlign: 'center' }), el.button('Continue shopping', { alignSelf: 'center' })], { trigger: 'exit' })),
  ], fields: [
    { key: 'trigger', label: 'Open popup', type: 'select', options: [{ value: 'button', label: 'When the trigger button is clicked' }, { value: 'delay', label: 'After a delay' }, { value: 'load', label: 'Immediately on page load' }, { value: 'exit', label: 'On exit intent' }] },
    { key: 'buttonLabel', label: 'Trigger button label', type: 'text', showIf: props => props.trigger === 'button' },
    { key: 'delay', label: 'Delay', type: 'range', min: 1, max: 60, unit: 's', showIf: props => props.trigger === 'delay' },
    { key: 'width', label: 'Popup width', type: 'range', min: 280, max: 960, step: 10, unit: 'px' },
    { key: 'closeOnOverlay', label: 'Close when clicking outside', type: 'toggle' },
    { key: 'note', label: 'Tip', type: 'note', text: 'Any button can also open this popup: set its click action to “Open popup” and choose this popup.' },
  ] },
  { type: 'slideshow', label: 'Slideshow', icon: GalleryHorizontal, category: 'containers', variants: [
    v('slideshow-hero', 'Hero slideshow', () => el.slideshow([
      [el.heading('New season. New essentials.', 'h2', { color: '#ffffff', textAlign: 'center' }), el.button('Shop now', { backgroundColor: '#ffffff', color: '#111827' })],
      [el.heading('Free shipping over $50', 'h2', { color: '#ffffff', textAlign: 'center' }), el.paragraph('Fast delivery, easy returns.', { color: '#e5e7eb', textAlign: 'center' })],
    ])),
    v('slideshow-quotes', 'Testimonial slider', () => el.slideshow([
      [el.paragraph('“The best purchase I made this year. My dentist noticed the difference.”', { fontSize: '22px', textAlign: 'center', color: '#ffffff' }), el.paragraph('— Sarah K., verified buyer', { color: '#cbd5e1' })],
      [el.paragraph('“Professional results at home. Battery lasts for weeks.”', { fontSize: '22px', textAlign: 'center', color: '#ffffff' }), el.paragraph('— Daniel M.', { color: '#cbd5e1' })],
    ], { height: '300' })),
  ], fields: [
    { key: 'height', label: 'Slide height', type: 'range', min: 160, max: 900, step: 10, unit: 'px' },
    { key: 'autoplay', label: 'Autoplay', type: 'toggle' },
    { key: 'interval', label: 'Interval', type: 'range', min: 2, max: 15, unit: 's', showIf: props => Boolean(props.autoplay) },
    { key: 'arrows', label: 'Show arrows', type: 'toggle' },
    { key: 'dots', label: 'Show dots', type: 'toggle' },
  ] },
  { type: 'content-list', label: 'Content list', icon: LayoutList, category: 'containers', variants: [
    v('content-vertical', 'Vertical with icons', () => el.contentList([{ icon: 'truck', title: 'Free shipping', text: 'On every order over $50.' }, { icon: 'returns', title: '30-day returns', text: 'Not happy? Send it back free.' }, { icon: 'shield-check', title: '2-year warranty', text: 'Covered against any defect.' }])),
    v('content-horizontal', 'Horizontal features', () => el.contentList([{ icon: 'zap', title: 'Fast setup', text: 'Live in minutes.' }, { icon: 'lock', title: 'Secure', text: 'Bank-level encryption.' }, { icon: 'users', title: 'Collaborative', text: 'Built for teams.' }], { layout: 'horizontal' })),
  ], fields: [
    { key: 'layout', label: 'Layout', type: 'segmented', options: [{ value: 'vertical', label: 'Vertical' }, { value: 'horizontal', label: 'Horizontal' }] },
    { key: 'iconColor', label: 'Icon color', type: 'color' },
    { key: 'items', label: 'Items', type: 'objects', addLabel: 'Add item', itemTitle: 'Item', titleKey: 'title', create: () => ({ icon: 'check', title: 'New item', text: 'Describe this benefit.' }), fields: [{ key: 'icon', label: 'Icon', type: 'icon' }, { key: 'title', label: 'Title', type: 'text' }, { key: 'text', label: 'Description', type: 'textarea' }] },
  ] },

  /* ---------------- Media ---------------- */
  { type: 'image-comparison', label: 'Image Comparison', icon: SquareSplitHorizontal, category: 'media', badge: 'New', variants: [
    v('comparison', 'Before / after slider', () => el.comparison(IMG.toothache, IMG.smile, { beforeLabel: 'Before', afterLabel: 'After' })),
  ], fields: [
    { key: 'before', label: 'Before image', type: 'image' }, { key: 'after', label: 'After image', type: 'image' },
    { key: 'beforeLabel', label: 'Before label', type: 'text' }, { key: 'afterLabel', label: 'After label', type: 'text' },
    { key: 'start', label: 'Initial position', type: 'range', min: 5, max: 95, unit: '%' },
    { key: 'ratio', label: 'Aspect ratio', type: 'select', options: ['16:9', '4:3', '3:2', '1:1'] },
  ] },
  { type: 'image', label: 'Image', icon: Image, category: 'media', clickable: true, variants: [
    v('image', 'Image', () => el.image(IMG.clinic, 'Modern dental clinic')),
    v('image-rounded', 'Rounded image', () => el.image(IMG.coach, 'Coach portrait', { borderRadius: '16px' }, { ratio: '4:3' })),
    v('image-caption', 'Image with caption', () => el.image(IMG.toothbrush, 'Electric toothbrush', {}, { caption: 'Our best-selling sonic toothbrush', ratio: '1:1' })),
  ], fields: [
    { key: 'src', label: 'Image', type: 'image' },
    { key: 'alt', label: 'Alt text', type: 'text', placeholder: 'Describe the image for accessibility & SEO' },
    { key: 'ratio', label: 'Aspect ratio', type: 'select', options: ratioOptions },
    { key: 'fit', label: 'Image fit', type: 'segmented', options: [{ value: 'cover', label: 'Cover' }, { value: 'contain', label: 'Contain' }] },
    { key: 'caption', label: 'Caption', type: 'text' },
    { key: 'lazy', label: 'Lazy load', type: 'toggle', help: 'Recommended for images below the fold.' },
  ] },
  { type: 'youtube', label: 'YouTube video', icon: YoutubeIcon, category: 'media', variants: [v('youtube', 'YouTube video', () => el.youtube('https://www.youtube.com/watch?v=ysz5S6PUM-U'))], fields: [
    { key: 'url', label: 'YouTube URL', type: 'url', placeholder: 'https://www.youtube.com/watch?v=…' },
    { key: 'ratio', label: 'Aspect ratio', type: 'select', options: ['16:9', '4:3', '1:1', '9:16', '21:9'] },
    { key: 'autoplay', label: 'Autoplay', type: 'toggle' }, { key: 'mute', label: 'Mute', type: 'toggle' }, { key: 'controls', label: 'Show controls', type: 'toggle' }, { key: 'loop', label: 'Loop', type: 'toggle' },
  ] },
  { type: 'vimeo', label: 'Vimeo video', icon: VimeoIcon, category: 'media', variants: [v('vimeo', 'Vimeo video', () => el.vimeo('https://vimeo.com/76979871'))], fields: [
    { key: 'url', label: 'Vimeo URL', type: 'url', placeholder: 'https://vimeo.com/…' },
    { key: 'ratio', label: 'Aspect ratio', type: 'select', options: ['16:9', '4:3', '1:1', '9:16', '21:9'] },
    { key: 'autoplay', label: 'Autoplay', type: 'toggle' }, { key: 'mute', label: 'Mute', type: 'toggle' }, { key: 'loop', label: 'Loop', type: 'toggle' },
  ] },
  { type: 'html-video', label: 'HTML video', icon: Film, category: 'media', variants: [v('html-video', 'HTML5 video', () => el.video('https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4', { poster: '' }))], fields: [
    { key: 'src', label: 'Video file URL (.mp4, .webm)', type: 'url' }, { key: 'poster', label: 'Poster image', type: 'image' },
    { key: 'ratio', label: 'Aspect ratio', type: 'select', options: ['16:9', '4:3', '1:1', '9:16'] },
    { key: 'autoplay', label: 'Autoplay', type: 'toggle' }, { key: 'muted', label: 'Muted', type: 'toggle' }, { key: 'loop', label: 'Loop', type: 'toggle' }, { key: 'controls', label: 'Show controls', type: 'toggle' },
  ] },
  { type: 'soundcloud', label: 'Soundcloud', icon: SoundcloudIcon, category: 'media', variants: [v('soundcloud', 'SoundCloud track', () => el.soundcloud('https://soundcloud.com/forss/flickermood'))], fields: [
    { key: 'url', label: 'SoundCloud URL', type: 'url' }, { key: 'color', label: 'Player color', type: 'color' }, { key: 'visual', label: 'Visual player', type: 'toggle' }, { key: 'height', label: 'Height', type: 'range', min: 120, max: 450, unit: 'px' },
  ] },

  /* ---------------- Basic ---------------- */
  { type: 'heading', label: 'Heading', icon: Heading, category: 'basic', clickable: true, variants: [
    v('h1', 'Heading 1', () => el.heading('Your main page headline', 'h1')),
    v('h2', 'Heading 2', () => el.heading('Section heading', 'h2')),
    v('h3', 'Heading 3', () => el.heading('Subheading', 'h3')),
    v('eyebrow', 'Small label', () => el.heading('NEW ARRIVAL', 'p', { fontSize: '12px', letterSpacing: '2px', fontWeight: '700', color: 'var(--pf-accent)' })),
  ], fields: [
    { key: 'source', label: 'Source type', type: 'select', options: textStyleOptions.slice(0, 3) },
    { key: 'text', label: 'Heading text', type: 'richtext', tagKey: 'tag', showIf: props => !props.source || props.source === 'static' },
    { key: 'tag', label: 'HTML tag', type: 'select', options: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'div'].map(tag => ({ value: tag, label: tag.toUpperCase() })) },
  ] },
  { type: 'paragraph', label: 'Paragraph', icon: Pilcrow, category: 'basic', clickable: true, variants: [
    v('p-body', 'Body text', () => el.paragraph(sampleParagraph)),
    v('p-lead', 'Lead text', () => el.paragraph('A clear, compelling statement that tells visitors exactly why they should keep reading.', { fontSize: '19px', lineHeight: '1.6', color: '#3f4450' })),
    v('p-small', 'Small caption', () => el.paragraph('Written by Dr. Nguyen · Published Feb 2026', { fontSize: '12px', color: '#8a8f99' })),
  ], fields: [
    { key: 'source', label: 'Source type', type: 'select', options: [textStyleOptions[0], textStyleOptions[3]] },
    { key: 'text', label: 'Paragraph text', type: 'richtext', showIf: props => !props.source || props.source === 'static' },
  ] },
  { type: 'button', label: 'Button', icon: SquareMousePointer, category: 'basic', clickable: true, variants: [
    v('btn-primary', 'Primary', () => el.button('Shop now')),
    v('btn-outline', 'Outline', () => el.button('Learn more', { backgroundColor: 'transparent', color: 'var(--pf-accent)', borderWidth: '2px', borderStyle: 'solid', borderColor: 'var(--pf-accent)' })),
    v('btn-pill', 'Pill', () => el.button('Get started', { borderRadius: '999px', paddingInlineStart: '32px', paddingInlineEnd: '32px' })),
    v('btn-dark', 'Dark', () => el.button('DOCTOR CONSULTATION', { backgroundColor: '#111111', borderRadius: '0px', fontSize: '12px', letterSpacing: '1px' })),
    v('btn-icon', 'With icon', () => el.button('Book a call', {}, { iconRight: 'arrow' })),
    v('btn-link', 'Text link', () => el.button('Read the full article', { backgroundColor: 'transparent', color: 'var(--pf-accent)', paddingInlineStart: '0px', paddingInlineEnd: '0px', textDecoration: 'underline' })),
  ], fields: [
    { key: 'label', label: 'Button text', type: 'text' },
    { key: 'iconLeft', label: 'Icon before text', type: 'icon' },
    { key: 'iconRight', label: 'Icon after text', type: 'icon' },
    { key: 'fullWidth', label: 'Full width', type: 'toggle' },
  ] },
  { type: 'list', label: 'List', icon: ListChecks, category: 'basic', variants: [
    v('list-bullet', 'Bullet list', () => el.list(['<b>Customer problem 1:</b> Lorem Ipsum is simply dummy text of the printing industry.', '<b>Customer problem 2:</b> It has been the industry standard dummy text.', '<b>Customer problem 3:</b> Typesetting remains essentially unchanged.'])),
    v('list-number', 'Numbered list', () => el.list(['Choose your plan', 'Book your first session', 'Start seeing results'], { marker: 'number' })),
    v('list-check', 'Check list', () => el.list(['Removes up to 10× more plaque', 'Gentle on gums', '30-day battery life'], { marker: 'icon', icon: 'check-circle' })),
  ], fields: [
    { key: 'marker', label: 'List style', type: 'segmented', options: [{ value: 'bullet', label: 'Bullet' }, { value: 'number', label: 'Number' }, { value: 'icon', label: 'Icon' }] },
    { key: 'icon', label: 'Icon', type: 'icon', showIf: props => props.marker === 'icon' },
    { key: 'iconColor', label: 'Marker color', type: 'color' },
    { key: 'items', label: 'List items', type: 'strings', addLabel: 'Add list item' },
  ] },
  { type: 'html', label: 'HTML/Liquid', icon: Code, category: 'basic', variants: [v('html', 'Custom HTML', () => el.html('<div style="padding:24px;border-radius:10px;background:linear-gradient(135deg,#eef2ff,#fdf2f8);font-family:Inter,sans-serif;text-align:center">\n  <strong>Custom HTML block</strong>\n  <p style="margin:6px 0 0;color:#555">Paste embed codes, widgets or Liquid snippets.</p>\n</div>'))], fields: [
    { key: 'code', label: 'HTML / Liquid code', type: 'code', help: 'Rendered in a secure sandbox. Liquid tags are processed when your store is connected.' },
  ] },
  { type: 'icon', label: 'Icon', icon: Sparkles, category: 'basic', clickable: true, variants: [
    v('icon', 'Icon', () => el.icon('star')),
    v('icon-circle', 'Icon in circle', () => el.icon('shield-check', { color: '#ffffff' }, { backgroundColor: 'var(--pf-accent)', borderRadius: '999px', padding: '14px', alignSelf: 'flex-start' })),
  ], fields: [
    { key: 'icon', label: 'Icon', type: 'icon' },
    { key: 'size', label: 'Size', type: 'range', min: 12, max: 128, unit: 'px' },
    { key: 'color', label: 'Color', type: 'color' },
  ] },
  { type: 'divider', label: 'Divider', icon: Minus, category: 'basic', variants: [
    v('divider-solid', 'Solid line', () => el.divider()),
    v('divider-dashed', 'Dashed line', () => el.divider({ lineStyle: 'dashed', color: '#c7c9d1' })),
    v('divider-accent', 'Short accent', () => el.divider({ thickness: '3', color: 'var(--pf-accent)', width: '64' })),
  ], fields: [
    { key: 'lineStyle', label: 'Line style', type: 'segmented', options: [{ value: 'solid', label: 'Solid' }, { value: 'dashed', label: 'Dashed' }, { value: 'dotted', label: 'Dotted' }, { value: 'double', label: 'Double' }] },
    { key: 'thickness', label: 'Thickness', type: 'range', min: 1, max: 12, unit: 'px' },
    { key: 'width', label: 'Width', type: 'range', min: 10, max: 100, unit: '%' },
    { key: 'color', label: 'Color', type: 'color' },
    { key: 'align', label: 'Alignment', type: 'segmented', options: [{ value: 'left', label: 'Left' }, { value: 'center', label: 'Center' }, { value: 'right', label: 'Right' }] },
  ] },

  /* ---------------- App blocks ---------------- */
  { type: 'app-block', label: 'App blocks', icon: Blocks, category: 'app', variants: [], fields: [
    { key: 'app', label: 'App', type: 'select', options: ['Judge.me Reviews', 'Klaviyo Signup', 'Calendly', 'Typeform', 'Trustpilot', 'WhatsApp Chat', 'Google Reviews'] },
    { key: 'embedUrl', label: 'Embed / profile URL', type: 'url', help: 'Calendly, Typeform or review profile link used by the widget.', showIf: props => ['Calendly', 'Typeform', 'Trustpilot', 'Google Reviews'].includes(props.app) },
    { key: 'phone', label: 'WhatsApp number', type: 'text', placeholder: '+20 100 000 0000', showIf: props => props.app === 'WhatsApp Chat' },
    { key: 'message', label: 'Prefilled message', type: 'text', showIf: props => props.app === 'WhatsApp Chat' },
    { key: 'title', label: 'Widget title', type: 'text' },
  ] },

  /* ---------------- Advanced ---------------- */
  { type: 'qrcode', label: 'QRCODE', icon: QrCode, category: 'advanced', variants: [v('qrcode', 'QR code', () => el.qrcode('https://example.com'))], fields: [
    { key: 'data', label: 'Content (URL or text)', type: 'text' }, { key: 'size', label: 'Size', type: 'range', min: 80, max: 400, step: 10, unit: 'px' }, { key: 'color', label: 'Code color', type: 'color' }, { key: 'bg', label: 'Background', type: 'color' },
  ] },
  { type: 'table', label: 'Table', icon: Table, category: 'advanced', badge: 'New', variants: [
    v('table-compare', 'Comparison table', () => el.table([['Feature', 'Manual', 'Electric'], ['Plaque removal', 'Good', 'Excellent'], ['Built-in timer', '—', '✓'], ['Pressure sensor', '—', '✓'], ['Average cost / year', '$12', '$45']])),
    v('table-simple', 'Simple table', () => el.table([['Size', 'Chest', 'Length'], ['S', '96 cm', '70 cm'], ['M', '102 cm', '72 cm'], ['L', '108 cm', '74 cm']], { striped: false })),
  ], fields: [
    { key: 'header', label: 'First row is header', type: 'toggle' }, { key: 'striped', label: 'Striped rows', type: 'toggle' }, { key: 'bordered', label: 'Borders', type: 'toggle' },
    { key: 'rows', label: 'Table content', type: 'table' },
  ] },
  { type: 'countdown', label: 'Countdown', icon: Timer, category: 'advanced', variants: [
    v('countdown-boxes', 'Boxes', () => el.countdown()),
    v('countdown-inline', 'Inline', () => el.countdown({ variant: 'inline' })),
    v('countdown-evergreen', 'Evergreen (15 min)', () => el.countdown({ mode: 'evergreen', minutes: '15' })),
  ], fields: [
    { key: 'mode', label: 'Timer type', type: 'segmented', options: [{ value: 'date', label: 'Fixed date' }, { value: 'evergreen', label: 'Evergreen' }] },
    { key: 'date', label: 'Ends at', type: 'datetime', showIf: props => props.mode !== 'evergreen' },
    { key: 'minutes', label: 'Minutes per visitor', type: 'number', showIf: props => props.mode === 'evergreen' },
    { key: 'variant', label: 'Style', type: 'segmented', options: [{ value: 'boxes', label: 'Boxes' }, { value: 'inline', label: 'Inline' }] },
    { key: 'showLabels', label: 'Show labels', type: 'toggle' },
    { key: 'expiredText', label: 'Text when expired', type: 'text' },
  ] },
  { type: 'google-map', label: 'Google Map', icon: MapIcon, category: 'advanced', variants: [v('map', 'Google Map', () => el.map('Tahrir Square, Cairo, Egypt'))], fields: [
    { key: 'address', label: 'Address or place', type: 'text' }, { key: 'zoom', label: 'Zoom', type: 'range', min: 3, max: 20 }, { key: 'height', label: 'Height', type: 'range', min: 180, max: 800, step: 10, unit: 'px' },
    { key: 'mapType', label: 'Map type', type: 'segmented', options: [{ value: 'roadmap', label: 'Roadmap' }, { value: 'satellite', label: 'Satellite' }] },
  ] },
  { type: 'progress', label: 'Progress', icon: ChartNoAxesColumn, category: 'advanced', variants: [
    v('progress-bar', 'Progress bar', () => el.progress(72, 'Stock remaining')),
    v('progress-striped', 'Striped & animated', () => el.progress(86, '86% funded', { striped: true, height: '16' })),
  ], fields: [
    { key: 'label', label: 'Label', type: 'text' }, { key: 'value', label: 'Value', type: 'range', min: 0, max: 100, unit: '%' }, { key: 'showValue', label: 'Show percentage', type: 'toggle' },
    { key: 'color', label: 'Bar color', type: 'color' }, { key: 'track', label: 'Track color', type: 'color' }, { key: 'height', label: 'Bar height', type: 'range', min: 4, max: 40, unit: 'px' }, { key: 'striped', label: 'Striped animation', type: 'toggle' },
  ] },
  { type: 'mc-form', label: 'MailChimp form', icon: Mail, category: 'advanced', variants: [
    v('mc-inline', 'Inline newsletter', () => el.form([el.field('Email', 'email', { name: 'EMAIL', required: true, placeholder: 'Enter your email' }), el.submit('Subscribe')], {}, { flexDirection: 'row', flexWrap: 'wrap' })),
    v('mc-stacked', 'Stacked signup', () => el.form([el.field('First name', 'text', { name: 'FNAME', placeholder: 'First name' }), el.field('Email', 'email', { name: 'EMAIL', required: true, placeholder: 'Email address' }), el.field('I agree to receive emails', 'checkbox', { name: 'CONSENT' }), el.submit('Get my free guide')])),
  ], fields: [
    { key: 'actionUrl', label: 'Mailchimp form action URL', type: 'url', help: 'Find it in Mailchimp → Audience → Signup forms → Embedded forms (the form "action" URL). Leave empty to collect submissions in GOS.' },
    { key: 'listName', label: 'Audience / list name', type: 'text' },
    { key: 'successMessage', label: 'Success message', type: 'textarea' },
    { key: 'redirectUrl', label: 'Redirect after submit (optional)', type: 'url' },
  ] },
  { type: 'mc-field', label: 'MailChimp form field', icon: TextCursorInput, category: 'advanced', variants: [
    v('field-email', 'Email', () => el.field('Email', 'email', { name: 'EMAIL', required: true })),
    v('field-text', 'Text', () => el.field('First name', 'text', { name: 'FNAME' })),
    v('field-phone', 'Phone', () => el.field('Phone', 'tel', { name: 'PHONE' })),
    v('field-select', 'Dropdown', () => el.field('Interest', 'select', { name: 'INTEREST', options: 'Whitening\nCheck-up\nBraces' })),
    v('field-textarea', 'Message', () => el.field('Message', 'textarea', { name: 'MESSAGE' })),
    v('field-checkbox', 'Checkbox', () => el.field('I agree to the terms', 'checkbox', { name: 'TERMS' })),
  ], fields: [
    { key: 'label', label: 'Label', type: 'text' }, { key: 'showLabel', label: 'Show label', type: 'toggle' },
    { key: 'type', label: 'Field type', type: 'select', options: [{ value: 'text', label: 'Text' }, { value: 'email', label: 'Email' }, { value: 'tel', label: 'Phone' }, { value: 'number', label: 'Number' }, { value: 'date', label: 'Date' }, { value: 'textarea', label: 'Multi-line text' }, { value: 'select', label: 'Dropdown' }, { value: 'checkbox', label: 'Checkbox' }] },
    { key: 'name', label: 'Merge tag (field name)', type: 'text', help: 'Must match the Mailchimp merge tag, e.g. EMAIL, FNAME.' },
    { key: 'placeholder', label: 'Placeholder', type: 'text', showIf: props => !['checkbox', 'select'].includes(props.type) },
    { key: 'options', label: 'Options (one per line)', type: 'textarea', showIf: props => props.type === 'select' },
    { key: 'required', label: 'Required', type: 'toggle' },
  ] },
  { type: 'mc-button', label: 'MailChimp form button', icon: MousePointerClick, category: 'advanced', variants: [v('mc-button', 'Submit button', () => el.submit('Subscribe'))], fields: [
    { key: 'label', label: 'Button text', type: 'text' }, { key: 'fullWidth', label: 'Full width', type: 'toggle' },
  ] },

  /* ---------------- Social ---------------- */
  { type: 'instagram', label: 'Instagram feed', icon: InstagramIcon, category: 'social', variants: [v('instagram', 'Instagram grid', () => el.instagram('gos.studio'))], fields: [
    { key: 'username', label: 'Instagram username', type: 'text' }, { key: 'columns', label: 'Columns', type: 'range', min: 2, max: 6 }, { key: 'count', label: 'Posts to show', type: 'range', min: 2, max: 12 },
    { key: 'images', label: 'Post images', type: 'strings', addLabel: 'Add post image', image: true, help: 'Connect your Instagram account in Integrations to sync posts automatically.' },
  ] },
  { type: 'fb-like', label: 'Facebook like & share', icon: FacebookIcon, category: 'social', variants: [v('fb-like', 'Like & share buttons', () => el.fbLike('https://www.facebook.com/facebook'))], fields: [
    { key: 'url', label: 'URL to like', type: 'url' },
    { key: 'layout', label: 'Layout', type: 'select', options: [{ value: 'button_count', label: 'Button with count' }, { value: 'button', label: 'Button' }, { value: 'box_count', label: 'Box count' }, { value: 'standard', label: 'Standard' }] },
    { key: 'likeAction', label: 'Verb', type: 'segmented', options: [{ value: 'like', label: 'Like' }, { value: 'recommend', label: 'Recommend' }] },
    { key: 'share', label: 'Include share button', type: 'toggle' },
    { key: 'size', label: 'Size', type: 'segmented', options: [{ value: 'small', label: 'Small' }, { value: 'large', label: 'Large' }] },
  ] },
  { type: 'fb-feed', label: 'Facebook feed', icon: FacebookIcon, category: 'social', variants: [v('fb-feed', 'Page timeline', () => el.fbFeed('https://www.facebook.com/facebook'))], fields: [
    { key: 'url', label: 'Facebook page URL', type: 'url' }, { key: 'height', label: 'Height', type: 'range', min: 200, max: 900, step: 10, unit: 'px' }, { key: 'smallHeader', label: 'Small header', type: 'toggle' }, { key: 'hideCover', label: 'Hide cover photo', type: 'toggle' },
  ] },
  { type: 'x-feed', label: 'X (Twitter) feed', icon: XIcon, category: 'social', variants: [v('x-feed', 'Profile timeline', () => el.xFeed('X'))], fields: [
    { key: 'username', label: 'X username', type: 'text' }, { key: 'height', label: 'Height', type: 'range', min: 200, max: 900, step: 10, unit: 'px' },
    { key: 'theme', label: 'Theme', type: 'segmented', options: [{ value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }] },
  ] },

  /* ---------------- Conversion (funnel) ---------------- */
  { type: 'pricing', label: 'Pricing table', icon: BadgeDollarSign, category: 'funnel', variants: [
    v('pricing-3', 'Three plans', () => el.pricing([{ name: 'Starter', price: '19', period: 'month', description: 'For individuals', features: ['1 project', 'Email support', 'Basic analytics'], button: 'Start free trial' }, { name: 'Growth', price: '49', period: 'month', description: 'For growing teams', features: ['10 projects', 'Priority support', 'Advanced analytics', 'Automations'], button: 'Start free trial', highlighted: true, badge: 'Most popular' }, { name: 'Scale', price: '99', period: 'month', description: 'For organizations', features: ['Unlimited projects', 'Dedicated manager', 'SSO & audit logs'], button: 'Contact sales' }])),
    v('pricing-1', 'Single offer', () => el.pricing([{ name: 'Complete program', price: '297', period: 'one-time', description: 'Lifetime access', features: ['12 video modules', 'Private community', 'Weekly live Q&A', '14-day guarantee'], button: 'Enroll now', highlighted: true }])),
  ], fields: [
    { key: 'currency', label: 'Currency symbol', type: 'text' },
    { key: 'plans', label: 'Plans', type: 'objects', addLabel: 'Add plan', itemTitle: 'Plan', titleKey: 'name', create: () => ({ name: 'New plan', price: '29', period: 'month', description: '', features: ['Feature'], button: 'Choose plan', highlighted: false, badge: '' }), fields: [
      { key: 'name', label: 'Plan name', type: 'text' }, { key: 'price', label: 'Price', type: 'text' }, { key: 'period', label: 'Billing period', type: 'select', options: ['month', 'year', 'one-time', 'week'] }, { key: 'description', label: 'Description', type: 'text' },
      { key: 'features', label: 'Features', type: 'strings', addLabel: 'Add feature' }, { key: 'button', label: 'Button text', type: 'text' }, { key: 'badge', label: 'Badge', type: 'text' }, { key: 'highlighted', label: 'Highlight plan', type: 'toggle' },
    ] },
  ] },
  { type: 'testimonial', label: 'Testimonials', icon: Quote, category: 'funnel', variants: [
    v('testimonial-grid', 'Review grid', () => el.testimonials([{ quote: 'My gums stopped bleeding within two weeks. Genuinely life-changing.', name: 'Amira H.', role: 'Verified buyer', rating: 5, avatar: IMG.smile }, { quote: 'Feels like a professional clean every single morning.', name: 'James P.', role: 'Verified buyer', rating: 5 }, { quote: 'Battery lasts forever and the timer keeps me honest.', name: 'Lina S.', role: 'Verified buyer', rating: 4 }])),
    v('testimonial-single', 'Featured quote', () => el.testimonials([{ quote: 'Working with Maya gave me the clarity and confidence to double my business in under a year.', name: 'Rachel Owens', role: 'Founder, Bloom Studio', rating: 5, avatar: IMG.coach }], { columns: '1' })),
  ], fields: [
    { key: 'columns', label: 'Columns', type: 'range', min: 1, max: 4 },
    { key: 'items', label: 'Testimonials', type: 'objects', addLabel: 'Add testimonial', itemTitle: 'Review', titleKey: 'name', create: () => ({ quote: 'Write the customer review here.', name: 'Customer name', role: 'Verified buyer', rating: 5, avatar: '' }), fields: [
      { key: 'quote', label: 'Quote', type: 'textarea' }, { key: 'name', label: 'Name', type: 'text' }, { key: 'role', label: 'Role / company', type: 'text' }, { key: 'rating', label: 'Rating', type: 'range', min: 1, max: 5 }, { key: 'avatar', label: 'Photo', type: 'image' },
    ] },
  ] },
  { type: 'booking', label: 'Booking calendar', icon: CalendarDays, category: 'funnel', variants: [v('booking', 'Appointment picker', () => el.booking())], fields: [
    { key: 'title', label: 'Title', type: 'text' }, { key: 'service', label: 'Service name', type: 'text' }, { key: 'duration', label: 'Duration (minutes)', type: 'number' },
    { key: 'times', label: 'Available times (comma separated)', type: 'text' }, { key: 'button', label: 'Button text', type: 'text' }, { key: 'successMessage', label: 'Confirmation message', type: 'textarea' },
  ] },
  { type: 'checkout', label: 'Checkout', icon: CreditCard, category: 'funnel', variants: [v('checkout', 'Product checkout', () => el.checkout({ product: 'SonicPro Electric Toothbrush', price: '89', comparePrice: '129', image: IMG.toothbrush }))], fields: [
    { key: 'product', label: 'Product name', type: 'text' }, { key: 'image', label: 'Product image', type: 'image' }, { key: 'currency', label: 'Currency', type: 'text' }, { key: 'price', label: 'Price', type: 'text' }, { key: 'comparePrice', label: 'Compare-at price', type: 'text' },
    { key: 'features', label: 'Included', type: 'strings', addLabel: 'Add line' }, { key: 'button', label: 'Button text', type: 'text' }, { key: 'gateway', label: 'Payment gateway', type: 'select', options: ['Stripe', 'PayPal', 'Paymob', 'Manual'] },
  ] },
  { type: 'rating', label: 'Star rating', icon: Star, category: 'funnel', variants: [v('rating', 'Rating summary', () => el.rating(4.9, 'from 2,341 reviews'))], fields: [
    { key: 'value', label: 'Rating', type: 'range', min: 0, max: 5, step: 0.1 }, { key: 'count', label: 'Caption', type: 'text' }, { key: 'color', label: 'Star color', type: 'color' }, { key: 'size', label: 'Star size', type: 'range', min: 10, max: 40, unit: 'px' },
  ] },
  { type: 'mc-form', catalogKey: 'lead-form', label: 'Lead capture form', icon: TextCursorInput, category: 'funnel', variants: [
    v('lead-form', 'Name + email + phone', () => el.form([el.field('Full name', 'text', { name: 'FNAME', required: true, placeholder: 'Full name' }), el.field('Email', 'email', { name: 'EMAIL', required: true, placeholder: 'Email address' }), el.field('Phone', 'tel', { name: 'PHONE', placeholder: 'Phone number' }), el.submit('Get instant access')], { successMessage: 'You’re in! Check your inbox for next steps.' }, { padding: '24px', borderRadius: '12px', backgroundColor: '#ffffff', boxShadow: '0 12px 40px rgba(15,23,42,.12)' })),
  ], fields: [] },

  /* ---------------- Hidden structural types ---------------- */
  { type: 'section', label: 'Flex section', icon: Square, category: 'hidden', variants: [], fields: [
    { key: 'container', label: 'Content width', type: 'segmented', options: [{ value: 'boxed', label: 'Boxed' }, { value: 'full', label: 'Full width' }] },
    { key: 'maxWidth', label: 'Max content width', type: 'range', min: 600, max: 1600, step: 10, unit: 'px', showIf: props => props.container !== 'full' },
    { key: 'minHeight', label: 'Minimum height', type: 'select', options: [{ value: '', label: 'Auto' }, { value: '50vh', label: 'Half screen' }, { value: '100vh', label: 'Full screen' }] },
    { key: 'overlay', label: 'Background overlay', type: 'color' },
    { key: 'overlayOpacity', label: 'Overlay opacity', type: 'range', min: 0, max: 100, unit: '%' },
    { key: 'bgVideo', label: 'Background video URL (.mp4)', type: 'url' },
    { key: 'sticky', label: 'Sticky on scroll', type: 'toggle' },
  ] },
  { type: 'block', label: 'Flex block', icon: Square, category: 'hidden', clickable: true, variants: [], fields: [
    { key: 'note', label: 'Flex block', type: 'note', text: 'A flexible container. Use Styling → Box alignment to set direction, alignment and gap.' },
  ] },
  { type: 'column', label: 'Column', icon: Columns3, category: 'hidden', clickable: true, variants: [], fields: [
    { key: 'span', label: 'Width on desktop', type: 'range', min: 1, max: 12, unit: '/12' },
    { key: 'spanLaptop', label: 'Width on laptop', type: 'range', min: 1, max: 12, unit: '/12' },
    { key: 'spanTablet', label: 'Width on tablet', type: 'range', min: 1, max: 12, unit: '/12' },
    { key: 'spanMobile', label: 'Width on mobile', type: 'range', min: 1, max: 12, unit: '/12' },
  ] },
  { type: 'tab', label: 'Tab', icon: PanelTop, category: 'hidden', variants: [], fields: [{ key: 'label', label: 'Tab label', type: 'text' }] },
  { type: 'accordion-item', label: 'Accordion item', icon: ListTree, category: 'hidden', variants: [], fields: [{ key: 'title', label: 'Title', type: 'text' }] },
  { type: 'slide', label: 'Slide', icon: Images, category: 'hidden', variants: [], fields: [{ key: 'note', label: 'Slide', type: 'note', text: 'Set a background image or color for this slide in the Styling tab.' }] },
  { type: 'spacer', label: 'Spacer', icon: Play, category: 'hidden', variants: [], fields: [{ key: 'height', label: 'Height', type: 'range', min: 4, max: 400, unit: 'px' }] },
];

export const elementDef = (type: PFType, catalogKey?: string) => (catalogKey ? ELEMENTS.find(item => item.catalogKey === catalogKey) : undefined) ?? ELEMENTS.find(item => item.type === type && item.category !== 'funnel') ?? ELEMENTS.find(item => item.type === type)!;
export const nodeLabel = (n: PFNode) => n.name || elementDef(n.type).label;
export const findVariant = (variantId: string) => { for (const item of ELEMENTS) { const found = item.variants.find(variant => variant.id === variantId); if (found) return { element: item, variant: found }; } return undefined; };
export const catalogItems = (category: CategoryId) => ELEMENTS.filter(item => item.category === category);
export const coreElementCount = ELEMENTS.filter(item => ['containers', 'media', 'basic', 'app', 'advanced', 'social'].includes(item.category)).length;
export const funnelElementCount = ELEMENTS.filter(item => item.category === 'funnel').length;

/* Third-party integrations shown in the third tab. */
export const THIRD_PARTY = [
  { app: 'Judge.me Reviews', vendor: 'Judge.me', description: 'Product reviews with photos and star ratings.', color: '#108474' },
  { app: 'Klaviyo Signup', vendor: 'Klaviyo', description: 'Grow your email & SMS list with embedded forms.', color: '#232426' },
  { app: 'Calendly', vendor: 'Calendly', description: 'Let visitors book meetings on your calendar.', color: '#006bff' },
  { app: 'Typeform', vendor: 'Typeform', description: 'Conversational forms and quizzes.', color: '#262627' },
  { app: 'Trustpilot', vendor: 'Trustpilot', description: 'Display your TrustScore and latest reviews.', color: '#00b67a' },
  { app: 'WhatsApp Chat', vendor: 'Meta', description: 'Floating chat button that opens WhatsApp.', color: '#25d366' },
  { app: 'Google Reviews', vendor: 'Google', description: 'Show your Google Business rating.', color: '#4285f4' },
];
export const createAppBlock = (app: string) => node('app-block', { app, title: app === 'Judge.me Reviews' ? 'Customer reviews' : app === 'Klaviyo Signup' ? 'Join the list' : app, embedUrl: '', phone: '', message: 'Hi! I have a question.' }, {});
