import { Crown } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from "@/modules/brand-engine/components/ui/popover";
import { useAppSelector } from "@/modules/brand-engine/store/hooks";
import "./WorkspaceAccount.css";

export function WorkspaceAccount() {
  const { userProfile, language } = useAppSelector((s) => s.brand);
  const isRtl = language === "ar";
  const name = userProfile?.displayName || userProfile?.email || (isRtl ? "المستخدم" : "User");
  const nameParts = name.trim().split(/\s+/);
  const initials = (nameParts.length > 1
    ? nameParts.map((part) => part[0]).slice(0, 2).join("")
    : name.substring(0, 2)).toUpperCase();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="workspace-account"
          aria-label={isRtl ? `حساب ${name}` : `Account for ${name}`}
          title={name}
        >
          <span className="workspace-account-avatar" aria-hidden="true">{initials}</span>
          <span className="workspace-account-copy">
            <strong>{name}</strong>
            <small>{isRtl ? "صاحب المشروع" : "Business Owner"}</small>
          </span>
          {userProfile?.tier && (
            <span className="workspace-account-tier" title={userProfile.tier}>
              <Crown aria-hidden="true" />
              <span>{userProfile.tier}</span>
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent side="top" align="start" sideOffset={8} className="workspace-account-menu" dir={isRtl ? "rtl" : "ltr"}>
        <strong>{name}</strong>
        {userProfile?.email && <span className="workspace-account-email">{userProfile.email}</span>}
        {userProfile?.tier && <span className="workspace-account-menu-tier">{userProfile.tier}</span>}
        <a href="/superadmin/">{isRtl ? "إعدادات الحساب" : "Account Settings"}</a>
      </PopoverContent>
    </Popover>
  );
}
