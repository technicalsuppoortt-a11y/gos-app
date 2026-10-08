import { FunnelCanvas } from './FunnelCanvas';
import { changeSection, findSection, insertSection, moveSection } from './funnel-tree';
import type { DropTarget } from './funnel-tree';
import { AssetSelect, AssetSearch } from './AssetControls';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, Check, CheckCircle2, ChevronDown, ChevronRight, Columns2, CreditCard, Eye, FileText, Globe2, Heading, Image, LayoutGrid, Link2, List, Menu, Monitor, MoreHorizontal, MousePointer2, PanelTop, Play, Plus, Redo2, Save,  ShieldCheck, Smartphone, Sparkles, Tablet, Trash2, Type, Undo2, Upload, Users, Video, WandSparkles, X, Zap, Clock3, CalendarDays, MessageSquare, Layers, Dumbbell, Heart, Star, Trophy, Flame, Target, CircleCheck, ArrowUpRight, Bell, Leaf } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { showToast } from '../utils/toast';
import './funnel-builder.css';
import './website-funnel-polish.css';

type BuilderTab = 'Pages' | 'Global' | 'Theme';
type InspectorTab = 'Content' | 'Style' | 'Advanced';
type Device = 'desktop' | 'tablet' | 'mobile';
type BuilderMode = 'funnel' | 'website';
type FunnelStepType = 'Landing' | 'Form' | 'Thank You' | 'Booking' | 'Checkout' | 'Confirmation' | 'Upsell' | 'Survey';
export type FunnelStep = { id: string; label: string; pageId: string; type?: FunnelStepType };
type BlockKind = 'Text' | 'Image' | 'Button' | 'Video' | 'Icon' | 'Divider' | 'Section' | 'Columns' | 'Spacer' | 'Heading' | 'Paragraph' | 'Image Gallery' | 'Form' | 'Testimonials' | 'Pricing' | 'Booking' | 'Payment';
type SectionType = BlockKind | 'Hero' | 'Program Highlights' | 'Testimonials' | 'Pricing Preview' | 'Brand Story' | 'Mission & Vision' | 'Team' | 'Core Values' | 'Stats' | 'Program Cards' | 'Pricing Table' | 'Contact Form' | 'Location & Hours' | 'FAQ';
export type BuilderSection = { children?: BuilderSection[][]; id: string; type: SectionType; content: Record<string, string>; styles: { backgroundColor: string; padding: string; textAlign: string; typography: string; customCss: string; visibility: string; animation: string } };
type GalleryImage = { id: string; src: string; alt: string };
type Testimonial = { id: string; author: string; role: string; quote: string; rating: number; avatar: string };
type PricePlan = { id: string; name: string; price: string; period: string; features: string[]; button: string; highlighted: boolean };
export type BuilderPage = { id: string; name: string; status?: 'Draft' | 'Published'; path: string; seoTitle: string; seoDescription: string; headline: string; subheadline: string; cta: string; showHeader: boolean; header: string; showFooter: boolean; footer: string; featuredImage: string; customCode?: string; backgroundColor?: string; hideOnMobile?: boolean; noIndex?: boolean; sections: BuilderSection[]; isFunnelStep?: boolean };
export type FunnelModel = { name: string; goal: string; audience: string; offer: string; pagesFlow: string[]; events: string[]; status: 'Draft' | 'Published'; };
const fitnessHero = 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1800&h=760&q=90&crop=faces';
const coachingTeamImage = 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=1200&h=800&q=90';
const programImages = [
  'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=900&h=420&q=88',
  'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?auto=format&fit=crop&w=900&h=420&q=88',
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=900&h=420&q=88',
];

function readLocalDraft() {
  try {
    const saved = localStorage.getItem('gos.funnel-builder.demo');
    if (saved) {
      const parsed = JSON.parse(saved) as { pages?: BuilderPage[]; funnel?: FunnelModel };
      if (parsed.pages) parsed.pages = parsed.pages.map((page: BuilderPage & { blocks?: { kind: BlockKind; label: string; text: string }[] }) => {
        const template = initialPages.find(item => item.id === page.id);
        const legacySections = (page.blocks ?? []).map(block => section(block.kind, block.label, block.text));
        const funnelStep = defaultFunnelSteps.find(step=>step.pageId===page.id) ?? {id:page.id.replace('funnel-step-',''),label:page.name,pageId:page.id,type:'Landing' as FunnelStepType};
        const isFunnelPage = Boolean(page.isFunnelStep || page.id.startsWith('funnel-step-'));
        const sectionsAreBlank = !page.sections?.length || page.sections.every(item=>item.type==='Section' && !item.content.title && !item.content.body);
        const oldLeadTemplate = page.id==='funnel-step-lead-form' && page.sections?.some(item=>item.type==='Form' && item.content.button==='Continue' && parseContentArray<string>(item.content.fields).length<=2);
        const oldThankYouTemplate = page.id==='funnel-step-thank-you' && page.sections?.length===1 && page.sections[0].type==='Heading' && page.sections[0].content.title==='Thank you';
        const oldBookingTemplate = page.id==='funnel-step-booking' && page.sections?.some(item=>item.type==='Booking' && !item.content.calendar);
        const oldConfirmationTemplate = page.id==='funnel-step-confirmation' && page.sections?.length===1 && page.sections[0].type==='Heading' && page.sections[0].content.title==='Booking confirmed';
        const shouldRefreshDefault = Boolean(oldLeadTemplate || oldThankYouTemplate || oldBookingTemplate || oldConfirmationTemplate);
        const restoredSections = isFunnelPage && (sectionsAreBlank || shouldRefreshDefault) ? createFunnelStepPage(funnelStep).sections : page.sections ?? [...(template?.sections ?? []), ...legacySections];
        return { ...page, isFunnelStep:isFunnelPage || page.isFunnelStep, sections: restoredSections, featuredImage: !page.featuredImage || page.featuredImage === '/fitness-coach-preview.jpg' || page.featuredImage.startsWith('blob:') ? (page.id === 'home' ? fitnessHero : '') : page.featuredImage };
      });
      return parsed;
    }
  } catch { /* Continue with the supplied demo when storage is unavailable. */ }
  return null;
}

const blockGroups: { title: string; items: { name: BlockKind; icon: React.ElementType }[] }[] = [
  { title: 'Basic', items: [{ name: 'Text', icon: Type }, { name: 'Image', icon: Image }, { name: 'Button', icon: MousePointer2 }, { name: 'Video', icon: Video }, { name: 'Icon', icon: Sparkles }, { name: 'Divider', icon: MinusIcon }] },
  { title: 'Layout', items: [{ name: 'Section', icon: LayoutGrid }, { name: 'Columns', icon: Columns2 }, { name: 'Spacer', icon: ArrowDown }] },
  { title: 'Content', items: [{ name: 'Heading', icon: Heading }, { name: 'Paragraph', icon: List }, { name: 'Image Gallery', icon: Image }, { name: 'Form', icon: FileText }, { name: 'Testimonials', icon: MessageSquare }, { name: 'Pricing', icon: CreditCard }, { name: 'Booking', icon: CalendarDays }, { name: 'Payment', icon: CreditCard }] },
];
function MinusIcon({ size = 16 }: { size?: number }) { return <span style={{ fontSize: size, lineHeight: 1 }}>−</span>; }

const section = (type: SectionType, title: string, body: string, extras: Record<string, string> = {}): BuilderSection => ({ id: `section-${type.toLowerCase().replace(/[^a-z]+/g, '-')}-${Math.random().toString(16).slice(2, 7)}`, type, content: { title, body, ...extras }, styles: { backgroundColor: '#ffffff', padding: '24', textAlign: ['Program Highlights','Testimonials','Pricing Preview','Program Cards','Pricing Table','Core Values','Stats'].includes(type) ? 'Center' : 'Left', typography: 'Default', customCss: '', visibility: 'All devices', animation: 'None' } });
const parseContentArray = <T,>(raw: string | undefined): T[] => { try { return raw ? JSON.parse(raw) as T[] : []; } catch { return []; } };
const serializeContentArray = <T,>(items: T[]) => JSON.stringify(items);
const iconChoices = [{name:'Dumbbell',Icon:Dumbbell},{name:'Heart',Icon:Heart},{name:'Star',Icon:Star},{name:'Zap',Icon:Zap},{name:'Sparkles',Icon:Sparkles},{name:'Calendar',Icon:CalendarDays},{name:'Trophy',Icon:Trophy},{name:'Flame',Icon:Flame},{name:'Target',Icon:Target},{name:'Check',Icon:CircleCheck},{name:'Arrow',Icon:ArrowUpRight},{name:'Bell',Icon:Bell},{name:'Leaf',Icon:Leaf}];
const initialPages: BuilderPage[] = [
  { id: 'home', name: 'Home', path: '/home', seoTitle: 'Personal Training for Real Results', seoDescription: 'Customized workout plans, expert coaching and ongoing support to help you reach your goals.', headline: 'Personal Training for Real Results', subheadline: 'Customized workout plans, expert coaching and ongoing support to help you reach your goals.', cta: 'Book Free Session', showHeader: true, header: 'Header 1', showFooter: true, footer: 'Footer 1', featuredImage: fitnessHero, sections: [section('Hero','Personal Training for Real Results','Customized workout plans, expert coaching and ongoing support to help you reach your goals.',{button:'Book Free Session',destinationType:'Open Booking Modal',destination:''}),section('Program Highlights','Choose Your Program','Programs designed for all fitness levels.',{items:'Weight Loss · Muscle Gain · General Fitness'}),section('Testimonials','Real stories. Stronger lives.','“The coaching helped me build habits that finally lasted.”'),section('Pricing Preview','Find your coaching plan','Flexible options for every goal.',{button:'View plans'})] },
  { id: 'about', name: 'About', path: '/about', seoTitle: 'About FitZone', seoDescription: 'Meet the coaches behind your next level.', headline: 'A stronger you starts here', subheadline: 'Expert coaching built around your goals.', cta: 'Meet the Team', showHeader: true, header: 'Header 1', showFooter: true, footer: 'Footer 1', featuredImage: '', sections: [section('Brand Story','Built around real life','FitZone helps people build strength, confidence, and healthier routines with coaching that meets them where they are.',{image:coachingTeamImage,alt:'FitZone coaching team'}),section('Mission & Vision','Our mission & vision','Make expert fitness coaching personal, practical, and accessible to every member.'),section('Core Values','What guides us','Consistency · Care · Evidence-led coaching · Progress over perfection'),section('Stats','Small steps. Lasting progress.','',{items:'1,000+ Members · 12 Coaches · 10+ Years coaching'}),section('Team','Meet your coaches','Experienced coaches focused on your progress.',{items:'Alex Morgan · Strength Coach  |  Jamie Lee · Nutrition Coach  |  Sam Rivera · Mobility Coach'})] },
  { id: 'programs', name: 'Programs', path: '/programs', seoTitle: 'Training Programs', seoDescription: 'Find a plan that fits your goals.', headline: 'Choose Your Program', subheadline: 'Programs designed for all fitness levels.', cta: 'Explore Programs', showHeader: true, header: 'Header 1', showFooter: true, footer: 'Footer 1', featuredImage: '', sections: [section('Program Cards','Training built around your goal','Explore a clear plan, expert coaching, and progress you can track.',{items:'Weight Loss · Muscle Gain · General Fitness',specs:'12-week guided syllabus · Coach check-ins · Progress tracking',button:'Enroll now'})] },
  { id: 'pricing', name: 'Pricing', path: '/pricing', seoTitle: 'Membership & Pricing', seoDescription: 'Simple plans for lasting progress.', headline: 'Invest in your progress', subheadline: 'Flexible coaching options for every goal.', cta: 'View Plans', showHeader: true, header: 'Header 1', showFooter: true, footer: 'Footer 1', featuredImage: '', sections: [section('Pricing Table','Plans for every stage','Choose the level of support that works for you.',{items:'Basic · Pro · Enterprise',specs:'Essential training · Personal coaching · Team and priority support',button:'Choose plan'})] },
  { id: 'contact', name: 'Contact', path: '/contact', seoTitle: 'Contact FitZone', seoDescription: 'Talk with a coach and plan your first session.', headline: 'Let’s get moving', subheadline: 'Our team is ready to help you get started.', cta: 'Get in Touch', showHeader: true, header: 'Header 1', showFooter: true, footer: 'Footer 1', featuredImage: '', sections: [section('Contact Form','Talk with a coach','Tell us what you are working toward and our team will be in touch.',{fields:serializeContentArray(['Name','Email','Phone','Message']),button:'Send message',successMessage:'Thanks, a coach will be in touch.'}),section('Location & Hours','Visit FitZone','123 Wellness Avenue · Mon–Fri 6:00–20:00 · Sat–Sun 8:00–14:00'),section('FAQ','Frequently asked questions','How do I get started? Book an intro session and we will help you choose the right plan.')] },
];

const journey = ['Visitor lands', 'Views offer', 'Submits form / booking', 'Lead created', 'Follow-up triggered', 'Payment recorded', 'CRM updated', 'Analytics event fired'];
const defaultFunnelSteps: FunnelStep[] = [
  { id:'landing', label:'Landing Page', pageId:'home', type:'Landing' },
  { id:'lead-form', label:'Lead Form', pageId:'funnel-step-lead-form', type:'Form' },
  { id:'thank-you', label:'Thank You', pageId:'funnel-step-thank-you', type:'Thank You' },
  { id:'booking', label:'Booking', pageId:'funnel-step-booking', type:'Booking' },
  { id:'confirmation', label:'Confirmation', pageId:'funnel-step-confirmation', type:'Confirmation' },
];
function readFunnelSteps(): FunnelStep[] {
  try {
    const stored = JSON.parse(localStorage.getItem('gos.funnel-steps') || 'null') as FunnelStep[] | null;
    if (!Array.isArray(stored)) return defaultFunnelSteps;
    const canonical = defaultFunnelSteps.map(base => stored.find(step=>step.id===base.id) ?? base);
    const extras = stored.filter(step=>!defaultFunnelSteps.some(base=>base.id===step.id));
    return [...canonical,...extras];
  } catch { return defaultFunnelSteps; }
}
function createFunnelStepPage(step: FunnelStep): BuilderPage {
  const shared = { id:step.pageId, name:step.label, path:`/${step.id}`, seoTitle:'', seoDescription:'', headline:'', subheadline:'', cta:'', showHeader:false, header:'Minimal header', showFooter:false, footer:'Minimal footer', featuredImage:'', isFunnelStep:true };
  const type = step.type ?? ({landing:'Landing','lead-form':'Form','thank-you':'Thank You',booking:'Booking',confirmation:'Confirmation'} as Record<string,FunnelStepType>)[step.id] ?? 'Landing';
  const sections: BuilderSection[] = type === 'Form'
    ? [section('Form','Claim Your Free 7-Day Fitness Pass','Start with a plan that fits your goals. No commitment required.',{template:'lead-capture',fields:serializeContentArray(['Name','Email','Phone','Dropdowns']),button:'Get Started Now',successMessage:'Your free pass request is in. A FitZone coach will be in touch shortly.'})]
    : type === 'Booking'
      ? [section('Booking','Book your free consultation','Choose a date and time for your 30-minute introduction.',{calendar:'FitZone Consultations',serviceType:'Free consultation · 30 minutes',timeSlots:'Today · 2:00 PM,Tomorrow · 10:30 AM,Friday · 4:00 PM',button:'Confirm booking',bookingMode:'step'})]
      : type === 'Thank You'
        ? [section('Heading','Thank You! Your Application Is Received','Your details are with our coaching team. Watch this quick video before your call.',{headingTag:'H1',template:'thank-you'}),section('Video','Watch this quick video before your call','',{videoUrl:''}),section('Text','Next Steps','01 · We review your goals   02 · Your coach reaches out   03 · We build your plan',{headingTag:'H2'})]
      : type === 'Confirmation'
        ? [section('Heading','You’re booked!','Your FitZone consultation is confirmed. We look forward to meeting you.',{headingTag:'H1'}),section('Booking','Appointment details','Add this consultation to your calendar.',{calendar:'FitZone Consultations',serviceType:'Free consultation · 30 minutes',timeSlots:'Tomorrow · 10:30 AM',button:'Add to Google Calendar',bookingMode:'confirmation'}),section('Location & Hours','Your appointment location','FitZone Studio',{address:'123 Wellness Avenue · Cairo',hours:'Coach Alex Morgan · Tomorrow at 10:30 AM'})]
        : type === 'Checkout'
          ? [section('Heading','Your next step starts here','Review your membership and continue to secure checkout.',{headingTag:'H1'}),section('Payment','FitZone Pro Membership','Monthly coaching, tailored workouts, and progress reviews.',{productId:'FitZone Pro Membership',price:'€49 / month',gateway:'Stripe · Demo',button:'Continue to secure checkout'})]
          : type === 'Survey'
            ? [section('Heading','Let’s personalize your plan','A few quick answers will help us recommend the right coaching path.',{headingTag:'H1'}),section('Form','','',{fields:serializeContentArray(['Name','Dropdowns','Message']),button:'See my recommendation',successMessage:'Your preferences have been saved in this demo.'})]
          : type === 'Upsell'
            ? [section('Hero','Take your progress further','Add one-to-one coaching to your plan and get expert support every week.',{button:'Add coaching to my plan',destinationType:'Open Booking Modal'}),section('Pricing Preview','Personal Coaching Add-on','Weekly check-ins · Custom training plan · Direct coach support',{items:'Personal Coaching'})]
          : [section('Hero','Personal Training for Real Results','Expert coaching and a plan built around your goals.',{button:'Book Free Session',destinationType:'Open Booking Modal'}),section('Program Highlights','Everything you need to make progress','Personal coaching · Flexible plans · Expert support',{items:'Personal coaching · Flexible plans · Expert support'})];
  return { ...shared, sections };
}

