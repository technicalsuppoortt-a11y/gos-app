import { useState, useEffect, useRef } from "react";
import { useAppState } from "../context/StateContext";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, Send, Loader2 } from "lucide-react";

interface Message {
  id: number;
  sender: "user" | "ai";
  text: string;
  time: string;
}

export default function FloatingChatWidget() {
  const { state } = useAppState();
  const [isOpen, setIsOpen] = useState(false);

  const isRtl = state.settings.language === "ar";
  const t = (ar: string, en: string) => (isRtl ? ar : en);

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Initialize messages once language state is ready
  useEffect(() => {
    setMessages([
      {
        id: 1,
        sender: "ai",
        text: t(
          "مرحباً يا بطل! 👋 أنا مدرب المبيعات الذكي الخاص بك (AI Coach). كيف يمكنني مساعدتك في صفقاتك وعملائك اليوم؟",
          "Hello champ! 👋 I am your sales AI Coach. How can I help you with your deals and leads today?",
        ),
        time: t("الآن", "Now"),
      },
    ]);
  }, [state.settings.language]);

  // Suggestions to display to the partner
  const suggestions = isRtl
    ? [
        "كيف أتعامل مع اعتراض السعر؟",
        "أفضل طريقة لافتتاح مكالمة الاستكشاف",
        "اعطيني تقرير سريع عن العملاء المحتملين",
        "كيف أكتب رسالة متابعة ذكية؟",
      ]
    : [
        "How to handle price objections?",
        "Best way to start a discovery call",
        "Give me a quick leads report",
        "How to write a smart follow-up message?",
      ];

  // Scroll to bottom
  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen, isTyping]);

  useEffect(() => {
    const handleToggle = () => setIsOpen((prev) => !prev);
    const handleOpen = () => setIsOpen(true);
    const handleClose = () => setIsOpen(false);

    window.addEventListener("toggle-ai-coach", handleToggle);
    window.addEventListener("open-ai-coach", handleOpen);
    window.addEventListener("close-ai-coach", handleClose);

    return () => {
      window.removeEventListener("toggle-ai-coach", handleToggle);
      window.removeEventListener("open-ai-coach", handleOpen);
      window.removeEventListener("close-ai-coach", handleClose);
    };
  }, []);

  // Handle User Input Submission
  const handleSubmit = (text: string) => {
    if (!text.trim()) return;

    const timeString = new Date().toLocaleTimeString(isRtl ? "ar-EG" : "en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });

    // Add user message
    const userMsg: Message = {
      id: Date.now(),
      sender: "user",
      text: text.trim(),
      time: timeString,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue("");
    setIsTyping(true);

    // Simulate AI Coaching advice based on context
    setTimeout(() => {
      let replyText = "";
      const lowerText = text.toLowerCase();

      if (
        lowerText.includes("سعر") ||
        lowerText.includes("غالي") ||
        lowerText.includes("price") ||
        lowerText.includes("expensive")
      ) {
        replyText = t(
          "للتعامل مع اعتراض السعر (Price Objection): \n1. لا تدافع عن السعر فوراً بل تفهم العميل: 'مقدر إن الميزانية مهمة ليك'. \n2. اربط القيمة بالعائد: اسأله 'لو الباقة دي هتوفرلك ضعف تكلفتها خلال شهرين، القرار هيبقى إيه؟'. \n3. يمكنك اقتراح باقة Silver كبديل أقل تكلفة لتجربة الخدمة.",
          "To handle a price objection:\n1. Don't defend the price immediately; emphasize empathy: 'I understand budget is important.'\n2. Link value to ROI: Ask 'If this plan saves you twice its cost in 2 months, what would you decide?'\n3. Suggest Silver package as a lower-cost trial alternative.",
        );
      } else if (
        lowerText.includes("افتتاح") ||
        lowerText.includes("الاستكشاف") ||
        lowerText.includes("مكالمة") ||
        lowerText.includes("opening") ||
        lowerText.includes("discovery") ||
        lowerText.includes("script")
      ) {
        replyText = t(
          "أفضل سيناريو لافتتاح مكالمة استكشاف (Discovery Call): \n'إزيك يا [الاسم]، شكراً لوقتك. هدفنا النهاردة نفهم وضعك ومشاكلك الحالية ونشوف هل حلولنا مناسبة ليك ولا لأ. حابب أبدأ بسؤال بسيط عن أكبر تحدي بتواجهه دلوقتي؟'",
          "Best opening script for a Discovery Call:\n'Hi [Name], thanks for your time. Our goal today is to understand your current situation and see if our solutions fit your needs. Let's start with a simple question: What is the biggest challenge you are facing right now?'",
        );
      } else if (
        lowerText.includes("تقرير") ||
        lowerText.includes("عملاء") ||
        lowerText.includes("المحتملين") ||
        lowerText.includes("report") ||
        lowerText.includes("lead") ||
        lowerText.includes("summary")
      ) {
        // Build dynamic context response from actual CRM state
        const allLeads = state.crmBoards.flatMap((b) => b.leads);
        const highScoredLeads = allLeads.filter((l) => l.score >= 80);

        replyText = isRtl
          ? `أهلاً بك. قمت بتحليل قائمة عملائك حالياً: \n- إجمالي العملاء في لوحة التحكم: ${allLeads.length} عميل. \n- لديك ${highScoredLeads.length} عميل ذو احتمالية إغلاق عالية (Score >= 80) وهم: \n  ${highScoredLeads.map((l) => `* ${l.name} (نقاط: ${l.score} - القيمة المتوقعة: $${l.revenue})`).join("\n")}. \nأنصحك بالتركيز عليهم اليوم فوراً!`
          : `Welcome! I analyzed your current lead list: \n- Total clients in dashboard: ${allLeads.length} leads. \n- You have ${highScoredLeads.length} hot leads with high probability of closing (Score >= 80): \n  ${highScoredLeads.map((l) => `* ${l.name} (Score: ${l.score} - Value: $${l.revenue})`).join("\n")}. \nI highly suggest following up with them today!`;
      } else if (
        lowerText.includes("متابعة") ||
        lowerText.includes("رسالة") ||
        lowerText.includes("follow") ||
        lowerText.includes("message")
      ) {
        replyText = t(
          "سيناريو رسالة متابعة ذكية بعد ٢٤ ساعة بدون رد: \n'أهلاً [الاسم]، حابب أتأكد إنك شفت رسالتي السابقة وتفاصيل عرض السعر. هل عندك أي استفسار بخصوص الباقات المتاحة قبل ما ننقل للخطوة الجاية؟'",
          "Script for a smart follow-up message after 24h with no reply:\n'Hi [Name], just checking if you saw my previous message and price details. Do you have any questions about the packages before we move to the next step?'",
        );
      } else {
        replyText = t(
          "فهمت سؤالك جيداً. كمدرب مبيعات، أنصحك دائماً بالتركيز على إيجاد الفجوة (Gap) بين وضع العميل الحالي ووضعه المستقبلي المرغوب، وتوضيح كيف لباقات Joe Partner أن تسد هذه الفجوة. هل حابب نتدرب على سيناريو محدد؟",
          "I understand your question. As a sales coach, I advise focusing on the gap between the prospect's current state and their desired future state, illustrating how Joe Partner packages bridge this gap. Would you like to practice a specific scenario?",
        );
      }

      const aiMsg: Message = {
        id: Date.now() + 1,
        sender: "ai",
        text: replyText,
        time: timeString,
      };

      setMessages((prev) => [...prev, aiMsg]);
      setIsTyping(false);
    }, 1200);
  };

  const containerPosition = isRtl ? "right-4 md:right-6" : "left-4 md:left-auto md:right-6";
  const panelAlignment = isRtl ? "right-0" : "left-0 md:left-auto md:right-0";

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className={`fixed bottom-20 md:bottom-6 z-40 font-sans pointer-events-none support-chat-widget-isolated ${containerPosition}`}
          dir={isRtl ? "rtl" : "ltr"}
        >
          {/* Chat Sliding Panel */}
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={`pointer-events-auto absolute bottom-0 w-[380px] max-w-[calc(100vw-2rem)] h-[520px] chat-container rounded-2xl shadow-2xl flex flex-col overflow-hidden backdrop-blur-xl ${panelAlignment}`}
            style={{
              background: "#0c1012",
              border: "1px solid rgba(255, 255, 255, 0.09)",
              boxShadow: "0 10px 30px -8px rgba(5, 189, 145, 0.55)",
            }}
          >
            {/* Header */}
            <div
              className="p-4 text-white flex items-center justify-between border-b"
              style={{
                background: "#0c1012",
                borderColor: "rgba(255, 255, 255, 0.09)",
              }}
            >
              <div className="flex items-center gap-2">
                <div
                  className="h-9 w-9 rounded-xl flex items-center justify-center animate-pulse shrink-0"
                  style={{
                    background: "rgba(255, 255, 255, 0.08)",
                    border: "1px solid rgba(255, 255, 255, 0.09)",
                    color: "#0dce9e",
                  }}
                >
                  <Sparkles className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h4
                    className="text-xs font-bold flex items-center gap-1.5"
                    style={{ color: "#eef3f1" }}
                  >
                    <span>{t("مدرب المبيعات الذكي", "AI Sales Coach")}</span>
                    <span
                      className="text-[9px] px-1.5 py-0.5 rounded font-black border"
                      style={{
                        background: "rgba(255, 255, 255, 0.08)",
                        color: "#0dce9e",
                        borderColor: "rgba(255, 255, 255, 0.09)",
                      }}
                    >
                      AI COACH
                    </span>
                  </h4>
                  <p className="text-[9px]" style={{ color: "#8b9994" }}>
                    {t(
                      "مساعد الإغلاق والتوجيه الفوري الخاص بك",
                      "Your instant closing & coaching assistant",
                    )}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg hover:bg-white/10 transition"
                style={{ color: "#8b9994" }}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Message Area */}
            <div
              className="flex-1 overflow-y-auto p-4 space-y-3.5"
              style={{ background: "#0c1012" }}
            >
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-2.5 max-w-[85%] ${
                    msg.sender === "user"
                      ? isRtl
                        ? "mr-auto flex-row-reverse text-right"
                        : "ml-auto flex-row text-left"
                      : isRtl
                        ? "ml-auto flex-row text-right"
                        : "mr-auto flex-row-reverse text-left"
                  }`}
                  style={{ direction: isRtl ? "rtl" : "ltr" }}
                >
                  {/* Avatar bubble */}
                  <div
                    className={`h-7 w-7 rounded-lg shrink-0 flex items-center justify-center text-[10px] font-bold ${
                      msg.sender === "user" ? "text-white" : "border"
                    }`}
                    style={
                      msg.sender === "user"
                        ? { background: "#0dce9e" }
                        : {
                            background: "rgba(255, 255, 255, 0.08)",
                            color: "#0dce9e",
                            borderColor: "rgba(255, 255, 255, 0.09)",
                          }
                    }
                  >
                    {msg.sender === "user" ? t("أنا", "Me") : "AI"}
                  </div>

                  <div className="space-y-1">
                    <div
                      className={`p-3 rounded-2xl text-[11px] leading-relaxed whitespace-pre-line ${
                        msg.sender === "user"
                          ? isRtl
                            ? "rounded-tr-none"
                            : "rounded-tl-none"
                          : isRtl
                            ? "rounded-tl-none"
                            : "rounded-tr-none"
                      }`}
                      style={
                        msg.sender === "user"
                          ? {
                              background: "linear-gradient(120deg, #0dce9e 0%, #028ec1 100%)",
                              color: "#eef3f1",
                            }
                          : {
                              background: "rgba(255, 255, 255, 0.06)",
                              color: "#eef3f1",
                            }
                      }
                    >
                      {msg.text}
                    </div>
                    <span
                      className={`text-[8px] block font-mono ${msg.sender === "user" ? "text-left" : "text-right"}`}
                      style={{ color: "#5d6d68" }}
                    >
                      {msg.time}
                    </span>
                  </div>
                </div>
              ))}

              {/* Typing indicator */}
              {isTyping && (
                <div
                  className="flex gap-2.5 ml-auto max-w-[85%]"
                  style={{ direction: isRtl ? "rtl" : "ltr" }}
                >
                  <div
                    className="h-7 w-7 rounded-lg shrink-0 flex items-center justify-center text-[10px] font-bold border"
                    style={{
                      background: "rgba(255, 255, 255, 0.08)",
                      color: "#0dce9e",
                      borderColor: "rgba(255, 255, 255, 0.09)",
                    }}
                  >
                    AI
                  </div>
                  <div
                    className={`p-3 flex items-center gap-1 ${
                      isRtl ? "rounded-tl-none" : "rounded-tr-none"
                    }`}
                    style={{
                      background: "rgba(255, 255, 255, 0.06)",
                      color: "#eef3f1",
                    }}
                  >
                    <Loader2
                      className="h-3.5 w-3.5 animate-spin shrink-0"
                      style={{ color: "#0dce9e" }}
                    />
                    <span className="text-[10px]" style={{ color: "#8b9994" }}>
                      {t("يقوم المدرب بصياغة نصيحة...", "Coach is writing advice...")}
                    </span>
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            {/* Suggestions pill container */}
            {messages.length === 1 && (
              <div
                className="p-3 border-t space-y-2"
                style={{
                  background: "#0c1012",
                  borderColor: "rgba(255, 255, 255, 0.09)",
                }}
              >
                <span className="text-[9px] font-bold block px-1" style={{ color: "#8b9994" }}>
                  {t("اقتراحات سريعة لتبدأ:", "Quick suggestions to start:")}
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {suggestions.map((sug, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSubmit(sug)}
                      className="px-2.5 py-1.5 border rounded-xl text-[9px] font-semibold transition hover:bg-white/5"
                      style={{
                        background: "#07090b",
                        borderColor: "rgba(255, 255, 255, 0.09)",
                        color: "#eef3f1",
                      }}
                    >
                      {sug}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input Bar */}
            <div
              className="p-3 border-t"
              style={{
                background: "#0c1012",
                borderColor: "rgba(255, 255, 255, 0.09)",
              }}
            >
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSubmit(inputValue);
                }}
                className="flex gap-1.5"
              >
                <input
                  type="text"
                  placeholder={t(
                    "اسأل المدرب عن اعتراض، سيناريو، أو عميل...",
                    "Ask about an objection, script, or lead...",
                  )}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl text-[11px] focus:outline-none focus:ring-1 transition"
                  style={{
                    background: "rgba(255, 255, 255, 0.05)",
                    border: "1px solid rgba(255, 255, 255, 0.09)",
                    color: "#eef3f1",
                    textAlign: isRtl ? "right" : "left",
                    outlineColor: "#0dce9e",
                    caretColor: "#0dce9e",
                  }}
                />
                <button
                  type="submit"
                  className="p-2 text-white rounded-xl transition flex items-center justify-center shrink-0 hover:scale-105"
                  style={{
                    background: "#0dce9e",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#2ef0b8";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "#0dce9e";
                  }}
                >
                  <Send className="h-4.5 w-4.5" />
                </button>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
