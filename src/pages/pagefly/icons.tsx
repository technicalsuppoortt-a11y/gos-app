import type { SVGProps } from 'react';
import {
  Activity, Award, BadgeCheck, Bell, BookOpen, Briefcase, CalendarDays, Camera, Check, CircleCheck, Clock3, CreditCard, Dumbbell, Flame, Gift, Globe, GraduationCap,
  Headphones, Heart, House, Leaf, Lightbulb, Lock, Mail, MapPin, MessageCircle, Package, Phone, Rocket, RotateCcw, Send, Shield, ShieldCheck, ShoppingBag, ShoppingCart,
  Smile, Sparkles, Star, Stethoscope, Target, ThumbsUp, TrendingUp, Trophy, Truck, Users, Watch, Zap, ArrowRight, Play, Info, Coffee, Music,
} from 'lucide-react';

type BrandProps = SVGProps<SVGSVGElement> & { size?: number | string };
const brand = (path: string, viewBox = '0 0 24 24') => function BrandIcon({ size = 16, ...props }: BrandProps) {
  return <svg width={size} height={size} viewBox={viewBox} fill="currentColor" aria-hidden="true" {...props}><path d={path}/></svg>;
};

export const InstagramIcon = brand('M12 2.2c3.2 0 3.6 0 4.8.1 1.2.1 1.8.2 2.2.4.6.2 1 .5 1.4.9.4.4.7.8.9 1.4.2.4.4 1 .4 2.2.1 1.3.1 1.6.1 4.8s0 3.6-.1 4.8c-.1 1.2-.2 1.8-.4 2.2-.2.6-.5 1-.9 1.4-.4.4-.8.7-1.4.9-.4.2-1 .4-2.2.4-1.3.1-1.6.1-4.8.1s-3.6 0-4.8-.1c-1.2-.1-1.8-.2-2.2-.4-.6-.2-1-.5-1.4-.9-.4-.4-.7-.8-.9-1.4-.2-.4-.4-1-.4-2.2C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.8c.1-1.2.2-1.8.4-2.2.2-.6.5-1 .9-1.4.4-.4.8-.7 1.4-.9.4-.2 1-.4 2.2-.4C8.4 2.2 8.8 2.2 12 2.2Zm0 4.9a4.9 4.9 0 1 0 0 9.8 4.9 4.9 0 0 0 0-9.8Zm0 8.1a3.2 3.2 0 1 1 0-6.4 3.2 3.2 0 0 1 0 6.4Zm5.1-9.5a1.1 1.1 0 1 0 0 2.3 1.1 1.1 0 0 0 0-2.3Z');
export const FacebookIcon = brand('M13.5 21.9v-8.2h2.8l.4-3.2h-3.2V8.4c0-.9.3-1.6 1.6-1.6h1.7V4c-.3 0-1.3-.1-2.5-.1-2.5 0-4.2 1.5-4.2 4.3v2.4H7.3v3.2h2.8v8.2a10 10 0 1 1 3.4 0Z');
export const XIcon = brand('M17.8 3h3.1l-6.8 7.8L22 21h-6.2l-4.9-6.4L5.3 21H2.2l7.3-8.3L1.9 3h6.4l4.4 5.8L17.8 3Zm-1.1 16.2h1.7L7.4 4.7H5.6l11.1 14.5Z');
export const YoutubeIcon = brand('M23 7.2a3 3 0 0 0-2.1-2.1C19 4.6 12 4.6 12 4.6s-7 0-8.9.5A3 3 0 0 0 1 7.2 31 31 0 0 0 .5 12a31 31 0 0 0 .5 4.8 3 3 0 0 0 2.1 2.1c1.9.5 8.9.5 8.9.5s7 0 8.9-.5a3 3 0 0 0 2.1-2.1 31 31 0 0 0 .5-4.8 31 31 0 0 0-.5-4.8ZM9.7 15V9l5.8 3-5.8 3Z');
export const VimeoIcon = brand('M23 7.2c-.1 2.1-1.6 5-4.5 8.8-3 3.9-5.5 5.8-7.6 5.8-1.3 0-2.4-1.2-3.3-3.6L5.8 11.6c-.7-2.4-1.4-3.6-2.2-3.6-.2 0-.8.4-1.8 1.1L.8 7.7l3.3-3c1.5-1.3 2.6-2 3.3-2 1.8-.2 2.8 1 3.2 3.5.4 2.8.7 4.5.9 5.1.5 2.3 1.1 3.4 1.7 3.4.5 0 1.2-.8 2.2-2.3.9-1.5 1.5-2.7 1.5-3.5.1-1.3-.4-2-1.5-2-.5 0-1.1.1-1.6.4 1.1-3.5 3.1-5.2 6.1-5.1 2.2.1 3.3 1.5 3.1 4.3Z');
export const SoundcloudIcon = brand('M1 14.6c0 .1.1.2.2.2s.2-.1.2-.2l.3-1.9-.3-2c0-.1-.1-.2-.2-.2s-.2.1-.2.2L.8 12.7l.2 1.9Zm1.4 1.1c0 .1.1.2.2.2.1 0 .2-.1.2-.2l.4-3-.4-4.6c0-.1-.1-.2-.2-.2s-.2.1-.2.2l-.3 4.6.3 3Zm1.5.2c0 .2.1.3.3.3.1 0 .3-.1.3-.3l.3-3.2-.3-5.6c0-.2-.1-.3-.3-.3-.1 0-.3.1-.3.3l-.3 5.6.3 3.2Zm1.6 0c0 .2.2.3.3.3.2 0 .3-.1.3-.3l.3-3.2-.3-6.2c0-.2-.2-.3-.3-.3-.2 0-.3.1-.3.3l-.3 6.2.3 3.2Zm1.6 0c0 .2.2.4.4.4s.4-.2.4-.4l.3-3.2-.3-6.7c0-.2-.2-.4-.4-.4s-.4.2-.4.4l-.2 6.7.2 3.2Zm1.7 0c0 .2.2.4.4.4s.4-.2.4-.4l.2-3.2-.2-7.3c0-.2-.2-.4-.4-.4s-.4.2-.4.4l-.2 7.3.2 3.2Zm1.7 0c0 .3.2.4.4.4.3 0 .4-.2.4-.4l.2-3.2-.2-7.6c0-.3-.2-.4-.4-.4-.3 0-.4.2-.4.4l-.2 7.6.2 3.2Zm1.8-11.2c-.3 0-.5.2-.5.5l-.2 7.5.2 3.2c0 .3.2.5.5.5.2 0 .5-.2.5-.5l.2-3.2-.2-7.5c0-.3-.2-.5-.5-.5Zm1.6-.8c-.1-.1-.2-.1-.3-.1-.1 0-.2 0-.3.1-.2.1-.3.3-.3.5v.1l-.2 8.2.1 1.5.1 1.6c0 .3.3.6.6.6s.6-.3.6-.6l.2-3.1-.2-8.3c0-.2-.1-.4-.3-.5Zm7.1 4.4c-.5 0-1 .1-1.4.3A6.3 6.3 0 0 0 13.9 3c-.4 0-.8.1-1.1.2-.1.1-.2.2-.2.3v12.4c0 .1.1.3.3.3h8.3a3.2 3.2 0 0 0 0-6.4Z');
export const WhatsappIcon = brand('M20.5 3.5A11.8 11.8 0 0 0 1.9 17.7L.2 24l6.4-1.7a11.8 11.8 0 0 0 5.6 1.4c6.5 0 11.8-5.3 11.8-11.8 0-3.2-1.2-6.1-3.5-8.4ZM12.2 21.7a9.8 9.8 0 0 1-5-1.4l-.4-.2-3.8 1 1-3.7-.2-.4a9.8 9.8 0 1 1 8.4 4.7Zm5.4-7.3c-.3-.1-1.7-.9-2-1s-.5-.1-.7.1l-.9 1.2c-.2.2-.3.2-.6.1-.3-.1-1.2-.5-2.4-1.5-.9-.8-1.5-1.8-1.6-2.1-.2-.3 0-.5.1-.6l.4-.5.3-.5v-.5l-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.1.2 2.1 3.2 5.1 4.5 2.5 1 3 .8 3.6.8.6-.1 1.7-.7 2-1.4.2-.7.2-1.3.2-1.4-.1-.2-.3-.3-.6-.5Z');
export const TiktokIcon = brand('M16.6 5.8A4.3 4.3 0 0 1 15.5 3h-3.1v12.4a2.6 2.6 0 1 1-2.6-2.6c.3 0 .5 0 .8.1V9.7a5.8 5.8 0 1 0 5 5.7V9.1a7.4 7.4 0 0 0 4.3 1.4V7.4a4.3 4.3 0 0 1-3.3-1.6Z');
export const LinkedinIcon = brand('M20.4 20.5h-3.6v-5.6c0-1.3 0-3-1.8-3s-2.1 1.4-2.1 2.9v5.7H9.3V9h3.4v1.6c.5-.9 1.6-1.8 3.4-1.8 3.6 0 4.3 2.4 4.3 5.5v6.2ZM5.3 7.4a2.1 2.1 0 1 1 0-4.2 2.1 2.1 0 0 1 0 4.2ZM7.1 20.5H3.5V9h3.6v11.5ZM22.2 0H1.8C.8 0 0 .8 0 1.7v20.6c0 .9.8 1.7 1.8 1.7h20.4c1 0 1.8-.8 1.8-1.7V1.7C24 .8 23.2 0 22.2 0Z');