export type BuilderDocument = { pages: BuilderPage[]; funnel: FunnelModel; steps: FunnelStep[]; theme?: { color: string; font: string; corners: string } };
export function createBuilderDocument(mode: BuilderMode, name: string, image: string, count?: number, template?: string): BuilderDocument {
  const steps = mode === 'funnel' ? defaultFunnelSteps.slice(0, count ?? 5).map(step => ({...step})) : [];
  const websiteTemplates = structuredClone(initialPages).filter(page => !page.isFunnelStep);
  websiteTemplates.splice(2,0,{...structuredClone(websiteTemplates[2]),id:'services',name:'Services',path:'/services',seoTitle:'Our Services',sections:[section('Heading','Expert support for your goals','Explore our services and find the right fit.'),section('Program Cards','How we can help','Personal guidance, practical plans, and ongoing support.',{items:'Consultation · Coaching · Support'})]});
  websiteTemplates.splice(5,0,{...structuredClone(websiteTemplates[0]),id:'blog',name:'Blog',path:'/blog',seoTitle:'Insights & Resources',sections:[section('Heading','Insights for your next step','Practical advice and inspiration from our team.'),section('Paragraph','Build habits that last','Discover ideas to support your goals, one step at a time.')]});
  websiteTemplates[0].path='/';
  const pages = mode === 'funnel' ? steps.map(createFunnelStepPage) : websiteTemplates.slice(0, count ?? 7);
  pages.forEach(page => { page.featuredImage = image; });
  const category = template ?? name;
  const copy = /clinic/i.test(category) ? {title:'Your Health, Our Priority',body:'Personal care from a team you can trust.',button:'Book an Appointment',items:'Primary Care · Specialist Consultations · Wellness'}
    : /nutrition/i.test(category) ? {title:'Nutrition Made Simple',body:'Custom nutrition plans for a healthier you.',button:'Get Started',items:'Meal Plans · Nutrition Coaching · Healthy Habits'}
    : /agency/i.test(category) ? {title:'Digital Solutions for Modern Businesses',body:'Strategy, design and marketing to help your business grow.',button:'Work With Us',items:'Strategy · Design · Marketing'}
    : /local business|cafe/i.test(category) ? {title:'Good Food Brings People Together',body:'Fresh ingredients, friendly service, and moments to remember.',button:'Explore Our Menu',items:'Fresh Favorites · Seasonal Specials · Catering'}
    : /e-commerce/i.test(category) ? {title:'Discover Your Everyday Essentials',body:'Thoughtfully selected products, ready for your next chapter.',button:'Shop Collection',items:'New Arrivals · Best Sellers · Collections'} : undefined;
  if(copy && pages[0]) {
    Object.assign(pages[0],{headline:copy.title,subheadline:copy.body,cta:copy.button,seoTitle:copy.title});
    Object.assign(pages[0].sections[0].content,{title:copy.title,body:copy.body,button:copy.button});
    const programs=pages[0].sections.find(item=>item.type==='Program Highlights');
    if(programs) Object.assign(programs.content,{title:'Explore What We Offer',body:'Find the right choice for your goals.',items:copy.items});
  }
  return { pages, steps, funnel: { name, goal:'Lead generation', audience:'Your ideal customers', offer:'Strength coaching', pagesFlow:pages.map(page=>page.id), events:['Form Submit','Booking'], status:'Draft' } };
}

