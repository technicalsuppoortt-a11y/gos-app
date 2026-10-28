import { useState, useEffect, useRef } from "react";
import { useAppState } from "../../context/StateContext";
import { useAuth } from "../../context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  MessageSquare,
  Search,
  Users,
  X,
  Mic,
  Smile,
  Info,
  Paperclip,
  Play,
  Pause,
  FileText,
  FileImage,
  FileVideo,
  FileAudio,
  FileArchive,
  FileCode,
  FileSpreadsheet,
  File as FileIcon,
  XCircle,
  CornerDownLeft,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  Download,
  Reply,
  Copy,
  StopCircle,
  Trash2,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import EmojiPicker from "emoji-picker-react";
import { db, firestore, mediaStorage } from "../../config/firebase";

// Mock online users
const ONLINE_USERS = [903, 901, 902, 904];

// ============================================================
// getFileIcon - Helper function defined OUTSIDE component
// ============================================================
const getFileIcon = (fileName: string) => {
  const ext = fileName.split(".").pop()?.toLowerCase() || "";
  if (["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp", "ico"].includes(ext)) {
    return FileImage;
  }
  if (["mp4", "webm", "avi", "mov", "mkv", "flv"].includes(ext)) {
    return FileVideo;
  }
  if (["mp3", "wav", "ogg", "flac", "aac", "m4a"].includes(ext)) {
    return FileAudio;
  }
  if (["zip", "rar", "7z", "tar", "gz", "bz2"].includes(ext)) {
    return FileArchive;
  }
  if (
    [
      "js",
      "ts",
      "jsx",
      "tsx",
      "html",
      "css",
      "json",
      "xml",
      "py",
      "java",
      "cpp",
      "c",
      "go",
      "rs",
      "php",
      "rb",
    ].includes(ext)
  ) {
    return FileCode;
  }
  if (["xls", "xlsx", "csv", "ods"].includes(ext)) {
    return FileSpreadsheet;
  }
  if (["pdf", "doc", "docx", "txt", "rtf", "md"].includes(ext)) {
    return FileText;
  }
  return FileIcon;
};