/** Icons available to the Icon element, Content list and buttons. */
export const ICONS: Record<string, React.ElementType> = {
  check: Check, 'check-circle': CircleCheck, star: Star, heart: Heart, sparkles: Sparkles, zap: Zap, trophy: Trophy, award: Award, badge: BadgeCheck,
  shield: Shield, 'shield-check': ShieldCheck, lock: Lock, truck: Truck, gift: Gift, package: Package, cart: ShoppingCart, bag: ShoppingBag, card: CreditCard,
  returns: RotateCcw, clock: Clock3, calendar: CalendarDays, phone: Phone, mail: Mail, send: Send, chat: MessageCircle, pin: MapPin, globe: Globe, home: House,
  users: Users, target: Target, rocket: Rocket, trending: TrendingUp, bulb: Lightbulb, book: BookOpen, grad: GraduationCap, briefcase: Briefcase,
  dumbbell: Dumbbell, flame: Flame, leaf: Leaf, activity: Activity, stethoscope: Stethoscope, smile: Smile, headphones: Headphones, watch: Watch,
  camera: Camera, music: Music, coffee: Coffee, bell: Bell, info: Info, play: Play, arrow: ArrowRight, thumbs: ThumbsUp,
  instagram: InstagramIcon, facebook: FacebookIcon, x: XIcon, youtube: YoutubeIcon, tiktok: TiktokIcon, linkedin: LinkedinIcon, whatsapp: WhatsappIcon,
};
export const ICON_NAMES = Object.keys(ICONS);

export function PFIcon({ name, size = 18, color, strokeWidth }: { name?: string; size?: number; color?: string; strokeWidth?: number }) {
  const Icon = ICONS[name ?? ''] ?? Star;
  return <Icon size={size} color={color} strokeWidth={strokeWidth} style={color ? { color } : undefined}/>;
}
