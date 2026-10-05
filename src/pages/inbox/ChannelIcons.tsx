import React, { useId } from "react";
import type { ChannelId } from "./inboxData";

type IconProps = { size?: number; className?: string };

const useSvgId = (prefix: string) =>
  `${prefix}-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;

export const InstagramIcon: React.FC<IconProps> = ({ size = 16, className }) => {
  const id = useSvgId("ig");
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-hidden="true">
      <defs>
        <radialGradient id={id} cx="0.3" cy="1.05" r="1.25">
          <stop offset="0" stopColor="#FFD776" />
          <stop offset="0.25" stopColor="#F9A23A" />
          <stop offset="0.5" stopColor="#E1306C" />
          <stop offset="0.78" stopColor="#C13584" />
          <stop offset="1" stopColor="#5B51D8" />
        </radialGradient>
      </defs>
      <rect width="24" height="24" rx="7" fill={`url(#${id})`} />
      <rect x="5.8" y="5.8" width="12.4" height="12.4" rx="3.8" fill="none" stroke="#fff" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="2.95" fill="none" stroke="#fff" strokeWidth="1.8" />
      <circle cx="15.65" cy="8.35" r="1" fill="#fff" />
    </svg>
  );
};

export const FacebookIcon: React.FC<IconProps> = ({ size = 16, className }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-hidden="true">
    <circle cx="12" cy="12" r="12" fill="#1877F2" />
    <path
      fill="#fff"
      d="M13.45 24v-8.6h2.55l.4-3.05h-2.95v-1.9c0-.88.25-1.48 1.5-1.48h1.6V6.25a21 21 0 0 0-2.3-.12c-2.3 0-3.85 1.4-3.85 3.95v2.27H7.8v3.05h2.6V24z"
    />
  </svg>
);

export const WhatsAppIcon: React.FC<IconProps> = ({ size = 16, className }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-hidden="true">
    <circle cx="12" cy="12" r="12" fill="#25D366" />
    <path
      d="M12 5.1a6.9 6.9 0 0 0-5.95 10.4L5.1 18.9l3.5-.92A6.9 6.9 0 1 0 12 5.1z"
      fill="none"
      stroke="#fff"
      strokeWidth="1.55"
      strokeLinejoin="round"
    />
    <path
      fill="#fff"
      d="M9.55 8.8c.17-.38.35-.39.52-.4h.44c.15 0 .4.06.6.5l.6 1.43c.05.13.08.28 0 .44l-.37.5c-.12.14-.2.3-.06.52.33.55.75 1.05 1.24 1.45.55.45 1.1.74 1.45.86.2.07.33.04.45-.1l.55-.66c.13-.17.28-.17.45-.1l1.34.63c.18.09.3.14.34.22.05.12.05.66-.2 1.12-.26.47-1.02.9-1.6.94-.5.04-1.13.06-3.15-1.06-1.6-.9-2.65-2.55-2.86-2.95-.2-.38-.62-1.25-.62-2.14 0-.66.34-1.17.48-1.4z"
    />
  </svg>
);

export const MessengerIcon: React.FC<IconProps> = ({ size = 16, className }) => {
  const id = useSvgId("ms");
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0.15" y1="1" x2="0.85" y2="0">
          <stop offset="0" stopColor="#0866FF" />
          <stop offset="0.6" stopColor="#5B6CFF" />
          <stop offset="1" stopColor="#A259FF" />
        </linearGradient>
      </defs>
      <circle cx="12" cy="12" r="12" fill={`url(#${id})`} />
      <path
        fill="#fff"
        d="M12 5.2c-3.85 0-6.8 2.82-6.8 6.6 0 1.98.82 3.7 2.14 4.87v2.13l2.06-1.13c.83.23 1.7.35 2.6.35 3.85 0 6.8-2.82 6.8-6.6S15.85 5.2 12 5.2z"
      />
      <path fill="#2F6BFF" d="m8.2 13.85 2.22-3.52 1.68 1.3 2.62-1.42-2.22 3.52-1.68-1.3z" />
    </svg>
  );
};

export const WebChatIcon: React.FC<IconProps> = ({ size = 16, className }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-hidden="true">
    <rect width="24" height="24" rx="7" fill="#7C5CFC" />
    <path
      fill="#fff"
      d="M7.6 6.9h8.8a1.7 1.7 0 0 1 1.7 1.7v5.6a1.7 1.7 0 0 1-1.7 1.7h-4.6l-3.2 2.4v-2.4h-1a1.7 1.7 0 0 1-1.7-1.7V8.6a1.7 1.7 0 0 1 1.7-1.7z"
    />
    <circle cx="9.4" cy="11.4" r=".95" fill="#7C5CFC" />
    <circle cx="12" cy="11.4" r=".95" fill="#7C5CFC" />
    <circle cx="14.6" cy="11.4" r=".95" fill="#7C5CFC" />
  </svg>
);

const iconMap: Record<ChannelId, React.FC<IconProps>> = {
  instagram: InstagramIcon,
  facebook: FacebookIcon,
  whatsapp: WhatsAppIcon,
  messenger: MessengerIcon,
  webchat: WebChatIcon,
};

export const ChannelIcon: React.FC<IconProps & { channel: ChannelId }> = ({
  channel,
  ...props
}) => {
  const Icon = iconMap[channel];
  return <Icon {...props} />;
};
