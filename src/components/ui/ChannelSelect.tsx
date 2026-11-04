import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check, Globe, Send, MessageCircle } from 'lucide-react';
import { useUILanguage, translateText, uiDirection } from '../../i18n/display';

export interface ChannelItem {
  id: string;
  name: string;
  subtitle: string;
  badgeColor: string;
  iconBg: string;
  icon: (props: { size?: number }) => React.ReactElement;
}

const WhatsAppIcon = ({ size = 15 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
  </svg>
);

const InstagramIcon = ({ size = 15 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
  </svg>
);

const MessengerIcon = ({ size = 15 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 2C6.5 2 2 6.1 2 11.2c0 2.9 1.5 5.5 3.8 7.2V22l3.4-1.9c.9.3 1.8.4 2.8.4 5.5 0 10-4.1 10-9.2S17.5 2 12 2z" />
    <path d="m8 13 3-3 2 2 3-3-3 3-2-2z" fill="currentColor" stroke="none" />
  </svg>
);

const WebChatIcon = ({ size = 15 }: { size?: number }) => (
  <Globe size={size} />
);

export const CHANNELS_CATALOG: readonly ChannelItem[] = [
  {
    id: 'webchat',
    name: 'Web Chat',
    subtitle: 'Live website chat widget',
    badgeColor: 'text-purple-600 dark:text-purple-400',
    iconBg: 'bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400',
    icon: WebChatIcon,
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    subtitle: 'Direct messaging & templates',
    badgeColor: 'text-emerald-600 dark:text-emerald-400',
    iconBg: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400',
    icon: WhatsAppIcon,
  },
  {
    id: 'instagram',
    name: 'Instagram Direct',
    subtitle: 'Direct messages & mentions',
    badgeColor: 'text-pink-600 dark:text-pink-400',
    iconBg: 'bg-pink-100 dark:bg-pink-950/60 text-pink-600 dark:text-pink-400',
    icon: InstagramIcon,
  },
  {
    id: 'messenger',
    name: 'Facebook Messenger',
    subtitle: 'Page inbox conversations',
    badgeColor: 'text-blue-600 dark:text-blue-400',
    iconBg: 'bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400',
    icon: MessengerIcon,
  },
];

export interface ChannelSelectProps {
  value: string;
  onChange: (channel: string) => void;
  disabled?: boolean;
  className?: string;
}

export function ChannelSelect({
  value,
  onChange,
  disabled = false,
  className = '',
}: ChannelSelectProps) {
  useUILanguage();
  const dir = uiDirection();
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number; width: number }>({
    top: 0,
    left: 0,
    width: 220,
  });

  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const selectedChannel = CHANNELS_CATALOG.find(c => c.id === value) || CHANNELS_CATALOG[0];
  const IconComp = selectedChannel.icon;

  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const width = Math.max(rect.width, 220);
    const spaceBelow = window.innerHeight - rect.bottom;
    const placeAbove = spaceBelow < 220 && rect.top > 220;

    setCoords({
      top: placeAbove ? Math.max(8, rect.top - 230) : rect.bottom + 4,
      left: dir === 'rtl' ? Math.max(8, rect.right - width) : Math.max(8, rect.left),
      width,
    });
  };

  useEffect(() => {
    if (open) {
      updatePosition();
      const onScrollOrResize = () => updatePosition();
      window.addEventListener('resize', onScrollOrResize);
      window.addEventListener('scroll', onScrollOrResize, true);
      return () => {
        window.removeEventListener('resize', onScrollOrResize);
        window.removeEventListener('scroll', onScrollOrResize, true);
      };
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (panelRef.current?.contains(target) || triggerRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [open]);

  const handleSelect = (id: string) => {
    onChange(id);
    setOpen(false);
    triggerRef.current?.focus();
  };

  return (
    <div className={`relative inline-block ${className}`} dir={dir}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => setOpen(prev => !prev)}
        className="flex items-center gap-2 h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-900/90 text-slate-800 dark:text-slate-100 text-xs font-medium hover:border-purple-300 dark:hover:border-purple-600 transition-colors shadow-2xs focus:outline-hidden focus:ring-2 focus:ring-purple-500/30 disabled:opacity-50 disabled:cursor-not-allowed min-w-[160px]"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 ${selectedChannel.iconBg}`}>
          <IconComp size={12} />
        </span>
        <span className="truncate flex-1 text-start font-semibold">
          {translateText(selectedChannel.name)}
        </span>
        <ChevronDown
          size={13}
          className={`text-slate-400 transition-transform shrink-0 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && typeof document !== 'undefined' && createPortal(
        <div
          ref={panelRef}
          style={{
            position: 'fixed',
            top: coords.top,
            left: coords.left,
            width: coords.width,
            zIndex: 9999,
          }}
          className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl overflow-hidden p-1 text-xs text-slate-800 dark:text-slate-100"
        >
          <div className="px-2 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
            {translateText("Select Channel")}
          </div>
          {CHANNELS_CATALOG.map(channel => {
            const ChannelIcon = channel.icon;
            const isSelected = channel.id === value;
            return (
              <button
                key={channel.id}
                type="button"
                onClick={() => handleSelect(channel.id)}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-start transition-colors ${
                  isSelected
                    ? 'bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 font-semibold'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                }`}
              >
                <span className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${channel.iconBg}`}>
                  <ChannelIcon size={13} />
                </span>
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="truncate font-semibold">{translateText(channel.name)}</span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal truncate">
                    {translateText(channel.subtitle)}
                  </span>
                </div>
                {isSelected && <Check size={14} className="text-purple-600 dark:text-purple-400 shrink-0" />}
              </button>
            );
          })}
        </div>,
        document.body
      )}
    </div>
  );
}