export default function CommunitySection() {
  const { state, updateState } = useAppState();
  const { userProfile, isAdmin, users } = useAuth();
  const partners = users.filter((u) => u.role !== "admin");

  const isRtl = state.settings.language === "ar";
  const t = (ar: string, en: string) => (isRtl ? ar : en);

  // State
  const [activeDmPartnerId, setActiveDmPartnerId] = useState<string | null>(
    isAdmin ? null : userProfile?.uid || null,
  );

  const [activeChatIds, setActiveChatIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isAdmin && partners.length > 0 && !activeDmPartnerId) {
      const firstActivePartner = partners.find((p) => activeChatIds.has(p.uid));
      if (firstActivePartner) {
        setActiveDmPartnerId(firstActivePartner.uid);
      }
    }
  }, [isAdmin, partners, activeDmPartnerId, activeChatIds]);

  const [messages, setMessages] = useState<any[]>([]);

  useEffect(() => {
    if (!activeDmPartnerId) return;
    const q = firestore.query(
      firestore.collection(db, "support_chats"),
      firestore.where("chatId", "==", activeDmPartnerId),
    );
    const unsub = firestore.onSnapshot(q, (snap: any) => {
      const msgs = snap.docs.map((d: any) => ({
        id: d.id,
        ...d.data(),
      })).filter((m: any) => !m.isInit);
      msgs.sort((a: any, b: any) => (a.createdAt || 0) - (b.createdAt || 0));
      setMessages(msgs);
    });
    return () => unsub();
  }, [activeDmPartnerId]);

  // Mark support chat messages as read when loaded in the active chat view
  useEffect(() => {
    const unreadMsgs = messages.filter(
      (m) => m.authorId !== (userProfile?.uid || "999") && !m.read,
    );
    if (unreadMsgs.length > 0) {
      unreadMsgs.forEach(async (m) => {
        try {
          await firestore.updateDoc(firestore.doc(db, "support_chats", m.id), {
            read: true,
          });
        } catch (err) {
          console.error("Failed to mark chat message as read:", err);
        }
      });
    }
  }, [messages, userProfile]);

  useEffect(() => {
    if (!isAdmin) return;
    const q = firestore.collection(db, "support_chats");
    const unsub = firestore.onSnapshot(q, (snap: any) => {
      const ids = new Set<string>();
      snap.docs.forEach((d: any) => {
        const data = d.data();
        if (data.chatId) ids.add(data.chatId);
      });
      setActiveChatIds(ids);
    });
    return () => unsub();
  }, [isAdmin]);

  const [typedMessage, setTypedMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  const [newChatSearchQuery, setNewChatSearchQuery] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const [mobileView, setMobileView] = useState<"list" | "chat">(isAdmin ? "list" : "chat");

  // Reply State
  const [replyTo, setReplyTo] = useState<{
    messageId: string | number;
    sender: string;
    text: string;
    isOwn: boolean;
  } | null>(null);

  // Voice Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlayingVoice, setIsPlayingVoice] = useState(false);
  const [voiceProgress, setVoiceProgress] = useState(0);
  const [playingMessageId, setPlayingMessageId] = useState<string | number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Attachment State
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [filePreviews, setFilePreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Message Context Menu
  const [contextMenu, setContextMenu] = useState<{
    messageId: string | number;
    messageText: string;
    sender: string;
    isOwn: boolean;
    position: { top: number; left: number };
  } | null>(null);

  // Info Modal State
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);

  // Chat scroll anchor
  const chatEndRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<Map<string | number, HTMLDivElement>>(new Map());
  const inputContainerRef = useRef<HTMLDivElement>(null);

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close context menu on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (contextMenu) {
        const target = event.target as HTMLElement;
        if (!target.closest(".context-menu-container") && !target.closest(".message-options-btn")) {
          setContextMenu(null);
        }
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [contextMenu]);

  // Auto scroll to bottom
  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [activeDmPartnerId, messages]);

  // Cleanup recording on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      filePreviews.forEach((preview) => URL.revokeObjectURL(preview));
    };
  }, []);

  const uploadChatFile = async (file: File): Promise<string> => {
    const { isFirebaseMocked } = await import("../../config/firebase");
    if (mediaStorage && !isFirebaseMocked) {
      const { ref, uploadBytes, getDownloadURL } = await import("firebase/storage");
      const fileRef = ref(mediaStorage, `chat_attachments/${Date.now()}_${file.name}`);
      await uploadBytes(fileRef, file);
      return await getDownloadURL(fileRef);
    }
    return URL.createObjectURL(file);
  };

  // Handle Send Message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!typedMessage.trim() && selectedFiles.length === 0) return;

    let messageText = typedMessage.trim();

    // Upload files if any
    const uploadedFiles: any[] = [];
    if (selectedFiles.length > 0) {
      const uploadToastId = toast.loading(t("جاري رفع الملفات...", "Uploading files..."));
      for (const file of selectedFiles) {
        try {
          const downloadUrl = await uploadChatFile(file);
          uploadedFiles.push({
            name: file.name,
            size: file.size,
            type: file.type,
            dataUrl: downloadUrl,
          });
        } catch (err) {
          console.error("File upload failed:", err);
          toast.error(t(`فشل رفع ${file.name}`, `Failed to upload ${file.name}`));
        }
      }
      toast.dismiss(uploadToastId);
    }

    const replyContext = replyTo
      ? {
          replyToId: replyTo.messageId,
          replyToSender: replyTo.sender,
          replyToText: replyTo.text,
        }
      : undefined;

    try {
      const msgData: any = {
        chatId: activeDmPartnerId,
        authorId: userProfile?.uid || "999",
        authorName: userProfile?.name || "Support",
        text: messageText,
        createdAt: Date.now(),
        files: uploadedFiles,
        ...(replyContext ? { replyContext } : {}),
      };

      await firestore.addDoc(firestore.collection(db, "support_chats"), msgData);
    } catch (err) {
      console.error(err);
      toast.error(t("فشل إرسال الرسالة", "Failed to send message"));
    }

    setTypedMessage("");
    setShowEmojiPicker(false);
    setSelectedFiles([]);
    setFilePreviews([]);
    setReplyTo(null);
  };

  // ============================================================
  // FILE ATTACHMENT HANDLERS
  // ============================================================
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newFiles: File[] = [];
    const newPreviews: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size > 10 * 1024 * 1024) {
        toast.error(
          t(
            `الملف ${file.name} كبير جداً (الحد الأقصى 10MB)`,
            `File ${file.name} is too large (max 10MB)`,
          ),
        );
        continue;
      }
      newFiles.push(file);

      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (e) => {
          if (e.target?.result) {
            newPreviews.push(e.target.result as string);
          }
        };
        reader.readAsDataURL(file);
      } else {
        newPreviews.push("");
      }
    }

    setSelectedFiles((prev) => [...prev, ...newFiles]);
    setFilePreviews((prev) => [...prev, ...newPreviews]);

    toast.success(t(`تم إضافة ${newFiles.length} ملف`, `${newFiles.length} file(s) added`));
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setFilePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + " MB";
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + " GB";
  };

  // ============================================================
  // REAL VOICE RECORDING
  // ============================================================
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      const chunks: Blob[] = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        if (chunks.length === 0) {
          toast.warning(t("لم يتم تسجيل أي صوت", "No audio recorded"));
          return;
        }
        const blob = new Blob(chunks, { type: "audio/webm" });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);

        if (audioRef.current) {
          audioRef.current.src = url;
        }

        toast.success(t("تم تسجيل الرسالة الصوتية", "Voice message recorded"));
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);

      toast.info(t("جاري التسجيل... اضغط على إيقاف للإنهاء", "Recording... Press stop to finish"));
    } catch (error) {
      console.error("Error accessing microphone:", error);
      toast.error(t("لا يمكن الوصول إلى المايكروفون", "Cannot access microphone"));
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {}
      mediaRecorderRef.current = null;
      setIsRecording(false);
    }

    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    if (streamRef.current) {
      try {
        streamRef.current.getTracks().forEach((track) => {
          track.stop();
          track.enabled = false;
        });
        streamRef.current = null;
      } catch (e) {}
    }

    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }

    setRecordingDuration(0);
    setVoiceProgress(0);
    setIsPlayingVoice(false);
    setPlayingMessageId(null);

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }

    mediaRecorderRef.current = null;

    toast.info(t("تم إلغاء التسجيل", "Recording cancelled"));
  };

  const sendVoiceMessage = async () => {
    if (!audioUrl) return;

    let finalAudioUrl = audioUrl;
    try {
      const response = await fetch(audioUrl);
      const blob = await response.blob();
      const file = new File([blob], `voice_${Date.now()}.webm`, { type: "audio/webm" });
      finalAudioUrl = await uploadChatFile(file);
    } catch (err) {
      console.error("Failed to upload voice message:", err);
    }

    const duration = recordingDuration;

    try {
      const msgData: any = {
        chatId: activeDmPartnerId,
        authorId: userProfile?.uid || "999",
        authorName: userProfile?.name || "Support",
        text: `🎤 رسالة صوتية`,
        createdAt: Date.now(),
        isVoice: true,
        duration: duration,
        audioData: finalAudioUrl,
      };

      await firestore.addDoc(firestore.collection(db, "support_chats"), msgData);
      toast.success(t("تم إرسال الرسالة الصوتية", "Voice message sent"));
    } catch (err) {
      console.error(err);
      toast.error(t("فشل إرسال الرسالة الصوتية", "Failed to send voice message"));
    }

    setAudioUrl(null);
    setRecordingDuration(0);
    setVoiceProgress(0);
    setIsPlayingVoice(false);
    setPlayingMessageId(null);
    mediaRecorderRef.current = null;
  };

  // Handle audio playback
  const togglePlayAudio = (messageId: number, audioData: string) => {
    if (playingMessageId === messageId && isPlayingVoice) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setIsPlayingVoice(false);
      setPlayingMessageId(null);
      setVoiceProgress(0);
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    const audio = new Audio(audioData);
    audioRef.current = audio;

    audio.play();
    setIsPlayingVoice(true);
    setPlayingMessageId(messageId);
    setVoiceProgress(0);

    audio.ontimeupdate = () => {
      if (audio.duration) {
        const progress = (audio.currentTime / audio.duration) * 100;
        setVoiceProgress(progress);
      }
    };

    audio.onended = () => {
      setIsPlayingVoice(false);
      setPlayingMessageId(null);
      setVoiceProgress(0);
    };

    audio.onerror = () => {
      toast.error(t("حدث خطأ في تشغيل الصوت", "Error playing audio"));
      setIsPlayingVoice(false);
      setPlayingMessageId(null);
      setVoiceProgress(0);
    };
  };

  // ============================================================
  // CONTEXT MENU HANDLERS
  // ============================================================
  const openMessageOptions = (messageId: string | number, event: React.MouseEvent) => {
    event.stopPropagation();

    const el = messageRefs.current.get(messageId as any);
    if (!el) return;

    const msg = messages.find((m) => m.id === messageId);
    if (!msg) return;

    const isOwn = msg.authorId === userProfile?.uid;
    let senderName = t("مستخدم", "User");
    if (isOwn) {
      senderName = t("أنت", "You");
    } else if (isAdmin) {
      const partner = users.find((u) => u.uid === msg.authorId);
      senderName = partner ? partner.name : t("شريك", "Partner");
    } else {
      senderName = t(" فريق جو", "Joe Team Support");
    }

    const isOwnSender = isOwn;
    let messageText = msg.text || "";
    if (msg.isVoice) {
      messageText = "🎤 رسالة صوتية";
    } else if (msg.files && msg.files.length > 0) {
      messageText = `📎 ملفات: ${msg.files.map((f: any) => f.name).join(", ")}`;
    }

    const container = el.closest(".chat-messages-container") as HTMLElement | null;
    if (!container) return;

    const rect = el.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    let top = rect.bottom - containerRect.top + 8;

    let left;
    const menuWidth = 160;
    if (isOwnSender) {
      left = rect.right - containerRect.left - menuWidth;
      if (left < 10) left = 10;
    } else {
      left = rect.left - containerRect.left + 10;
      if (left + menuWidth > container.offsetWidth - 10) {
        left = container.offsetWidth - menuWidth - 10;
      }
      if (left < 10) left = 10;
    }

    setContextMenu({
      messageId: messageId as any,
      messageText,
      sender: senderName,
      isOwn: isOwnSender,
      position: { top, left },
    });
  };

  const handleCopyMessage = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success(t("تم نسخ الرسالة", "Message copied"));
    setContextMenu(null);
  };

  const handleDeleteMessage = async (messageId: string | number) => {
    try {
      await firestore.deleteDoc(firestore.doc(db, "support_chats", String(messageId)));
      toast.success(t("تم حذف الرسالة بنجاح", "Message deleted successfully"));
    } catch (err) {
      console.error("Failed to delete message:", err);
      toast.error(t("فشل حذف الرسالة", "Failed to delete message"));
    }
    setContextMenu(null);
  };

  const handleReplyMessage = (
    messageId: string | number,
    sender: string,
    text: string,
    isOwn: boolean,
  ) => {
    const msg = messages.find((m) => m.id === messageId);

    if (msg) {
      setReplyTo({
        messageId: msg.id,
        sender: isOwn ? t("أنت", "You") : sender,
        text: msg.text || (msg.isVoice ? "🎤 رسالة صوتية" : ""),
        isOwn: isOwn,
      });

      const input = document.querySelector('input[type="text"]') as HTMLInputElement;
      if (input) {
        input.focus();
      }

      if (inputContainerRef.current) {
        inputContainerRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
      }
    }
    setContextMenu(null);
  };

  const cancelReply = () => {
    setReplyTo(null);
  };

  // ============================================================
  // INFO MODAL HANDLERS
  // ============================================================
  const openInfoModal = () => {
    setIsInfoModalOpen(true);
  };

  const closeInfoModal = () => {
    setIsInfoModalOpen(false);
  };

  // Get channel or user info
  const getInfoData = () => {
    if (!isAdmin) {
      return {
        type: "user",
        name: t(" فريق جو", "Joe Team Support"),
        level: "Admin",
        sales: 0,
        revenue: 0,
        streak: 0,
        online: true,
      };
    }
    const partner = partners.find((p) => p.uid === activeDmPartnerId);
    return {
      type: "user",
      name: partner?.name || "Unknown",
      level: partner?.level || "Silver",
      sales: partner?.sales || 0,
      revenue: partner?.revenue || 0,
      streak: partner?.streak || 0,
      online: activeDmPartnerId !== null ? isUserOnline(activeDmPartnerId) : false,
    };
  };

  // Check if user is online
  const isUserOnline = (userId: string) => {
    const uProfile = users.find((u) => u.uid === userId);
    if (!uProfile) {
      if (userId === "999") {
        // Find any admin user and check if they are online
        const adminUser = users.find((u) => u.role === "admin");
        if (adminUser && adminUser.lastActive) {
          const lastActiveTime =
            typeof adminUser.lastActive === "string"
              ? new Date(adminUser.lastActive).getTime()
              : Number(adminUser.lastActive);
          return Date.now() - lastActiveTime < 70000;
        }
      }
      return false;
    }
    if (!uProfile.lastActive) return false;
    const lastActiveTime =
      typeof uProfile.lastActive === "string"
        ? new Date(uProfile.lastActive).getTime()
        : Number(uProfile.lastActive);
    return Date.now() - lastActiveTime < 70000;
  };

  // Get active partner info for DM title
  const activeDmPartner = isAdmin
    ? partners.find((p) => p.uid === activeDmPartnerId)
    : { name: t(" فريق جو", "Joe Team Support"), level: "Admin", uid: "999" };

  const filteredPartners = partners.filter((p) => {
    const matchesSearch = (p.name || "").toLowerCase().includes(searchQuery.toLowerCase());
    const hasChatOrIsActive = !isAdmin || activeChatIds.has(p.uid) || p.uid === activeDmPartnerId;
    return matchesSearch && hasChatOrIsActive;
  });

  // Format duration
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const infoData = getInfoData();

  // ----- RENDER -----
  return (
    <div
      className="flex flex-col h-[calc(100vh-7.5rem)] md:h-[calc(100vh-10rem)] bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl font-sans relative"
      dir={isRtl ? "rtl" : "ltr"}
    >
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,.pdf,.doc,.docx,.txt,.xls,.xlsx,.csv,.zip,.rar,.js,.ts,.html,.css,.json,.xml,.py,.java,.cpp,.c,.go,.rs,.php,.rb,.md,.rtf"
        className="hidden"
        onChange={handleFileSelect}
      />

      <div className="flex flex-1 min-h-0">
        {/* ============================================================ */}
        {/* 1. Sidebar - hidden on mobile, shown on md+ */}
        {/* ============================================================ */}
        {isAdmin && (
          <div
            className={`${
              mobileView === "list" ? "flex w-full" : "hidden"
            } md:flex w-full md:w-64 lg:w-80 flex-col border-slate-200/60 dark:border-slate-700/60 bg-slate-50/80 dark:bg-slate-900/80 ${
              isRtl ? "border-l" : "border-r"
            }`}
          >
            {/* Sidebar Header */}
            <div className="p-4 border-b border-slate-200/60 dark:border-slate-700/60 space-y-3 bg-white/50 dark:bg-slate-900/50">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-base text-slate-800 dark:text-white flex items-center gap-2">
                  <Users className="h-5 w-5 text-purple-500" />
                  <span>{t("استفسارات الدعم", "Support Inquiries")}</span>
                </h3>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      setNewChatSearchQuery("");
                      setIsNewChatModalOpen(true);
                    }}
                    className="p-1.5 bg-purple-500 hover:bg-purple-600 text-white rounded-lg shadow-sm shadow-purple-500/20 transition-all"
                    title={t("محادثة جديدة", "New Chat")}
                  >
                    <Plus className="h-4.5 w-4.5" />
                  </button>
                )}
              </div>

              {/* Search bar */}
              <div className="relative">
                <Search
                  className={`absolute ${
                    isRtl ? "right-3" : "left-3"
                  } top-2.5 h-4 w-4 text-slate-400 dark:text-slate-500`}
                />
                <input
                  type="text"
                  placeholder={t("ابحث عن شريك...", "Search partner...")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full ${
                    isRtl ? "pr-9 pl-4 text-right" : "pl-9 pr-4 text-left"
                  } py-2 bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500`}
                />
              </div>
            </div>

            {/* Lists Container */}
            <div className="flex-1 overflow-y-auto p-3 space-y-4">
              <div className="space-y-1">
                <span
                  className={`text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase px-3 block mb-1 ${
                    isRtl ? "text-right" : "text-left"
                  }`}
                >
                  {t("الشركاء", "Partners")}
                </span>
                {filteredPartners.map((partner) => (
                  <button
                    type="button"
                    key={partner.uid}
                    onClick={() => {
                      setActiveDmPartnerId(partner.uid);
                      setMobileView("chat");
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition ${
                      isRtl ? "text-right" : "text-left"
                    } ${
                      activeDmPartnerId === partner.uid
                        ? "bg-purple-500/15 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 font-bold"
                        : "text-slate-600 dark:text-slate-300 hover:bg-slate-100/50 dark:hover:bg-slate-800/50"
                    }`}
                  >
                    <div className="relative">
                      <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500/20 to-fuchsia-500/20 dark:from-indigo-500/30 dark:to-fuchsia-500/30 flex items-center justify-center font-bold text-xs text-purple-600 dark:text-purple-300 shrink-0">
                        {partner.name
                          .split(" ")
                          .map((w) => w[0])
                          .slice(0, 2)
                          .join("")}
                      </div>
                      <div
                        className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-slate-900 ${
                          isUserOnline(partner.uid)
                            ? "bg-emerald-500"
                            : "bg-slate-400 dark:bg-slate-600"
                        }`}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center">
                        <span className="truncate text-slate-700 dark:text-slate-200">
                          {partner.name}
                        </span>
                        {partner.streak !== undefined && partner.streak > 5 && (
                          <span
                            className="text-[9px] text-amber-500 dark:text-amber-400 flex items-center gap-0.5"
                            title="Streak active"
                          >
                            🔥 {partner.streak}
                          </span>
                        )}
                      </div>
                      <span className="text-[9px] text-slate-400 dark:text-slate-500 block truncate">
                        {isUserOnline(partner.uid)
                          ? t("🟢 متصل الآن", "🟢 Online")
                          : t("⚪ غير متصل", "⚪ Offline")}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Current user bar */}
            <div className="p-3 bg-slate-100/80 dark:bg-slate-800/80 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center gap-3">
              <div className="relative">
                <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white font-extrabold text-xs flex items-center justify-center shrink-0">
                  {(userProfile?.name || "Joe Partner")
                    .split(" ")
                    .map((w: string) => w[0])
                    .slice(0, 2)
                    .join("")}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-slate-800 bg-emerald-500" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-xs font-bold text-slate-800 dark:text-white block truncate">
                  {userProfile?.name || "Joe Partner"}
                </span>
                <span className="text-[10px] text-emerald-500 dark:text-emerald-400 block font-semibold">
                  {t("🟢 متصل الآن", "🟢 Online")}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* 2. Main Chat Workspace */}
        {/* ============================================================ */}
        <div
          className={`${
            mobileView === "chat" ? "flex w-full" : "hidden"
          } md:flex flex-1 flex-col bg-white/60 dark:bg-slate-900/60 relative min-h-0`}
        >
          {/* Chat Header */}
          <div className="h-14 md:h-16 px-4 md:px-6 border-b border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between bg-white/80 dark:bg-slate-900/80 backdrop-blur-md shrink-0">
            <div className="flex items-center gap-3">
              {/* Back Button for mobile */}
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => setMobileView("list")}
                  className="md:hidden p-2 -ml-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition shrink-0"
                  title={t("رجوع", "Back")}
                >
                  {isRtl ? (
                    <ChevronRight className="h-5 w-5" />
                  ) : (
                    <ChevronLeft className="h-5 w-5" />
                  )}
                </button>
              )}

              <div className="relative">
                <div className="h-10 w-10 rounded-xl bg-purple-500/10 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                  <span className="font-extrabold text-sm">
                    {activeDmPartner?.name
                      ?.split(" ")
                      ?.map((w) => w[0])
                      ?.slice(0, 2)
                      ?.join("") || "SP"}
                  </span>
                </div>
                {activeDmPartnerId !== null && (
                  <div
                    className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-slate-900 ${
                      isUserOnline(activeDmPartnerId)
                        ? "bg-emerald-500"
                        : "bg-slate-400 dark:bg-slate-600"
                    }`}
                  />
                )}
              </div>
              <div>
                <h4 className="font-extrabold text-sm text-slate-800 dark:text-white">
                  {activeDmPartner?.name}
                </h4>
                <div className="flex items-center gap-2">
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                    {activeDmPartnerId !== null && isUserOnline(activeDmPartnerId)
                      ? t("🟢 متصل الآن", "🟢 Online")
                      : t("⚪ غير متصل", "⚪ Offline")}
                  </p>
                  {activeDmPartnerId !== null && isUserOnline(activeDmPartnerId) && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={openInfoModal}
                className="p-2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                title={t("معلومات", "Info")}
              >
                <Info className="h-4.5 w-4.5" />
              </button>
            </div>
          </div>

          {/* Message Feed Area - Improved colors */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 bg-gradient-to-b from-white/40 to-slate-50/40 dark:from-slate-900/40 dark:to-slate-800/30 chat-messages-container relative">
            {(() => {
              const currentMsgs = messages;

              if (currentMsgs.length === 0) {
                return (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-3">
                    <div className="p-4 rounded-full bg-purple-500/10 dark:bg-purple-500/20 text-purple-500">
                      <MessageSquare className="h-8 w-8 animate-pulse" />
                    </div>
                    <div className="space-y-1">
                      <h5 className="font-bold text-sm text-slate-700 dark:text-slate-300">
                        {t("لا توجد رسائل بعد", "No messages yet")}
                      </h5>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500">
                        {t(
                          "ابدأ المحادثة الآن وشارك الفريق!",
                          "Start the conversation and connect with the team!",
                        )}
                      </p>
                    </div>
                  </div>
                );
              }

              return currentMsgs.map((msg) => {
                const isOwn = msg.authorId === userProfile?.uid;

                let senderName = t("مستخدم", "User");
                if (isOwn) {
                  senderName = t("أنت", "You");
                } else if (isAdmin) {
                  const partner = users.find((u) => u.uid === msg.authorId);
                  senderName = partner ? partner.name : t("شريك", "Partner");
                } else {
                  senderName = t(" فريق جو", "Joe Team Support");
                }

                const sender = {
                  name: senderName,
                  isMe: isOwn,
                };

                const msgTime = msg.createdAt
                  ? new Date(msg.createdAt).toLocaleTimeString(isRtl ? "ar-EG" : "en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : msg.time || "";

                return (
                  <div
                    key={msg.id}
                    ref={(el) => {
                      if (el) {
                        messageRefs.current.set(msg.id, el);
                      }
                    }}
                    className={`flex gap-3 max-w-[80%] relative group ${
                      isOwn
                        ? isRtl
                          ? "ml-auto mr-0 flex-row"
                          : "mr-auto ml-0 flex-row-reverse"
                        : isRtl
                          ? "mr-auto ml-0 flex-row-reverse"
                          : "ml-auto mr-0 flex-row"
                    }`}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      openMessageOptions(msg.id, e);
                    }}
                  >
                    {/* Sender Avatar */}
                    <div
                      className={`h-8 w-8 rounded-lg shrink-0 flex items-center justify-center text-[10px] font-black uppercase ${
                        isOwn
                          ? "bg-purple-600 text-white"
                          : "bg-gradient-to-br from-indigo-500/20 to-fuchsia-500/20 dark:from-indigo-500/30 dark:to-fuchsia-500/30 text-purple-700 dark:text-purple-300"
                      }`}
                    >
                      {sender.name
                        .split(" ")
                        .map((w) => w[0])
                        .slice(0, 2)
                        .join("")}
                    </div>

                    {/* Message Bubble Container */}
                    <div className="space-y-1 relative">
                      {/* Author and Date metadata - Improved colors */}
                      <div
                        className={`flex items-center gap-2 text-[9px] ${
                          isOwn
                            ? isRtl
                              ? "justify-start"
                              : "justify-end"
                            : isRtl
                              ? "justify-end"
                              : "justify-start"
                        }`}
                      >
                        <span
                          className={`font-bold ${
                            isOwn
                              ? "text-purple-600 dark:text-purple-400"
                              : "text-slate-700 dark:text-slate-300"
                          }`}
                        >
                          {isOwn ? t("أنت", "You") : sender.name}
                        </span>
                        <span className="text-slate-400 dark:text-slate-500">•</span>
                        <span className="font-mono text-slate-400 dark:text-slate-500">
                          {msgTime}
                        </span>
                        {isOwn && (
                          <span className="text-[8px] text-purple-400 dark:text-purple-300">
                            ✓✓
                          </span>
                        )}
                      </div>

                      {/* Reply Context */}
                      {msg.replyContext && (
                        <div
                          className={`flex items-center gap-1.5 text-[10px] ${
                            isOwn
                              ? "text-purple-200 dark:text-purple-300"
                              : "text-slate-500 dark:text-slate-400"
                          } border-r-2 border-purple-400 dark:border-purple-500 pr-2`}
                        >
                          <CornerDownLeft className="w-3 h-3" />
                          <span className="font-medium">{msg.replyContext.replyToSender}</span>
                          <span className="truncate max-w-[120px] opacity-70">
                            {msg.replyContext.replyToText}
                          </span>
                        </div>
                      )}

                      {/* Text block - Improved colors */}
                      <div
                        className={`p-3.5 rounded-2xl text-xs leading-relaxed break-words whitespace-pre-wrap shadow-sm ${
                          isOwn
                            ? `bg-gradient-to-br from-purple-600 to-purple-700 dark:from-purple-500 dark:to-purple-600 text-white ${
                                isRtl ? "rounded-tr-none" : "rounded-tl-none"
                              }`
                            : `bg-white dark:bg-slate-800/90 text-slate-800 dark:text-slate-200 border border-slate-200/60 dark:border-slate-700/60 ${
                                isRtl ? "rounded-tl-none" : "rounded-tr-none"
                              }`
                        }`}
                      >
                        {msg.isVoice ? (
                          <div className="flex items-center gap-3 min-w-[180px]">
                            <button
                              onClick={() => togglePlayAudio(msg.id, msg.audioData || "")}
                              className={`w-8 h-8 rounded-full flex items-center justify-center transition ${
                                isOwn
                                  ? "bg-white/20 hover:bg-white/30 text-white"
                                  : "bg-purple-500/20 dark:bg-purple-500/30 hover:bg-purple-500/40 text-purple-600 dark:text-purple-400"
                              }`}
                            >
                              {playingMessageId === msg.id && isPlayingVoice ? (
                                <Pause className="w-4 h-4" />
                              ) : (
                                <Play className="w-4 h-4" />
                              )}
                            </button>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <div
                                  className={`flex-1 h-1.5 rounded-full overflow-hidden ${
                                    isOwn ? "bg-white/20" : "bg-slate-300 dark:bg-slate-600"
                                  }`}
                                >
                                  <div
                                    className={`h-full rounded-full transition-all duration-300 ${
                                      isOwn ? "bg-white/80" : "bg-purple-500 dark:bg-purple-400"
                                    }`}
                                    style={{
                                      width: `${playingMessageId === msg.id ? voiceProgress : 0}%`,
                                    }}
                                  />
                                </div>
                                <span
                                  className={`text-[10px] font-mono whitespace-nowrap ${
                                    isOwn ? "text-white/80" : "text-slate-500 dark:text-slate-400"
                                  }`}
                                >
                                  {formatDuration(msg.duration || 0)}
                                </span>
                              </div>
                            </div>
                          </div>
                        ) : msg.files && msg.files.length > 0 ? (
                          <div className="space-y-2">
                            {msg.text && (
                              <div className="whitespace-pre-wrap break-words">{msg.text}</div>
                            )}
                            <div className="space-y-1.5 mt-2">
                              {msg.files.map((file: any, idx: number) => {
                                const FileIcon = getFileIcon(file.name);
                                const isImage = file.type?.startsWith("image/");
                                return (
                                  <div
                                    key={idx}
                                    className={`flex items-center gap-3 p-2 rounded-lg ${
                                      isOwn
                                        ? "bg-white/10 dark:bg-white/10"
                                        : "bg-slate-100 dark:bg-slate-700/50"
                                    }`}
                                  >
                                    {isImage ? (
                                      <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                                        <img
                                          src={file.dataUrl}
                                          alt={file.name}
                                          className="w-full h-full object-cover"
                                        />
                                      </div>
                                    ) : (
                                      <div
                                        className={`p-2 rounded-lg ${
                                          isOwn
                                            ? "bg-white/20 dark:bg-white/20"
                                            : "bg-slate-200 dark:bg-slate-600"
                                        }`}
                                      >
                                        <FileIcon
                                          className={`w-5 h-5 ${
                                            isOwn
                                              ? "text-white"
                                              : "text-slate-600 dark:text-slate-300"
                                          }`}
                                        />
                                      </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                      <div
                                        className={`text-xs font-medium truncate ${
                                          isOwn
                                            ? "text-white"
                                            : "text-slate-700 dark:text-slate-200"
                                        }`}
                                      >
                                        {file.name}
                                      </div>
                                      <div
                                        className={`text-[9px] ${
                                          isOwn
                                            ? "text-white/70"
                                            : "text-slate-500 dark:text-slate-400"
                                        }`}
                                      >
                                        {formatFileSize(file.size)}
                                      </div>
                                    </div>
                                    <a
                                      href={file.dataUrl}
                                      download={file.name}
                                      className={`p-1.5 rounded-lg transition ${
                                        isOwn
                                          ? "hover:bg-white/20 text-white/80 hover:text-white"
                                          : "hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white"
                                      }`}
                                      title={t("تحميل", "Download")}
                                    >
                                      <Download className="w-4 h-4" />
                                    </a>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ) : (
                          msg.text
                        )}
                      </div>

                      {/* Options Button (three dots) */}
                      <button
                        onClick={(e) => openMessageOptions(msg.id, e)}
                        className={`message-options-btn absolute ${
                          isOwn
                            ? isRtl
                              ? "-left-10"
                              : "-right-10"
                            : isRtl
                              ? "-right-10"
                              : "-left-10"
                        } top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-slate-200/80 dark:bg-slate-700/80 text-slate-500 dark:text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-purple-100 dark:hover:bg-purple-900/30 hover:text-purple-600 dark:hover:text-purple-400 z-10`}
                        title={t("خيارات", "Options")}
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              });
            })()}

            <div ref={chatEndRef} />
          </div>

          {/* ============================================================ */}
          {/* 3. CONTEXT MENU */}
          {/* ============================================================ */}
          {contextMenu && (
            <div
              className="absolute z-[9999] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl py-1.5 min-w-[140px] context-menu-container"
              style={{
                top: contextMenu.position.top,
                left: contextMenu.position.left,
                maxWidth: "180px",
              }}
            >
              {/* Reply Button */}
              <button
                onClick={() =>
                  handleReplyMessage(
                    contextMenu.messageId,
                    contextMenu.sender,
                    contextMenu.messageText,
                    contextMenu.isOwn,
                  )
                }
                className="w-full px-4 py-2.5 text-xs font-medium flex items-center gap-3 transition text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <Reply className="w-4 h-4" />
                {t("رد", "Reply")}
              </button>

              {/* Divider */}
              <div className="border-t border-slate-200 dark:border-slate-700 my-1" />

              {/* Copy Button */}
              <button
                onClick={() => handleCopyMessage(contextMenu.messageText)}
                className="w-full px-4 py-2.5 text-xs font-medium flex items-center gap-3 transition text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <Copy className="w-4 h-4" />
                {t("نسخ", "Copy")}
              </button>

              {/* Delete Button (Only for own messages) */}
              {contextMenu.isOwn && (
                <>
                  <div className="border-t border-slate-200 dark:border-slate-700 my-1" />
                  <button
                    onClick={() => handleDeleteMessage(contextMenu.messageId)}
                    className="w-full px-4 py-2.5 text-xs font-medium flex items-center gap-3 transition text-red-650 hover:bg-red-50 dark:hover:bg-red-950/20"
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                    <span className="text-red-550 dark:text-red-400">{t("حذف", "Delete")}</span>
                  </button>
                </>
              )}
            </div>
          )}

          {/* ============================================================ */}
          {/* 4. Input Container - Fixed at bottom */}
          {/* ============================================================ */}
          <div ref={inputContainerRef} className="shrink-0">
            <div className="p-3 border-t border-slate-200/60 dark:border-slate-700/60 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
              {/* Reply Indicator */}
              {replyTo && (
                <div className="flex items-center justify-between mb-2 px-3 py-2 bg-purple-50 dark:bg-purple-950/30 rounded-xl border border-purple-200 dark:border-purple-800">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <CornerDownLeft className="w-4 h-4 text-purple-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-bold text-purple-600 dark:text-purple-400">
                        {t(`رد على ${replyTo.sender}`, `Replying to ${replyTo.sender}`)}
                      </span>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {replyTo.text}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={cancelReply}
                    className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                    title={t("إلغاء الرد", "Cancel reply")}
                  >
                    <X className="w-4 h-4 text-slate-400" />
                  </button>
                </div>
              )}

              {/* Recording indicator - Improved colors */}
              {isRecording && (
                <div className="flex items-center gap-3 mb-2 px-3 py-2 bg-rose-50 dark:bg-rose-950/30 rounded-xl border border-rose-200 dark:border-rose-800">
                  <div className="flex items-center gap-2 flex-1">
                    <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                    <span className="text-xs font-bold text-rose-600 dark:text-rose-400">
                      {t("جاري التسجيل...", "Recording...")}
                    </span>
                    <span className="text-xs font-mono text-rose-500 dark:text-rose-400">
                      {formatDuration(recordingDuration)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={cancelRecording}
                      className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1"
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      {t("إلغاء", "Cancel")}
                    </button>
                    <button
                      type="button"
                      onClick={stopRecording}
                      className="px-3 py-1 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold transition hover:bg-slate-300 dark:hover:bg-slate-600 flex items-center gap-1"
                    >
                      <StopCircle className="h-3.5 w-3.5" />
                      {t("إيقاف", "Stop")}
                    </button>
                  </div>
                </div>
              )}

              {/* Audio preview after recording - Improved colors */}
              {audioUrl && !isRecording && (
                <div className="flex items-center gap-3 mb-2 px-3 py-2 bg-purple-50 dark:bg-purple-950/30 rounded-xl border border-purple-200 dark:border-purple-800">
                  <div className="flex items-center gap-2 flex-1">
                    <button
                      onClick={() => {
                        if (isPlayingVoice) {
                          if (audioRef.current) {
                            audioRef.current.pause();
                          }
                          setIsPlayingVoice(false);
                          setVoiceProgress(0);
                        } else {
                          const audio = new Audio(audioUrl);
                          audioRef.current = audio;
                          audio.play();
                          setIsPlayingVoice(true);
                          setVoiceProgress(0);
                          audio.ontimeupdate = () => {
                            if (audio.duration) {
                              setVoiceProgress((audio.currentTime / audio.duration) * 100);
                            }
                          };
                          audio.onended = () => {
                            setIsPlayingVoice(false);
                            setVoiceProgress(0);
                          };
                        }
                      }}
                      className="w-8 h-8 rounded-full bg-purple-500/20 dark:bg-purple-500/30 flex items-center justify-center hover:bg-purple-500/40 transition"
                    >
                      {isPlayingVoice ? (
                        <Pause className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      ) : (
                        <Play className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      )}
                    </button>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-slate-300 dark:bg-slate-600 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-purple-500 rounded-full transition-all duration-300"
                            style={{ width: `${isPlayingVoice ? voiceProgress : 0}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-mono text-purple-600 dark:text-purple-400 whitespace-nowrap">
                          {formatDuration(recordingDuration)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={cancelRecording}
                      className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1"
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      {t("إلغاء", "Cancel")}
                    </button>
                    <button
                      type="button"
                      onClick={sendVoiceMessage}
                      className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1"
                    >
                      <Send className="h-3.5 w-3.5" />
                      {t("إرسال", "Send")}
                    </button>
                  </div>
                </div>
              )}

              {/* File attachments preview - Improved colors */}
              {selectedFiles.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {selectedFiles.map((file, index) => {
                    const FileIcon = getFileIcon(file.name);
                    const isImage = file.type.startsWith("image/");
                    return (
                      <div
                        key={index}
                        className="flex items-center gap-2 px-2 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700"
                      >
                        {isImage && filePreviews[index] ? (
                          <div className="w-8 h-8 rounded overflow-hidden flex-shrink-0">
                            <img
                              src={filePreviews[index]}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <FileIcon className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                        )}
                        <span className="text-[10px] font-medium truncate max-w-[100px] text-slate-700 dark:text-slate-300">
                          {file.name}
                        </span>
                        <span className="text-[8px] text-slate-400 dark:text-slate-500">
                          {formatFileSize(file.size)}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeFile(index)}
                          className="p-0.5 hover:text-rose-500 transition"
                        >
                          <XCircle className="w-3.5 h-3.5 text-slate-400 hover:text-rose-500" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              <form onSubmit={handleSendMessage} className="flex gap-1 md:gap-2 items-center">
                <div className="relative" ref={emojiPickerRef}>
                  <button
                    type="button"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="p-1.5 md:p-2.5 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                    title={t("إيموجي", "Emoji")}
                  >
                    <Smile className="h-5 w-5" />
                  </button>
                  {showEmojiPicker && (
                    <div className="absolute bottom-full mb-2 z-50">
                      <EmojiPicker
                        onEmojiClick={(emoji) => {
                          setTypedMessage((prev) => prev + emoji.emoji);
                          setShowEmojiPicker(false);
                        }}
                        width={300}
                        height={350}
                        theme={state.settings.theme as any}
                      />
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={startRecording}
                  disabled={isRecording || !!audioUrl}
                  className={`p-1.5 md:p-2.5 rounded-xl transition ${
                    isRecording
                      ? "text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-950/30 animate-pulse"
                      : audioUrl
                        ? "text-slate-300 dark:text-slate-600 cursor-not-allowed"
                        : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                  title={t("تسجيل صوتي", "Voice Record")}
                >
                  <Mic className="h-5 w-5" />
                </button>

                <button
                  type="button"
                  onClick={triggerFileInput}
                  className="p-1.5 md:p-2.5 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  title={t("إرفاق ملف", "Attach File")}
                >
                  <Paperclip className="h-5 w-5" />
                </button>

                <input
                  type="text"
                  placeholder={
                    isRecording
                      ? t("جاري التسجيل...", "Recording...")
                      : replyTo
                        ? t(`رد على ${replyTo.sender}...`, `Reply to ${replyTo.sender}...`)
                        : t("اكتب رسالتك هنا...", "Write your message here...")
                  }
                  value={typedMessage}
                  onChange={(e) => setTypedMessage(e.target.value)}
                  disabled={isRecording || !!audioUrl}
                  className={`flex-1 px-3 md:px-4 py-2 bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 ${
                    isRecording || audioUrl ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                  style={{ textAlign: isRtl ? "right" : "left" }}
                />

                <button
                  type="submit"
                  disabled={
                    (!typedMessage.trim() && selectedFiles.length === 0) ||
                    isRecording ||
                    !!audioUrl
                  }
                  className={`px-3 md:px-5 py-2 md:py-2.5 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white rounded-2xl text-xs md:text-sm font-bold transition flex items-center justify-center gap-1.5 shadow-md shadow-purple-500/20 dark:shadow-purple-500/30 shrink-0 ${
                    (!typedMessage.trim() && selectedFiles.length === 0) || isRecording || audioUrl
                      ? "opacity-50 cursor-not-allowed"
                      : ""
                  }`}
                >
                  <Send className="h-4 w-4" />
                  <span className="hidden md:inline">{t("إرسال", "Send")}</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 5. INFO MODAL */}
      {/* ============================================================ */}
      <AnimatePresence>
        {isInfoModalOpen && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeInfoModal}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl p-6 z-10 font-sans"
            >
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
                <h4 className="font-extrabold text-base text-slate-800 dark:text-white flex items-center gap-2">
                  <Info className="h-5 w-5 text-purple-500" />
                  <span>{t("معلومات", "Info")}</span>
                </h4>
                <button
                  type="button"
                  onClick={closeInfoModal}
                  className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-indigo-500/20 to-fuchsia-500/20 dark:from-indigo-500/30 dark:to-fuchsia-500/30 flex items-center justify-center font-bold text-lg text-purple-600 dark:text-purple-300">
                    {infoData.name
                      ?.split(" ")
                      .map((w: string) => w[0])
                      .slice(0, 2)
                      .join("")}
                  </div>
                  <div>
                    <div className="font-bold text-sm text-slate-800 dark:text-white">
                      {infoData.name}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-xs text-slate-550 dark:text-slate-400">
                        {infoData.level}
                      </span>
                      <span
                        className={`w-2 h-2 rounded-full ${infoData.online ? "bg-emerald-500" : "bg-slate-400"}`}
                      />
                      <span className="text-[10px] text-slate-400 dark:text-slate-500">
                        {infoData.online ? t("متصل", "Online") : t("غير متصل", "Offline")}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 text-center">
                    <div className="text-lg font-bold text-slate-800 dark:text-white">
                      {infoData.sales}
                    </div>
                    <div className="text-[10px] text-slate-400 dark:text-slate-500">
                      {t("صفقات", "Sales")}
                    </div>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 text-center">
                    <div className="text-lg font-bold text-emerald-500">
                      ${infoData.revenue?.toLocaleString()}
                    </div>
                    <div className="text-[10px] text-slate-400 dark:text-slate-500">
                      {t("إيرادات", "Revenue")}
                    </div>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 text-center">
                    <div className="text-lg font-bold text-amber-500">🔥 {infoData.streak}</div>
                    <div className="text-[10px] text-slate-400 dark:text-slate-500">
                      {t("أيام متتالية", "Streak")}
                    </div>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 text-center">
                    <div className="text-lg font-bold text-purple-500">{infoData.level}</div>
                    <div className="text-[10px] text-slate-400 dark:text-slate-500">
                      {t("المستوى", "Level")}
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={closeInfoModal}
                className="w-full mt-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-bold transition"
              >
                {t("إغلاق", "Close")}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ============================================================ */}
      {/* 6. NEW CHAT MODAL */}
      {/* ============================================================ */}
      <AnimatePresence>
        {isNewChatModalOpen && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsNewChatModalOpen(false)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl p-5 z-10 flex flex-col max-h-[85vh] font-sans"
              dir={isRtl ? "rtl" : "ltr"}
            >
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3 mb-4 shrink-0">
                <h4 className="font-extrabold text-base text-slate-800 dark:text-white flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-purple-500" />
                  <span>{t("محادثة جديدة", "New Conversation")}</span>
                </h4>
                <button
                  type="button"
                  onClick={() => setIsNewChatModalOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="relative mb-4 shrink-0">
                <Search
                  className={`absolute ${isRtl ? "right-3" : "left-3"} top-2.5 h-4 w-4 text-slate-400 dark:text-slate-500`}
                />
                <input
                  type="text"
                  placeholder={t("ابحث بالاسم أو الإيميل...", "Search by name or email...")}
                  value={newChatSearchQuery}
                  onChange={(e) => setNewChatSearchQuery(e.target.value)}
                  className={`w-full ${isRtl ? "pr-9 pl-4 text-right" : "pl-9 pr-4 text-left"} py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500`}
                />
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 min-h-[300px]">
                {partners
                  .filter((p) => {
                    const q = newChatSearchQuery.toLowerCase();
                    return p.name?.toLowerCase().includes(q) || p.email?.toLowerCase().includes(q);
                  })
                  .map((partner) => (
                    <button
                      key={partner.uid}
                      type="button"
                      onClick={async () => {
                        setActiveDmPartnerId(partner.uid);
                        setMobileView("chat");
                        setIsNewChatModalOpen(false);

                        if (!activeChatIds.has(partner.uid)) {
                          try {
                            await firestore.addDoc(firestore.collection(db, "support_chats"), {
                              chatId: partner.uid,
                              authorId: "system",
                              authorName: "System",
                              isInit: true,
                              text: "Chat Initiated",
                              createdAt: Date.now(),
                              read: true
                            });
                          } catch (err) {
                            console.error("Failed to initialize chat", err);
                          }
                        }
                      }}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border border-transparent hover:border-slate-200 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all ${isRtl ? "text-right" : "text-left"}`}
                    >
                      <div className="relative">
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-fuchsia-500/20 dark:from-indigo-500/30 dark:to-fuchsia-500/30 flex items-center justify-center font-bold text-sm text-purple-600 dark:text-purple-300 shrink-0">
                          {partner.name
                            ?.split(" ")
                            .map((w: string) => w[0])
                            .slice(0, 2)
                            .join("")}
                        </div>
                        <div
                          className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-slate-900 ${isUserOnline(partner.uid) ? "bg-emerald-500" : "bg-slate-400 dark:bg-slate-600"}`}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-sm text-slate-800 dark:text-white truncate">
                          {partner.name}
                        </div>
                        {partner.email && (
                          <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                            {partner.email}
                          </div>
                        )}
                      </div>
                      <ChevronLeft
                        className={`w-5 h-5 text-slate-400 ${isRtl ? "" : "rotate-180"}`}
                      />
                    </button>
                  ))}
                {partners.filter((p) => {
                  const q = newChatSearchQuery.toLowerCase();
                  return p.name?.toLowerCase().includes(q) || p.email?.toLowerCase().includes(q);
                }).length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2">
                    <Search className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {t("لم يتم العثور على شركاء", "No partners found")}
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
