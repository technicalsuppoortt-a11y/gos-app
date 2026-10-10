import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { db, firestore } from "../config/firebase";
import StandardBookingView from "../components/StandardBookingView";

export default function BookingSuccess() {
  const [searchParams] = useSearchParams();
  const templateId = searchParams.get("templateId");
  const bookingId = searchParams.get("bookingId");
  
  const [htmlContent, setHtmlContent] = useState<string | null>(null);
  const [bookingData, setBookingData] = useState<any>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTemplateAndBooking = async () => {
      setLoading(true);
      try {
        if (!templateId) {
          setError(true);
          setLoading(false);
          return;
        }

        // 1. Fetch Template: try partnerLandingPages first, fallback to systemTemplates
        let tplSnap = await firestore.getDoc(firestore.doc(db, "partnerLandingPages", templateId));
        if (!tplSnap.exists()) {
          tplSnap = await firestore.getDoc(firestore.doc(db, "systemTemplates", templateId));
        }
        
        if (!tplSnap.exists()) {
          console.warn("Template not found in partnerLandingPages or systemTemplates:", templateId);
          setError(true);
          setLoading(false);
          return;
        }

        let rawHtml = tplSnap.data()?.htmlCode || "";

        // 2. Fetch booking details if bookingId is provided
        if (bookingId) {
          try {
            let bookingSnap = await firestore.getDoc(firestore.doc(db, "bookings", bookingId));
            if (!bookingSnap.exists()) {
              bookingSnap = await firestore.getDoc(firestore.doc(db, "meetings", bookingId));
            }

            if (bookingSnap.exists()) {
              const bData = bookingSnap.data();
              setBookingData(bData);
              // Hydrate template variables
              rawHtml = rawHtml.replace(/\{\{customerName\}\}/g, bData.name || bData.customerName || "");
              rawHtml = rawHtml.replace(/\{\{customerEmail\}\}/g, bData.email || bData.customerEmail || "");
              rawHtml = rawHtml.replace(/\{\{customerPhone\}\}/g, bData.whatsapp || bData.phone || "");
              rawHtml = rawHtml.replace(/\{\{bookingDate\}\}/g, bData.date || bData.bookingDate || "");
              rawHtml = rawHtml.replace(/\{\{bookingTime\}\}/g, bData.time || bData.bookingTime || "");
              rawHtml = rawHtml.replace(/\{\{bookingId\}\}/g, bookingId);
              rawHtml = rawHtml.replace(/\{\{serviceName\}\}/g, bData.serviceName || bData.calendarName || "");
            }
          } catch (bErr) {
            console.warn("Could not load booking details:", bErr);
          }
        }
        
        setHtmlContent(rawHtml);
      } catch (err) {
        console.error("Error loading success page:", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchTemplateAndBooking();
  }, [templateId, bookingId]);

  // Graceful Fallback: Render Standard Confirmation Page if template fails or is missing
  if (error || (!loading && !htmlContent)) {
    return (
      <StandardBookingView
        initialSuccessBooking={bookingData || (bookingId ? { id: bookingId } : null)}
      />
    );
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-[#0f1015]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return <div className="w-full min-h-screen" dangerouslySetInnerHTML={{ __html: htmlContent || "" }} />;
}
