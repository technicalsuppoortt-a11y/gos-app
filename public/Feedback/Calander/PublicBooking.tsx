import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db, firestore } from "../config/firebase";
import { useAuth } from "../context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar as CalendarIcon,
  Clock,
  CheckCircle,
  XCircle,
  Globe,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Activity,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  X,
  Plus,
  Trash2,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import LoadingScreen from "../components/LoadingScreen";
import CalendarModal from "../components/CalendarModal";

const POPULAR_TIMEZONES = [
  "Africa/Cairo",
  "Asia/Riyadh",
  "Asia/Dubai",
  "Europe/London",
  "Europe/Paris",
  "Europe/Bucharest",
  "Europe/Istanbul",
  "America/New_York",
  "America/Los_Angeles",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
];

export default function PublicBooking() {
  const { userId, calendarId } = useParams<{ userId?: string; calendarId: string }>();
  const { isAdmin } = useAuth();
  const navigate = useNavigate();

  // ============================================================
  // STATE - All synced from Firestore
  // ============================================================
  const [calendar, setCalendar] = useState<any | null>(null);
  const [existingBookings, setExistingBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isTemplateLoading, setIsTemplateLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [successBooking, setSuccessBooking] = useState<any>(null);

  // UI States
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTimezone, setSelectedTimezone] = useState<string>(
    Intl.DateTimeFormat().resolvedOptions().timeZone,
  );
  const [isTzDropdownOpen, setIsTzDropdownOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [step, setStep] = useState<"select-slot" | "confirm-form">("select-slot");
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [companyName, setCompanyName] = useState("");
  const [brandLogo, setBrandLogo] = useState("");
  const [guestsList, setGuestsList] = useState<{ name: string; email: string }[]>([]);

  // Form States
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [source, setSource] = useState("");
  const [fromAd, setFromAd] = useState<boolean | null>(null);
  const [customAnswers, setCustomAnswers] = useState<Record<number, string>>({});
  const [selectedLocation, setSelectedLocation] = useState<any>(null);
  const [inviteeLocationText, setInviteeLocationText] = useState("");
  const [inviteePhoneCallText, setInviteePhoneCallText] = useState("");

  // Checkout / Payment Modal States
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [paymentCompleted, setPaymentCompleted] = useState(false);
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [cardName, setCardName] = useState("");
  const [reschedulingBookingId, setReschedulingBookingId] = useState<number | null>(null);

  // ============================================================
  // DURATION SYNC
  // ============================================================
  const [selectedDuration, setSelectedDuration] = useState<number>(30);

  const durationOptions = useMemo(() => {
    if (!calendar) return [{ id: 1, value: 30, isDefault: true }];
    return calendar.durationOptions || [{ id: 1, value: 30, isDefault: true }];
  }, [calendar]);

  useEffect(() => {
    if (calendar) {
      const defaultDur = (calendar.durationOptions || []).find((d: any) => d.isDefault);
      if (defaultDur) {
        setSelectedDuration(defaultDur.value);
      } else if (calendar.duration) {
        setSelectedDuration(calendar.duration);
      } else {
      }
      if (calendar.locationOptions && calendar.locationOptions.length > 0) {
        setSelectedLocation(calendar.locationOptions[0]);
      } else {
        setSelectedLocation(null);
      }
    }
  }, [calendar]);

  const getSelectedDayName = (dateStr: string) => {
    if (!dateStr) return "";
    try {
      const date = new Date(dateStr);
      const locale = currentLang === "ar" ? "ar-EG" : "en-US";
      return new Intl.DateTimeFormat(locale, { weekday: "long" }).format(date);
    } catch (e) {
      return "";
    }
  };

  // ============================================================
  // LANGUAGE & LAYOUT SYNC
  // ============================================================
  const [selectedLanguage, setSelectedLanguage] = useState<"ar" | "en" | null>(null);
  const queryParams = new URLSearchParams(window.location.search);
  const urlLang = queryParams.get("lang") as "ar" | "en" | null;
  const currentLang = selectedLanguage || urlLang || calendar?.language || "ar";
  const isRtl = currentLang === "ar";

  const translateText = (arabicText: string, englishText: string) =>
    isRtl ? arabicText : englishText;

  const formatPrice = (price: number, currency: string, priceType?: string) => {
    const formattedPrice = `${price || 0} ${currency || "USD"}`;
    if (!priceType || priceType === "fixed") {
      return formattedPrice;
    }
    if (priceType === "hourly") {
      return `${formattedPrice} / ${translateText("ساعة", "hour")}`;
    }
    if (priceType === "per_attendee") {
      return `${formattedPrice} / ${translateText("ضيف", "Guest")}`;
    }
    return formattedPrice;
  };

  const getHostDate = (dateStr: string, timeStr: string, timeZone: string) => {
    try {
      const [year, month, day] = dateStr.split("-").map(Number);
      const [hour, minute] = timeStr.split(":").map(Number);

      const date = new Date(Date.UTC(year, month - 1, day, hour, minute));

      const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone,
        year: "numeric",
        month: "numeric",
        day: "numeric",
        hour: "numeric",
        minute: "numeric",
        second: "numeric",
        hour12: false,
      });

      const parts = formatter.formatToParts(date);
      const tzYear = Number(parts.find((p) => p.type === "year")?.value);
      const tzMonth = Number(parts.find((p) => p.type === "month")?.value);
      const tzDay = Number(parts.find((p) => p.type === "day")?.value);
      const tzHour = Number(parts.find((p) => p.type === "hour")?.value);
      const tzMinute = Number(parts.find((p) => p.type === "minute")?.value);

      const tzDate = Date.UTC(tzYear, tzMonth - 1, tzDay, tzHour, tzMinute);
      const offsetMs = tzDate - date.getTime();

      return new Date(date.getTime() - offsetMs);
    } catch (e) {
      const [year, month, day] = dateStr.split("-").map(Number);
      const [hour, minute] = timeStr.split(":").map(Number);
      return new Date(year, month - 1, day, hour, minute);
    }
  };

  const getFormattedTimeInTimeZone = (date: Date, timeZone: string) => {
    try {
      return date.toLocaleTimeString(isRtl ? "ar" : "en-US", {
        timeZone,
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    } catch (e) {
      return date.toLocaleTimeString(isRtl ? "ar" : "en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    }
  };

  const getSelectedSlotDisplayTime = () => {
    if (!selectedSlot) return "";
    const [datePart, timePart] = selectedSlot.split("|");
    const hostTz = calendar?.hostTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
    const displayTz = calendar?.timezoneDisplay === "locked" ? hostTz : selectedTimezone;
    const slotDate = getHostDate(datePart, timePart, hostTz);
    return getFormattedTimeInTimeZone(slotDate, displayTz);
  };

  const getTimezoneFriendlyName = (tz: string) => {
    try {
      const formatter = new Intl.DateTimeFormat(isRtl ? "ar" : "en-US", {
        timeZone: tz,
        timeZoneName: "long",
      });
      const parts = formatter.formatToParts(new Date());
      const tzNamePart = parts.find((p) => p.type === "timeZoneName");
      return tzNamePart ? tzNamePart.value : tz;
    } catch (e) {
      return tz;
    }
  };

  const getTimezoneCurrentTime = (tz: string) => {
    try {
      const formatter = new Intl.DateTimeFormat(isRtl ? "ar" : "en-US", {
        timeZone: tz,
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
      return formatter.format(new Date());
    } catch (e) {
      return "";
    }
  };

  // ============================================================
  // SYNC STATUS
  // ============================================================
  const [syncStatus, setSyncStatus] = useState<"connecting" | "synced" | "error">("connecting");
  const [lastSyncedTime, setLastSyncedTime] = useState<string>("");
  const [showTroubleshoot, setShowTroubleshoot] = useState(false);
  // Template mode: split HTML parts (above/below the calendar section)
  const [templateHtmlAbove, setTemplateHtmlAbove] = useState<string | null>(null);
  const [templateHtmlBelow, setTemplateHtmlBelow] = useState<string | null>(null);
  const [buttonConfigs, setButtonConfigs] = useState<Record<string, any>>({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [iframeAboveHeight, setIframeAboveHeight] = useState(0);
  const [iframeBelowHeight, setIframeBelowHeight] = useState(0);

  // Builds a self-contained srcDoc string for an isolated template section iframe.
  // Injects the template's original <head> (styles, fonts) and an auto-height reporter script.
  const buildSrcDoc = (bodyContent: string, headContent: string, iframeId: string, bodyClass: string = "", tailContent: string = "", btnConfigs: any = {}): string => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  ${headContent}
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; overflow: hidden; }
  </style>
</head>
<body class="${bodyClass}">
${bodyContent}
${tailContent}
<script>
  const btnConfigs = ${JSON.stringify(btnConfigs)};
  // Auto-report height to parent so the iframe can grow/shrink naturally
  function reportHeight() {
    const h = document.body.scrollHeight;
    window.parent.postMessage({ type: 'TEMPLATE_IFRAME_HEIGHT', id: '${iframeId}', height: h }, '*');
  }
  reportHeight();
  new ResizeObserver(reportHeight).observe(document.body);
  document.addEventListener('click', function(e) {
    const btn = e.target.closest('button, a');
    if (!btn) return;
    const btnId = btn.getAttribute('data-resolved-cta-id') || btn.getAttribute('data-cta-id') || btn.id;
    
    const config = btnId ? btnConfigs[btnId] : null;
    if (config && config.actionType === 'keep_current') {
       return; // Retain default HTML template behavior without overriding
    }
    
    window.parent.postMessage({ type: 'TEMPLATE_CTA_CLICK', id: '${iframeId}', buttonId: btnId, href: btn.getAttribute('href'), tag: btn.tagName }, '*');
    if (btn.getAttribute('href') === '#' || btn.tagName === 'BUTTON') e.preventDefault();
  });
<\/script>
</body>
</html>`;

  // Splits raw template HTML at {{calendarElement}} or <section id="booking-calendar"> markers.
  // Returns [above, below, extractedCssText] so StandardBookingView renders natively between them.
  const splitTemplateHtml = (rawHtml: string, serviceName: string): { above: string; below: string; headHtml: string; bodyClass: string; tailHtml: string } => {
    const SENTINEL = "___BOOKING_CALENDAR_SPLIT_MARKER___";
    let html = rawHtml
      .replace(/\{\{calendarElement\}\}/g, SENTINEL)
      .replace(/\{\{BOOKING_CALENDAR_SECTION\}\}/g, SENTINEL)
      .replace(/\{\{serviceName\}\}/g, serviceName);

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // Collect ALL styles and links for the head
    const headElements = Array.from(doc.querySelectorAll('style, link'));
    const headHtml = headElements.map(el => el.outerHTML).join('\n');
  
    // Extract scripts to be injected at the end of the body
    const scriptElements = Array.from(doc.querySelectorAll('script'));
    const tailHtml = scriptElements.map(el => el.outerHTML).join('\n');

    // Extract template's body classes to maintain background colors / themes
    const bodyClass = doc.body.getAttribute('class') || "";

    // Strip <script> tags from body for security/rendering safely
    doc.body.querySelectorAll('script').forEach(s => s.remove());

    // If SENTINEL is not in HTML yet, target static calendar card elements and replace ONLY the card with SENTINEL
    if (!doc.body.innerHTML.includes(SENTINEL)) {
      // 1. Try explicit placeholders in case user pasted them as text
      if (doc.body.innerHTML.includes('<!--BOOKING_CALENDAR_SLOT-->') || doc.body.innerHTML.includes('&lt;!--BOOKING_CALENDAR_SLOT--&gt;')) {
         doc.body.innerHTML = doc.body.innerHTML
            .replace(/<!--\s*BOOKING_CALENDAR_SLOT\s*-->/gi, SENTINEL)
            .replace(/&lt;!--\s*BOOKING_CALENDAR_SLOT\s*--&gt;/gi, SENTINEL);
      } else {
          // 2. Find the booking section
          const bookingSection = doc.body.querySelector('section[id*="booking" i], section[id*="calendar" i], section[class*="booking" i], section[class*="calendar" i]');
          
          let staticCard = null;
          
          if (bookingSection) {
             // The card is usually a major block inside the booking section.
             const container = bookingSection.querySelector('.container, [class*="max-w"]') || bookingSection;
             
             // Look for specific card classes
             staticCard = container.querySelector('div[class*="calendar-card" i], div[class*="booking-card" i], div[id*="calendar" i]:not(section), div[class*="booking-widget" i]');
             
             if (!staticCard) {
                // Heuristic: The last block-level child of the container is usually the calendar card
                const childDivs = Array.from(container.children).filter(el => el.tagName === 'DIV');
                if (childDivs.length > 0) {
                    staticCard = childDivs[childDivs.length - 1];
                }
             }
          } else {
             // Fallback if no booking section found:
             // Find any large div containing calendar indicators
             const allDivs = Array.from(doc.body.querySelectorAll('div'));
             staticCard = allDivs.find(div => 
                 (div.classList.contains('bg-white') || (div.className && div.className.includes('bg-['))) &&
                 (div.textContent?.includes('am') || div.textContent?.includes('pm') || div.textContent?.includes('12:00') || div.textContent?.includes('أغسطس') || div.textContent?.includes('August') || div.textContent?.includes('متاح')) &&
                 !div.querySelector('section') // ensure it's not a huge wrapper
             );
          }

          if (staticCard) {
              staticCard.outerHTML = SENTINEL;
          }
      }
    }

    let bodyHtml = doc.body.innerHTML;

    // Auto-insert sentinel before <footer> if not explicitly placed
    if (!bodyHtml.includes(SENTINEL)) {
      const footerMatch = bodyHtml.match(/<footer[\s>]/i);
      if (footerMatch && footerMatch.index !== undefined) {
        bodyHtml =
          bodyHtml.slice(0, footerMatch.index) +
          SENTINEL +
          bodyHtml.slice(footerMatch.index);
      } else {
        return { above: bodyHtml, below: "", headHtml, bodyClass, tailHtml };
      }
    }

    const idx = bodyHtml.indexOf(SENTINEL);
    return {
      above: bodyHtml.slice(0, idx),
      below: bodyHtml.slice(idx + SENTINEL.length),
      headHtml,
      bodyClass,
      tailHtml
    };
  };


  const [templateHeadHtml, setTemplateHeadHtml] = useState<string>("");
  const [templateTailHtml, setTemplateTailHtml] = useState<string>("");
  const [templateBodyClass, setTemplateBodyClass] = useState<string>("");

  useEffect(() => {
    if (loading) return;

    const urlTemplateId = queryParams.get("templateId");
    const activeTemplateId = urlTemplateId || calendar?.templateSettings?.previewTemplateId;

    if ((calendar?.templateSettings?.previewMode === "template" || urlTemplateId) && activeTemplateId) {
      setIsTemplateLoading(true);
      const fetchTemplate = async () => {
        try {
          let data = null;

          const docRefPartner = firestore.doc(db, "partnerLandingPages", activeTemplateId);
          const docSnapPartner = await firestore.getDoc(docRefPartner);

          if (docSnapPartner.exists()) {
            data = docSnapPartner.data();
          } else {
            const docRefSystem = firestore.doc(db, "systemTemplates", activeTemplateId);
            const docSnapSystem = await firestore.getDoc(docRefSystem);
            if (docSnapSystem.exists()) {
              data = docSnapSystem.data();
            }
          }

          if (data) {
            const { above, below, headHtml, bodyClass, tailHtml } = splitTemplateHtml(
              data.htmlCode || "",
              calendar?.name || ""
            );
            setTemplateHtmlAbove(above);
            setTemplateHtmlBelow(below);
            setTemplateHeadHtml(headHtml);
            setTemplateTailHtml(tailHtml);
            setTemplateBodyClass(bodyClass);
            if (data.buttonConfigs) setButtonConfigs(data.buttonConfigs);
          }
          setIsTemplateLoading(false);
        } catch (err) {
          setIsTemplateLoading(false);
          console.error("Failed to load template", err);
        }
      };
      fetchTemplate();
    } else {
      setTemplateHtmlAbove(null);
      setTemplateHtmlBelow(null);
      setTemplateHeadHtml("");
      setTemplateTailHtml("");
      setTemplateBodyClass("");
      setIsTemplateLoading(false);
    }
  }, [calendar, loading]);

  // Listen for postMessages from both isolated template iframes (height + CTA clicks)
  useEffect(() => {
    const handler = (ev: MessageEvent) => {
      if (!ev.data || typeof ev.data !== 'object') return;

      if (ev.data.type === 'TEMPLATE_IFRAME_HEIGHT') {
        if (ev.data.id === 'template-above') setIframeAboveHeight(ev.data.height);
        if (ev.data.id === 'template-below') setIframeBelowHeight(ev.data.height);
        return;
      }

      if (ev.data.type === 'TEMPLATE_CTA_CLICK') {
        const { buttonId, href, tag } = ev.data;
        const config = buttonId ? buttonConfigs?.[buttonId] : null;

        if (config?.actionType === 'scroll_to_calendar') {
          document.getElementById('booking-calendar-section')?.scrollIntoView({ behavior: 'smooth' });
          return;
        }
        if (config?.actionType === 'external_url' && config.targetUrl) {
          window.open(config.targetUrl, config.openInNewTab !== false ? '_blank' : '_self');
          return;
        }
        if (config?.actionType === 'keep_current') {
          return;
        }
        if (config?.actionType === 'open_modal') {
          setIsModalOpen(true);
          return;
        }
        if (config?.actionType === 'whatsapp' && config.phoneNumber) {
          window.open(`https://wa.me/${config.phoneNumber.replace(/[^0-9]/g, '')}`, '_blank');
          return;
        }
        if (config?.actionType === 'phone_call' && config.phoneNumber) {
          window.location.href = `tel:${config.phoneNumber}`;
          return;
        }
        // Default: unconfigured buttons now keep their current state.
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [buttonConfigs]);

  const handleTemplateClick = (e: any) => {
    // 1. Find the target button or anchor tag
    const target = e.target as HTMLElement;
    const buttonEl = target.closest('button, a');
    if (!buttonEl) return;

    // 2. Identify the button ID
    const buttonId = 
      buttonEl.getAttribute('data-resolved-cta-id') || 
      buttonEl.getAttribute('data-cta-id') || 
      buttonEl.id || 
      buttonEl.getAttribute('data-auto-id');

    const config = buttonId ? buttonConfigs?.[buttonId] : null;

    // 3. Handle configured actions cleanly
    if (config) {
      if (config.actionType === 'external_url' && config.targetUrl) {
        e.preventDefault();
        e.stopPropagation();
        window.open(config.targetUrl, config.openInNewTab !== false ? '_blank' : '_self');
        return;
      }

      if (config.actionType === 'scroll_to_calendar') {
        e.preventDefault();
        e.stopPropagation();
        const doc = target.ownerDocument || document;
        const calEl = doc.getElementById('partner-booking-section') || doc.getElementById('calendar-injection-point');
        calEl?.scrollIntoView({ behavior: 'smooth' });
        return;
      }

      if (config.actionType === 'whatsapp' && config.phoneNumber) {
        e.preventDefault();
        e.stopPropagation();
        const cleanedNumber = config.phoneNumber.replace(/[^0-9]/g, '');
        window.open(`https://wa.me/${cleanedNumber}`, '_blank');
        return;
      }
      
      if (config.actionType === 'phone_call' && config.phoneNumber) {
        e.preventDefault();
        e.stopPropagation();
        window.location.href = `tel:${config.phoneNumber}`;
        return;
      }

      if (config.actionType === 'keep_current') {
        return;
      }
      
      if (config.actionType === 'open_modal') {
        e.preventDefault();
        e.stopPropagation();
        setIsModalOpen(true);
        return;
      }
    }

    // Default: unconfigured buttons now keep their current state.
  };

  // ============================================================
  // PASSWORD SYNC
  // ============================================================
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordAuthorized, setPasswordAuthorized] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // ============================================================
  // REAL-TIME LISTENERS
  // ============================================================
  useEffect(() => {
    if (!calendarId) return;

    setLoading(true);
    setSyncStatus("connecting");

    let unsubCalendar: (() => void) | null = null;
    let unsubBookings: (() => void) | null = null;

    const setupCalendarListener = () => {
      const numericId = Number(calendarId);
      const calendarQuery = firestore.query(
        firestore.collection(db, "calendars"),
        isNaN(numericId)
          ? firestore.where("slug", "==", calendarId)
          : firestore.where("id", "==", numericId),
      );

      return firestore.onSnapshot(
        calendarQuery,
        (querySnap) => {
          if (!querySnap.empty) {
            const data = querySnap.docs[0].data();
            setCalendar(data);
            setSyncStatus("synced");
            setLastSyncedTime(new Date().toLocaleTimeString());

            if (data.id) {
              if (unsubBookings) unsubBookings();
              unsubBookings = setupBookingsListener(data.id);
            }
          } else {
            const directRef = firestore.doc(
              db,
              "calendars",
              `calendar-${calendarId}-${userId || ""}`,
            );
            firestore
              .getDoc(directRef)
              .then((snap) => {
                if (snap.exists()) {
                  const data = snap.data();
                  setCalendar(data);
                  setSyncStatus("synced");
                  if (data.id) {
                    unsubBookings = setupBookingsListener(data.id);
                  }
                } else {
                  setSyncStatus("error");
                }
              })
              .catch(() => setSyncStatus("error"));
          }
          setLoading(false);
        },
        (error) => {
          console.error("Calendar listener error:", error);
          setSyncStatus("error");
          setLoading(false);
        },
      );
    };

    const setupBookingsListener = (calId: number) => {
      const qBookings = firestore.query(
        firestore.collection(db, "bookings"),
        firestore.where("calendarId", "==", Number(calId)),
      );

      return firestore.onSnapshot(
        qBookings,
        (snap) => {
          const bookingsList = snap.docs.map((d: any) => d.data());
          setExistingBookings(bookingsList);
          setLastSyncedTime(new Date().toLocaleTimeString());
          setSyncStatus("synced");
        },
        (error) => {
          console.error("Bookings listener error:", error);
          setSyncStatus("error");
        },
      );
    };

    unsubCalendar = setupCalendarListener();

    return () => {
      if (unsubCalendar) unsubCalendar();
      if (unsubBookings) unsubBookings();
    };
  }, [calendarId, userId]);

  useEffect(() => {
    const ownerUid = calendar?.userId || userId || "";
    if (!ownerUid) return;

    const fetchBrand = async () => {
      try {
        const settingsRef = firestore.doc(db, "settings", ownerUid);
        const settingsSnap = await firestore.getDoc(settingsRef);
        if (settingsSnap.exists()) {
          const sData = settingsSnap.data();
          if (sData?.companyName) setCompanyName(sData.companyName);
          if (sData?.avatarDataUrl) setBrandLogo(sData.avatarDataUrl);
          if (sData?.companyName) return;
        }

        const userRef = firestore.doc(db, "users", ownerUid);
        const userSnap = await firestore.getDoc(userRef);
        if (userSnap.exists()) {
          const uData = userSnap.data();
          if (uData?.name) {
            setCompanyName(`${uData.name}'s Brand`);
          }
          if (uData?.photoURL) {
            setBrandLogo(uData.photoURL);
          }
          return;
        }
      } catch (e) {
        console.warn("Failed to fetch brand name:", e);
      }
    };

    fetchBrand();
  }, [calendar?.userId, userId]);

  // ============================================================
  // BOOKING LIMITS CHECKERS
  // ============================================================
  const isBookingLimitExceeded = (dateStr: string) => {
    if (!calendar || !calendar.bookingLimits || calendar.bookingLimits.length === 0) return false;

    const [y, mo, d] = dateStr.split("-").map(Number);
    const targetDate = new Date(y, mo - 1, d);

    for (const limit of calendar.bookingLimits) {
      if (limit.scope === "all") {
        let count = 0;
        if (limit.period === "day") {
          count = existingBookings.filter(
            (b) => b.date === dateStr && b.status !== "Cancelled",
          ).length;
        } else if (limit.period === "week") {
          const startOfWeek = new Date(targetDate);
          startOfWeek.setDate(targetDate.getDate() - targetDate.getDay());
          const endOfWeek = new Date(startOfWeek);
          endOfWeek.setDate(startOfWeek.getDate() + 6);

          const startStr = `${startOfWeek.getFullYear()}-${String(startOfWeek.getMonth() + 1).padStart(2, "0")}-${String(startOfWeek.getDate()).padStart(2, "0")}`;
          const endStr = `${endOfWeek.getFullYear()}-${String(endOfWeek.getMonth() + 1).padStart(2, "0")}-${String(endOfWeek.getDate()).padStart(2, "0")}`;

          count = existingBookings.filter(
            (b) => b.date >= startStr && b.date <= endStr && b.status !== "Cancelled",
          ).length;
        } else if (limit.period === "month") {
          const monthStr = dateStr.substring(0, 7); // "YYYY-MM"
          count = existingBookings.filter(
            (b) => b.date.startsWith(monthStr) && b.status !== "Cancelled",
          ).length;
        } else if (limit.period === "total") {
          count = existingBookings.filter((b) => b.status !== "Cancelled").length;
        }

        const limitVal =
          Number(limit.limit) !== undefined && !isNaN(Number(limit.limit))
            ? Number(limit.limit)
            : Number(limit.value) || 0;

        if (count >= limitVal) {
          return true;
        }
      }
    }
    return false;
  };

  const isEmailLimitExceeded = (emailVal: string, dateStr: string) => {
    if (!calendar || !calendar.bookingLimits || calendar.bookingLimits.length === 0) return false;

    const [y, mo, d] = dateStr.split("-").map(Number);
    const targetDate = new Date(y, mo - 1, d);
    const emailClean = emailVal.trim().toLowerCase();
    if (!emailClean) return false;

    for (const limit of calendar.bookingLimits) {
      if (limit.scope === "email") {
        let count = 0;
        if (limit.period === "day") {
          count = existingBookings.filter(
            (b) =>
              b.date === dateStr &&
              b.email?.toLowerCase() === emailClean &&
              b.status !== "Cancelled",
          ).length;
        } else if (limit.period === "week") {
          const startOfWeek = new Date(targetDate);
          startOfWeek.setDate(targetDate.getDate() - targetDate.getDay());
          const endOfWeek = new Date(startOfWeek);
          endOfWeek.setDate(startOfWeek.getDate() + 6);

          const startStr = `${startOfWeek.getFullYear()}-${String(startOfWeek.getMonth() + 1).padStart(2, "0")}-${String(startOfWeek.getDate()).padStart(2, "0")}`;
          const endStr = `${endOfWeek.getFullYear()}-${String(endOfWeek.getMonth() + 1).padStart(2, "0")}-${String(endOfWeek.getDate()).padStart(2, "0")}`;

          count = existingBookings.filter(
            (b) =>
              b.date >= startStr &&
              b.date <= endStr &&
              b.email?.toLowerCase() === emailClean &&
              b.status !== "Cancelled",
          ).length;
        } else if (limit.period === "month") {
          const monthStr = dateStr.substring(0, 7);
          count = existingBookings.filter(
            (b) =>
              b.date.startsWith(monthStr) &&
              b.email?.toLowerCase() === emailClean &&
              b.status !== "Cancelled",
          ).length;
        } else if (limit.period === "total") {
          count = existingBookings.filter(
            (b) => b.email?.toLowerCase() === emailClean && b.status !== "Cancelled",
          ).length;
        }

        const limitVal =
          Number(limit.limit) !== undefined && !isNaN(Number(limit.limit))
            ? Number(limit.limit)
            : Number(limit.value) || 0;

        if (count >= limitVal) {
          return true;
        }
      }
    }
    return false;
  };

  // ============================================================
  // SLOT RECALCULATION - FIXED
  // ============================================================
  // ============================================================
  // SLOT RECALCULATION - FIXED WITH TROUBLESHOOTING REASONS
  // ============================================================
  const getAvailableTimesForDate = (
    dateStr: string,
  ): {
    time: string;
    isBooked: boolean;
    displayTime: string;
    reason?: string;
    spotsLeft: number;
  }[] => {
    if (!calendar) return [];

    const hostTz = calendar.hostTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
    const displayTz = calendar.timezoneDisplay === "locked" ? hostTz : selectedTimezone;

    // Check booking limits (scope: all)
    const isLimitExceeded = isBookingLimitExceeded(dateStr);

    // Check fixedDateRange
    const isOutsideFixedRange = !!(
      calendar.fixedDateRange?.start &&
      calendar.fixedDateRange?.end &&
      (dateStr < calendar.fixedDateRange.start || dateStr > calendar.fixedDateRange.end)
    );

    // Parse dateStr ("YYYY-MM-DD") in the host's timezone
    const [y, mo, d] = dateStr.split("-").map(Number);
    const targetDate = getHostDate(dateStr, "00:00", hostTz);

    // 2. Check maxAdvanceBooking
    const maxDays = Number(calendar.maxAdvanceBooking) || 60;
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + maxDays);
    maxDate.setHours(23, 59, 59, 999);

    const todayStr = new Date().toISOString().split("T")[0];
    const isPastDate = dateStr < todayStr;
    const isExceedingAdvance = targetDate > maxDate;

    // 3. Check day availability
    const daysOfWeek = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    const dayName = daysOfWeek[targetDate.getDay()];

    // Resolve availability intervals for this date
    let intervalsWasEmpty = false;
    let intervals: { start: string; end: string }[] = [];
    const specificDateEntries = (calendar.specificDateAvailability || []).filter((entry: any) => {
      if (!entry.date) return false;
      if (entry.date.includes("_to_")) {
        const [start, end] = entry.date.split("_to_");
        return dateStr >= start && dateStr <= end;
      }
      return entry.date === dateStr;
    });

    if (specificDateEntries && specificDateEntries.length > 0) {
      intervals = specificDateEntries.map((e: any) => ({ start: e.start, end: e.end }));
    } else {
      const avail = (calendar.availability || []).find((a: any) => a.day === dayName);
      if (avail && avail.enabled) {
        intervals.push({ start: avail.start || "10:00", end: avail.end || "18:00" });
      }
      const additionalEntries = (calendar.additionalWeekdayAvailability || []).filter(
        (entry: any) => {
          const day = entry.day;
          if (day === "Every day") return true;
          if (day === "Mon - Fri") {
            return ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"].includes(dayName);
          }
          if (day === "Sat - Sun") {
            return ["Saturday", "Sunday"].includes(dayName);
          }
          return day === dayName;
        },
      );
      if (additionalEntries && additionalEntries.length > 0) {
        intervals.push(...additionalEntries.map((e: any) => ({ start: e.start, end: e.end })));
      }
    }

    if (intervals.length === 0) {
      intervalsWasEmpty = true;
      if (showTroubleshoot) {
        intervals.push({ start: "10:00", end: "18:00" });
      } else {
        return [];
      }
    }

    // Generate slots
    const times: {
      time: string;
      isBooked: boolean;
      displayTime: string;
      reason?: string;
      spotsLeft: number;
    }[] = [];
    const duration = selectedDuration || calendar.duration || 30;
    const increment =
      calendar.startIncrement === "use-duration" ? duration : Number(calendar.startIncrement) || 30;

    const now = new Date();
    const minNoticeMin = Number(calendar.minNotice) || 0;
    const cutoffTime = new Date(now.getTime() + minNoticeMin * 60 * 1000);

    intervals.forEach(({ start, end }) => {
      const [startH, startM] = start.split(":").map(Number);
      const [endH, endM] = end.split(":").map(Number);

      const startMinutes = startH * 60 + startM;
      const endMinutes = endH * 60 + endM;

      for (let m = startMinutes; m + duration <= endMinutes; m += increment) {
        const h = Math.floor(m / 60);
        const mins = m % 60;
        const timeStr = `${String(h).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;

        const slotDate = getHostDate(dateStr, timeStr, hostTz);

        let isBooked = false;
        let reason: string | undefined = undefined;

        const slotBookings = existingBookings.filter(
          (b) => b.date === dateStr && b.time === timeStr && b.status !== "Cancelled",
        );
        const maxSpots = Number(calendar.groupCapacity) || Number(calendar.groupMax) || 1;
        const spotsLeft = Math.max(0, maxSpots - slotBookings.length);

        // Check if slot falls in any conflict categories:
        if (isOutsideFixedRange) {
          isBooked = true;
          reason = "FIXED_DATE";
        } else if (isExceedingAdvance) {
          isBooked = true;
          reason = "MAX_ADVANCE";
        } else if (isPastDate) {
          isBooked = true;
          reason = "AVAILABILITY";
        } else if (isLimitExceeded) {
          isBooked = true;
          reason = "LIMIT";
        } else if (intervalsWasEmpty || slotDate <= cutoffTime) {
          isBooked = true;
          reason = "AVAILABILITY";
        }

        // Check breaks (date-specific or recurring)
        if (!isBooked) {
          let isDuringBreak = false;
          if (calendar.breaks && calendar.breaks.length > 0) {
            isDuringBreak = calendar.breaks.some((br: any) => {
              if (br.date && br.date !== dateStr) return false;
              const [bhStart, bmStart] = (br.start || "00:00").split(":").map(Number);
              const [bhEnd, bmEnd] = (br.end || "00:00").split(":").map(Number);
              const breakStart = bhStart * 60 + bmStart;
              const breakEnd = bhEnd * 60 + bmEnd;
              const slotStart = m;
              const slotEnd = m + duration;
              return slotStart < breakEnd && slotEnd > breakStart;
            });
          }
          if (isDuringBreak) {
            isBooked = true;
            reason = "BREAK";
          }
        }

        // Check existing bookings (Exact Conflict -> BOOKING)
        if (!isBooked) {
          if (spotsLeft <= 0) {
            isBooked = true;
            reason = "BOOKING";
          }
        }

        // Check Duration Overlaps (Starts at different time but overlaps duration -> DURATION)
        if (!isBooked) {
          const hasDurationOverlap = existingBookings.some((b) => {
            if (b.date !== dateStr || b.status === "Cancelled") return false;
            const bDuration = Number(b.duration) || Number(calendar.duration) || 30;
            const [bh, bm] = b.time.split(":").map(Number);
            const bookingStart = bh * 60 + bm;
            const bookingEnd = bookingStart + bDuration;
            const slotStart = m;
            const slotEnd = m + duration;
            if (slotStart === bookingStart) return false;
            return slotStart < bookingEnd && slotEnd > bookingStart;
          });
          if (hasDurationOverlap) {
            isBooked = true;
            reason = "DURATION";
          }
        }

        // Check Buffer Conflicts (Within buffer bounds of another booking -> BUFFER)
        if (!isBooked && calendar.bufferTime && calendar.bufferTime > 0) {
          const buffer = calendar.bufferTime;
          const conflictsWithBuffer = existingBookings.some((b) => {
            if (b.date !== dateStr || b.status === "Cancelled") return false;
            const bDuration = Number(b.duration) || Number(calendar.duration) || 30;
            const [bh, bm] = b.time.split(":").map(Number);
            const bookingStart = bh * 60 + bm;
            const bookingEnd = bookingStart + bDuration;
            const slotStart = m;
            const slotEnd = m + duration;
            return slotStart < bookingEnd + buffer && slotEnd > bookingStart - buffer;
          });
          if (conflictsWithBuffer) {
            isBooked = true;
            reason = "BUFFER";
          }
        }

        if (!isBooked || calendar.grayOutBusy || showTroubleshoot) {
          const displayTime = getFormattedTimeInTimeZone(slotDate, displayTz);
          times.push({ time: timeStr, isBooked, displayTime, reason, spotsLeft });
        }
      }
    });

    // 8. Look Busy - hide/gray out random slots
    if (calendar.lookBusy?.enabled && times.length > 0) {
      const seed = dateStr.split("-").reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const randomPct = ((seed % 20) + (calendar.lookBusy.min || 20)) / 100;
      const slotsToHideCount = Math.floor(times.length * randomPct);

      const hideIndices = new Set<number>();
      for (let i = 0; i < slotsToHideCount; i++) {
        const hideIndex = (seed + i) % times.length;
        if (!calendar.grayOutBusy && !showTroubleshoot && hideIndices.size >= times.length - 1)
          break;
        hideIndices.add(hideIndex);
      }

      times.forEach((t, idx) => {
        if (hideIndices.has(idx)) {
          t.isBooked = true;
          if (!t.reason) {
            t.reason = "BUSY";
          }
        }
      });
    }

    if (!calendar.grayOutBusy && !showTroubleshoot) {
      return times.filter((t) => !t.isBooked);
    }

    return times;
  };

  // ============================================================
  // TIMEZONE WIDGET RENDERER FOR SLOTS & FORM SIDE
  // ============================================================
  const renderTimezoneWidget = () => {
    if (!calendar || calendar.showTimezone === false) return null;

    const hostTz = calendar.hostTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
    const currentTz = calendar.timezoneDisplay === "locked" ? hostTz : selectedTimezone;

    return (
      <div className="relative flex flex-col items-center z-[20] mb-4">
        <button
          type="button"
          disabled={calendar.timezoneDisplay === "locked"}
          onClick={() => setIsTzDropdownOpen(!isTzDropdownOpen)}
          className={`flex items-center gap-1.5 text-[11px] text-slate-655 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors bg-white dark:bg-slate-950 px-3 py-1.5 rounded-full border border-slate-205 dark:border-slate-800 shadow-sm ${
            calendar.timezoneDisplay !== "locked" ? "cursor-pointer" : "cursor-default"
          }`}
        >
          <Globe className="w-3.5 h-3.5 text-purple-500" />
          <span className="max-w-[300px] truncate font-semibold">
            {getTimezoneFriendlyName(currentTz)} ({getTimezoneCurrentTime(currentTz)})
          </span>
          {calendar.timezoneDisplay !== "locked" && (
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform duration-200 ${isTzDropdownOpen ? "rotate-180" : ""}`}
            />
          )}
        </button>

        {isTzDropdownOpen && calendar.timezoneDisplay !== "locked" && (
          <div className="absolute top-8 left-1/2 -translate-x-1/2 z-[100] w-64 bg-white border border-gray-300 rounded-xl shadow-2xl p-2 flex flex-col">
            <div className="text-[10px] text-gray-500 px-2 py-1 border-b border-gray-200 mb-1 text-center font-bold">
              {translateText("اختيار المنطقة الزمنية", "Select Timezone")}
            </div>
            <div
              className="-mr-4 mt-1 flex h-full max-h-48 flex-col overflow-y-scroll pr-2 pt-1 md:h-auto"
              aria-hidden="true"
              inert={!isTzDropdownOpen}
            >
              <ul aria-label="time" className="m-0 flex list-none flex-col p-0">
                {POPULAR_TIMEZONES.map((tz) => (
                  <li
                    key={tz}
                    className="relative first:mt-0 w-full border mt-2 border-gray-300 hover:border-gray-400 bg-white text-gray-600 text-base rounded"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTimezone(tz);
                        setIsTzDropdownOpen(false);
                      }}
                      className="font-light w-full rounded py-3 text-center hover:bg-gray-100 cursor-pointer text-xs text-gray-700 font-semibold"
                    >
                      {tz}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ============================================================
  // SET FIRST AVAILABLE DATE
  // ============================================================
  useEffect(() => {
    if (calendar && existingBookings.length >= 0) {
      const now = new Date();

      for (let i = 0; i < 60; i++) {
        const d = new Date();
        d.setDate(now.getDate() + i);

        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const dateDay = String(d.getDate()).padStart(2, "0");
        const dateStr = `${year}-${month}-${dateDay}`;

        const times = getAvailableTimesForDate(dateStr);
        if (times.some((t) => !t.isBooked)) {
          setSelectedDate(dateStr);
          setCurrentYear(d.getFullYear());
          setCurrentMonth(d.getMonth());
          break;
        }
      }
    }
  }, [calendar, existingBookings]);

  // ============================================================
  // RECALCULATE SLOTS ON DURATION CHANGE
  // ============================================================
  useEffect(() => {
    if (calendar && selectedDate) {
      getAvailableTimesForDate(selectedDate);
    }
  }, [selectedDuration, calendar, selectedDate, existingBookings]);

  // ============================================================
  // PREFILL - Load from localStorage
  // ============================================================
  useEffect(() => {
    if (calendar?.afterBooking?.prefill) {
      const saved = localStorage.getItem("booking_prefill");
      if (saved) {
        try {
          const data = JSON.parse(saved);
          setName(data.name || "");
          setEmail(data.email || "");
          setWhatsapp(data.whatsapp || "");
        } catch (e) {}
      }
    }
  }, [calendar]);

  // ============================================================
  // SUBMIT BOOKING
  // ============================================================
  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isAdmin) {
      toast.error(
        translateText("حسابات الإدارة لا يمكنها إجراء حجوزات", "Admin accounts cannot make bookings"),
      );
      return;
    }
    if (!calendar || !selectedSlot) {
      toast.error(translateText("يرجى تحديد وقت أولاً", "Please select a time slot first"));
      return;
    }

    // Validate required fields
    if (calendar.questions) {
      for (const q of calendar.questions) {
        if (!q.active || q.type === "text-block") continue;
        if (q.id === 1 && q.required && !name.trim()) {
          toast.error(translateText("يرجى إدخال اسمك الكامل", "Please enter your full name"));
          return;
        }
        if (q.id === 2 && q.required && !whatsapp.trim()) {
          toast.error(translateText("يرجى إدخال رقم هاتفك", "Please enter your phone number"));
          return;
        }
        if (q.id === 3 && q.required && !email.trim()) {
          toast.error(translateText("يرجى إدخال بريدك الإلكتروني", "Please enter your email"));
          return;
        }

        const isGuests =
          q.id === 4 ||
          q.label.toLowerCase().includes("ضيوف") ||
          q.label.toLowerCase().includes("guest");
        if (isGuests) {
          if (q.required && guestsList.length === 0) {
            toast.error(
              translateText("يرجى إضافة ضيف واحد على الأقل", "Please add at least one guest"),
            );
            return;
          }
          const activeDetails = q.guestDetails || [
            { id: 1, label: "الاسم", active: true, required: true },
            { id: 2, label: "البريد الإلكتروني", active: true, required: true },
          ];
          for (let i = 0; i < guestsList.length; i++) {
            const g = guestsList[i];
            if (activeDetails[0]?.active !== false && activeDetails[0].required && !g.name.trim()) {
              toast.error(
                `${translateText("يرجى إدخال اسم الضيف", "Please enter guest name")} #${i + 1}`,
              );
              return;
            }
            if (
              activeDetails[1]?.active !== false &&
              activeDetails[1].required &&
              !g.email.trim()
            ) {
              toast.error(
                `${translateText("يرجى إدخال البريد الإلكتروني للضيف", "Please enter guest email")} #${i + 1}`,
              );
              return;
            }
          }
          continue;
        }

        const isStandardQuestion =
          q.id === 1 ||
          q.id === 2 ||
          q.id === 3 ||
          q.id === 4 ||
          q.label.toLowerCase().includes("الاسم") ||
          q.label.toLowerCase().includes("name") ||
          q.label.toLowerCase().includes("الهاتف") ||
          q.label.toLowerCase().includes("phone") ||
          q.label.toLowerCase().includes("واتساب") ||
          q.label.toLowerCase().includes("whatsapp") ||
          q.label.toLowerCase().includes("البريد") ||
          q.label.toLowerCase().includes("email") ||
          q.label.toLowerCase().includes("ضيوف") ||
          q.label.toLowerCase().includes("guest");

        if (!isStandardQuestion && q.required && !customAnswers[q.id]?.trim()) {
          toast.error(`${translateText("حقل مطلوب", "Required field")}: ${q.label}`);
          return;
        }
      }
    }

    const [date, time] = selectedSlot.split("|");

    // Check if slot has become booked in the meantime
    const slotBookings = existingBookings.filter(
      (b) => b.date === date && b.time === time && b.status !== "Cancelled",
    );
    const maxSpots = Number(calendar.groupMax) || Number(calendar.groupCapacity) || 1;
    if (slotBookings.length >= maxSpots) {
      toast.error(
        translateText("عذراً، هذا الوقت لم يعد متاحاً", "Sorry, this slot is no longer available"),
      );
      return;
    }

    // Validate booking limits (email scope)
    if (isEmailLimitExceeded(email, date)) {
      toast.error(
        translateText(
          "لقد تجاوزت حد الحجز المسموح به لهذا البريد الإلكتروني.",
          "You have exceeded the allowed booking limit for this email address.",
        ),
      );
      return;
    }

    // Validate booking limits (all scope)
    if (isBookingLimitExceeded(date)) {
      toast.error(
        translateText(
          "عذراً، تم الوصول إلى الحد الأقصى للحجوزات لهذا اليوم.",
          "Sorry, the maximum booking limit has been reached.",
        ),
      );
      return;
    }

    setIsSaving(true);
    try {
      const newId = reschedulingBookingId || Date.now();

      const answers: Record<string, string> = {};
      if (calendar.questions) {
        calendar.questions.forEach((q: any) => {
          if (q.type === "text-block") return;
          const isName = q.id === 1 || q.label.toLowerCase().includes("الاسم");
          const isPhone =
            q.id === 2 ||
            q.label.toLowerCase().includes("الهاتف") ||
            q.label.toLowerCase().includes("واتساب");
          const isEmail =
            q.id === 3 ||
            q.label.toLowerCase().includes("البريد") ||
            q.label.toLowerCase().includes("email");
          const isGuests =
            q.id === 4 ||
            q.label.toLowerCase().includes("ضيوف") ||
            q.label.toLowerCase().includes("guest");

          if (isName) answers[q.label] = name.trim();
          else if (isPhone) answers[q.label] = whatsapp.trim();
          else if (isEmail) answers[q.label] = email.trim();
          else if (isGuests)
            answers[q.label] = guestsList
              .map((g, idx) => `${idx + 1}. ${g.name || ""} (${g.email || ""})`)
              .join(", ");
          else if (customAnswers[q.id]?.trim()) answers[q.label] = customAnswers[q.id].trim();
        });
      }

      let finalLocation = "";
      if (selectedLocation) {
        if (selectedLocation.type === "ask-invitee") {
          finalLocation = inviteeLocationText.trim();
        } else if (selectedLocation.type === "phone") {
          finalLocation = inviteePhoneCallText.trim();
        } else if (selectedLocation.type === "in-person") {
          finalLocation = selectedLocation.address || translateText("حضور شخصي", "In-Person");
        } else if (selectedLocation.type === "custom") {
          finalLocation = selectedLocation.customLabel || selectedLocation.label || "Custom";
        } else {
          finalLocation = selectedLocation.type || selectedLocation.label || "";
        }
      }

      const payload: any = {
        id: newId,
        calendarId: Number(calendar.id),
        name: name.trim(),
        contact: whatsapp.trim(),
        email: email.trim(),
        whatsapp: whatsapp.trim(),
        date,
        time,
        status: calendar.requireApproval ? "Pending" : "Confirmed",
        source: source.trim() || "External Link",
        answers,
        guests: guestsList,
        location: finalLocation,
        locationDetails: selectedLocation || null,
        createdAt: newId,
        userId: calendar.userId || userId || "",
        fromAd: fromAd,
      };

      if (calendar.free === false) {
        payload.paymentDetails = {
          amount: calendar.price || 0,
          currency: calendar.currency || "USD",
          method: "Manual / Cash",
          status: "Pending Manual Collection",
        };
      }

      const docId = `booking-${newId}-${calendar.userId || userId || ""}`;
      await firestore.setDoc(firestore.doc(db, "bookings", docId), payload);

      // Create/Update the contact document in contacts collection
      const contactDocId = `contact-${email.trim().toLowerCase()}-${calendar.userId || userId || ""}`;
      const contactRef = firestore.doc(db, "contacts", contactDocId);
      const contactPayload: any = {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        whatsapp: whatsapp.trim(),
        userId: calendar.userId || userId || "",
        updatedAt: Date.now(),
      };
      if (fromAd === true) {
        contactPayload.source = "ads";
      } else {
        contactPayload.source = "direct";
      }
      await firestore.setDoc(contactRef, contactPayload, { merge: true });

      // Trigger notification for the calendar owner
      const targetUserId = calendar.userId || userId || "";
      if (targetUserId) {
        try {
          const isPaid = calendar.free === false;
          await firestore.addDoc(firestore.collection(db, "notifications"), {
            userId: targetUserId,
            title: isRtl
              ? isPaid
                ? `حجز مدفوع جديد من ${name.trim()}`
                : `حجز جديد من ${name.trim()}`
              : isPaid
                ? `New Paid Booking from ${name.trim()}`
                : `New Booking from ${name.trim()}`,
            desc: isRtl
              ? isPaid
                ? `تم حجز موعد جديد في ${date} الساعة ${time} (دفع معلق بمبلغ ${calendar.price || 0} ${calendar.currency || "USD"})`
                : `تم حجز موعد جديد في ${date} الساعة ${time}`
              : isPaid
                ? `A new appointment has been booked on ${date} at ${time} (payment pending: ${calendar.price || 0} ${calendar.currency || "USD"})`
                : `A new appointment has been booked on ${date} at ${time}`,
            icon: isPaid ? "CreditCard" : "Calendar",
            read: false,
            isRead: false,
            createdAt: Date.now(),
            time: isRtl ? "الآن" : "Just now",
          });
        } catch (notifErr) {
          console.error("Failed to write booking notification:", notifErr);
        }
      }

      // Prefill - Save to localStorage
      if (calendar.afterBooking?.prefill) {
        localStorage.setItem(
          "booking_prefill",
          JSON.stringify({ name: name.trim(), email: email.trim(), whatsapp: whatsapp.trim() }),
        );
      }

      // Webhook
      const webhookUrl =
        calendar.afterBooking?.webhookUrl ||
        "https://n8n.srv1259274.hstgr.cloud/webhook/5f4f7bb6-01ff-4445-8d62-a49726b54664";
      const webhookEnabled = calendar.afterBooking?.webhookEnabled !== false;

      if (webhookEnabled && webhookUrl) {
        try {
          await fetch(webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
        } catch (e) {
          console.warn("Webhook failed:", e);
        }
      }

      if (calendar.free === false) {
        toast.success(
          translateText(
            "سوف يتواصلوا معك لإتمام الدفع",
            "They will contact you to complete the payment",
          ),
        );
      } else {
        toast.success(
          translateText("تم حجز موعدك بنجاح", "Your appointment has been booked successfully"),
        );
      }

      setReschedulingBookingId(null);

      // Redirect
      const postMode = calendar.templateSettings?.postBookingMode || (calendar.afterBooking as any)?.postBookingMode;
      const targetRedirectUrl = calendar.templateSettings?.redirectUrl || calendar.afterBooking?.redirectUrl;
      const targetThanksTemplateId = calendar.templateSettings?.thankYouTemplateId || (calendar.afterBooking as any)?.thankYouTemplateId;

      if (postMode === 'template' && targetThanksTemplateId) {
        navigate(`/booking/success?templateId=${targetThanksTemplateId}&bookingId=${payload.id}`);
      } else if ((postMode === 'custom_url' || calendar.afterBooking?.redirectEnabled) && targetRedirectUrl) {
        window.location.href = targetRedirectUrl;
      } else if (postMode === 'modal') {
        setIsModalOpen(true);
      } else {
        setSuccessBooking(payload);
      }
    } catch (err) {
      console.error("Error creating public booking:", err);
      toast.error(translateText("حدث خطأ أثناء الحجز", "An error occurred while booking"));
    } finally {
      setIsSaving(false);
    }
  };

  const getCurrencySymbol = (currencyCode: string) => {
    const symbols: Record<string, string> = {
      USD: "$",
      AED: "د.إ ",
      SAR: "ر.س ",
      EGP: "ج.م ",
      KWD: "د.ك ",
      QAR: "ر.ق ",
      EUR: "€",
      GBP: "£",
    };
    return symbols[currencyCode] || currencyCode || "";
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isAdmin) {
      toast.error(
        translateText("حسابات الإدارة لا يمكنها إجراء حجوزات", "Admin accounts cannot make bookings"),
      );
      return;
    }
    if (!cardName.trim() || !cardNumber.trim() || !cardExpiry.trim() || !cardCvv.trim()) {
      toast.error(
        translateText("يرجى إدخال جميع معلومات الدفع", "Please enter all payment details"),
      );
      return;
    }

    setIsSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));

    setPaymentCompleted(true);
    setShowCheckoutModal(false);

    try {
      const [date, time] = selectedSlot!.split("|");

      // Check if slot has become booked in the meantime
      const slotBookings = existingBookings.filter(
        (b) => b.date === date && b.time === time && b.status !== "Cancelled",
      );
      const maxSpots = Number(calendar.groupMax) || Number(calendar.groupCapacity) || 1;
      if (slotBookings.length >= maxSpots) {
        toast.error(
          translateText(
            "عذراً، هذا الموعد غير متاح الآن",
            "Sorry, this slot is no longer available",
          ),
        );
        setIsSaving(false);
        return;
      }

      // Validate booking limits (email scope)
      if (isEmailLimitExceeded(email, date)) {
        toast.error(
          translateText(
            "لقد تجاوزت حد الحجز المسموح به لهذا البريد الإلكتروني.",
            "You have exceeded the allowed booking limit for this email address.",
          ),
        );
        setIsSaving(false);
        return;
      }

      // Validate booking limits (all scope)
      if (isBookingLimitExceeded(date)) {
        toast.error(
          translateText(
            "عذراً، تم الوصول إلى الحد الأقصى للحجوزات لهذا اليوم.",
            "Sorry, the maximum booking limit has been reached.",
          ),
        );
        setIsSaving(false);
        return;
      }

      const newId = reschedulingBookingId || Date.now();

      const answers: Record<string, string> = {};
      if (calendar.questions) {
        calendar.questions.forEach((q: any) => {
          if (q.type === "text-block") return;
          const isName = q.id === 1 || q.label.toLowerCase().includes("الاسم");
          const isPhone =
            q.id === 2 ||
            q.label.toLowerCase().includes("الهاتف") ||
            q.label.toLowerCase().includes("واتساب");
          const isEmail =
            q.id === 3 ||
            q.label.toLowerCase().includes("البريد") ||
            q.label.toLowerCase().includes("email");
          const isGuests =
            q.id === 4 ||
            q.label.toLowerCase().includes("ضيوف") ||
            q.label.toLowerCase().includes("guest");

          if (isName) answers[q.label] = name.trim();
          else if (isPhone) answers[q.label] = whatsapp.trim();
          else if (isEmail) answers[q.label] = email.trim();
          else if (isGuests)
            answers[q.label] = guestsList
              .map((g, idx) => `${idx + 1}. ${g.name || ""} (${g.email || ""})`)
              .join(", ");
          else if (customAnswers[q.id]?.trim()) answers[q.label] = customAnswers[q.id].trim();
        });
      }

      const payload = {
        id: newId,
        calendarId: Number(calendar.id),
        name: name.trim(),
        contact: whatsapp.trim(),
        email: email.trim(),
        whatsapp: whatsapp.trim(),
        date,
        time,
        status: calendar.requireApproval ? "Pending" : "Confirmed",
        source: source.trim() || "External Link",
        answers,
        guests: guestsList,
        createdAt: newId,
        userId: calendar.userId || userId || "",
        paymentDetails: {
          amount: calendar.price,
          currency: calendar.currency || "USD",
          method: "Card",
          transactionId: `TXN-${Math.floor(Math.random() * 100000000)}`,
        },
      };

      const docId = `booking-${newId}-${calendar.userId || userId || ""}`;
      await firestore.setDoc(firestore.doc(db, "bookings", docId), payload);

      // Trigger notification for the calendar owner
      const targetUserId = calendar.userId || userId || "";
      if (targetUserId) {
        try {
          await firestore.addDoc(firestore.collection(db, "notifications"), {
            userId: targetUserId,
            title: isRtl
              ? `حجز مدفوع جديد من ${name.trim()}`
              : `New Paid Booking from ${name.trim()}`,
            desc: isRtl
              ? `تم حجز ودفع موعد جديد بمبلغ ${calendar.price} ${calendar.currency || "USD"} في ${date} الساعة ${time}`
              : `A new appointment has been booked and paid for (${calendar.price} ${calendar.currency || "USD"}) on ${date} at ${time}`,
            icon: "CreditCard",
            read: false,
            isRead: false,
            createdAt: Date.now(),
            time: isRtl ? "الآن" : "Just now",
          });
        } catch (notifErr) {
          console.error("Failed to write booking notification:", notifErr);
        }
      }

      if (calendar.afterBooking?.prefill) {
        localStorage.setItem(
          "booking_prefill",
          JSON.stringify({ name: name.trim(), email: email.trim(), whatsapp: whatsapp.trim() }),
        );
      }

      if (calendar.afterBooking?.webhookEnabled && calendar.afterBooking?.webhookUrl) {
        try {
          await fetch(calendar.afterBooking.webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
        } catch (e) {
          console.warn("Webhook failed:", e);
        }
      }

      toast.success(
        translateText("تم الدفع وحجز موعدك بنجاح", "Payment successful and appointment booked!"),
      );

      setReschedulingBookingId(null);

      // Redirect
      const postMode = calendar.templateSettings?.postBookingMode || (calendar.afterBooking as any)?.postBookingMode;
      const targetRedirectUrl = calendar.templateSettings?.redirectUrl || calendar.afterBooking?.redirectUrl;
      const targetThanksTemplateId = calendar.templateSettings?.thankYouTemplateId || (calendar.afterBooking as any)?.thankYouTemplateId;

      if (postMode === 'template' && targetThanksTemplateId) {
        navigate(`/booking/success?templateId=${targetThanksTemplateId}&bookingId=${payload.id}`);
      } else if ((postMode === 'custom_url' || calendar.afterBooking?.redirectEnabled) && targetRedirectUrl) {
        window.location.href = targetRedirectUrl;
      } else if (postMode === 'modal') {
        setIsModalOpen(true);
      } else {
        setSuccessBooking(payload);
      }
    } catch (err) {
      console.error("Error creating public booking after payment:", err);
      toast.error(translateText("حدث خطأ أثناء الحجز", "An error occurred while booking"));
    } finally {
      setIsSaving(false);
    }
  };

  // ============================================================
  // RENDER
  // ============================================================
  if (loading) return <LoadingScreen />;

  // Active Status
  if (!calendar || calendar.active === false) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-slate-100 p-4 text-center">
        <XCircle className="w-16 h-16 text-red-500 mb-4 animate-bounce" />
        <h2 className="text-2xl font-bold mb-2">404 - الصفحة غير موجودة</h2>
        <p className="text-slate-400">الرابط غير صحيح أو تم مسح هذا التقويم.</p>
      </div>
    );
  }

  // Password Protect
  if (calendar.passwordProtect && !passwordAuthorized) {
    return (
      <div
        className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 py-12 px-4 flex items-center justify-center"
        dir={isRtl ? "rtl" : "ltr"}
      >
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-8 text-center">
          <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-full flex items-center justify-center mx-auto mb-4 border border-purple-200 dark:border-purple-800">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2">
            {translateText("هذا التقويم محمي بكلمة مرور", "This calendar is password protected")}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
            {translateText(
              "يرجى إدخال كلمة المرور للمتابعة وحجز موعد.",
              "Please enter the password to proceed and book a slot.",
            )}
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (passwordInput === calendar.password) {
                setPasswordAuthorized(true);
              } else {
                toast.error(translateText("كلمة المرور غير صحيحة", "Incorrect password"));
              }
            }}
            className="space-y-4"
          >
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder={translateText("كلمة المرور...", "Password...")}
                className="w-full bg-slate-50 dark:bg-slate-950/45 border border-slate-200 dark:border-slate-800 rounded-xl px-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 text-center text-slate-800 dark:text-white"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className={`absolute ${isRtl ? "left-3" : "right-3"} top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors`}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <button
              type="submit"
              className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-purple-500/20 transition-all duration-205"
            >
              {translateText("دخول", "Enter")}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ============================================================
  // MAIN UI
  // ============================================================
  const monthWeeks = () => {
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const numDays = new Date(currentYear, currentMonth + 1, 0).getDate();
    const weeks: (Date | null)[][] = [];
    let week: (Date | null)[] = Array(7).fill(null);
    for (let i = 0; i < firstDay; i++) week[i] = null;
    let dayOfWeek = firstDay;
    for (let day = 1; day <= numDays; day++) {
      if (dayOfWeek === 7) {
        weeks.push(week);
        week = Array(7).fill(null);
        dayOfWeek = 0;
      }
      week[dayOfWeek] = new Date(currentYear, currentMonth, day);
      dayOfWeek++;
    }
    if (week.some((d) => d !== null)) weeks.push(week);
    return weeks;
  };

  const weekdays = isRtl
    ? ["أحد", "اثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"]
    : ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  const monthsList = isRtl
    ? [
        "يناير",
        "فبراير",
        "مارس",
        "إبريل",
        "مايو",
        "يونيو",
        "يوليو",
        "أغسطس",
        "سبتمبر",
        "أكتوبر",
        "نوفمبر",
        "ديسمبر",
      ]
    : [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
      ];

  const renderCalendarBlock = (embeddedOverride?: boolean, hideOuterWrapperOverride?: boolean) => {
    const isEmbedded = embeddedOverride ?? (calendar?.templateSettings?.previewMode === "template" || !!queryParams.get("templateId"));

    return (
    <div
      className={isEmbedded 
        ? "w-full mx-auto py-8 pb-16 flex flex-col items-center justify-center relative bg-transparent"
        : "min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 py-12 px-4 flex flex-col items-center justify-center relative"
      }
      dir={isRtl ? "rtl" : "ltr"}
    >
      {/* Background decoration */}
      {!isEmbedded && (
        <>
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none animate-pulse" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none animate-pulse" />
        </>
      )}

      {/* Floating Language Switcher */}
      {!isEmbedded && (
        <div className="absolute top-4 right-4 z-50">
        <button
          type="button"
          onClick={() => setSelectedLanguage(currentLang === "ar" ? "en" : "ar")}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-white/10 dark:bg-slate-900/40 backdrop-blur-md border border-white/20 dark:border-slate-850 text-white rounded-full hover:bg-white/20 transition cursor-pointer shadow-md"
        >
          <Globe className="w-3.5 h-3.5 text-purple-400" />
          <span>{currentLang === "ar" ? "English" : "العربية"}</span>
        </button>
      </div>
      )}

      {/* Troubleshooting Panel */}
      <div className="absolute bottom-4 left-4 z-50 flex flex-col gap-2 items-start">
        <button
          type="button"
          onClick={() => setShowTroubleshoot(!showTroubleshoot)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-white/10 dark:bg-slate-900/40 backdrop-blur-md border border-white/20 dark:border-slate-850 text-white rounded-full hover:bg-white/20 transition cursor-pointer shadow-md"
        >
          <Activity className="w-3.5 h-3.5 text-emerald-450 animate-pulse" />
          <span>{translateText("استكشاف الأخطاء", "Troubleshoot")}</span>
        </button>

        {showTroubleshoot && (
          <div
            className="bg-slate-950/95 backdrop-blur-md border border-slate-800 p-4 rounded-2xl text-[10px] font-mono text-slate-300 w-64 shadow-2xl space-y-2 text-left"
            dir="ltr"
          >
            <div className="flex justify-between items-center border-b border-slate-800 pb-1.5">
              <span className="font-bold text-slate-200 font-sans">Sync Monitor</span>
              <span
                className={`h-2 w-2 rounded-full ${syncStatus === "synced" ? "bg-green-500" : syncStatus === "error" ? "bg-red-500" : "bg-amber-500"}`}
              />
            </div>
            <div>
              <span className="text-slate-500">Sync status:</span> {syncStatus}
            </div>
            <div>
              <span className="text-slate-500">Last synced:</span> {lastSyncedTime || "N/A"}
            </div>
            <div>
              <span className="text-slate-500">Calendar:</span> {calendar?.name || "N/A"}
            </div>
            <div>
              <span className="text-slate-500">Bookings:</span> {existingBookings.length}
            </div>
            <div>
              <span className="text-slate-500">Language:</span> {currentLang}
            </div>
            <div>
              <span className="text-slate-500">Layout:</span> {isRtl ? "RTL" : "LTR"}
            </div>
            <div>
              <span className="text-slate-500">Durations:</span>{" "}
              {durationOptions.map((d: any) => d.value).join(", ")}
            </div>
          </div>
        )}
      </div>

      <AnimatePresence mode="wait">
        {!successBooking ? (
          <motion.div
            key="booking-card"
            initial={isEmbedded ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl w-full ${isEmbedded ? 'max-w-[1200px] mx-auto' : 'max-w-5xl'} rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 grid grid-cols-1 md:grid-cols-12 relative overflow-hidden`}
          >
            {/* Accent line - Color Sync */}
            <div
              className="absolute top-0 left-0 right-0 h-1.5 z-10"
              style={{
                backgroundColor: "var(--green)",
              }}
            />

            {/* ============================================================
                LEFT PANE - All Appearance Settings
                ============================================================ */}
            <div
              className={`md:col-span-5 p-6 md:p-8 flex flex-col justify-center border-b md:border-b-0 relative md:order-1 ${
                isRtl ? "md:border-l" : "md:border-r"
              } text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),_0_10px_30px_-5px_rgba(16,185,129,0.3)]`}
              style={{
                background: "var(--grad)",
                borderColor: "rgba(255, 255, 255, 0.15)",
              }}
            >
              <div className="space-y-6 w-full flex flex-col items-center">
                {/* Image + Name + Duration + Price */}
                <div className="flex flex-col items-center gap-4 text-center">
                  {calendar.image ? (
                    <div className="relative w-16 h-16 flex-shrink-0">
                      {calendar.mediaType === "video" ? (
                        <video
                          src={calendar.image}
                          className="w-full h-full object-cover border border-2 rounded-2xl"
                          style={{ borderColor: "var(--line)" }}
                          controls
                          playsInline
                        />
                      ) : (
                        <img
                          src={calendar.image}
                          alt="Logo"
                          className="w-full h-full object-cover border border-2 rounded-2xl"
                          style={{ borderColor: "var(--line)" }}
                        />
                      )}
                    </div>
                  ) : (
                    <div
                      className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-xl font-bold flex-shrink-0 border border-white/20 bg-white/10"
                    >
                      {calendar.name?.charAt(0) || "?"}
                    </div>
                  )}

                  <div className="min-w-0 flex flex-col items-center">
                    <h1 className="text-xl font-bold text-white text-center">
                      {calendar.name || translateText("تقويم", "Calendar")}
                    </h1>
                    <div className="text-xs text-white/80 flex flex-wrap justify-center items-center gap-x-2 gap-y-1 mt-1">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-emerald-50" />
                        {selectedDuration || calendar.duration || 30}{" "}
                        {translateText("دقيقة", "min")}
                      </span>
                      <span
                        className="w-1 h-1 rounded-full bg-white/40"
                      />
                      <span className="flex items-center gap-1">
                        <Globe className="w-3.5 h-3.5 text-emerald-50" />
                        {translateText("أونلاين", "Online")}
                      </span>
                    </div>
                    <div className="mt-1.5 flex justify-center">
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 bg-white/10 text-white rounded-full border border-white/20"
                      >
                        {calendar.free
                          ? translateText("مجاني", "Free")
                          : formatPrice(
                              calendar.price || 0,
                              calendar.currency || "USD",
                              calendar.priceType,
                            )}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Description */}
                {calendar.description && (
                  <p className="text-xs text-emerald-50 leading-relaxed max-h-[120px] overflow-y-auto pr-1 text-center">
                    {calendar.description}
                  </p>
                )}

                {/* Location Badges */}
                {calendar.locationOptions && calendar.locationOptions.length > 0 && (
                  <div className="flex flex-wrap justify-center gap-1.5 mt-1">
                    {calendar.locationOptions.map((loc: any) => (
                      <span
                        key={loc.id}
                        className="text-[9px] font-bold px-2 py-0.5 bg-white/10 text-white rounded-full border border-white/20"
                      >
                        {loc.type === "zoom"
                          ? "Zoom"
                          : loc.type === "meet"
                            ? "Google Meet"
                            : loc.type === "teams"
                              ? "Teams"
                              : loc.type === "phone"
                                ? "📞"
                                : loc.type === "in-person"
                                  ? "📍"
                                  : loc.customLabel || loc.label}
                      </span>
                    ))}
                  </div>
                )}

                {/* Selected slot summary */}
                {step === "confirm-form" && selectedSlot && (
                  <motion.div
                    initial={isEmbedded ? false : { opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white/10 border border-white/20 rounded-2xl p-4 space-y-2 text-white text-center flex flex-col items-center justify-center w-full"
                  >
                    <div className="text-xs font-bold text-emerald-50">
                      {translateText("الموعد المحدد:", "Selected Appointment:")}
                    </div>
                    <div className="text-sm font-bold text-white flex items-center justify-center gap-2">
                      <CalendarIcon className="w-4 h-4 text-emerald-50" />
                      {selectedSlot.split("|")[0]}
                    </div>
                    <div className="text-sm font-bold text-white flex items-center justify-center gap-2">
                      <Clock className="w-4 h-4 text-emerald-50" />
                      {getSelectedSlotDisplayTime()} ({selectedDuration || calendar.duration || 30}{" "}
                      {translateText("دقيقة", "min")})
                    </div>
                    {!calendar.free && (
                      <div
                        className="text-sm font-bold text-white flex items-center justify-center gap-2 pt-2 border-t border-white/20 w-full"
                      >
                        <span>💵</span>
                        <span>
                          {translateText("السعر:", "Price:")}{" "}
                          {formatPrice(
                            calendar.price || 0,
                            calendar.currency || "USD",
                            calendar.priceType,
                          )}
                        </span>
                      </div>
                    )}
                  </motion.div>
                )}
              </div>

              {/* Calendar */}
              {step === "select-slot" && (
                <div className="mt-8 pt-6 border-t border-white/20 w-full">
                  <div className="flex items-center justify-center gap-6 mb-4">
                    <button
                      type="button"
                      onClick={() => {
                        if (currentMonth === 0) {
                          setCurrentMonth(11);
                          setCurrentYear((y) => y - 1);
                        } else setCurrentMonth((m) => m - 1);
                      }}
                      className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition border border-white/10"
                    >
                      {isRtl ? (
                        <ChevronRight className="w-4 h-4" />
                      ) : (
                        <ChevronLeft className="w-4 h-4" />
                      )}
                    </button>
                    <span className="text-xs font-bold text-white">
                      {monthsList[currentMonth]} {currentYear}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        if (currentMonth === 11) {
                          setCurrentMonth(0);
                          setCurrentYear((y) => y + 1);
                        } else setCurrentMonth((m) => m + 1);
                      }}
                      className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition border border-white/10"
                    >
                      {isRtl ? (
                        <ChevronLeft className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </button>
                  </div>

                  <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-emerald-50 opacity-80 mb-2">
                    {weekdays.map((w) => (
                      <div key={w} className="py-1">
                        {w}
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-7 gap-1 text-center">
                    {monthWeeks().map((week, wIdx) =>
                      week.map((date, dIdx) => {
                        if (!date) return <div key={`empty-${wIdx}-${dIdx}`} className="py-1" />;
                        const year = date.getFullYear();
                        const month = String(date.getMonth() + 1).padStart(2, "0");
                        const dateDay = String(date.getDate()).padStart(2, "0");
                        const dateStr = `${year}-${month}-${dateDay}`;

                        const availableTimes = getAvailableTimesForDate(dateStr);
                        const isSelectable =
                          showTroubleshoot ||
                          (calendar.grayOutBusy
                            ? availableTimes.length > 0
                            : availableTimes.some((t) => !t.isBooked));
                        const isSelected = selectedDate === dateStr;

                        const now = new Date();
                        const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
                        const isToday = dateStr === todayStr;

                        return (
                          <button
                            key={dateStr}
                            type="button"
                            disabled={!isSelectable}
                            onClick={() => setSelectedDate(dateStr)}
                            className={`text-[10px] font-bold py-1.5 rounded-lg flex flex-col items-center justify-center ${
                              isSelected
                                ? "bg-white text-slate-900 shadow-md"
                                : isSelectable
                                  ? "transition-all duration-200 bg-white/10 text-white hover:bg-black/15 hover:shadow-md cursor-pointer"
                                  : "text-white/40 cursor-not-allowed"
                            } ${isToday && !isSelected ? "ring-1 ring-white/50" : ""}`}
                          >
                            <span>{date.getDate()}</span>
                            {isSelectable && !isSelected && (
                              <span className="w-1 h-1 bg-white rounded-full mt-0.5" />
                            )}
                          </button>
                        );
                      }),
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* ============================================================
                RIGHT PANE - SLOTS & FORM
                ============================================================ */}
            <div className="md:col-span-7 p-6 md:p-8 bg-white/40 dark:bg-slate-900/40 md:order-2">
              <AnimatePresence mode="wait">
                {step === "select-slot" ? (
                  <motion.div
                    key="select-slot-pane"
                    initial={isEmbedded ? false : { opacity: 0, x: isRtl ? -15 : 15 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: isRtl ? 15 : -15 }}
                    className="h-full flex flex-col max-w-md mx-auto w-full"
                  >
                    {/* Timezone Display inside SLOTS & FORM side */}
                    {renderTimezoneWidget()}

                    {/* ============================================================
                        DURATION BUTTONS
                        ============================================================ */}
                    <div className="mb-6 text-center">
                      <div className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 bg-slate-100 dark:bg-slate-900/60 px-3 py-1 rounded-full border border-slate-200/50 dark:border-slate-800/50">
                        <Clock className="w-3.5 h-3.5 text-purple-500" />
                        <span>{translateText("مدة الجلسة", "Session Duration")}</span>
                      </div>
                      <div className="flex flex-wrap justify-center gap-2">
                        {durationOptions.map((dur: any) => {
                          const isSelected = selectedDuration === dur.value;
                          return (
                            <button
                              key={dur.id}
                              type="button"
                              onClick={() => setSelectedDuration(dur.value)}
                              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                                isSelected
                                  ? "bg-slate-200 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white"
                                  : "bg-white dark:bg-slate-950/40 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-purple-300 dark:hover:border-purple-700"
                              }`}
                              dir="ltr"
                            >
                              {dur.value < 60
                                ? `${dur.value} ${translateText("دقيقة", "min")}`
                                : `${dur.value / 60} ${translateText("ساعة", "hour")}`}
                              {dur.isDefault && " ★"}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Time Slots - FIXED */}
                    <div>
                      <h2 className="text-base font-bold text-slate-800 dark:text-white mb-4 flex items-center justify-center gap-2">
                        <Clock className="w-5 h-5 text-purple-500 animate-pulse" />
                        {selectedDate
                          ? translateText(
                              `المواعيد المتاحة ليوم ${getSelectedDayName(selectedDate)} ${selectedDate}`,
                              `Available Slots for ${getSelectedDayName(selectedDate)}, ${selectedDate}`,
                            )
                          : translateText("اختر تاريخًا", "Select a Date")}
                      </h2>

                      {!selectedDate ? (
                        <div className="text-center py-16 text-slate-500 dark:text-slate-400 text-xs">
                          {translateText(
                            "يرجى اختيار تاريخ من التقويم",
                            "Please select a date from the calendar",
                          )}
                        </div>
                      ) : (
                        (() => {
                          const times = getAvailableTimesForDate(selectedDate);
                          if (times.length === 0) {
                            return (
                              <div className="text-center py-16 text-slate-500 dark:text-slate-400 text-xs">
                                {translateText(
                                  "لا توجد مواعيد متاحة في هذا اليوم",
                                  "No slots available on this day",
                                )}
                              </div>
                            );
                          }
                          return (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[360px] overflow-y-auto pr-1">
                              {times.map(({ time, isBooked, displayTime, reason, spotsLeft }) => {
                                if (isBooked) {
                                  if (showTroubleshoot) {
                                    return (
                                      <div
                                        key={time}
                                        className="w-full text-xs font-black pt-7 pb-3 px-2 rounded-xl border-2 border-red-350 border-dashed bg-white dark:bg-slate-955 text-slate-700 dark:text-slate-350 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all text-center relative flex flex-col items-center justify-between min-h-[90px]"
                                      >
                                        {/* "Unavailable" badge */}
                                        <div className="absolute top-1 left-1 px-1 py-0.5 rounded border border-red-500 bg-white dark:bg-slate-900 text-red-500 text-[8px] font-bold uppercase leading-none scale-90 origin-top-left">
                                          {translateText("غير متاح", "Unavailable")}
                                        </div>

                                        {/* "Details" button/icon */}
                                        <button
                                          type="button"
                                          onClick={() =>
                                            toast.info(`Reason: ${reason || "UNKNOWN"}`)
                                          }
                                          className="absolute top-1 right-1 p-0.5 rounded text-indigo-500 hover:text-indigo-600 transition-colors cursor-pointer"
                                          title={`Conflict Details: ${reason || "UNKNOWN"}`}
                                        >
                                          <Info className="w-3.5 h-3.5" />
                                        </button>

                                        <span className="text-slate-400 dark:text-slate-500 line-through">
                                          {displayTime}
                                        </span>

                                        {/* Reason tag */}
                                        <div className="mt-2 px-2 py-0.5 rounded bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 text-[9px] font-black uppercase tracking-wider border border-red-200/50 dark:border-red-800/50">
                                          {reason || "UNKNOWN"}
                                        </div>
                                      </div>
                                    );
                                  } else {
                                    return (
                                      <button
                                        key={time}
                                        type="button"
                                        disabled
                                        className="w-full text-xs font-black py-3 rounded-xl border bg-gray-200 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed line-through relative text-center flex flex-col items-center justify-center"
                                      >
                                        <span>{displayTime}</span>
                                        {calendar.displaySpotsLeft !== false && (
                                          <span className="block text-[8px] font-bold text-red-500 dark:text-red-400 mt-0.5">
                                            {spotsLeft <= 0
                                              ? translateText("مكتمل", "full")
                                              : `${spotsLeft} ${translateText("متاح", "spots left")}`}
                                          </span>
                                        )}
                                      </button>
                                    );
                                  }
                                }

                                return (
                                  <button
                                    key={time}
                                    type="button"
                                    onClick={() => {
                                      setSelectedSlot(`${selectedDate}|${time}`);
                                      setStep("confirm-form");
                                    }}
                                    className="w-full text-xs font-black py-3 rounded-xl border bg-white border-slate-200 text-slate-700 hover:border-[var(--green)] hover:bg-[var(--green)]/5 hover:text-[var(--green)] cursor-pointer transition-all duration-200 text-center relative dark:bg-zinc-900/50 dark:border-slate-800 dark:text-slate-350 dark:hover:bg-[var(--green)]/20 dark:hover:text-[var(--green)] dark:hover:border-[var(--green)]"
                                  >
                                    <span>{displayTime}</span>
                                    {calendar.displaySpotsLeft !== false && (
                                      <span
                                        className={`block text-[8px] font-bold ${
                                          spotsLeft > 0
                                            ? "text-emerald-500 dark:text-emerald-400"
                                            : "text-red-500 dark:text-red-400"
                                        }`}
                                      >
                                        {spotsLeft > 0
                                          ? `${spotsLeft} ${translateText("متاح", "spots left")}`
                                          : translateText("مكتمل", "full")}
                                      </span>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          );
                        })()
                      )}
                    </div>
                  </motion.div>
                ) : (
                  // ============================================================
                  // CONFIRM FORM
                  // ============================================================
                  <motion.div
                    key="confirm-form-pane"
                    initial={isEmbedded ? false : { opacity: 0, x: isRtl ? 15 : -15 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: isRtl ? -15 : 15 }}
                    className="max-w-md mx-auto w-full"
                  >
                    {/* Timezone Display inside SLOTS & FORM side */}
                    {renderTimezoneWidget()}

                    <div className="flex items-center justify-center gap-4 mb-4 pb-2 border-b border-slate-200 dark:border-slate-800 relative">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedSlot(null);
                          setStep("select-slot");
                        }}
                        className={`absolute ${isRtl ? "right-0" : "left-0"} flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition`}
                      >
                        <ChevronLeft className={`w-4 h-4 ${isRtl ? "rotate-0" : "rotate-180"}`} />
                        {translateText("رجوع", "Back")}
                      </button>
                      <h2 className="text-sm font-bold text-slate-700 dark:text-slate-300 text-center">
                        {translateText("تأكيد تفاصيل الحجز", "Confirm Booking")}
                      </h2>
                    </div>

                    <form onSubmit={handleConfirm} className="space-y-4">
                      {isAdmin && (
                        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-xs text-red-500 flex items-center justify-center gap-2">
                          <span>⚠️</span>
                          <span>
                            {translateText(
                              "حسابك الحالي كمشرف لا يسمح لك بإنشاء حجوزات.",
                              "You are logged in as an administrator. You cannot make bookings.",
                            )}
                          </span>
                        </div>
                      )}

                      {/* Location Option Selector & Conditional Inputs */}
                      {calendar.locationOptions && calendar.locationOptions.length > 0 && (
                        <div className="space-y-4 bg-slate-50/50 dark:bg-slate-900/30 p-4 rounded-2xl border border-slate-200/50 dark:border-slate-800/50">
                          {calendar.locationOptions.length > 1 && (
                            <div className="text-center">
                              <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1 text-center">
                                {translateText("اختر موقع الاجتماع", "Select Meeting Location")}
                              </label>
                              <div className="flex flex-wrap gap-2 justify-center">
                                {calendar.locationOptions.map((loc: any) => {
                                  const isSelected = selectedLocation?.id === loc.id;
                                  return (
                                    <button
                                      key={loc.id}
                                      type="button"
                                      onClick={() => {
                                        setSelectedLocation(loc);
                                        setInviteeLocationText("");
                                        setInviteePhoneCallText("");
                                      }}
                                      className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition ${
                                        isSelected
                                          ? "bg-purple-600 border-purple-600 text-white"
                                          : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
                                      }`}
                                    >
                                      {loc.type === "zoom"
                                        ? "Zoom"
                                        : loc.type === "meet"
                                          ? "Google Meet"
                                          : loc.type === "teams"
                                            ? "Microsoft Teams"
                                            : loc.type === "phone"
                                              ? translateText("مكالمة هاتفية", "Phone Call")
                                              : loc.type === "in-person"
                                                ? translateText("حضور شخصي", "In-Person")
                                                : loc.type === "ask-invitee"
                                                  ? translateText("اسأل المدعو", "Ask Invitee")
                                                  : loc.customLabel || loc.label}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {selectedLocation?.type === "ask-invitee" && (
                            <div className="text-center">
                              <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1 text-center">
                                {translateText(
                                  "مكان الاجتماع / العنوان",
                                  "Meeting Location / Address",
                                )}{" "}
                                *
                              </label>
                              <input
                                type="text"
                                required
                                value={inviteeLocationText}
                                onChange={(e) => setInviteeLocationText(e.target.value)}
                                placeholder={translateText(
                                  "أدخل تفاصيل المكان أو الرابط",
                                  "Enter location details or link",
                                )}
                                className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition text-slate-800 dark:text-white text-center"
                              />
                            </div>
                          )}

                          {selectedLocation?.type === "phone" && (
                            <div className="text-center">
                              <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1 text-center">
                                {translateText("رقم الهاتف للمكالمة", "Phone Number for the Call")}{" "}
                                *
                              </label>
                              <input
                                type="tel"
                                required
                                value={inviteePhoneCallText}
                                onChange={(e) => setInviteePhoneCallText(e.target.value)}
                                placeholder={translateText(
                                  "أدخل رقم هاتفك",
                                  "Enter your phone number",
                                )}
                                className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition text-slate-800 dark:text-white text-center"
                              />
                            </div>
                          )}
                        </div>
                      )}

                      {/* Questions from calendar */}
                      {calendar.questions && calendar.questions.length > 0 ? (
                        calendar.questions.map((q: any) => {
                          if (!q.active) return null;

                          // Text Block
                          if (q.type === "text-block") {
                            return (
                              <div
                                key={q.id}
                                className="pt-2 pb-2 text-slate-700 dark:text-slate-300 text-center"
                              >
                                {q.label && (
                                  <h4 className="text-sm font-bold text-slate-800 dark:text-white mb-1 text-center">
                                    {q.label}
                                  </h4>
                                )}
                                <p className="text-xs whitespace-pre-line leading-relaxed text-center">
                                  {q.text}
                                </p>
                              </div>
                            );
                          }

                          // Name
                          if (
                            q.id === 1 ||
                            q.label.toLowerCase().includes("الاسم") ||
                            q.label.toLowerCase().includes("name")
                          ) {
                            return (
                              <div key={q.id} className="text-center">
                                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1 text-center">
                                  {q.label} {q.required && "*"}
                                </label>
                                <input
                                  type="text"
                                  required={q.required}
                                  value={name}
                                  onChange={(e) => setName(e.target.value)}
                                  placeholder={translateText(
                                    "أدخل اسمك بالكامل",
                                    "Enter your full name",
                                  )}
                                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition text-slate-800 dark:text-white text-center"
                                />
                              </div>
                            );
                          }

                          // Email
                          if (
                            q.id === 3 ||
                            q.label.toLowerCase().includes("البريد") ||
                            q.label.toLowerCase().includes("email")
                          ) {
                            return (
                              <div key={q.id} className="text-center">
                                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1 text-center">
                                  {q.label} {q.required && "*"}
                                </label>
                                <input
                                  type="email"
                                  required={q.required}
                                  value={email}
                                  onChange={(e) => setEmail(e.target.value)}
                                  placeholder="name@example.com"
                                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition text-slate-800 dark:text-white text-center"
                                />
                              </div>
                            );
                          }

                          // Phone/WhatsApp
                          if (
                            q.id === 2 ||
                            q.label.toLowerCase().includes("الهاتف") ||
                            q.label.toLowerCase().includes("phone") ||
                            q.label.toLowerCase().includes("واتساب") ||
                            q.label.toLowerCase().includes("whatsapp")
                          ) {
                            return (
                              <div key={q.id} className="text-center">
                                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1 text-center">
                                  {q.label} {q.required && "*"}
                                </label>
                                <input
                                  type="tel"
                                  required={q.required}
                                  value={whatsapp}
                                  onChange={(e) => setWhatsapp(e.target.value)}
                                  placeholder="+20 123 456 7890"
                                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition text-slate-800 dark:text-white text-center"
                                />
                              </div>
                            );
                          }

                          // Guests
                          if (
                            q.id === 4 ||
                            q.label.toLowerCase().includes("ضيوف") ||
                            q.label.toLowerCase().includes("guest")
                          ) {
                            const activeDetails = q.guestDetails || [
                              { id: 1, label: "الاسم", active: true, required: true },
                              { id: 2, label: "البريد الإلكتروني", active: true, required: true },
                            ];
                            const isNameActive = activeDetails[0]?.active !== false;
                            const isEmailActive = activeDetails[1]?.active !== false;

                            return (
                              <div key={q.id} className="w-full space-y-3">
                                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1 text-center">
                                  {q.label} {q.required && "*"}
                                </label>

                                {guestsList.length > 0 && (
                                  <div className="space-y-3 bg-slate-50/50 dark:bg-slate-900/30 p-3 rounded-2xl border border-slate-200/50 dark:border-slate-800/50">
                                    {guestsList.map((g, idx) => (
                                      <div
                                        key={idx}
                                        className="flex gap-2 items-end justify-between border-b border-slate-100 dark:border-slate-805/50 pb-3 last:border-b-0 last:pb-0"
                                      >
                                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2 text-right">
                                          {isNameActive && (
                                            <div>
                                              <label className="text-[10px] font-bold text-slate-500 block mb-1">
                                                {activeDetails[0].label}{" "}
                                                {activeDetails[0].required && "*"}
                                              </label>
                                              <input
                                                type="text"
                                                required={activeDetails[0].required}
                                                value={g.name}
                                                onChange={(e) => {
                                                  const updated = [...guestsList];
                                                  updated[idx].name = e.target.value;
                                                  setGuestsList(updated);
                                                }}
                                                placeholder={translateText(
                                                  "اسم الضيف",
                                                  "Guest Name",
                                                )}
                                                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500 transition text-slate-800 dark:text-white"
                                              />
                                            </div>
                                          )}
                                          {isEmailActive && (
                                            <div>
                                              <label className="text-[10px] font-bold text-slate-500 block mb-1">
                                                {activeDetails[1].label}{" "}
                                                {activeDetails[1].required && "*"}
                                              </label>
                                              <input
                                                type="email"
                                                required={activeDetails[1].required}
                                                value={g.email}
                                                onChange={(e) => {
                                                  const updated = [...guestsList];
                                                  updated[idx].email = e.target.value;
                                                  setGuestsList(updated);
                                                }}
                                                placeholder="guest@example.com"
                                                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500 transition text-slate-800 dark:text-white"
                                              />
                                            </div>
                                          )}
                                        </div>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setGuestsList(guestsList.filter((_, i) => i !== idx));
                                          }}
                                          className="p-2 text-red-500 hover:text-red-650 bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-950/40 rounded-xl transition-all"
                                          title={translateText("حذف الضيف", "Remove Guest")}
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                <button
                                  type="button"
                                  onClick={() => {
                                    setGuestsList([...guestsList, { name: "", email: "" }]);
                                  }}
                                  className="flex items-center justify-center gap-1.5 w-full py-2 border-2 border-dashed border-slate-350 dark:border-slate-800 rounded-xl text-xs font-bold text-purple-600 dark:text-purple-400 hover:bg-purple-50/30 dark:hover:bg-purple-950/10 hover:border-purple-450 dark:hover:border-purple-800 transition-all"
                                >
                                  <Plus className="w-4 h-4" />
                                  <span>{translateText("إضافة ضيف", "Add Guest")}</span>
                                </button>
                              </div>
                            );
                          }

                          // Custom Questions
                          return (
                            <div key={q.id} className="text-center">
                              <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1 text-center">
                                {q.label} {q.required && "*"}
                              </label>
                              {q.type === "long" ? (
                                <textarea
                                  rows={3}
                                  required={q.required}
                                  value={customAnswers[q.id] || ""}
                                  onChange={(e) =>
                                    setCustomAnswers({ ...customAnswers, [q.id]: e.target.value })
                                  }
                                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition resize-none text-slate-800 dark:text-white text-center"
                                />
                              ) : q.type === "radio" || q.type === "select" ? (
                                <div className="flex flex-wrap gap-2 justify-center">
                                  {(q.options || []).map((opt: string) => {
                                    const isSelected = customAnswers[q.id] === opt;
                                    return (
                                      <button
                                        key={opt}
                                        type="button"
                                        onClick={() =>
                                          setCustomAnswers({ ...customAnswers, [q.id]: opt })
                                        }
                                        className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition ${
                                          isSelected
                                            ? "bg-purple-600 border-purple-600 text-white"
                                            : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
                                        }`}
                                      >
                                        {opt}
                                      </button>
                                    );
                                  })}
                                </div>
                              ) : (
                                <input
                                  type="text"
                                  required={q.required}
                                  value={customAnswers[q.id] || ""}
                                  onChange={(e) =>
                                    setCustomAnswers({ ...customAnswers, [q.id]: e.target.value })
                                  }
                                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition text-slate-800 dark:text-white text-center"
                                />
                              )}
                            </div>
                          );
                        })
                      ) : (
                        <div className="text-xs text-slate-500 dark:text-slate-400 text-center py-4">
                          {translateText(
                            "لا توجد أسئلة في هذا التقويم",
                            "No questions in this calendar",
                          )}
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={isSaving || isAdmin}
                        className="w-full mt-6 py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 text-white rounded-2xl font-black text-base shadow-xl shadow-purple-500/20 transition-all flex items-center justify-center gap-2"
                      >
                        {isSaving ? (
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          translateText("تأكيد حجز الموعد", "Confirm Booking Appointment")
                        )}
                      </button>
                    </form>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        ) : (
          // ============================================================
          // SUCCESS SCREEN - All After Booking Settings
          // ============================================================
          <motion.div
            key="success-screen"
            initial={isEmbedded ? false : { opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-8 text-center"
          >
            <CheckCircle className="w-20 h-20 text-emerald-500 mx-auto mb-4 animate-bounce" />
            <h1 className="text-2xl font-black text-slate-800 dark:text-white mb-2">
              {translateText("تم حجز موعدك بنجاح!", "Appointment Booked Successfully!")}
            </h1>

            {/* Confirmation Body */}
            {calendar.afterBooking?.confirmationBody ? (
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed whitespace-pre-line">
                {calendar.afterBooking.confirmationBody}
              </p>
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                {calendar.requireApproval
                  ? translateText(
                      "الموعد حالياً معلق وفي انتظار موافقة المحاضر.",
                      "Your booking is pending approval from the organizer.",
                    )
                  : translateText(
                      "تم تأكيد الموعد وإرسال التفاصيل لبريدك الإلكتروني.",
                      "The appointment has been confirmed and details sent to your email.",
                    )}
              </p>
            )}

            {/* Booking details */}
            <div
              className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-right space-y-2 mb-6"
              style={{ direction: isRtl ? "rtl" : "ltr" }}
            >
              <div className="text-xs text-slate-400 dark:text-slate-500">
                {translateText("تفاصيل الموعد:", "Appointment details:")}
              </div>
              <div className="text-sm font-bold text-slate-700 dark:text-slate-300">
                {translateText("التقويم: ", "Calendar: ")} {calendar.name}
              </div>
              <div className="text-sm font-bold text-slate-700 dark:text-slate-300">
                {translateText("التاريخ: ", "Date: ")} {successBooking.date}
              </div>
              <div className="text-sm font-bold text-slate-700 dark:text-slate-300">
                {translateText("الوقت: ", "Time: ")} {successBooking.time}
              </div>
            </div>

            {/* Cancel/Reschedule Buttons */}
            {calendar.afterBooking?.allowCancelReschedule ? (
              <div className="flex flex-col gap-2 mt-4">
                <div className="flex gap-2">
                  <button
                    onClick={async () => {
                      try {
                        const docKey = `booking-${successBooking.id}-${calendar.userId || userId || ""}`;
                        await firestore.setDoc(
                          firestore.doc(db, "bookings", docKey),
                          { status: "Cancelled" },
                          { merge: true },
                        );
                        toast.success(translateText("تم إلغاء الحجز", "Booking cancelled"));
                        setSuccessBooking(null);
                        setStep("select-slot");
                        setSelectedSlot(null);
                      } catch (err) {
                        toast.error(
                          translateText("حدث خطأ أثناء الإلغاء", "Error cancelling booking"),
                        );
                      }
                    }}
                    className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold transition"
                  >
                    {translateText("إلغاء الحجز", "Cancel Booking")}
                  </button>
                  <button
                    onClick={() => {
                      setReschedulingBookingId(successBooking.id);
                      setSuccessBooking(null);
                      setStep("select-slot");
                      setSelectedSlot(null);
                      toast.info(translateText("اختر موعداً جديداً", "Choose a new time"));
                    }}
                    className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-sm font-bold transition"
                  >
                    {translateText("إعادة جدولة", "Reschedule")}
                  </button>
                </div>
                <button
                  onClick={() => {
                    localStorage.setItem("partner_portal_active_tab", "booking");
                    navigate("/dashboard");
                  }}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition"
                >
                  {translateText("العودة للحجوزات والمكالمات", "Back to Bookings & Calls")}
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  localStorage.setItem("partner_portal_active_tab", "booking");
                  navigate("/dashboard");
                }}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition mt-4"
              >
                {translateText("العودة للحجوزات والمكالمات", "Back to Bookings & Calls")}
              </button>
            )}

            {/* Schedule Another Button */}
            {calendar.afterBooking?.scheduleAnother !== false && (
              <button
                onClick={() => {
                  setSelectedSlot(null);
                  setSuccessBooking(null);
                  setStep("select-slot");
                }}
                className="w-full py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-white font-bold rounded-xl transition mt-3"
              >
                {translateText("حجز موعد آخر", "Book Another Appointment")}
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Checkout Modal */}
      <AnimatePresence>
        {showCheckoutModal && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
            <motion.div
              initial={isEmbedded ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCheckoutModal(false)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-md z-0"
            />
            <motion.div
              initial={isEmbedded ? false : { opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 relative z-10 text-slate-800 dark:text-white"
              style={{ direction: isRtl ? "rtl" : "ltr" }}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2">
                  <span>💳</span>
                  {translateText("إكمال عملية الدفع", "Complete Payment")}
                </h3>
                <button
                  type="button"
                  onClick={() => setShowCheckoutModal(false)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>

              <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800/30 rounded-2xl p-4 mb-6 space-y-2">
                <div className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
                  {translateText("تفاصيل الحجز والطلب", "Booking & Order Details")}
                </div>
                <div className="text-sm font-semibold flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">
                    {translateText("الخدمة/التقويم:", "Service:")}
                  </span>
                  <span className="font-bold">{calendar.name}</span>
                </div>
                <div className="text-sm font-semibold flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">
                    {translateText("التاريخ والوقت:", "Date & Time:")}
                  </span>
                  <span className="font-bold">
                    {selectedSlot?.split("|")[0]} - {getSelectedSlotDisplayTime()}
                  </span>
                </div>
                <div className="text-sm font-semibold flex justify-between border-t border-purple-200/50 dark:border-purple-800/50 pt-2 mt-2">
                  <span className="text-purple-700 dark:text-purple-300 font-bold">
                    {translateText("المجموع المطلوب:", "Total Amount:")}
                  </span>
                  <span className="text-base font-black text-purple-700 dark:text-purple-300">
                    {formatPrice(
                      calendar.price || 0,
                      calendar.currency || "USD",
                      calendar.priceType,
                    )}
                  </span>
                </div>
              </div>

              <form onSubmit={handlePaymentSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">
                    {translateText("اسم صاحب البطاقة", "Cardholder Name")}
                  </label>
                  <input
                    type="text"
                    required
                    value={cardName}
                    onChange={(e) => setCardName(e.target.value)}
                    placeholder="John Doe"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition text-slate-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">
                    {translateText("رقم البطاقة", "Card Number")}
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={19}
                    value={cardNumber}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "");
                      const formatted = val.match(/.{1,4}/g)?.join(" ") || val;
                      setCardNumber(formatted);
                    }}
                    placeholder="xxxx xxxx xxxx xxxx"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition text-slate-800 dark:text-white font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500 block mb-1">
                      {translateText("تاريخ الانتهاء", "Expiry Date")}
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={5}
                      value={cardExpiry}
                      onChange={(e) => {
                        let val = e.target.value.replace(/\D/g, "");
                        if (val.length > 2) {
                          val = val.substring(0, 2) + "/" + val.substring(2, 4);
                        }
                        setCardExpiry(val);
                      }}
                      placeholder="MM/YY"
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition text-slate-800 dark:text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-500 block mb-1">
                      {translateText("الرمز السري (CVV)", "CVV")}
                    </label>
                    <input
                      type="password"
                      required
                      maxLength={3}
                      value={cardCvv}
                      onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, ""))}
                      placeholder="•••"
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition text-slate-800 dark:text-white font-mono"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="w-full mt-6 py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 text-white rounded-2xl font-black text-base shadow-xl shadow-purple-500/20 transition-all flex items-center justify-center gap-2"
                >
                  {isSaving ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    `${translateText("ادفع الآن واحجز الموعد", "Pay & Confirm Booking")} (${formatPrice(calendar.price || 0, calendar.currency || "USD", calendar.priceType)})`
                  )}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Branding - Show project branding (Mandatory Mohamed Joe Brand) */}
      {!isEmbedded && (
        <div className="mt-8 mb-4 flex items-center justify-center gap-1.5 bg-slate-900/60 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/10 shadow-lg z-40 mx-auto w-fit">
        <div className="w-4 h-4 rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 flex items-center justify-center text-[8px] font-black text-black">
          M
        </div>
        <span className="text-[10px] text-white/70 font-semibold tracking-wide">
          Mohamed Joe Brand
        </span>
      </div>
      )}
    </div>
  );
  };

  const isTemplateMode =
    calendar?.templateSettings?.previewMode === "template" ||
    !!queryParams.get("templateId");

  // ============================================================
  // TEMPLATE MODE — native React split rendering (NO iframe/portal)
  // ============================================================
  if (isTemplateMode) {
    if (isTemplateLoading) {
      return <LoadingScreen />;
    }

    // If template failed to load, fall back to standard view
    if (!templateHtmlAbove && !templateHtmlBelow) {
      return renderCalendarBlock();
    }

    // Handle CTA button clicks (scroll-to-calendar, external links, etc.)
    const handleCtaClick = (e: React.MouseEvent<HTMLDivElement>) => {
      const target = e.target as HTMLElement;
      const buttonEl = target.closest('button, a') as HTMLElement | null;
      if (!buttonEl) return;

      const buttonId =
        buttonEl.getAttribute('data-resolved-cta-id') ||
        buttonEl.getAttribute('data-cta-id') ||
        buttonEl.id;
      const config = buttonId ? buttonConfigs?.[buttonId] : null;

      if (config?.actionType === 'scroll_to_calendar') {
        e.preventDefault();
        document.getElementById('booking-calendar-section')?.scrollIntoView({ behavior: 'smooth' });
        return;
      }
      if (config?.actionType === 'external_url' && config.targetUrl) {
        e.preventDefault();
        window.open(config.targetUrl, config.openInNewTab !== false ? '_blank' : '_self');
        return;
      }
      if (config?.actionType === 'open_modal') {
        e.preventDefault();
        setIsModalOpen(true);
        return;
      }
      if (config?.actionType === 'whatsapp' && config.phoneNumber) {
        e.preventDefault();
        window.open(`https://wa.me/${config.phoneNumber.replace(/[^0-9]/g, '')}`, '_blank');
        return;
      }
      // Default: unconfigured button that links to # → scroll to calendar
      if (buttonEl.getAttribute('href') === '#' || buttonEl.tagName === 'BUTTON') {
        e.preventDefault();
        document.getElementById('booking-calendar-section')?.scrollIntoView({ behavior: 'smooth' });
      }
    };

    return (
      <>
        {/* ── ABOVE CALENDAR: isolated srcDoc iframe with full template head ── */}
        {templateHtmlAbove && (
          <iframe
            title="template-above"
            srcDoc={buildSrcDoc(templateHtmlAbove, templateHeadHtml, 'template-above', templateBodyClass, templateTailHtml, buttonConfigs)}
            style={{
              width: '100%',
              height: iframeAboveHeight || '100vh',
              border: 'none',
              display: 'block',
              overflow: 'hidden',
            }}
            scrolling="no"
            sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation"
          />
        )}

        {/* ── STANDARD BOOKING VIEW: native React, fully isolated from template CSS ── */}
        <section
          id="booking-calendar-section"
          style={{ width: '100%', background: 'transparent' }}
        >
          {/* We pass hideOuterWrapper={true} so the calendar renders cleanly as a card without extra headers/padding */}
          {renderCalendarBlock(true, true)}
        </section>

        {/* ── BELOW CALENDAR (footer etc.): isolated srcDoc iframe ── */}
        {templateHtmlBelow && (
          <iframe
            title="template-below"
            srcDoc={buildSrcDoc(templateHtmlBelow, templateHeadHtml, 'template-below', templateBodyClass, templateTailHtml, buttonConfigs)}
            style={{
              width: '100%',
              height: iframeBelowHeight || 300,
              border: 'none',
              display: 'block',
              overflow: 'hidden',
            }}
            scrolling="no"
            sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation"
          />
        )}

        <CalendarModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
          {renderCalendarBlock(true, false)}
        </CalendarModal>
      </>
    );
  }

  // Fallback for non-embedded view
  return renderCalendarBlock();
}