export const BuilderWorkspace: React.FC<{ mode: BuilderMode; document?: BuilderDocument; selectedPageId?: string; domain?: string; initialColor?: string; onBack?: () => void; onStepChange?: (id:string)=>void; onDocumentChange?: (document: BuilderDocument) => void }> = ({ mode, document: assetDocument, selectedPageId, domain, initialColor, onBack, onStepChange, onDocumentChange }) => {
  const navigate = useNavigate();
  const [savedDemo] = useState(() => assetDocument ?? readLocalDraft());
  const initialAsset = useRef(assetDocument);
  const onChangeRef = useRef(onDocumentChange);
  useEffect(()=>{onChangeRef.current=onDocumentChange;},[onDocumentChange]);
  const siteOrigin = domain ? `https://${domain}` : 'https://your-domain.com';
  const [pagesData, setPagesData] = useState<BuilderPage[]>(savedDemo?.pages?.length ? savedDemo.pages : initialPages);
  const [activePageId, setActivePageId] = useState(selectedPageId ?? 'home');
  const [funnelSteps, setFunnelSteps] = useState<FunnelStep[]>(() => assetDocument?.steps ?? readFunnelSteps());
  const [activeFunnelStepId, setActiveFunnelStepId] = useState(() => { if(assetDocument) return assetDocument.steps.find(step=>step.pageId===selectedPageId)?.id ?? assetDocument.steps[0]?.id ?? 'landing'; try { return localStorage.getItem('gos.active-funnel-step') || 'landing'; } catch { return 'landing'; } });
  const [funnel, setFunnel] = useState<FunnelModel>(savedDemo?.funnel ?? { name: 'Fitness Website', goal: 'Lead generation', audience: 'People looking to improve their fitness', offer: 'Brand strategy session', pagesFlow: defaultFunnelSteps.map(step=>step.pageId), events: ['Form Submit', 'Booking', 'Checkout'], status: 'Published' });
  const [leftTab, setLeftTab] = useState<BuilderTab>('Pages');
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>('Content');
  const [device, setDevice] = useState<Device>('desktop');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewPageId, setPreviewPageId] = useState(selectedPageId ?? 'home');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [backgroundTab, setBackgroundTab] = useState<'Color'|'Image'|'Video'>('Image');
  const sectionImageInputRef = useRef<HTMLInputElement>(null);
  const stepListRef = useRef<HTMLDivElement>(null);
  const [showAddStepModal, setShowAddStepModal] = useState(false);
  const [pendingDeleteStepId, setPendingDeleteStepId] = useState<string | null>(null);
  const [, setStepOverflow] = useState(false);
  const [newStepName, setNewStepName] = useState('');
  const [newStepType, setNewStepType] = useState<FunnelStepType>('Landing');
  const [scrollTargetId, setScrollTargetId] = useState<string | null>(null);
  const [pendingImageSectionId, setPendingImageSectionId] = useState<string | null>(null);
  const [showJourney, setShowJourney] = useState(false);
  const [showActionStep, setShowActionStep] = useState(false);
  const [previewActionType, setPreviewActionType] = useState<'booking' | 'payment'>('booking');
  const [showAIModal, setShowAIModal] = useState(false);
  const [showPublishMenu, setShowPublishMenu] = useState(false);
  const [showVersions, setShowVersions] = useState(false);
  const [accordion, setAccordion] = useState<Record<string, boolean>>({ Background: false, 'Custom Code': false, 'Advanced Settings': false });

  const [leftInspectorMode, setLeftInspectorMode] = useState<'elements' | 'sections'>('elements');
  const [themeColor, setThemeColor] = useState(assetDocument?.theme?.color ?? initialColor ?? '#6366f1');
  const [headingFont, setHeadingFont] = useState(assetDocument?.theme?.font ?? 'Manrope');
  const [cornerStyle, setCornerStyle] = useState(assetDocument?.theme?.corners ?? 'Rounded');
  const [visibility, setVisibility] = useState('All devices');
  const [undoStack, setUndoStack] = useState<BuilderPage[][]>([]);
  const [redoStack, setRedoStack] = useState<BuilderPage[][]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const currentPage = pagesData.find(page => page.id === activePageId) ?? pagesData[0];
  const previewPage = pagesData.find(page => page.id === previewPageId) ?? currentPage;
  const websitePages = pagesData.filter(page => !page.isFunnelStep && !page.id.startsWith('funnel-step-'));

  const openPreviewAction = (type: 'booking' | 'payment' = funnel.goal === 'Sales' ? 'payment' : 'booking') => { setPreviewActionType(type); setShowActionStep(true); };
  const openPreviewSectionAction = (item: BuilderSection) => openPreviewAction(item.type === 'Payment' || item.type.toLowerCase().includes('pricing') ? 'payment' : item.type === 'Booking' ? 'booking' : undefined);
  useEffect(() => {
    if (!isPreviewOpen) return;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') { setShowActionStep(false); setIsPreviewOpen(false); } };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', closeOnEscape);
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener('keydown', closeOnEscape); };
  }, [isPreviewOpen]);
  useEffect(() => { if (device !== 'mobile') setMobileNavOpen(false); }, [device]);
  const selectedBlock = mode==='funnel'?findSection(currentPage.sections,selectedBlockId):currentPage.sections.find(item => item.id === selectedBlockId);
  const shownGroups = useMemo(() => blockGroups.map(group => ({ ...group, items: group.items.filter(item => item.name.toLowerCase().includes(search.toLowerCase())) })).filter(group => group.items.length), [search]);

  useEffect(()=>{
    const list=stepListRef.current;
    if(!list || mode!=='funnel') return;
    const measure=()=>setStepOverflow(list.scrollWidth>list.clientWidth+2);
    measure();
    const observer=new ResizeObserver(measure);
    observer.observe(list);
    list.addEventListener('scroll',measure,{passive:true});
    return ()=>{observer.disconnect();list.removeEventListener('scroll',measure);};
  },[funnelSteps,mode]);

  const notify = (message: string) => { showToast.success(message); };
  useEffect(() => {
    if (!pagesData.some(page => page.id === activePageId)) setActivePageId(pagesData[0]?.id ?? 'home');
  }, [activePageId, pagesData]);

  useEffect(() => {
    if(initialAsset.current) return;
    setFunnelSteps(current => {
      const missing = defaultFunnelSteps.filter(base => !current.some(step => step.id === base.id));
      return missing.length ? [...current, ...missing] : current;
    });
  }, []);
  useEffect(() => {
    if (!scrollTargetId) return;
    const frame = window.requestAnimationFrame(() => {
      document.querySelector<HTMLElement>(`[data-section-id="${scrollTargetId}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setScrollTargetId(null);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [pagesData, activePageId, scrollTargetId]);
  const updatePages = (updater: (value: BuilderPage[]) => BuilderPage[]) => {
    setPagesData(previous => { setUndoStack(stack => [...stack.slice(-19), previous]); return updater(previous); }); setRedoStack([]); setFunnel(value => ({ ...value, status: 'Draft' }));
  };
  const updatePage = (patch: Partial<BuilderPage>) => updatePages(list => list.map(page => page.id === activePageId ? { ...page, ...patch, status:'Draft' } : page));
  const activateFunnelStep = (step: FunnelStep) => {
    if(assetDocument && onStepChange && step.pageId!==selectedPageId){onStepChange(step.pageId);return;}
    setActiveFunnelStepId(step.id);
    try { if(!assetDocument) localStorage.setItem('gos.active-funnel-step', step.id); } catch { /* The current editor session remains functional without storage. */ }
    if (!pagesData.some(page => page.id === step.pageId)) updatePages(list => [...list, createFunnelStepPage(step)]);
    setFunnel(value => value.pagesFlow.join('|') === funnelSteps.map(item=>item.pageId).join('|') ? value : { ...value, pagesFlow:funnelSteps.map(item=>item.pageId), status:'Draft' });
    setActivePageId(step.pageId); setSelectedBlockId(null);
  };
  const requestDeleteFunnelStep = (stepId: string) => {
    if (defaultFunnelSteps.some(base => base.id === stepId)) return;
    setPendingDeleteStepId(stepId);
  };
  const confirmDeleteFunnelStep = () => {
    if (!pendingDeleteStepId || defaultFunnelSteps.some(base => base.id === pendingDeleteStepId)) return;
    const currentPipeline = assetDocument ? funnelSteps : [...funnelSteps, ...defaultFunnelSteps.filter(base => !funnelSteps.some(step => step.id === base.id))];
    const deletedIndex = currentPipeline.findIndex(step => step.id === pendingDeleteStepId);
    const adjacentStep = currentPipeline[deletedIndex + 1] ?? currentPipeline[deletedIndex - 1] ?? defaultFunnelSteps[0];
    const remainingSteps = funnelSteps.filter(step => step.id !== pendingDeleteStepId);
    const deletedStep = funnelSteps.find(step => step.id === pendingDeleteStepId);

    setFunnelSteps(remainingSteps);
    if (deletedStep) {
      updatePages(list => list.filter(page => page.id !== deletedStep.pageId || remainingSteps.some(step => step.pageId === page.id)));
      setFunnel(value => ({ ...value, pagesFlow: value.pagesFlow.filter(pageId => pageId !== deletedStep.pageId), status: 'Draft' }));
    }
    if (activeFunnelStepId === pendingDeleteStepId && adjacentStep) {
      setActiveFunnelStepId(adjacentStep.id);
      setActivePageId(adjacentStep.pageId);
      setSelectedBlockId(null);
      try { if(!assetDocument) localStorage.setItem('gos.active-funnel-step', adjacentStep.id); } catch { /* Keep the active step for this editor session. */ }
    }
    setPendingDeleteStepId(null);
    notify('Step deleted successfully');
  };
  const createFunnelStep = () => {
    const name = newStepName.trim();
    if (!name) return;
    const id = `custom-${Date.now()}`;
    const step: FunnelStep = { id, label:name, pageId:`funnel-step-${id}`, type:newStepType };
    setFunnelSteps(previous => [...previous, step]);
    updatePages(list => [...list, createFunnelStepPage(step)]);
    setFunnel(value => ({ ...value, pagesFlow:[...funnelSteps.map(item=>item.pageId),step.pageId], status:'Draft' }));
    setActiveFunnelStepId(id); setActivePageId(step.pageId); setSelectedBlockId(null); setShowAddStepModal(false); setNewStepName('');
    requestAnimationFrame(()=>stepListRef.current?.scrollTo({left:stepListRef.current.scrollWidth,behavior:'smooth'}));
    notify(`${step.label} added to funnel`);
  };
  useEffect(() => {
    try {
      if(initialAsset.current) { onChangeRef.current?.({pages:pagesData, funnel, steps:funnelSteps, theme:{color:themeColor,font:headingFont,corners:cornerStyle}}); return; }
      localStorage.setItem('gos.funnel-builder.demo', JSON.stringify({ pages: pagesData, funnel }));
      localStorage.setItem('gos.funnel-steps', JSON.stringify(funnelSteps));
    } catch { /* The editor remains usable when browser storage is unavailable. */ }
  }, [pagesData, funnel, funnelSteps, themeColor, headingFont, cornerStyle]);
  useEffect(() => {
    if (mode !== 'funnel') return;
    const activeStep = funnelSteps.find(step => step.id === activeFunnelStepId) ?? funnelSteps[0];
    if (activeStep && activePageId !== activeStep.pageId) activateFunnelStep(activeStep);
  }, [mode, activeFunnelStepId, funnelSteps]);
  const addBlock = (kind: BlockKind, targetId?: string, dropTarget?:DropTarget) => {
    const label = kind === 'Booking' ? 'Booking' : kind === 'Payment' ? 'Payment' : kind;
    const extras: Record<string,string> = kind === 'Image' ? { src:'', alt:'', aspectRatio:'16:9' }
      : kind === 'Heading' || kind === 'Text' || kind === 'Paragraph' ? { headingTag: kind === 'Heading' ? 'H2' : 'Paragraph' }
      : kind === 'Button' ? { button:'', destinationType:'Open Booking Modal', destination:'' }
      : kind === 'Video' ? { videoUrl:'', autoplay:'false', muted:'true' }
      : kind === 'Icon' ? { iconName:'', iconSize:'28', iconColor:'#6544e8' }
      : kind === 'Divider' ? { lineStyle:'Solid', thickness:'1', lineColor:'#d9dce5' }
      : kind === 'Columns' ? { columnLayout:'2 Col (50/50)', gap:'16' }
      : kind === 'Spacer' ? { height:'40' }
      : kind === 'Image Gallery' ? { images:'[]', gridColumns:'3' }
      : kind === 'Form' ? { fields:'[]', button:'', successMessage:'' }
      : kind === 'Testimonials' ? { testimonials:'[]' }
      : kind === 'Pricing' ? { plans:'[]' }
      : kind === 'Booking' ? { calendar:'', serviceType:'', timeSlots:'[]' }
      : kind === 'Payment' ? { productId:'', gateway:'Stripe', price:'', button:'' } : {};
    const block = section(kind, '', '', extras);
    updatePages(list => list.map(page => page.id === activePageId ? { ...page, sections: mode==='funnel'?insertSection(page.sections,block,dropTarget??{beforeId:targetId}):[...page.sections, block] } : page));
    setSelectedBlockId(block.id); setScrollTargetId(block.id); setInspectorTab('Content'); notify(`${label} added to the page`);
  };
  const addPresetSection = (type: SectionType) => {
    const presets: Partial<Record<SectionType, Record<string,string>>> = {
      Hero: { button:'', destinationType:'Open Booking Modal', destination:'' },
      'Program Highlights': { items:'', specs:'' },
      Testimonials: { testimonials:'[]' },
      'Pricing Preview': { plans:'[]' },
      'Pricing Table': { plans:'[]' },
      'Contact Form': { fields:'[]', button:'', successMessage:'' },
      Team: { items:'' },
      'Core Values': { body:'' },
      Stats: { items:'' },
      'Program Cards': { items:'', specs:'' },
      'Location & Hours': { address:'', hours:'' },
      FAQ: { questions:'[]' },
      'Brand Story': { image:'', alt:'' },
      'Mission & Vision': { mission:'', vision:'' },
    };
    const preset = { title:'', body:'', content:presets[type] ?? {} };
    const block = section(type, preset.title, preset.body, preset.content);
    updatePages(list => list.map(page => page.id === activePageId ? { ...page, sections: [...page.sections, block] } : page));
    setSelectedBlockId(block.id); setScrollTargetId(block.id); setInspectorTab('Content'); notify(`${type} section added`);
  };
  const undo = () => { if (!undoStack.length) return; const previous = undoStack[undoStack.length - 1]; setRedoStack(stack => [...stack, pagesData]); setPagesData(previous); setUndoStack(stack => stack.slice(0, -1)); setFunnel(value => ({ ...value, status: 'Draft' })); };
  const redo = () => { if (!redoStack.length) return; const next = redoStack[redoStack.length - 1]; setUndoStack(stack => [...stack, pagesData]); setPagesData(next); setRedoStack(stack => stack.slice(0, -1)); setFunnel(value => ({ ...value, status: 'Draft' })); };
  const addPage = () => { const id = `page-${Date.now()}`; const page: BuilderPage = { id, name: `Page ${pagesData.length + 1}`, path: `/page-${pagesData.length + 1}`, seoTitle: '', seoDescription: '', headline: 'Your new page headline', subheadline: 'Add a clear message for your visitors.', cta: 'Get started', showHeader: true, header: 'Header 1', showFooter: true, footer: 'Footer 1', featuredImage: '', sections: [section('Hero','Your new page headline','Add a clear message for your visitors.',{button:'Get started'})] }; updatePages(list => [...list, page]); setActivePageId(id); notify('New page added'); };
  const persistLocal = (status: FunnelModel['status']) => {
    const snapshot = { pages: pagesData, funnel: { ...funnel, status } };
    try { if(!assetDocument) localStorage.setItem('gos.funnel-builder.demo', JSON.stringify(snapshot)); } catch { /* The visible demo remains usable when storage is blocked. */ }
    return snapshot;
  };
  const saveDraft = () => { const snapshot = persistLocal('Draft'); setFunnel(snapshot.funnel); setShowPublishMenu(false); notify(`Draft saved just now · ${new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`); };
  const publish = () => { const snapshot = persistLocal('Published'); setFunnel(snapshot.funnel); setPagesData(pages=>pages.map(page=>({...page,status:'Published'}))); setShowPublishMenu(false); notify(`${snapshot.funnel.name} published in this workspace · live hosting is not connected`); };
  const updateSelectedSection = (patch: { content?: Record<string, string>; styles?: Partial<BuilderSection['styles']> }) => { if (!selectedBlock) return; updatePage({ sections: changeSection(currentPage.sections,selectedBlock.id,item=>[{...item,content:{...item.content,...patch.content},styles:{...item.styles,...patch.styles}}]) }); };
  const editElementContent=(id:string,key:string,value:string)=>{const element=findSection(currentPage.sections,id);if(!element||element.content[key]===value)return;updatePage({...((element.type==='Hero'&&key==='title')?{headline:value}:element.type==='Hero'&&key==='body'?{subheadline:value}:{}),sections:changeSection(currentPage.sections,id,item=>{const count=value.startsWith('3')?3:value.startsWith('1')?1:2;const children=item.children&&key==='columnLayout'?Array.from({length:count},(_,index)=>index===count-1?(item.children??[]).slice(index).flat():item.children?.[index]??[]):item.children;return [{...item,children,content:{...item.content,[key]:value}}];})});};
  const updateSelectedContent=(key:string,value:string)=>{if(selectedBlock)editElementContent(selectedBlock.id,key,value);};
  const deleteElement=(id:string)=>{updatePage({sections:changeSection(currentPage.sections,id,()=>[])});setSelectedBlockId(null);};
  const duplicateElement=(id:string)=>{const element=findSection(currentPage.sections,id);if(!element)return;const clone=(item:BuilderSection):BuilderSection=>({...structuredClone(item),id:crypto.randomUUID(),...(item.children?{children:item.children.map(column=>column.map(clone))}:{})});const copy=clone(element);updatePage({sections:changeSection(currentPage.sections,id,item=>[item,copy])});setSelectedBlockId(copy.id);};
  const dropElement=(event:React.DragEvent,target:DropTarget)=>{const source=event.dataTransfer.getData('text/gos-section'),kind=event.dataTransfer.getData('text/gos-block') as BlockKind;if(source){updatePage({sections:moveSection(currentPage.sections,source,target)});setSelectedBlockId(source);}else if(blockGroups.some(group=>group.items.some(item=>item.name===kind)))addBlock(kind,target.beforeId,target);};
  const selectedImageRef = useRef<HTMLInputElement>(null);
  const chooseImageForSection = (sectionId: string) => { setPendingImageSectionId(sectionId); window.setTimeout(() => selectedImageRef.current?.click(), 0); };
  const updateSectionImage = (sectionId: string, file?: File) => { if (!file || !file.type.startsWith('image/')) return; const reader = new FileReader(); reader.onload=()=>{ const src = String(reader.result); updatePages(list => list.map(page => page.id === activePageId ? { ...page, sections: changeSection(page.sections,sectionId,item=>[{...item,content:{...item.content,src,alt:item.content.alt||file.name.replace(/\.[^.]+$/,'')}}]) } : page)); }; reader.readAsDataURL(file); };
  const onImageDrop = (sectionId: string, event: React.DragEvent) => { event.preventDefault(); event.stopPropagation(); updateSectionImage(sectionId, event.dataTransfer.files?.[0]); };
  const activateButton = (item: BuilderSection) => {
    if (isPreviewOpen) { setShowActionStep(true); return; }
    if (item.content.destinationType === 'External URL' && item.content.destination) window.open(item.content.destination, '_blank', 'noopener,noreferrer');
    else if (item.content.destinationType === 'Scroll to Section') {
      const target = currentPage.sections.find(sectionItem => sectionItem.id === item.content.destination || sectionItem.content.title === item.content.destination);
      const frame = document.querySelector<HTMLElement>('.fb-site-frame');
      const targetElement = target ? document.querySelector<HTMLElement>(`[data-section-id="${target.id}"]`) : null;
      if (frame && targetElement) frame.scrollTo({ top: frame.scrollTop + targetElement.getBoundingClientRect().top - frame.getBoundingClientRect().top, behavior: 'smooth' });
    }
    else setShowJourney(true);
  };
  const selectFeatureImage = (file?: File) => { if (!file) return; const reader = new FileReader(); reader.onload=()=>updatePage({featuredImage:String(reader.result)}); reader.readAsDataURL(file); };
  const reorderSection = (from: string, to: string) => { if(from===to) return; const sections=[...currentPage.sections], source=sections.findIndex(item=>item.id===from), target=sections.findIndex(item=>item.id===to); if(source<0||target<0) return; sections.splice(target,0,sections.splice(source,1)[0]); updatePage({sections}); };
  const handleDrop = (event: React.DragEvent) => { event.preventDefault(); const kind = event.dataTransfer.getData('text/gos-block') as BlockKind; if (kind) addBlock(kind); };
  const applyAIAction = (action: string) => {
    if (action === 'Rewrite headline in brand voice') {
      const headline = 'Build strength. Find your edge. Feel unstoppable.';
      updatePages(list => list.map(page => page.id === activePageId ? { ...page, headline, sections: page.sections.map(item => item.type === 'Hero' ? { ...item, content: { ...item.content, title: headline } } : item) } : page));
    }
    if (action === 'Insert connected Booking Calendar') addBlock('Booking');
    if (action === 'Attach Product Checkout form') addBlock('Payment');
    setShowAIModal(false); notify(`AI suggestion applied: ${action}`);
  };

  return <div className={`funnel-builder-page ${mode === 'funnel' ? 'fb-mode-funnel' : 'fb-mode-website'} ${visibility === 'Desktop only' ? 'visibility-desktop-only' : visibility === 'Mobile only' ? 'visibility-mobile-only' : ''}`} style={{ '--fb-accent': themeColor, '--fb-heading-font': headingFont, '--fb-card-radius': cornerStyle === 'Square' ? '2px' : cornerStyle === 'Soft' ? '13px' : '7px' } as React.CSSProperties}>
    <input ref={selectedImageRef} type="file" accept="image/*" hidden onChange={event => { updateSectionImage(pendingImageSectionId || '', event.target.files?.[0]); event.currentTarget.value = ''; }}/>
    <header className="fb-editor-header">
      <div className="fb-editor-title"><button className="fb-back" onClick={() => onBack ? onBack() : navigate('/dashboard/funnels')} aria-label="Back to overview"><ArrowLeft size={18}/></button><input aria-label="Funnel name" value={funnel.name} onChange={event => setFunnel(value => ({ ...value, name: event.target.value, status: 'Draft' }))}/><button className="fb-edit-title" onClick={() => document.querySelector<HTMLInputElement>('.fb-editor-title input')?.focus()} aria-label="Edit funnel name"><FileText size={14}/></button><span className={`fb-published-pill ${funnel.status.toLowerCase()}`}><i/>{funnel.status}</span></div>
      <div className="fb-main-actions"><div className="fb-viewport-switch" aria-label="Preview size"><button className={device === 'desktop' ? 'active' : ''} onClick={() => setDevice('desktop')} title="Desktop"><Monitor size={15}/></button><button className={device === 'tablet' ? 'active' : ''} onClick={() => setDevice('tablet')} title="Tablet"><Tablet size={15}/></button><button className={device === 'mobile' ? 'active' : ''} onClick={() => setDevice('mobile')} title="Mobile"><Smartphone size={15}/></button></div><span className="fb-action-divider"/><button className="fb-icon-button" onClick={undo} disabled={!undoStack.length} aria-label="Undo"><Undo2 size={16}/></button><button className="fb-icon-button" onClick={redo} disabled={!redoStack.length} aria-label="Redo"><Redo2 size={16}/></button><button className="fb-outline-button" onClick={() => { setPreviewPageId(activePageId); setIsPreviewOpen(true); }}><Eye size={15}/> Preview</button><button className="fb-outline-button fb-flow-button" onClick={() => setShowJourney(true)}><Zap size={14}/> Funnel Flow</button><div className="fb-menu-anchor"><button className="fb-publish-button" onClick={publish}><Zap size={14}/> Publish <span className="fb-split-chevron" onClick={event => { event.stopPropagation(); setShowPublishMenu(value => !value); }}><ChevronDown size={13}/></span></button>{showPublishMenu && <div className="fb-dropdown"><button onClick={publish}><Globe2 size={14}/> Publish changes</button><button onClick={saveDraft}><Save size={14}/> Save as draft</button><button onClick={() => setShowVersions(value => !value)}><HistoryIcon/> Version history</button></div>}</div><button className="fb-icon-button" onClick={() => setShowVersions(value => !value)} aria-label="Version history"><MoreHorizontal size={18}/></button></div>
    </header>
    <div className="fb-builder-grid">
      <aside className="fb-left-panel">
        {mode === 'website' && <div className="fb-tabs">{(['Pages', 'Global', 'Theme'] as BuilderTab[]).map(tab => <button key={tab} className={leftTab === tab ? 'active' : ''} onClick={() => setLeftTab(tab)}>{tab}</button>)}</div>}
        {mode === 'funnel' || leftTab === 'Pages' ? <>
          {mode==='website'&&<div className="fb-pages-list"><div className="fb-panel-caption">WEBSITE PAGES <span>{websitePages.length}</span></div>{websitePages.map(page => <button className={`fb-page-item ${page.id === activePageId ? 'active' : ''}`} key={page.id} onClick={() => { setActivePageId(page.id); setSelectedBlockId(null); }}><PanelTop size={13}/><span>{page.name}</span>{page.id === activePageId && <MoreHorizontal size={15}/>}</button>)}<button className="fb-add-page" onClick={addPage}><Plus size={13}/> Add Page</button></div>}
          <div className="fb-elements-panel"><div className="fb-element-head"><h3>{leftInspectorMode === 'sections' ? 'Add a section' : 'Add Elements'}</h3><div className="fb-element-tabs"><button className={leftInspectorMode === 'elements' ? 'active' : ''} onClick={() => setLeftInspectorMode('elements')}>Elements</button><button className={leftInspectorMode === 'sections' ? 'active' : ''} onClick={() => setLeftInspectorMode('sections')}>Sections</button></div></div>{leftInspectorMode === 'elements' ? <><AssetSearch className="fb-block-search" value={search} onChange={setSearch} placeholder="Search elements..." shortcut/><div className="fb-block-scroll">{shownGroups.map(group => <section className="fb-block-group" key={group.title}><details open><summary>{group.title === 'Basic' ? 'Basic Elements' : group.title === 'Content' ? 'Content Blocks' : group.title}</summary><div className="fb-block-grid">{group.items.map(item => <button className="fb-block-button" key={item.name} draggable onDragStart={event => event.dataTransfer.setData('text/gos-block', item.name)} onClick={() => addBlock(item.name)}><item.icon size={18}/><span>{item.name}</span></button>)}</div></details></section>)}</div></> : <div className="fb-section-list">{(['Hero','Program Highlights','Testimonials','Pricing Preview','Brand Story','Mission & Vision','Team','Core Values','Stats','Program Cards','Pricing Table','Contact Form','Location & Hours','FAQ'] as SectionType[]).map(type => <button key={type} onClick={() => addPresetSection(type)}><Layers size={14}/><span>{type}</span><Plus size={13}/></button>)}</div>}</div>
        </> : leftTab === 'Global' ? <div className="fb-global-panel"><span className="fb-panel-caption">FUNNEL SETTINGS</span><label>Funnel name<input value={funnel.name} onChange={event => setFunnel(value => ({ ...value, name: event.target.value, status: 'Draft' }))}/></label><label>Conversion goal<PopoverSelect value={funnel.goal} options={['Lead generation', 'Sales', 'Bookings']} onChange={goal => setFunnel(value => ({ ...value, goal }))}/></label><label>Target audience<textarea value={funnel.audience} onChange={event => setFunnel(value => ({ ...value, audience: event.target.value }))}/></label><label>Connected offer<PopoverSelect value={funnel.offer} options={['Brand strategy session', 'Strength coaching', 'Fitness membership']} onChange={offer => setFunnel(value => ({ ...value, offer }))}/></label><div className="fb-connected-note"><Link2 size={13}/> Shared with Products, Booking & CRM</div><span className="fb-panel-caption">CONVERSION EVENTS</span>{['Form Submit', 'Booking', 'Checkout'].map(event => <label className="fb-check-row" key={event}><input type="checkbox" checked={funnel.events.includes(event)} onChange={e => setFunnel(value => ({ ...value, events: e.target.checked ? [...value.events, event] : value.events.filter(current => current !== event) }))}/>{event}</label>)}</div> : <div className="fb-theme-panel"><span className="fb-panel-caption">BRAND COLORS</span><div className="fb-color-swatches">{['#6544e8', '#17182f', '#15a982', '#f5a623', '#ffffff'].map(color => <button style={{ background: color }} className={themeColor === color ? 'selected' : ''} key={color} onClick={() => setThemeColor(color)} aria-label={`Select ${color}`}/>)}</div><label>Primary color<input type="color" value={themeColor} onChange={event => setThemeColor(event.target.value)}/></label><label>Heading font<PopoverSelect value={headingFont} options={['Manrope', 'DM Sans', 'Inter']} onChange={setHeadingFont}/></label><label>Corner style<PopoverSelect value={cornerStyle} options={['Rounded', 'Soft', 'Square']} onChange={setCornerStyle}/></label><button className="fb-outline-button" onClick={() => notify('Brand theme applied to all funnel pages')}><Check size={14}/> Apply to all pages</button></div>}
      </aside>
      <main className="fb-center-panel">
        
        <div className="fb-canvas-controls"><div className="fb-page-picker"><span><PanelTop size={14}/></span><label>{mode === 'funnel' ? 'Step:' : 'Page:'}</label>{mode === 'funnel' ? <FunnelStepDropdown steps={assetDocument ? funnelSteps : [...funnelSteps, ...defaultFunnelSteps.filter(base => !funnelSteps.some(step => step.id === base.id))]} activeId={activeFunnelStepId} onSelect={activateFunnelStep} onDelete={requestDeleteFunnelStep} /> : <PopoverSelect className="fb-page-select" value={currentPage.name} options={websitePages.map(page => page.name)} onChange={name => { setActivePageId(websitePages.find(page => page.name === name)?.id ?? activePageId); setSelectedBlockId(null); }}/>}</div>{mode === 'website' && <label className="fb-url-input"><Globe2 size={13}/><input aria-label="Page URL" value={`${siteOrigin}${currentPage.path}`} onChange={event => updatePage({ path: event.target.value.replace(siteOrigin, '') || '/' })}/><button aria-label="Edit page URL"><FileText size={13}/></button></label>}<button className="fb-save-draft" onClick={saveDraft}><Save size={13}/> Save Draft</button><div className="fb-menu-anchor"><button className="fb-version-button" onClick={() => setShowVersions(value => !value)}><HistoryIcon/> Versions <ChevronDown size={12}/></button>{showVersions && <div className="fb-dropdown fb-version-menu"><b>Version history</b><button onClick={() => { setFunnel(value => ({ ...value, status: 'Published' })); setShowVersions(false); notify('Restored published version'); }}>v1.3 · Published <span>Today</span></button><button onClick={() => { setFunnel(value => ({ ...value, status: 'Draft' })); setShowVersions(false); notify('Restored draft version'); }}>v1.2 · Draft <span>Yesterday</span></button></div>}</div></div>
        <div className={`fb-site-frame ${device}`} onDragOver={event => event.preventDefault()} onDrop={handleDrop}>
          <div className="fb-site-window" style={{backgroundColor:currentPage.backgroundColor ?? '#ffffff'}}>{currentPage.showHeader && <div className="fb-site-topline"><span>● {funnel.name.split(' ')[0].toUpperCase()}</span>{currentPage.showHeader && <><nav className="fb-desktop-site-nav">{websitePages.map(page => <button key={page.id} onClick={() => { setActivePageId(page.id); setSelectedBlockId(null); }}>{page.name}</button>)}</nav><button className="fb-mobile-nav-toggle" aria-label={mobileNavOpen ? 'Close navigation menu' : 'Open navigation menu'} aria-expanded={mobileNavOpen} onClick={() => setMobileNavOpen(value => !value)}>{mobileNavOpen ? <X size={16}/> : <Menu size={16}/>}</button>{mobileNavOpen && <nav className="fb-mobile-site-menu">{websitePages.map(page => <button key={page.id} onClick={() => { setActivePageId(page.id); setSelectedBlockId(null); setMobileNavOpen(false); }}>{page.name}<ArrowRight size={12}/></button>)}</nav>}</>}<button className="fb-site-header-cta" onClick={() => setShowJourney(true)}>{currentPage.cta || 'Get started'}</button></div>}
{mode==='funnel'?<FunnelCanvas page={currentPage} selected={selectedBlockId} device={device} select={id=>{setSelectedBlockId(id);setInspectorTab('Content');}} drop={dropElement} content={editElementContent} duplicate={duplicateElement} remove={deleteElement} move={(id,target)=>updatePage({sections:moveSection(currentPage.sections,id,target)})} settings={id=>{setSelectedBlockId(id);setInspectorTab('Content');requestAnimationFrame(()=>document.querySelector<HTMLButtonElement>('.fb-inspector-tabs button')?.focus());}}/>:currentPage.sections.map(item => {
              const isSelected = selectedBlockId === item.id;
              const sectionStyle: React.CSSProperties = { backgroundColor: item.styles.backgroundColor, padding: `${item.styles.padding}px 22px`, textAlign: item.styles.textAlign.toLowerCase() as React.CSSProperties['textAlign'], fontFamily: item.styles.typography === 'Brand heading' ? `'${headingFont}', sans-serif` : undefined, maxWidth: item.content.contentWidth === 'Boxed' ? '1100px' : undefined, marginInline: item.content.contentWidth === 'Boxed' ? 'auto' : undefined, minHeight: item.content.sectionHeight === 'Screen Height' ? '100vh' : undefined, backgroundImage: item.type !== 'Hero' && item.content.src ? `linear-gradient(rgba(3,7,18,${Number(item.content.overlayOpacity||0)/100}),rgba(3,7,18,${Number(item.content.overlayOpacity||0)/100})),url("${item.content.src}")` : undefined, backgroundSize: 'cover', backgroundPosition: 'center', display: item.styles.visibility === 'Hidden' || (item.styles.visibility === 'Desktop only' && device !== 'desktop') || (item.styles.visibility === 'Tablet only' && device !== 'tablet') || (item.styles.visibility === 'Mobile only' && device !== 'mobile') ? 'none' : undefined };
              const select = () => { setSelectedBlockId(item.id); };
              const title = item.type === 'Hero' ? item.content.title ?? currentPage.headline : item.content.title;
              const body = item.type === 'Hero' ? item.content.body ?? currentPage.subheadline : item.content.body;
              return <section key={item.id} data-section-id={item.id} className={`fb-canvas-section ${item.type === 'Hero' ? 'fb-hero-section' : ''} typography-${item.styles.typography.toLowerCase().replace(/\s+/g,'-')} ${isSelected ? 'selected' : ''} ${item.styles.animation !== 'None' ? `anim-${item.styles.animation.toLowerCase()}` : ''}`} style={sectionStyle} onClickCapture={select} onDragOver={event=>event.preventDefault()} onDrop={event=>{const source=event.dataTransfer.getData('text/gos-section');const block=event.dataTransfer.getData('text/gos-block');if(source){event.preventDefault();event.stopPropagation();reorderSection(source,item.id);}else if(block){event.preventDefault();event.stopPropagation();addBlock(block as BlockKind, item.id);}}}>
                <button className="fb-canvas-drag" draggable aria-label={`Move ${item.type} section`} onDragStart={event=>{event.dataTransfer.setData('text/gos-section',item.id);event.dataTransfer.effectAllowed='move';}}><Menu size={13}/> {item.type}</button>
              {item.type === 'Hero' ? <><img className="fb-hero-image" src={currentPage.featuredImage || fitnessHero} alt="Fitness coaching hero" onError={event => { if (event.currentTarget.src !== fitnessHero) event.currentTarget.src = fitnessHero; }}/><span className="fb-hero-overlay" style={{background:`rgba(3,7,18,${Math.min(100,Number(item.content.overlayOpacity)||0)/100})`}}/><div className="fb-hero-copy">{(title || body || item.content.button) && <span className="fb-hero-kicker"><Sparkles size={10}/> HERO SECTION</span>}{title && <h1>{title}</h1>}{body && <p>{body}</p>}{(title || body || item.content.button) && <div className="fb-hero-actions">{item.content.button && <button className="fb-site-primary" onClick={event => { event.stopPropagation(); activateButton(item); }}>{item.content.button}<ArrowRight size={14}/></button>}</div>}</div></> : <>
                <SectionPreview item={item} onAction={activateButton} onImagePick={() => chooseImageForSection(item.id)} onImageDrop={event => onImageDrop(item.id,event)} onNotify={notify}/>
                </>}
                {item.styles.customCss && <style>{`[data-section-id="${item.id}"]{${item.styles.customCss}}`}</style>}
              </section>;
            })}
            {currentPage.showFooter && <footer className="fb-site-footer">{funnel.name} <span>Training for real life.</span><small>© 2025 FitZone</small></footer>}
          </div>
        </div>
      </main>
      <aside className="fb-right-panel">
        <div className="fb-inspector-tabs">{(['Content', 'Style', 'Advanced'] as InspectorTab[]).map(tab => <button className={inspectorTab === tab ? 'active' : ''} key={tab} onClick={() => setInspectorTab(tab)}>{tab}</button>)}</div>
        {inspectorTab === 'Content' ? <div className="fb-inspector-scroll"><h2>{selectedBlock ? `${selectedBlock.type} settings` : mode === 'funnel' ? 'Funnel Step Settings' : 'Page Settings'}</h2>
          {selectedBlock ? <>
            {mode === 'funnel' && <section className="fb-content-inspector">
              <h3>Section</h3>
              <div className="fb-inspector-label">Background</div>
              <div className="fb-background-tabs">{(['Color','Image','Video'] as const).map(tab=><button key={tab} className={backgroundTab===tab?'active':''} onClick={()=>setBackgroundTab(tab)}>{tab}</button>)}</div>
              {backgroundTab === 'Color' ? <label className="fb-background-color">Background color<input type="color" value={selectedBlock.styles.backgroundColor} onChange={event=>updateSelectedSection({styles:{backgroundColor:event.target.value}})}/></label> : backgroundTab === 'Image' ? <><input ref={sectionImageInputRef} type="file" accept="image/*" hidden onChange={event=>{const file=event.target.files?.[0];if(file)updateSectionImage(selectedBlock.id,file);event.currentTarget.value='';}}/><div className="fb-background-image-row"><div className="fb-background-thumb">{(selectedBlock.content.src || (selectedBlock.type==='Hero' ? currentPage.featuredImage : '')) && <img src={selectedBlock.content.src || currentPage.featuredImage} alt="Section background"/>}</div><div><button onClick={()=>sectionImageInputRef.current?.click()}><Image size={12}/> Change Image</button><button onClick={()=>selectedBlock.type==='Hero' ? updatePage({featuredImage:''}) : updateSelectedContent('src','')}><Trash2 size={12}/> Remove</button></div></div></> : <label className="fb-inspector-field">Background video URL<input value={selectedBlock.content.backgroundVideo || ''} onChange={event=>updateSelectedContent('backgroundVideo',event.target.value)} placeholder="Paste a video URL"/></label>}
              <label className="fb-overlay-control">Overlay <span>{selectedBlock.content.overlayOpacity || '0'}%</span><input type="range" min="0" max="100" value={selectedBlock.content.overlayOpacity || '0'} onChange={event=>updateSelectedContent('overlayOpacity',event.target.value)}/></label>
              <div className="fb-inspector-divider"/><div className="fb-inspector-label">Spacing · Padding</div><div className="fb-padding-options">{['0','8','16','24','32'].map(value=><button key={value} className={selectedBlock.styles.padding===value?'active':''} onClick={()=>updateSelectedSection({styles:{padding:value}})}>{value}</button>)}</div>
              <div className="fb-inspector-divider"/><h3>Layout</h3><div className="fb-layout-pair"><label>Content Width<PopoverSelect value={selectedBlock.content.contentWidth || 'Full Width'} options={['Full Width','Boxed']} onChange={value=>updateSelectedContent('contentWidth',value)}/></label><label>Height<PopoverSelect value={selectedBlock.content.sectionHeight || 'Auto'} options={['Auto','Screen Height']} onChange={value=>updateSelectedContent('sectionHeight',value)}/></label></div>
              <div className="fb-inspector-divider"/><h3>Visibility</h3>
            </section>}
            <ElementContentPanel activeElement={selectedBlock} onChange={updateSelectedContent} onUpload={file => updateSectionImage(selectedBlock.id,file)}/>
            {mode === 'funnel' && <div className="fb-responsive-visibility"><span>Visible on</span>{([{label:'Desktop',value:'Desktop only',Icon:Monitor},{label:'Tablet',value:'Tablet only',Icon:Tablet},{label:'Mobile',value:'Mobile only',Icon:Smartphone}] as const).map(({label,value,Icon}) => <button type="button" key={value} className={selectedBlock.styles.visibility === value ? 'active' : ''} onClick={() => updateSelectedSection({styles:{visibility:selectedBlock.styles.visibility === value ? 'All devices' : value}})}><Icon size={13}/>{label}</button>)}</div>}
            <button className="fb-ai-refine" onClick={() => setShowAIModal(true)}><Sparkles size={14}/> Ask AI to refine this section <ArrowRight size={13}/></button>
            <button className="fb-danger-button" onClick={() => { updatePages(list => list.map(page => page.id === activePageId ? { ...page, sections: changeSection(page.sections,selectedBlock.id,()=>[]) } : page)); setSelectedBlockId(null); }}><Trash2 size={13}/> Remove section</button>
          </> : <>            <label>Page Name<input value={currentPage.name} onChange={event => { updatePage({ name: event.target.value }); setFunnelSteps(steps=>steps.map(step=>step.pageId===activePageId?{...step,label:event.target.value}:step)); }}/></label><label>URL<div className="fb-url-pair"><span>{siteOrigin}</span><input value={currentPage.path} onChange={event => updatePage({ path: event.target.value })}/><Link2 size={13}/></div></label><label>SEO Title<input value={currentPage.seoTitle} onChange={event => updatePage({ seoTitle: event.target.value })}/></label><label>SEO Description<textarea value={currentPage.seoDescription} onChange={event => updatePage({ seoDescription: event.target.value })}/></label><div className="fb-image-field"><b>Featured Image</b><input ref={fileRef} type="file" accept="image/*" hidden onChange={event => selectFeatureImage(event.target.files?.[0])}/><div className="fb-featured-preview">{currentPage.featuredImage ? <img src={currentPage.featuredImage} alt="Featured page"/> : <span><Image size={21}/></span>}<div><button onClick={() => fileRef.current?.click()}><Upload size={12}/> Change Image</button><button onClick={() => updatePage({ featuredImage: '' })}><Trash2 size={12}/> Remove</button></div></div></div>
            <div className="fb-layout-settings"><h3>Page Layout</h3><div className="fb-toggle-row"><span>Header</span><button className={`fb-toggle ${currentPage.showHeader ? 'on' : ''}`} onClick={() => updatePage({ showHeader: !currentPage.showHeader })} role="switch" aria-label="Page header" aria-checked={currentPage.showHeader}/></div><PopoverSelect value={currentPage.header} options={['Header 1', 'Header 2', 'Minimal header']} onChange={header => updatePage({ header })}/><div className="fb-toggle-row"><span>Footer</span><button className={`fb-toggle ${currentPage.showFooter ? 'on' : ''}`} onClick={() => updatePage({ showFooter: !currentPage.showFooter })} role="switch" aria-label="Page footer" aria-checked={currentPage.showFooter}/></div><PopoverSelect value={currentPage.footer} options={['Footer 1', 'Footer 2', 'Minimal footer']} onChange={footer => updatePage({ footer })}/></div>
            {['Background', 'Custom Code', 'Advanced Settings'].map(name => <div className="fb-accordion" key={name}><button onClick={() => setAccordion(value => ({ ...value, [name]: !value[name] }))}><span>{name}</span>{accordion[name] ? <ChevronDown size={15}/> : <ChevronRight size={15}/>}</button>{accordion[name] && <div>{name === 'Background' ? <><label>Background color<input type="color" value={currentPage.backgroundColor ?? '#ffffff'} onChange={event=>updatePage({backgroundColor:event.target.value})}/></label><button className="fb-acc-option" onClick={() => fileRef.current?.click()}>Background image <span>Choose</span></button></> : name === 'Custom Code' ? <textarea value={currentPage.customCode ?? ''} onChange={event=>updatePage({customCode:event.target.value})} placeholder="Add custom HTML or tracking code…"/> : <><label className="fb-check-row"><input type="checkbox" checked={currentPage.hideOnMobile ?? false} onChange={event=>updatePage({hideOnMobile:event.target.checked})}/> Hide on mobile</label><label className="fb-check-row"><input type="checkbox" checked={currentPage.noIndex ?? false} onChange={event=>updatePage({noIndex:event.target.checked})}/> Disable indexing</label></>}</div>}</div>)}
          </>}
        </div> : inspectorTab === 'Style' ? <div className="fb-inspector-scroll"><h2>{selectedBlock ? `${selectedBlock.type} style` : 'Page style'}</h2>{selectedBlock ? <><label>Background color<input type="color" value={selectedBlock.styles.backgroundColor} onChange={event => updateSelectedSection({ styles: { backgroundColor: event.target.value } })}/></label><label>Padding (px)<input type="number" min="0" max="160" value={selectedBlock.styles.padding} onChange={event => updateSelectedSection({ styles: { padding: event.target.value } })}/></label><label>Text alignment<PopoverSelect value={selectedBlock.styles.textAlign} options={['Left', 'Center', 'Right']} onChange={value => updateSelectedSection({ styles: { textAlign: value } })}/></label><label>Typography<PopoverSelect value={selectedBlock.styles.typography} options={['Default', 'Brand heading', 'Compact']} onChange={value => updateSelectedSection({ styles: { typography: value } })}/></label></> : <><label>Primary color<input type="color" value={themeColor} onChange={event => setThemeColor(event.target.value)}/></label><label>Heading font<PopoverSelect value={headingFont} options={['Manrope', 'DM Sans', 'Inter']} onChange={setHeadingFont}/></label></>}<button className="fb-ai-refine" onClick={() => setShowAIModal(true)}><Sparkles size={14}/> Ask AI to refine this section</button></div> : <div className="fb-inspector-scroll"><h2>Advanced</h2>{selectedBlock ? <><label>Section ID<input readOnly value={selectedBlock.id}/></label><label>Custom CSS<textarea placeholder="color: #172033; border-radius: 16px;" value={selectedBlock.styles.customCss} onChange={event => updateSelectedSection({ styles: { customCss: event.target.value } })}/></label><label>Visibility<PopoverSelect value={selectedBlock.styles.visibility} options={['All devices', 'Desktop only', 'Mobile only', 'Hidden']} onChange={value => updateSelectedSection({ styles: { visibility: value } })}/></label><label>Animation<PopoverSelect value={selectedBlock.styles.animation} options={['None', 'Fade', 'Rise']} onChange={value => updateSelectedSection({ styles: { animation: value } })}/></label></> : <><label>Visibility<PopoverSelect value={visibility} options={['All devices', 'Desktop only', 'Mobile only']} onChange={setVisibility}/></label><div className="fb-advanced-hint"><ShieldCheck size={14}/> Select a canvas section to edit its advanced settings.</div></>}<div className="fb-advanced-hint"><ShieldCheck size={14}/> Changes are saved to this funnel draft.</div></div>}
      </aside>
    </div>
    <AnimatePresence>{showAddStepModal && <motion.div className="fb-modal-backdrop fb-add-step-backdrop z-[120]" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onMouseDown={event => event.target === event.currentTarget && setShowAddStepModal(false)}>
      <motion.section initial={{opacity:0, scale:0.95}} animate={{opacity:1, scale:1}} exit={{opacity:0, scale:0.95}} className="bg-white rounded-2xl shadow-2xl overflow-hidden w-full max-w-[650px] font-sans" role="dialog" aria-modal="true">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center"><Layers size={20}/></span>
            <div>
              <h2 className="text-[17px] font-bold text-gray-900 m-0 leading-tight">Add Pipeline Step</h2>
              <p className="text-[11px] text-gray-500 m-0 mt-0.5 font-medium">Choose a step type to expand your customer journey.</p>
            </div>
          </div>
          <button className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors border-0 cursor-pointer" onClick={() => setShowAddStepModal(false)}><X size={16}/></button>
        </div>
        
        <div className="p-6">
          <label className="block mb-6">
            <span className="block text-[10px] font-bold text-gray-700 mb-1.5 uppercase tracking-wide">Step Name</span>
            <input className="w-full h-[42px] px-4 border border-gray-200 rounded-xl text-[13px] font-medium text-gray-900 placeholder:font-normal focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all bg-white" autoFocus placeholder="e.g. Special Upsell Offer" value={newStepName} onChange={e => setNewStepName(e.target.value)} onKeyDown={e => e.key === 'Enter' && newStepName.trim() && createFunnelStep()}/>
          </label>
          
          <span className="block text-[10px] font-bold text-gray-700 mb-2.5 uppercase tracking-wide">Step Template</span>
          <div className="grid grid-cols-4 gap-3 mb-2">
            {[
              { type: 'Landing', icon: <Monitor size={16}/>, desc: 'Sales or capture page' },
              { type: 'Form', icon: <FileText size={16}/>, desc: 'Collect lead details' },
              { type: 'Booking', icon: <CalendarDays size={16}/>, desc: 'Schedule appointments' },
              { type: 'Upsell', icon: <ArrowUpRight size={16}/>, desc: 'One-click upgrade offer' },
              { type: 'Checkout', icon: <CreditCard size={16}/>, desc: 'Process payments' },
              { type: 'Survey', icon: <Target size={16}/>, desc: 'Collect preferences' },
              { type: 'Thank You', icon: <Heart size={16}/>, desc: 'Gratitude & next steps' },
              { type: 'Confirmation', icon: <CheckCircle2 size={16}/>, desc: 'Receipt & summary' }
            ].map(opt => (
              <button key={opt.type} type="button" onClick={() => setNewStepType(opt.type as FunnelStepType)} className={`flex flex-col items-start text-left p-3 rounded-xl border ${newStepType === opt.type ? 'border-indigo-600 bg-indigo-50/70 ring-1 ring-indigo-600' : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50/50'} transition-all cursor-pointer bg-white`}>
                <span className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2.5 ${newStepType === opt.type ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' : 'bg-gray-100 text-gray-600'}`}>{opt.icon}</span>
                <b className={`text-[11px] block tracking-tight ${newStepType === opt.type ? 'text-indigo-950 font-bold' : 'text-gray-800'}`}>{opt.type}</b>
                <span className={`text-[9px] mt-1 leading-[1.2] block ${newStepType === opt.type ? 'text-indigo-700 font-medium' : 'text-gray-500'}`}>{opt.desc}</span>
              </button>
            ))}
          </div>
        </div>
        
        <div className="p-4 px-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
          <button type="button" className="h-[36px] px-5 rounded-xl text-[11px] font-bold text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 hover:text-gray-900 transition-colors cursor-pointer" onClick={() => setShowAddStepModal(false)}>Cancel</button>
          <button type="button" className="h-[36px] px-6 rounded-xl text-[11px] font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:hover:bg-indigo-600 disabled:cursor-not-allowed cursor-pointer border-0 shadow-sm shadow-indigo-600/20" disabled={!newStepName.trim()} onClick={createFunnelStep}>Add Step <ArrowRight size={14}/></button>
        </div>
      </motion.section>
    </motion.div>}</AnimatePresence>
    <AnimatePresence>{pendingDeleteStepId && <motion.div className="fb-modal-backdrop fb-delete-step-backdrop" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onMouseDown={event => event.target === event.currentTarget && setPendingDeleteStepId(null)}>
      <motion.section className="fb-delete-step-dialog" role="alertdialog" aria-modal="true" aria-labelledby="fb-delete-step-title" aria-describedby="fb-delete-step-description" initial={{opacity:0,scale:.96,y:8}} animate={{opacity:1,scale:1,y:0}} exit={{opacity:0,scale:.96,y:8}} transition={{duration:.16}}>
        <span className="fb-delete-step-icon"><Trash2 size={18}/></span>
        <h2 id="fb-delete-step-title">Delete funnel step?</h2>
        <p id="fb-delete-step-description">Are you sure you want to delete this step? This removes the step and its page from the funnel.</p>
        <div><button type="button" onClick={() => setPendingDeleteStepId(null)}>Cancel</button><button type="button" className="danger" onClick={confirmDeleteFunnelStep}>Delete step</button></div>
      </motion.section>
    </motion.div>}</AnimatePresence>
    <AnimatePresence>{isPreviewOpen && <motion.div className="fb-live-preview-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="dialog" aria-modal="true" aria-label={`${previewPage.name} live preview`}>
      <header className="fb-preview-toolbar"><div className="fb-preview-brand"><span className="fb-preview-brand-mark">F</span><div><b>Live preview</b><small>{previewPage.name} · Workspace preview · Live hosting is not connected.</small></div></div><div className="fb-preview-page-select"><AssetSelect label={mode === "funnel" ? "Preview step" : "Preview page"} value={previewPage.id} options={(mode === "funnel" ? pagesData.filter(page => funnelSteps.some(step => step.pageId === page.id)) : websitePages).map(page => ({value:page.id,label:page.name}))} onChange={id=>{setPreviewPageId(id);setMobileNavOpen(false);}}/></div><div className="fb-preview-device-switch"><button className={device === 'desktop' ? 'active' : ''} onClick={() => setDevice('desktop')} aria-label="Desktop preview" aria-pressed={device === 'desktop'}><Monitor size={15}/> <span>Desktop</span></button><button className={device === 'tablet' ? 'active' : ''} onClick={() => setDevice('tablet')} aria-label="Tablet preview" aria-pressed={device === 'tablet'}><Tablet size={15}/><span>Tablet</span></button><button className={device === 'mobile' ? 'active' : ''} onClick={() => setDevice('mobile')} aria-label="Mobile preview" aria-pressed={device === 'mobile'}><Smartphone size={15}/><span>Mobile</span></button></div><button className="fb-preview-exit" onClick={() => { setShowActionStep(false); setIsPreviewOpen(false); }}><X size={15}/> Exit Preview</button></header>
      <main className="fb-live-preview-stage"><div className={`fb-live-preview-frame ${device}`}><div className="fb-live-page">
        {previewPage.showHeader && <header className="fb-live-page-nav"><button className="fb-live-wordmark" onClick={() => setPreviewPageId(websitePages[0]?.id ?? previewPage.id)}>{funnel.name.split(' ')[0].toUpperCase()}</button><nav className="fb-live-desktop-nav">{websitePages.map(page => <button key={page.id} className={previewPage.id === page.id ? 'active' : ''} onClick={() => { setPreviewPageId(page.id); setMobileNavOpen(false); }}>{page.name}</button>)}</nav><button className="fb-live-mobile-nav-toggle" aria-label={mobileNavOpen ? 'Close navigation menu' : 'Open navigation menu'} aria-expanded={mobileNavOpen} onClick={() => setMobileNavOpen(value => !value)}>{mobileNavOpen ? <X size={16}/> : <Menu size={16}/>}</button><button className="fb-site-header-cta" onClick={() => openPreviewAction()}>{previewPage.cta || 'Get started'}</button>{mobileNavOpen && <nav className="fb-preview-mobile-menu">{websitePages.map(page => <button key={page.id} onClick={() => { setPreviewPageId(page.id); setMobileNavOpen(false); }}>{page.name}<ArrowRight size={13}/></button>)}</nav>}</header>}
        {previewPage.sections.map(item => {
          const styles: React.CSSProperties = { backgroundColor: item.styles.backgroundColor, padding: `${item.styles.padding}px clamp(20px,5vw,72px)`, textAlign: item.styles.textAlign.toLowerCase() as React.CSSProperties['textAlign'], fontFamily: item.styles.typography === 'Brand heading' ? `'${headingFont}', sans-serif` : undefined, maxWidth: item.content.contentWidth === 'Boxed' ? '1100px' : undefined, marginInline: item.content.contentWidth === 'Boxed' ? 'auto' : undefined, minHeight: item.content.sectionHeight === 'Screen Height' ? '100vh' : undefined, backgroundImage: item.type !== 'Hero' && item.content.src ? `linear-gradient(rgba(3,7,18,${Number(item.content.overlayOpacity||0)/100}),rgba(3,7,18,${Number(item.content.overlayOpacity||0)/100})),url("${item.content.src}")` : undefined, backgroundSize:'cover', backgroundPosition:'center', display: item.styles.visibility === 'Hidden' || (item.styles.visibility === 'Desktop only' && device !== 'desktop') || (item.styles.visibility === 'Tablet only' && device !== 'tablet') || (item.styles.visibility === 'Mobile only' && device !== 'mobile') ? 'none' : undefined };
          const heroTitle = item.content.title ?? previewPage.headline;
          const heroBody = item.content.body ?? previewPage.subheadline;
          return <section key={item.id} data-section-id={item.id} className={`fb-canvas-section ${item.type === 'Hero' ? 'fb-hero-section' : ''} typography-${item.styles.typography.toLowerCase().replace(/\s+/g,'-')} ${item.styles.animation !== 'None' ? `anim-${item.styles.animation.toLowerCase()}` : ''}`} style={styles}>
            {item.type === 'Hero' ? <><img className="fb-hero-image" src={previewPage.featuredImage || fitnessHero} alt=""/><span className="fb-hero-overlay" style={{background:`rgba(3,7,18,${Math.min(100,Number(item.content.overlayOpacity)||0)/100})`}}/><div className="fb-hero-copy">{(heroTitle || heroBody) && <span className="fb-hero-kicker"><Sparkles size={10}/> {previewPage.name.toUpperCase()}</span>}{heroTitle && <h1>{heroTitle}</h1>}{heroBody && <p>{heroBody}</p>}{item.content.button && <div className="fb-hero-actions"><button className="fb-site-primary" onClick={() => openPreviewAction()}>{item.content.button}<ArrowRight size={14}/></button></div>}</div></> : <SectionPreview item={item} onAction={openPreviewSectionAction} onImagePick={() => {}} onImageDrop={event => event.preventDefault()} onNotify={notify}/>}
            {item.styles.customCss && <style>{`[data-section-id="${item.id}"]{${item.styles.customCss}}`}</style>}
          </section>;
        })}
        {previewPage.showFooter && <footer className="fb-site-footer">FITZONE <span>Training for real life.</span><small>© {new Date().getFullYear()} FitZone</small></footer>}
      </div></div></main>
      {showActionStep && <div className="fb-preview-action-backdrop" onMouseDown={event => event.target === event.currentTarget && setShowActionStep(false)}><section className="fb-preview-action-modal"><span className="fb-preview-action-icon">{previewActionType === 'payment' ? <CreditCard size={20}/> : <CalendarDays size={20}/>}</span><button className="fb-preview-action-close" onClick={() => setShowActionStep(false)} aria-label="Close"><X size={16}/></button><p className="fb-preview-eyebrow">{previewActionType === 'payment' ? 'SECURE CHECKOUT' : 'BOOK A SESSION'}</p><h2>{previewActionType === 'payment' ? 'Continue to checkout' : 'Choose a time that works for you'}</h2><p>{funnel.offer} · This preview shows the next connected step in the customer journey.</p><div className="fb-preview-action-fields"><label>Your name<input placeholder="Full name"/></label><label>Email address<input type="email" placeholder="you@example.com"/></label>{previewActionType === 'booking' && <label>Available time<AssetSelect defaultValue={""} options={[{value:"",label:"Select a time",disabled:true},{value:"Today · 2:00 PM",label:"Today · 2:00 PM"},{value:"Tomorrow · 10:30 AM",label:"Tomorrow · 10:30 AM"}]}/></label>}</div><button className="fb-site-primary" onClick={() => { setShowActionStep(false); notify(previewActionType === 'payment' ? 'Checkout preview submitted successfully' : 'Booking request submitted successfully'); }}>{previewActionType === 'payment' ? 'Continue to payment' : 'Confirm booking'} <ArrowRight size={14}/></button><small><ShieldCheck size={12}/> Demo preview · no real booking or payment is created</small></section></div>}
      <button className="fb-preview-exit-mobile" onClick={() => { setShowActionStep(false); setIsPreviewOpen(false); }} aria-label="Exit preview"><X size={18}/></button>
    </motion.div>}</AnimatePresence>
    {showJourney && <div className="fb-modal-backdrop" onMouseDown={event => event.target === event.currentTarget && setShowJourney(false)}><section className="fb-journey-modal"><header><div><span><Zap size={16}/></span><div><h2>Visitor journey preview</h2><p>One connected flow · {funnel.name}</p></div></div><button onClick={() => setShowJourney(false)}><X size={17}/></button></header><div className="fb-journey-list">{journey.map((step,index) => <div key={step} className="fb-journey-step"><span className="fb-journey-number">{index+1}</span><div><b>{step}</b><small>{index===2?'Booking form or checkout is captured in the same workspace record.':index===5?'Payment is recorded against the canonical offer.':index===6?'The lead profile and activity history are updated.':'Connected funnel event is recorded for this visitor.'}</small></div>{index<journey.length-1&&<i/>}</div>)}</div><footer><span><ShieldCheck size={14}/> CRM, Booking, Checkout & Analytics stay connected</span><button onClick={() => setShowJourney(false)}>Close Preview</button></footer></section></div>}
    {showAIModal && <div className="fb-modal-backdrop" onMouseDown={event => event.target === event.currentTarget && setShowAIModal(false)}><section className="fb-ai-modal"><header><div><span><Sparkles size={17}/></span><div><h2>AI Assist</h2><p>Enhance this page using your business context.</p></div></div><button onClick={() => setShowAIModal(false)}><X size={16}/></button></header>{['Rewrite headline in brand voice', 'Insert connected Booking Calendar', 'Attach Product Checkout form'].map(action => <button className="fb-ai-action" key={action} onClick={() => applyAIAction(action)}><span><WandSparkles size={15}/></span><b>{action}</b><ArrowRight size={14}/></button>)}<small><ShieldCheck size={12}/> Preview changes before you publish.</small></section></div>}
  </div>;
};

export function SectionPreview({ item, onAction, onImagePick, onImageDrop, onNotify }: { item: BuilderSection; onAction: (section: BuilderSection) => void; onImagePick: () => void; onImageDrop: (event: React.DragEvent) => void; onNotify: (message: string) => void }) {
  const [selectedSlot, setSelectedSlot] = useState('');
  const [selectedService, setSelectedService] = useState(item.content.serviceType || '');
  const [leadSent,setLeadSent] = useState(false);
  const [selectedDay,setSelectedDay] = useState('Tomorrow');
  const title = item.content.title || '';
  const body = item.content.body || '';
  if(item.type==='Columns'&&item.children) return <div className="fn-column-layout" style={{gridTemplateColumns:'repeat('+(item.content.columnLayout?.startsWith('3')?3:item.content.columnLayout?.startsWith('1')?1:2)+',minmax(0,1fr))',gap:(item.content.gap||'16')+'px'}}>{item.children.map((column,index)=><div key={index}>{column.map(child=><section key={child.id} style={{padding:child.styles.padding+'px',backgroundColor:child.styles.backgroundColor}}><SectionPreview item={child} onAction={onAction} onImagePick={onImagePick} onImageDrop={onImageDrop} onNotify={onNotify}/></section>)}</div>)}</div>;
  const ratio = item.content.aspectRatio || '16:9';
  const imageStyle: React.CSSProperties = { aspectRatio: ratio === 'Auto' ? 'auto' : ratio.replace(':', ' / ') };
  if (item.type === 'Image') return <div className="fb-image-element">
    {item.content.src ? <div className="fb-image-element-frame" style={imageStyle}><img src={item.content.src} alt={item.content.alt || ''}/></div> : <div className="fb-image-dropzone" style={imageStyle} onClick={onImagePick} onDragOver={event => event.preventDefault()} onDrop={onImageDrop}><Upload size={24}/><b>Click or drag an image to upload</b><span>PNG, JPG, or WebP · Add an image to this page</span><button type="button" onClick={event => { event.stopPropagation(); onImagePick(); }}>Upload Image</button></div>}
  </div>;
  if (item.type === 'Image Gallery') { const images = parseContentArray<GalleryImage>(item.content.images); return <>{title && <h2>{title}</h2>}{images.length ? <div className="fb-gallery-grid" style={{gridTemplateColumns:`repeat(${item.content.gridColumns || 3},minmax(0,1fr))`}}>{images.map(image => <div className="fb-gallery-image" key={image.id}><img src={image.src} alt={image.alt}/></div>)}</div> : <div className="fb-image-dropzone fb-gallery-empty"><Upload size={21}/><b>Gallery is empty</b><span>Add images from Content settings</span></div>}{body && <p>{body}</p>}</>; }
  if (item.type === 'Program Highlights' || item.type === 'Program Cards') return <><style>{`.mobile .fb-modern-grid { grid-template-columns: 1fr !important; }`}</style>{item.type === 'Program Cards' && <span className="fb-section-eyebrow">FITZONE PROGRAMS</span>}{title && <h2>{title}</h2>}{body && <p>{body}</p>}{item.content.items ? <div className="max-w-6xl mx-auto px-6 py-12 grid grid-cols-1 md:grid-cols-3 gap-6 fb-modern-grid">{item.content.items.split('·').filter(name=>name.trim()).map((name, programIndex) => <button key={`${name}-${programIndex}`} className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between text-left" onClick={() => onAction(item)}><div className="w-full h-44 rounded-xl overflow-hidden mb-4 relative"><img src={programImages[programIndex % 3]} alt="" loading="lazy" className="w-full h-full object-cover"/><span className="absolute bottom-3 left-3 text-white font-bold drop-shadow-md">0{programIndex + 1}</span></div><div className="flex-1"><b className="text-base font-bold text-slate-900 block">{name.trim()}</b><span className="text-xs text-slate-500 mt-1 block">{item.content.specs || 'Add program details'}</span></div><div className="flex items-center justify-between mt-4 pt-2 border-t border-slate-100 w-full"><div /><i className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center"><ArrowRight size={14}/></i></div></button>)}</div> : <div className="fb-empty-widget">Add program items in Content settings.</div>}{item.content.button && <button className="fb-site-primary fb-template-cta" onClick={() => onAction(item)}>{item.content.button}<ArrowRight size={13}/></button>}</>;
  if (item.type === 'Pricing') {
    const plans = parseContentArray<PricePlan>(item.content.plans);
    return <><span className="fb-section-eyebrow">MEMBERSHIP</span>{title && <h2>{title}</h2>}{body && <p>{body}</p>}{plans.length ? <div className="fb-price-grid">{plans.map(plan => <article key={plan.id} className={plan.highlighted ? 'featured' : ''}><small>{plan.name}</small><strong>{plan.price}{plan.period && <em>/{plan.period}</em>}</strong><ul>{plan.features.filter(Boolean).map(feature => <li key={feature}><Check size={11}/>{feature}</li>)}</ul><button onClick={() => onAction(item)}>{plan.button || 'Choose plan'} <ArrowRight size={11}/></button></article>)}</div> : <div className="fb-empty-widget">Your pricing plans will appear here after you add them.</div>}</>;
  }
  if (item.type === 'Pricing Table' || item.type === 'Pricing Preview') { const plans=parseContentArray<PricePlan>(item.content.plans); return <>{title && <><span className="fb-section-eyebrow">MEMBERSHIP</span><h2>{title}</h2></>}{body && <p>{body}</p>}{plans.length ? <div className="fb-price-grid">{plans.map(plan=><article key={plan.id} className={plan.highlighted?'featured':''}><small>{plan.name}</small><strong>{plan.price}<em>{plan.period?`/${plan.period}`:''}</em></strong><ul>{plan.features.filter(Boolean).map(feature=><li key={feature}><Check size={11}/>{feature}</li>)}</ul><button onClick={()=>onAction(item)}>{plan.button || 'Choose plan'} <ArrowRight size={11}/></button></article>)}</div> : <div className="fb-empty-widget">Add plans in Content settings to preview pricing.</div>}</>; }
  if (item.type === 'Contact Form' || item.type === 'Form') {
    const fields = parseContentArray<string>(item.content.fields);
    if(item.content.template==='lead-capture') return <div className="fb-lead-capture"><div className="fb-lead-copy"><span className="fb-section-eyebrow">YOUR FIRST WEEK IS ON US</span><h1>{leadSent?'Your free pass is waiting!':title || 'Claim Your Free 7-Day Fitness Pass'}</h1><p>{leadSent?'Thanks for sharing your goals. A FitZone coach will contact you shortly.':body || 'Build momentum with expert coaching and a plan tailored to you.'}</p>{!leadSent&&<><ul>{['A personalized starter plan','One-to-one coach introduction','Full access to our training studio'].map(benefit=><li key={benefit}><CheckCircle2 size={15}/>{benefit}</li>)}</ul><div className="fb-lead-social"><div className="fb-lead-avatars"><span>AM</span><span>SL</span><span>JR</span></div><small><b>Join 1,200+ members</b><br/>Rated 4.9/5 by our community</small></div></>}</div>{leadSent?<div className="fb-lead-form-card fb-lead-success"><CheckCircle2 size={35}/><b>Application received</b><span>{item.content.successMessage}</span></div>:<form className="fb-lead-form-card" onSubmit={event=>{event.preventDefault();setLeadSent(true);onNotify(item.content.successMessage || 'Your free pass request has been received.')}}><span className="fb-lead-form-eyebrow">START YOUR FREE PASS</span><h2>Tell us where to reach you</h2><label>Full name<input required placeholder="Alex Morgan"/></label><label>Email address<input required type="email" placeholder="alex@example.com"/></label><label>Phone number<input required type="tel" placeholder="+1 (555) 000-0000"/></label><label>Fitness goal<AssetSelect defaultValue={""} required={true} options={[{value:"",label:"Select your primary goal",disabled:true},{value:"Build strength",label:"Build strength"},{value:"Lose weight",label:"Lose weight"},{value:"Improve overall fitness",label:"Improve overall fitness"},{value:"Increase mobility",label:"Increase mobility"}]}/></label><button className="fb-site-primary" type="submit">{item.content.button || 'Get Started Now'} <ArrowRight size={14}/></button><small><ShieldCheck size={12}/> Your information stays private and secure.</small></form>}</div>;
    return <>{title && <h2>{title}</h2>}{body && <p>{body}</p>}{fields.length ? <form className="fb-demo-form" onSubmit={event => { event.preventDefault(); onNotify(item.content.successMessage || 'Form preview submitted'); }}>{fields.map((field,index) => field === 'Message' ? <textarea key={`${field}-${index}`} placeholder="Your message"/> : field === 'Dropdowns' ? <AssetSelect key={`${field}-${index}`} label="Fitness goals" defaultValue={""} options={[{value:"",label:"What are your goals?",disabled:true},{value:"Lose weight",label:"Lose weight"},{value:"Build strength",label:"Build strength"},{value:"Improve overall fitness",label:"Improve overall fitness"}]}/> : <input key={`${field}-${index}`} type={field === 'Email' ? 'email' : field === 'Phone' ? 'tel' : 'text'} placeholder={field === 'Name' ? 'Your name' : field}/>)}<button className="fb-site-primary" type="submit">{item.content.button || 'Submit'} <ArrowRight size={12}/></button></form> : <div className="fb-empty-widget">Add form fields from the Content settings panel.</div>}</>;
  }
  if(item.type==='Heading' && item.content.template==='thank-you') return <div className="fb-thank-you-banner"><motion.span className="fb-thank-you-check" initial={{scale:.65,opacity:0}} animate={{scale:1,opacity:1}} transition={{type:'spring',stiffness:250,damping:15}}><Check size={24}/></motion.span><span className="fb-section-eyebrow">APPLICATION RECEIVED</span><h1>{title}</h1><p>{body}</p></div>;
  if (item.type === 'Testimonials') { const reviews = parseContentArray<Testimonial>(item.content.testimonials); return <><span className="fb-section-eyebrow">MEMBER STORIES</span>{title && <h2>{title}</h2>}{reviews.length ? <div className="fb-review-grid">{reviews.map(review => <article key={review.id}>{review.avatar && <img src={review.avatar} alt=""/>}<div className="fb-review-stars">{'★'.repeat(Math.max(0,Math.min(5,review.rating)))}</div><blockquote>{review.quote}</blockquote><b>{review.author}</b><small>{review.role}</small></article>)}</div> : body ? <blockquote>{body}</blockquote> : <div className="fb-empty-widget">Customer testimonials will appear here.</div>}</>; }
  if (item.type === 'Team') return <>{title && <h2>{title}</h2>}{body && <p>{body}</p>}{item.content.items ? <div className="fb-inline-cards">{item.content.items.split('|').filter(person=>person.trim()).map(person => <article key={person}><Users size={18}/><b>{person.split('·')[0]}</b><small>{person.split('·')[1] || ''}</small></article>)}</div> : <div className="fb-empty-widget">Add team members in Content settings.</div>}</>;
  if (item.type === 'FAQ') return <>{title && <h2>{title}</h2>}{item.content.questions ? parseContentArray<{id:string;question:string;answer:string}>(item.content.questions).map(entry=><details key={entry.id}><summary>{entry.question}</summary><p>{entry.answer}</p></details>) : body ? <p>{body}</p> : <div className="fb-empty-widget">Add questions and answers in Content settings.</div>}</>;
  if (item.type === 'Location & Hours') return <>{title && <h2>{title}</h2>}{body && <p>{body}</p>}{item.content.address || item.content.hours ? <div className="fb-map-placeholder"><Globe2 size={22}/>{[item.content.address,item.content.hours].filter(Boolean).join(' · ')}</div> : <div className="fb-empty-widget">Add a location and opening hours in Content settings.</div>}</>;
  if (item.type === 'Brand Story') return <div className="fb-about-story"><div><span className="fb-section-eyebrow">OUR STORY</span>{title && <h2>{title}</h2>}{body && <p>{body}</p>}</div><div className="fb-about-image-frame">{item.content.image ? <img src={item.content.image} alt={item.content.alt || ''} loading="lazy"/> : <div className="fb-image-dropzone"><Upload size={22}/><b>Add a story image</b></div>}</div></div>;
  if (item.type === 'Mission & Vision') return <div className="fb-mission-grid"><article><span>OUR MISSION</span>{title && <h2>{title}</h2>}{body && <p>{body}</p>}{!title && !body && <div className="fb-empty-widget">Add your mission in Content settings.</div>}</article><article><span>OUR VISION</span>{item.content.visionTitle && <h2>{item.content.visionTitle}</h2>}{item.content.vision && <p>{item.content.vision}</p>}{!item.content.visionTitle && !item.content.vision && <div className="fb-empty-widget">Add your vision in Content settings.</div>}</article></div>;
  if (item.type === 'Core Values') return <>{title && <><span className="fb-section-eyebrow">WHAT WE BELIEVE</span><h2>{title}</h2></>}{body ? <div className="fb-values-grid">{body.split('·').filter(value=>value.trim()).map((value, valueIndex) => <article key={value}><i>0{valueIndex + 1}</i><b>{value.trim()}</b></article>)}</div> : <div className="fb-empty-widget">Add values in Content settings.</div>}</>;
  if (item.type === 'Stats') return item.content.items ? <div className="fb-stats-grid">{item.content.items.split('·').filter(stat=>stat.trim()).map(stat => { const [number,...label] = stat.trim().split(' '); return <article key={stat}><strong>{number}</strong><span>{label.join(' ')}</span></article>; })}</div> : <div className="fb-empty-widget">Add stats in Content settings.</div>;
  if (item.type === 'Button') return item.content.button ? <button className="fb-site-primary" onClick={() => onAction(item)}>{item.content.button}<ArrowRight size={13}/></button> : <div className="fb-empty-widget">Button preview · set a label in the Content panel</div>;
  if (item.type === 'Text' || item.type === 'Heading' || item.type === 'Paragraph') {
    const tag = item.content.headingTag || (item.type === 'Heading' ? 'H2' : 'Paragraph');
    if (tag === 'Paragraph') return body ? <p className="fb-custom-text">{body}</p> : <div className="fb-empty-widget">Empty text · edit in Content settings</div>;
    if (!title) return <div className="fb-empty-widget">Empty heading · edit in Content settings</div>;
    if (tag === 'H1') return <><h1 className="fb-custom-heading">{title}</h1>{body && <p className="fb-custom-text">{body}</p>}</>;
    if (tag === 'H3') return <><h3 className="fb-custom-heading">{title}</h3>{body && <p className="fb-custom-text">{body}</p>}</>;
    return <><h2 className="fb-custom-heading">{title}</h2>{body && <p className="fb-custom-text">{body}</p>}</>;
  }
  if (item.type === 'Video') {
    if (!item.content.videoUrl) return <div className="fb-video-placeholder"><Play size={20} fill="currentColor"/> Add a video URL in Content settings</div>;
    if (/\.mp4($|\?)/i.test(item.content.videoUrl)) return <div className="fb-video-frame" style={{aspectRatio:'16/9'}}><video src={item.content.videoUrl} controls autoPlay={item.content.autoplay==='true'} muted={item.content.muted!=='false'} playsInline/></div>;
    const embedUrl=item.content.videoUrl.replace('watch?v=','embed/').replace('vimeo.com/','player.vimeo.com/video/'); const join=embedUrl.includes('?')?'&':'?';
    return <div className="fb-video-frame" style={{aspectRatio:'16/9'}}><iframe title="Video preview" src={`${embedUrl}${join}autoplay=${item.content.autoplay==='true'?1:0}&mute=${item.content.muted==='true'?1:0}`} allow="autoplay; fullscreen; picture-in-picture" allowFullScreen/></div>;
  }
  if (item.type === 'Divider') return <hr className={`fb-element-divider ${item.content.lineStyle?.toLowerCase() || 'solid'}`} style={{borderTopWidth:`${item.content.thickness || '1'}px`,borderColor:item.content.lineColor || '#d9dce5'}}/>;
  if (item.type === 'Spacer') return <div className="fb-spacer-preview" style={{height:`${item.content.height || '40'}px`}}><span>{item.content.height || '40'} px spacer</span></div>;
  if (item.type === 'Icon') { const selectedIcon = iconChoices.find(icon => icon.name === item.content.iconName)?.Icon; const Icon = selectedIcon; return Icon ? <div className="fb-icon-block"><Icon size={Number(item.content.iconSize) || 28} color={item.content.iconColor || '#6544e8'}/></div> : <div className="fb-empty-widget"><Sparkles size={18}/> Choose an icon in Content settings</div>; }
  if (item.type === 'Payment') return item.content.productId ? <><h2>{title || item.content.productId}</h2><div className="fb-booking-preview"><CreditCard size={20}/><span>{item.content.productId} · {item.content.price && `${item.content.price} · `}{item.content.gateway || 'Payment gateway'}</span><button onClick={() => onAction(item)}>{item.content.button || 'Checkout'} <ArrowRight size={12}/></button></div></> : <div className="fb-empty-widget"><CreditCard size={18}/> Select a product to configure checkout</div>;
  if (item.type === 'Booking') {
    if (!item.content.calendar) return <div className="fb-empty-widget"><CalendarDays size={18}/> Connect a calendar to show booking options</div>;
    if(item.content.bookingMode==='confirmation') return <><h2>{title || 'Appointment details'}</h2>{body&&<p>{body}</p>}<div className="fb-confirmation-layout"><div className="fb-confirmation-summary"><span className="fb-confirmation-kicker"><CheckCircle2 size={15}/> APPOINTMENT CONFIRMED</span><span><CalendarDays size={16}/><b>Tomorrow, October 2, 2026</b></span><span><Clock3 size={16}/>{item.content.timeSlots || '10:30 AM'} · {item.content.serviceType || 'FitZone consultation'}</span><div className="fb-calendar-sync"><button onClick={()=>onNotify('Google Calendar link prepared in this demo')}><CalendarDays size={14}/> Google Calendar</button><button onClick={()=>onNotify('Apple Calendar file prepared in this demo')}><CalendarDays size={14}/> Apple iCal</button></div><button className="fb-site-primary" onClick={()=>onNotify('Calendar invitation added in this demo')}>{item.content.button || 'Add to Google Calendar'} <ArrowRight size={13}/></button><a href="mailto:support@fitzone.example">Contact Support</a></div><div className="fb-confirm-location"><div className="fb-map-preview"><Globe2 size={25}/><span>FITZONE STUDIO</span></div><div><b>FitZone Studio</b><small>123 Wellness Avenue · Cairo</small><small>Coach Alex Morgan · Personal Trainer</small></div><button onClick={()=>onNotify('Home page opened in this demo')}>Return to Home <ArrowRight size={13}/></button></div></div></>;
    return <div className="fb-booking-layout"><aside className="fb-booking-coach"><span className="fb-booking-brand"><CalendarDays size={15}/> FITZONE · APPOINTMENTS</span><h2>{title || 'Book a session'}</h2><p>{body}</p><div className="fb-booking-service"><span><Dumbbell size={15}/></span><div><b>{selectedService || 'Free consultation · 30 minutes'}</b><small>With a dedicated FitZone coach</small></div></div><div className="fb-coach-profile"><span>AM</span><div><b>Alex Morgan</b><small>Personal Trainer · 8 years experience</small></div></div><div className="fb-booking-secure"><ShieldCheck size={14}/> Your booking is held securely</div></aside><div className="fb-booking-picker"><h3>Select a date &amp; time</h3><label className="fb-booking-date">Service<AssetSelect value={selectedService} onChange={event=>setSelectedService(event)} options={[{value:"Free consultation · 30 minutes",label:"Free consultation · 30 minutes"},{value:"Personal training · 60 minutes",label:"Personal training · 60 minutes"},{value:"Nutrition consultation · 45 minutes",label:"Nutrition consultation · 45 minutes"}]}/></label><div className="fb-booking-month"><button type="button" aria-label="Previous month">‹</button><b>October 2026</b><button type="button" aria-label="Next month">›</button></div><div className="fb-booking-days">{['M','T','W','T','F','S','S'].map((day,index)=><span key={`${day}-${index}`}>{day}</span>)}{Array.from({length:14},(_,index)=><button type="button" key={index} className={selectedDay===String(index+1)?'active':''} onClick={()=>setSelectedDay(String(index+1))}>{index+1}</button>)}</div><b className="fb-booking-time-title">Available times · {selectedDay} October</b><div className="fb-time-slot-preview">{['09:00 AM','10:30 AM','02:00 PM','03:30 PM'].map(slot=><button type="button" className={selectedSlot===slot?'active':''} onClick={()=>setSelectedSlot(slot)} key={slot}>{slot}</button>)}</div><button className="fb-site-primary" disabled={!selectedSlot} onClick={()=>onAction({...item,content:{...item.content,serviceType:selectedService,timeSlots:`${selectedDay} October · ${selectedSlot}`}})}>{item.content.button || 'Confirm booking'} <ArrowRight size={12}/></button></div></div>;
  }
  if (item.type === 'Columns') { const layout=item.content.columnLayout || '2 Col (50/50)'; const count = Number(layout.startsWith('3') ? 3 : layout.startsWith('1') ? 1 : 2); const gridTemplateColumns=layout.includes('30/70')?'3fr 7fr':`repeat(${count},minmax(0,1fr))`; return <div className="fb-empty-columns" style={{gridTemplateColumns,gap:`${item.content.gap || 16}px`}}>{Array.from({length:count},(_,column) => <div key={column}><span>Empty column</span></div>)}</div>; }
  if (item.type === 'Section') return <div className="fb-empty-section"><Layers size={20}/><span>Empty section container</span></div>;
  return <><h2>{title}</h2><p>{body}</p>{item.content.button && <button className="fb-site-primary" onClick={() => onAction(item)}>{item.content.button}<ArrowRight size={13}/></button>}</>;
}

function ElementContentPanel({ activeElement, onChange, onUpload }: { activeElement: BuilderSection; onChange: (key: string, value: string) => void; onUpload: (file: File) => void }) {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const value = (key: string, fallback = '') => activeElement.content[key] ?? fallback;
  const titleFields = <><label>Section title<input value={value('title')} onChange={event => onChange('title',event.target.value)} placeholder="Add a title"/></label><label>Supporting text<textarea value={value('body')} onChange={event => onChange('body',event.target.value)} placeholder="Add supporting copy"/></label></>;
  const commonButton = <label>Button text<input value={value('button')} onChange={event => onChange('button',event.target.value)} placeholder="Button label"/></label>;
  const actionFields = <><label>Action destination<PopoverSelect value={value('destinationType','Open Booking Modal')} options={['External URL','Open Booking Modal','Scroll to Section']} onChange={next => onChange('destinationType',next)}/></label>{value('destinationType') === 'External URL' && <label>Destination URL<input value={value('destination')} onChange={event => onChange('destination',event.target.value)} placeholder="https://example.com"/></label>}{value('destinationType') === 'Scroll to Section' && <label>Target section<input value={value('destination')} onChange={event => onChange('destination',event.target.value)} placeholder="#programs or section ID"/></label>}</>;

  switch (activeElement.type) {
    case 'Image':
      return <div className="fb-element-settings"><p className="fb-settings-intro">Add an image to this section. No image is selected yet.</p><button className="fb-upload-image-button" onClick={() => imageInputRef.current?.click()}><Upload size={14}/> Upload Image</button><label>Image URL<input value={value('src')} onChange={event => onChange('src',event.target.value)} placeholder="https://…"/></label><label>Alt text<input value={value('alt')} onChange={event => onChange('alt',event.target.value)} placeholder="Describe the image"/></label><label>Image aspect ratio<PopoverSelect value={value('aspectRatio','16:9')} options={['16:9','4:3','1:1','Auto']} onChange={next => onChange('aspectRatio',next)}/></label><input ref={imageInputRef} type="file" accept="image/*" hidden onChange={event => { const file = event.target.files?.[0]; if (file) onUpload(file); event.currentTarget.value=''; }}/></div>;
    case 'Video':
      return <div className="fb-element-settings"><label>Video URL<input value={value('videoUrl')} onChange={event => onChange('videoUrl',event.target.value)} placeholder="YouTube, Vimeo, or direct MP4 URL"/></label><label className="fb-switch-setting"><input type="checkbox" checked={value('autoplay') === 'true'} onChange={event => onChange('autoplay',String(event.target.checked))}/>Autoplay</label><label className="fb-switch-setting"><input type="checkbox" checked={value('muted','true') === 'true'} onChange={event => onChange('muted',String(event.target.checked))}/>Mute by default</label></div>;
    case 'Icon':
      return <div className="fb-element-settings"><span className="fb-settings-label">Choose icon</span><div className="fb-icon-picker-grid">{iconChoices.map(({name,Icon}) => <button type="button" key={name} aria-label={name} title={name} className={value('iconName') === name ? 'selected' : ''} onClick={() => onChange('iconName',name)}><Icon size={18}/></button>)}</div><label>Icon size · {value('iconSize','28')}px<input type="range" min="12" max="72" value={value('iconSize','28')} onChange={event => onChange('iconSize',event.target.value)}/></label><label>Icon color<input type="color" value={value('iconColor','#6544e8')} onChange={event => onChange('iconColor',event.target.value)}/></label></div>;
    case 'Divider':
      return <div className="fb-element-settings"><label>Line style<PopoverSelect value={value('lineStyle','Solid')} options={['Solid','Dashed','Dotted']} onChange={next => onChange('lineStyle',next)}/></label><label>Line thickness · {value('thickness','1')}px<input type="range" min="1" max="12" value={value('thickness','1')} onChange={event => onChange('thickness',event.target.value)}/></label><label>Line color<input type="color" value={value('lineColor','#d9dce5')} onChange={event => onChange('lineColor',event.target.value)}/></label></div>;
    case 'Columns':
      return <div className="fb-element-settings"><label>Column layout<PopoverSelect value={value('columnLayout','2 Col (50/50)')} options={['1 Col','2 Col (50/50)','3 Col (33/33/33)','2 Col (30/70)']} onChange={next => onChange('columnLayout',next)}/></label><label>Gap spacing · {value('gap','16')}px<input type="range" min="0" max="48" value={value('gap','16')} onChange={event => onChange('gap',event.target.value)}/></label></div>;
    case 'Spacer':
      return <div className="fb-element-settings"><label>Height · {value('height','40')}px<input type="range" min="10" max="200" step="2" value={value('height','40')} onChange={event => onChange('height',event.target.value)}/></label><label>Exact height (px)<input type="number" min="10" max="200" value={value('height','40')} onChange={event => onChange('height',event.target.value)}/></label></div>;
    case 'Image Gallery': {
      const images = parseContentArray<GalleryImage>(value('images'));
      const addImages = (files: FileList | null) => { if (!files) return; const added = Array.from(files).filter(file => file.type.startsWith('image/')).map(file => ({id:`gallery-${Date.now()}-${Math.random().toString(16).slice(2,5)}`,src:URL.createObjectURL(file),alt:file.name.replace(/\.[^.]+$/,'')})); onChange('images',serializeContentArray([...images,...added])); };
      const moveImage = (index: number, step: number) => { const next=[...images]; const target=index+step; if(target<0||target>=next.length)return; [next[index],next[target]]=[next[target],next[index]]; onChange('images',serializeContentArray(next)); };
      return <div className="fb-element-settings"><label>Gallery title<input value={value('title')} onChange={event => onChange('title',event.target.value)} placeholder="Optional gallery title"/></label><label>Grid columns<PopoverSelect value={value('gridColumns','3')} options={['2','3','4']} onChange={next => onChange('gridColumns',next)}/></label><label className="fb-gallery-uploader" onDrop={event => {event.preventDefault();addImages(event.dataTransfer.files);}} onDragOver={event => event.preventDefault()}><Upload size={18}/><span>Click or drop images to add</span><input type="file" accept="image/*" multiple onChange={event => {addImages(event.target.files);event.currentTarget.value='';}}/></label><div className="fb-image-manager">{images.map((image,index) => <div key={image.id}><img src={image.src} alt={image.alt}/><span>{image.alt || `Image ${index+1}`}</span><button type="button" onClick={() => moveImage(index,-1)} disabled={!index}>↑</button><button type="button" onClick={() => moveImage(index,1)} disabled={index === images.length-1}>↓</button><button type="button" onClick={() => onChange('images',serializeContentArray(images.filter(item => item.id !== image.id)))} aria-label="Remove image"><Trash2 size={13}/></button></div>)}</div></div>;
    }
    case 'Form':
    case 'Contact Form': {
      const fields = parseContentArray<string>(value('fields'));
      const choices = ['Name','Email','Phone','Message','Dropdowns'];
      return <div className="fb-element-settings">{activeElement.type === 'Contact Form' && titleFields}<fieldset className="fb-field-toggle-group"><legend>Form fields</legend>{choices.map(field => <label className="fb-check-row" key={field}><input type="checkbox" checked={fields.includes(field)} onChange={event => onChange('fields',serializeContentArray(event.target.checked ? [...fields,field] : fields.filter(item => item !== field)))}/>{field}</label>)}</fieldset>{commonButton}<label>Success message<textarea value={value('successMessage')} onChange={event => onChange('successMessage',event.target.value)} placeholder="Shown after a successful submission"/></label><button type="button" className="fb-add-row-button" onClick={() => onChange('fields',serializeContentArray([...fields,'Dropdowns']))}><Plus size={13}/> Add dropdown field</button></div>;
    }
    case 'Testimonials': {
      const reviews=parseContentArray<Testimonial>(value('testimonials'));
      const updateReview=(index:number,patch:Partial<Testimonial>)=>onChange('testimonials',serializeContentArray(reviews.map((review,i)=>i===index?{...review,...patch}:review)));
      return <div className="fb-element-settings"><label>Section title<input value={value('title')} onChange={event=>onChange('title',event.target.value)} placeholder="Optional title"/></label>{reviews.map((review,index)=><article className="fb-manager-card" key={review.id}><div className="fb-manager-card-head"><b>Review {index+1}</b><button type="button" onClick={()=>onChange('testimonials',serializeContentArray(reviews.filter(item=>item.id!==review.id)))}><Trash2 size={13}/></button></div><label>Author name<input value={review.author} onChange={event=>updateReview(index,{author:event.target.value})} placeholder="Name"/></label><label>Role<input value={review.role} onChange={event=>updateReview(index,{role:event.target.value})} placeholder="Customer role"/></label><label>Quote<textarea value={review.quote} onChange={event=>updateReview(index,{quote:event.target.value})} placeholder="Customer review"/></label><label>Rating · {review.rating} stars<input type="range" min="1" max="5" value={review.rating} onChange={event=>updateReview(index,{rating:Number(event.target.value)})}/></label><label>Avatar image<input type="file" accept="image/*" onChange={event=>{const file=event.target.files?.[0];if(file)updateReview(index,{avatar:URL.createObjectURL(file)});}}/></label></article>)}<button type="button" className="fb-add-row-button" onClick={()=>onChange('testimonials',serializeContentArray([...reviews,{id:`review-${Date.now()}`,author:'',role:'',quote:'',rating:5,avatar:''}]))}><Plus size={13}/> Add testimonial</button></div>;
    }
    case 'Pricing':
    case 'Pricing Table':
    case 'Pricing Preview': {
      const plans=parseContentArray<PricePlan>(value('plans'));
      const updatePlan=(index:number,patch:Partial<PricePlan>)=>onChange('plans',serializeContentArray(plans.map((plan,i)=>i===index?{...plan,...patch}:plan)));
      return <div className="fb-element-settings">{titleFields}{plans.map((plan,index)=><article className="fb-manager-card" key={plan.id}><div className="fb-manager-card-head"><b>Plan {index+1}</b><button type="button" onClick={()=>onChange('plans',serializeContentArray(plans.filter(item=>item.id!==plan.id)))}><Trash2 size={13}/></button></div><label>Plan name<input value={plan.name} onChange={event=>updatePlan(index,{name:event.target.value})} placeholder="Plan name"/></label><div className="fb-price-config"><label>Price<input value={plan.price} onChange={event=>updatePlan(index,{price:event.target.value})} placeholder="0"/></label><label>Billing period<PopoverSelect value={plan.period || 'month'} options={['month','year','one-time']} onChange={period=>updatePlan(index,{period})}/></label></div><label>Features (one per line)<textarea value={plan.features.join('\n')} onChange={event=>updatePlan(index,{features:event.target.value.split('\n')})} placeholder="Included feature"/></label><label>CTA text<input value={plan.button} onChange={event=>updatePlan(index,{button:event.target.value})} placeholder="Choose plan"/></label><label className="fb-switch-setting"><input type="checkbox" checked={plan.highlighted} onChange={event=>updatePlan(index,{highlighted:event.target.checked})}/>Highlight this plan</label></article>)}<button type="button" className="fb-add-row-button" onClick={()=>onChange('plans',serializeContentArray([...plans,{id:`plan-${Date.now()}`,name:'',price:'',period:'month',features:[],button:'',highlighted:false}]))}><Plus size={13}/> Add pricing plan</button></div>;
    }
    case 'Booking':
      return <div className="fb-element-settings"><label>Connected calendar<PopoverSelect value={value('calendar')} options={['','Fitness consultation','Personal training','Nutrition coaching']} onChange={next=>onChange('calendar',next)}/></label><label>Service type<input value={value('serviceType')} onChange={event=>onChange('serviceType',event.target.value)} placeholder="Select or enter service"/></label><label>Time slots (comma separated)<textarea value={value('timeSlots')} onChange={event=>onChange('timeSlots',event.target.value)} placeholder="09:00, 10:30, 13:00"/></label><div className="fb-time-slot-preview">{value('timeSlots').split(',').filter(Boolean).map(slot=><span key={slot}>{slot.trim()}</span>)}</div>{commonButton}</div>;
    case 'Payment':
      return <div className="fb-element-settings"><label>Product<PopoverSelect value={value('productId')} options={['','Fitness coaching plan','Personal training pack','Nutrition guide']} onChange={next=>onChange('productId',next)}/></label><label>Payment gateway<PopoverSelect value={value('gateway','Stripe')} options={['Stripe','PayPal','Manual payment']} onChange={next=>onChange('gateway',next)}/></label><div className="fb-price-config"><label>Price<input type="number" min="0" step="0.01" value={value('price')} onChange={event=>onChange('price',event.target.value)} placeholder="0.00"/></label><label>Currency<PopoverSelect value={value('currency','€')} options={['€','$','£']} onChange={next=>onChange('currency',next)}/></label></div>{commonButton}</div>;
    case 'Button':
      return <div className="fb-element-settings">{commonButton}{actionFields}</div>;
    case 'Text':
    case 'Heading':
    case 'Paragraph':
      return <div className="fb-element-settings"><label>{activeElement.type === 'Heading' ? 'Heading text' : 'Text content'}<textarea value={value(activeElement.type === 'Heading' ? 'title' : 'body')} onChange={event=>onChange(activeElement.type === 'Heading' ? 'title' : 'body',event.target.value)} placeholder={activeElement.type === 'Heading' ? 'Add heading' : 'Type your content'}/></label>{activeElement.type === 'Heading' && <label>Supporting text (optional)<textarea value={value('body')} onChange={event=>onChange('body',event.target.value)} placeholder="Optional supporting copy"/></label>}<label>Text style<PopoverSelect value={value('headingTag',activeElement.type==='Heading'?'H2':'Paragraph')} options={['H1','H2','H3','Paragraph']} onChange={next=>onChange('headingTag',next)}/></label></div>;
    case 'Brand Story':
      return <div className="fb-element-settings">{titleFields}<label>Story image<input type="file" accept="image/*" onChange={event=>{const file=event.target.files?.[0];if(file)onChange('image',URL.createObjectURL(file));}}/></label><label>Image URL<input value={value('image')} onChange={event=>onChange('image',event.target.value)} placeholder="https://…"/></label><label>Image alt text<input value={value('alt')} onChange={event=>onChange('alt',event.target.value)} placeholder="Describe the image"/></label></div>;
    case 'Mission & Vision':
      return <div className="fb-element-settings"><label>Mission title<input value={value('title')} onChange={event=>onChange('title',event.target.value)} placeholder="Our mission"/></label><label>Mission<textarea value={value('body')} onChange={event=>onChange('body',event.target.value)} placeholder="Describe your mission"/></label><label>Vision title<input value={value('visionTitle')} onChange={event=>onChange('visionTitle',event.target.value)} placeholder="Our vision"/></label><label>Vision<textarea value={value('vision')} onChange={event=>onChange('vision',event.target.value)} placeholder="Describe your vision"/></label></div>;
    case 'Location & Hours':
      return <div className="fb-element-settings">{titleFields}<label>Address<input value={value('address')} onChange={event=>onChange('address',event.target.value)} placeholder="Business address"/></label><label>Opening hours<textarea value={value('hours')} onChange={event=>onChange('hours',event.target.value)} placeholder="Add opening hours"/></label></div>;
    case 'FAQ': {
      const questions=parseContentArray<{id:string;question:string;answer:string}>(value('questions'));
      const updateQuestion=(index:number,patch:Partial<(typeof questions)[number]>)=>onChange('questions',serializeContentArray(questions.map((entry,i)=>i===index?{...entry,...patch}:entry)));
      return <div className="fb-element-settings"><label>Section title<input value={value('title')} onChange={event=>onChange('title',event.target.value)} placeholder="Frequently asked questions"/></label>{questions.map((entry,index)=><article className="fb-manager-card" key={entry.id}><div className="fb-manager-card-head"><b>Question {index+1}</b><button type="button" onClick={()=>onChange('questions',serializeContentArray(questions.filter(item=>item.id!==entry.id)))}><Trash2 size={13}/></button></div><label>Question<input value={entry.question} onChange={event=>updateQuestion(index,{question:event.target.value})} placeholder="Write a question"/></label><label>Answer<textarea value={entry.answer} onChange={event=>updateQuestion(index,{answer:event.target.value})} placeholder="Write an answer"/></label></article>)}<button type="button" className="fb-add-row-button" onClick={()=>onChange('questions',serializeContentArray([...questions,{id:`faq-${Date.now()}`,question:'',answer:''}]))}><Plus size={13}/> Add question</button></div>;
    }
    case 'Hero':
      return <div className="fb-element-settings">{titleFields}{commonButton}{actionFields}</div>;
    case 'Section':
      return <div className="fb-element-settings">{titleFields}<div className="fb-settings-hint">This section is an empty layout container. Add child elements to populate it.</div></div>;
    default:
      return <div className="fb-element-settings">{titleFields}{activeElement.content.button !== undefined && commonButton}{activeElement.content.items !== undefined && <label>Items<textarea value={value('items')} onChange={event=>onChange('items',event.target.value)} placeholder="Add items"/></label>}{activeElement.content.specs !== undefined && <label>Features<textarea value={value('specs')} onChange={event=>onChange('specs',event.target.value)} placeholder="Add features"/></label>}</div>;
  }
}

function HistoryIcon() { return <Clock3 size={13}/>; }

function FunnelStepDropdown({ steps, activeId, onSelect, onDelete }: { steps: FunnelStep[]; activeId: string; onSelect: (step: FunnelStep) => void; onDelete: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null), trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    rootRef.current?.querySelector<HTMLElement>('[aria-checked="true"]')?.focus();
    const close = (event: MouseEvent) => { if (!rootRef.current?.contains(event.target as Node)) setOpen(false); };
    const escape = (event: KeyboardEvent) => { if(event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); setOpen(false); trigger.current?.focus(); } };
    document.addEventListener('mousedown', close); document.addEventListener('keydown',escape,true);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown',escape,true); };
  }, [open]);
  const activeStep = steps.find(step => step.id === activeId) ?? steps[0];
  return <div className="relative fb-step-selector" ref={rootRef}>
    <button ref={trigger} className="aw-select-trigger fb-step-trigger" type="button" aria-label="Select funnel step" aria-haspopup="menu" aria-expanded={open} onClick={()=>setOpen(!open)} onKeyDown={event=>{if(['ArrowDown','ArrowUp'].includes(event.key)){event.preventDefault();setOpen(true);}}}><span>{activeStep?.label}</span><ChevronDown size={13}/></button>
    {open && <div className="fb-step-popup" role="menu" aria-label="Funnel steps" onKeyDown={event=>{
      const items=Array.from(event.currentTarget.querySelectorAll<HTMLElement>('[role^="menuitem"]'));
      const index=items.indexOf(document.activeElement as HTMLElement);
      if(['ArrowDown','ArrowUp','Home','End'].includes(event.key)) {event.preventDefault(); const next=event.key==='Home'?0:event.key==='End'?items.length-1:(index+(event.key==='ArrowDown'?1:-1)+items.length)%items.length;items[next]?.focus();}
      if(event.key==='Tab')setOpen(false);
    }}>
      <b className="fb-step-popup-title">Pipeline steps</b>
      {steps.map((step,index)=><div className="fb-step-option-row" key={step.id}>
        <button type="button" role="menuitemradio" aria-checked={activeId===step.id} tabIndex={-1} onClick={()=>{onSelect(step);setOpen(false);trigger.current?.focus();}}><span>{index+1}</span><b>{step.label}</b>{activeId===step.id&&<Check size={13}/>}</button>
        {!['landing','lead-form','thank-you','booking','confirmation'].includes(step.id)&&<button type="button" role="menuitem" tabIndex={-1} aria-label={`Delete ${step.label}`} className="fb-step-delete" onClick={()=>onDelete(step.id)}><Trash2 size={13}/></button>}
      </div>)}
    </div>}
  </div>;
}

function PopoverSelect({value,options,onChange,className=''}:{value:string;options:string[];onChange:(value:string)=>void;className?:string}) { return <AssetSelect value={value} options={options} onChange={onChange} className={className}/>; }
