import sarah from "../../assets/inbox/sarah.jpg";
import omar from "../../assets/inbox/omar.jpg";
import lina from "../../assets/inbox/lina.jpg";
import ahmed from "../../assets/inbox/ahmed.jpg";
import nour from "../../assets/inbox/nour.jpg";
import karim from "../../assets/inbox/karim.jpg";
import diana from "../../assets/inbox/diana.jpg";
import youssef from "../../assets/inbox/youssef.jpg";
import mona from "../../assets/inbox/mona.jpg";
import hassan from "../../assets/inbox/hassan.jpg";
import mohamed from "../../assets/inbox/mohamed.jpg";

export type ChannelId = "instagram" | "facebook" | "whatsapp" | "messenger" | "webchat";
export type TagId = "new" | "interested" | "booking" | "question";
export type Sender = "customer" | "ai" | "agent" | "note";
export type ActivityKind = "ai" | "customer" | "tag" | "created" | "agent" | "note" | "handoff";

export type Attachment = { id: string; name: string; size: number; url: string; isImage: boolean };
export type VoiceNote = { url: string; duration: number };

export type Message = {
  id: string;
  sender: Sender;
  text?: string;
  time: string;
  card?: "consultation";
  attachments?: Attachment[];
  voice?: VoiceNote;
};

export type Activity = { id: string; kind: ActivityKind; text: string; time: string };

export type Conversation = {
  id: string;
  name: string;
  avatar?: string;
  initials: string;
  channel: ChannelId;
  preview: string;
  time: string;
  unread: number;
  tags: TagId[];
  stage: string;
  source: string;
  phone: string;
  email: string;
  location: string;
  assignee: string;
  aiAutoReply: boolean;
  takenOver: boolean;
  followUp: boolean;
  followUpRules: boolean[];
  starred: boolean;
  messages: Message[];
  activity: Activity[];
};

export const channelMeta: Record<ChannelId, { label: string }> = {
  instagram: { label: "Instagram" },
  facebook: { label: "Facebook" },
  whatsapp: { label: "WhatsApp" },
  messenger: { label: "Messenger" },
  webchat: { label: "Website Chat" },
};

export const channelOrder: ChannelId[] = ["instagram", "facebook", "whatsapp", "messenger", "webchat"];

export const tagMeta: Record<TagId, { label: string; className: string }> = {
  new: {
    label: "New Lead",
    className: "bg-rose-50 text-rose-500 dark:bg-rose-500/15 dark:text-rose-300",
  },
  interested: {
    label: "Interested",
    className: "bg-blue-50 text-blue-500 dark:bg-blue-500/15 dark:text-blue-300",
  },
  booking: {
    label: "Booking",
    className: "bg-orange-50 text-orange-500 dark:bg-orange-500/15 dark:text-orange-300",
  },
  question: {
    label: "Question",
    className: "bg-purple-50 text-purple-500 dark:bg-purple-500/15 dark:text-purple-300",
  },
};

export const stages = ["New Lead", "Contacted", "Interested", "Booking", "Customer", "Lost"];

export const teamMembers = [
  { id: "mohamed", name: "Mohamed Joe", avatar: mohamed, initials: "MJ" },
  { id: "sara", name: "Sara Adel", initials: "SA" },
  { id: "youssef", name: "Youssef Kamal", initials: "YK" },
  { id: "ai", name: "AI Agent", initials: "AI" },
];

export const currentUser = teamMembers[0];

export const followUpRuleLabels = [
  "Auto-reply to new messages",
  "Send follow-up if no response (24h)",
  "Qualify and book consultations",
];

export const replyTemplates = [
  {
    title: "Pricing overview",
    body: "Here are our coaching plans:\n- **Basic Plan** – €97/month\n- **Pro Plan** – €197/month (most popular)\n- **VIP Plan** – €297/month\n\nEvery plan includes workout plans, nutrition guidance and weekly check-ins.",
  },
  {
    title: "Book a free consultation",
    body: "I'd love to understand your goals better. You can book a free 20-minute consultation at a time that suits you — just pick a slot from our calendar.",
  },
  {
    title: "Online coaching",
    body: "Yes! Our coaching is 100% online, so you can join from anywhere. You'll get your plan in the app and weekly video check-ins with your coach.",
  },
  {
    title: "Thanks & follow-up",
    body: "Thank you for reaching out! Let me know if you have any other questions — I'm happy to help you get started.",
  },
];

let seed = 0;
const uid = (prefix: string) => `${prefix}-${++seed}`;

const quickThread = (customer: string, time: string, ai?: string, aiTime?: string): Message[] => [
  { id: uid("m"), sender: "customer", text: customer, time },
  ...(ai ? [{ id: uid("m"), sender: "ai" as const, text: ai, time: aiTime ?? time }] : []),
];

const baseActivity = (created: string, extra: Activity[] = []): Activity[] => [
  ...extra,
  { id: uid("a"), kind: "created", text: "Conversation created", time: created },
];

const rules = (a = true, b = true, c = true) => [a, b, c];

export const initialConversations: Conversation[] = [
  {
    id: "c-sarah",
    name: "Sarah Ahmed",
    avatar: sarah,
    initials: "SA",
    channel: "instagram",
    preview: "Hi, I'm interested in your coaching program...",
    time: "2 min ago",
    unread: 3,
    tags: ["new", "interested"],
    stage: "New Lead",
    source: "Instagram Ad",
    phone: "+20 123 456 7890",
    email: "sarah.ahmed@gmail.com",
    location: "Cairo, Egypt",
    assignee: "Mohamed Joe",
    aiAutoReply: true,
    takenOver: false,
    followUp: true,
    followUpRules: rules(),
    starred: false,
    messages: [
      {
        id: uid("m"),
        sender: "customer",
        text: "Hi, I'm interested in your coaching program. Can you tell me more about it?",
        time: "10:24 AM",
      },
      {
        id: uid("m"),
        sender: "ai",
        text: "Hi Sarah! 👋\nThanks for your interest in our coaching program.\n\nOur program includes personalized workout plans, nutrition guidance, and ongoing support to help you reach your goals faster.\n\nWould you like me to share the available plans and prices?",
        time: "10:25 AM",
      },
      {
        id: uid("m"),
        sender: "customer",
        text: "Yes please! Also, do you have online coaching? I'm currently in a different city.",
        time: "10:26 AM",
      },
      {
        id: uid("m"),
        sender: "ai",
        text: "Yes, we do! Our coaching program is 100% online.\n\nHere are our main plans:\n- **Basic Plan** – €97/month\n- **Pro Plan** – €197/month (most popular)\n- **VIP Plan** – €297/month\n\nEach plan includes workout plans, nutrition guidance and weekly check-ins.\n\nYou can book a free consultation here:",
        time: "10:28 AM",
        card: "consultation",
      },
    ],
    activity: baseActivity("12 min ago", [
      { id: uid("a"), kind: "ai", text: "AI sent message", time: "2 min ago" },
      { id: uid("a"), kind: "customer", text: "Customer replied", time: "4 min ago" },
      { id: uid("a"), kind: "tag", text: "Tag added: Interested", time: "12 min ago" },
    ]),
  },
  {
    id: "c-omar",
    name: "Omar Khaled",
    avatar: omar,
    initials: "OK",
    channel: "whatsapp",
    preview: "Do you have online coaching?",
    time: "7 min ago",
    unread: 1,
    tags: ["interested"],
    stage: "Interested",
    source: "WhatsApp Click-to-Chat",
    phone: "+20 100 284 1123",
    email: "omar.khaled@outlook.com",
    location: "Alexandria, Egypt",
    assignee: "Mohamed Joe",
    aiAutoReply: true,
    takenOver: false,
    followUp: true,
    followUpRules: rules(),
    starred: true,
    messages: quickThread(
      "Hey! I saw your transformation posts. Do you have online coaching?",
      "10:19 AM",
      "Hi Omar! Yes — all our programs are fully online with weekly check-ins. Would you like to see the plans?",
      "10:20 AM",
    ),
    activity: baseActivity("9 min ago", [
      { id: uid("a"), kind: "ai", text: "AI sent message", time: "7 min ago" },
      { id: uid("a"), kind: "tag", text: "Tag added: Interested", time: "8 min ago" },
    ]),
  },
  {
    id: "c-lina",
    name: "Lina Mansour",
    avatar: lina,
    initials: "LM",
    channel: "facebook",
    preview: "Can I book a free session?",
    time: "12 min ago",
    unread: 1,
    tags: ["booking"],
    stage: "Booking",
    source: "Facebook Lead Form",
    phone: "+20 112 908 4471",
    email: "lina.mansour@gmail.com",
    location: "Giza, Egypt",
    assignee: "Sara Adel",
    aiAutoReply: true,
    takenOver: false,
    followUp: true,
    followUpRules: rules(),
    starred: false,
    messages: quickThread("Hello, can I book a free session this week?", "10:14 AM"),
    activity: baseActivity("14 min ago", [
      { id: uid("a"), kind: "customer", text: "Customer sent a message", time: "12 min ago" },
    ]),
  },
  {
    id: "c-ahmed",
    name: "Ahmed Ali",
    avatar: ahmed,
    initials: "AA",
    channel: "webchat",
    preview: "What's the price for the program?",
    time: "20 min ago",
    unread: 2,
    tags: ["question"],
    stage: "Contacted",
    source: "Website Chat Widget",
    phone: "+971 50 412 7788",
    email: "ahmed.ali@company.ae",
    location: "Dubai, UAE",
    assignee: "Mohamed Joe",
    aiAutoReply: true,
    takenOver: false,
    followUp: true,
    followUpRules: rules(true, true, false),
    starred: false,
    messages: quickThread("Hi there", "10:05 AM").concat(
      quickThread("What's the price for the program?", "10:06 AM"),
    ),
    activity: baseActivity("21 min ago", [
      { id: uid("a"), kind: "customer", text: "Customer sent 2 messages", time: "20 min ago" },
    ]),
  },
  {
    id: "c-nour",
    name: "Nour Hassan",
    avatar: nour,
    initials: "NH",
    channel: "instagram",
    preview: "I want to join next month",
    time: "35 min ago",
    unread: 1,
    tags: ["interested"],
    stage: "Interested",
    source: "Instagram DM",
    phone: "+20 109 553 2210",
    email: "nour.hassan@yahoo.com",
    location: "Mansoura, Egypt",
    assignee: "Sara Adel",
    aiAutoReply: true,
    takenOver: false,
    followUp: true,
    followUpRules: rules(),
    starred: false,
    messages: quickThread(
      "Your Pro plan looks great, I want to join next month",
      "9:51 AM",
    ),
    activity: baseActivity("40 min ago", [
      { id: uid("a"), kind: "tag", text: "Tag added: Interested", time: "35 min ago" },
    ]),
  },
  {
    id: "c-karim",
    name: "Karim Mohamed",
    avatar: karim,
    initials: "KM",
    channel: "whatsapp",
    preview: "Is there a nutrition plan included?",
    time: "1 hour ago",
    unread: 1,
    tags: ["new"],
    stage: "New Lead",
    source: "WhatsApp Broadcast",
    phone: "+20 122 667 3409",
    email: "karim.m@gmail.com",
    location: "Cairo, Egypt",
    assignee: "Mohamed Joe",
    aiAutoReply: true,
    takenOver: false,
    followUp: true,
    followUpRules: rules(),
    starred: false,
    messages: quickThread("Is there a nutrition plan included?", "9:22 AM"),
    activity: baseActivity("1 hour ago"),
  },
  {
    id: "c-diana",
    name: "Diana Samir",
    avatar: diana,
    initials: "DS",
    channel: "messenger",
    preview: "Great! I want to book now",
    time: "2 hours ago",
    unread: 1,
    tags: ["booking"],
    stage: "Booking",
    source: "Messenger Inbox",
    phone: "+20 115 220 9087",
    email: "diana.samir@gmail.com",
    location: "Hurghada, Egypt",
    assignee: "AI Agent",
    aiAutoReply: true,
    takenOver: false,
    followUp: true,
    followUpRules: rules(),
    starred: false,
    messages: quickThread(
      "Thanks for the details!",
      "8:12 AM",
      "You're welcome, Diana! Would you like to book your free consultation?",
      "8:13 AM",
    ).concat(quickThread("Great! I want to book now", "8:20 AM")),
    activity: baseActivity("2 hours ago", [
      { id: uid("a"), kind: "ai", text: "AI sent message", time: "2 hours ago" },
    ]),
  },
  {
    id: "c-youssef",
    name: "Youssef Ibrahim",
    avatar: youssef,
    initials: "YI",
    channel: "facebook",
    preview: "Do you have gym in Dubai?",
    time: "3 hours ago",
    unread: 0,
    tags: ["question"],
    stage: "Contacted",
    source: "Facebook Page",
    phone: "+971 55 908 1123",
    email: "youssef.ibrahim@gmail.com",
    location: "Dubai, UAE",
    assignee: "Youssef Kamal",
    aiAutoReply: true,
    takenOver: false,
    followUp: false,
    followUpRules: rules(true, false, false),
    starred: false,
    messages: quickThread(
      "Do you have gym in Dubai?",
      "7:31 AM",
      "Hi Youssef! We're fully online — you can train at any gym in Dubai with your personalized plan.",
      "7:32 AM",
    ),
    activity: baseActivity("3 hours ago", [
      { id: uid("a"), kind: "ai", text: "AI sent message", time: "3 hours ago" },
    ]),
  },
  {
    id: "c-mona",
    name: "Mona Abdallah",
    avatar: mona,
    initials: "MA",
    channel: "instagram",
    preview: "Can you send me more details?",
    time: "5 hours ago",
    unread: 2,
    tags: ["new"],
    stage: "New Lead",
    source: "Instagram Story Reply",
    phone: "+20 106 771 5532",
    email: "mona.abdallah@gmail.com",
    location: "Cairo, Egypt",
    assignee: "Sara Adel",
    aiAutoReply: true,
    takenOver: false,
    followUp: true,
    followUpRules: rules(),
    starred: false,
    messages: quickThread("Loved your last story 😍", "5:40 AM").concat(
      quickThread("Can you send me more details?", "5:41 AM"),
    ),
    activity: baseActivity("5 hours ago"),
  },
  {
    id: "c-hassan",
    name: "Hassan Tarek",
    avatar: hassan,
    initials: "HT",
    channel: "whatsapp",
    preview: "What's the next available time?",
    time: "1 day ago",
    unread: 0,
    tags: ["interested"],
    stage: "Interested",
    source: "WhatsApp Click-to-Chat",
    phone: "+20 128 330 4410",
    email: "hassan.tarek@gmail.com",
    location: "Tanta, Egypt",
    assignee: "Mohamed Joe",
    aiAutoReply: false,
    takenOver: true,
    followUp: true,
    followUpRules: rules(false, true, true),
    starred: false,
    messages: quickThread("What's the next available time?", "Yesterday"),
    activity: baseActivity("1 day ago", [
      { id: uid("a"), kind: "handoff", text: "Mohamed Joe took over", time: "1 day ago" },
    ]),
  },
  {
    id: "c-rana",
    name: "Rana Fathy",
    initials: "RF",
    channel: "instagram",
    preview: "Booked for Thursday at 6 PM 🙌",
    time: "2 days ago",
    unread: 0,
    tags: ["booking"],
    stage: "Booking",
    source: "Instagram Ad",
    phone: "+20 101 445 9021",
    email: "rana.fathy@gmail.com",
    location: "Port Said, Egypt",
    assignee: "AI Agent",
    aiAutoReply: true,
    takenOver: false,
    followUp: true,
    followUpRules: rules(),
    starred: false,
    messages: quickThread(
      "Booked for Thursday at 6 PM 🙌",
      "Mon",
      "Amazing, Rana! You'll receive a reminder 1 hour before your consultation.",
      "Mon",
    ),
    activity: baseActivity("2 days ago", [
      { id: uid("a"), kind: "ai", text: "AI booked a consultation", time: "2 days ago" },
    ]),
  },
  {
    id: "c-tarek",
    name: "Tarek Nabil",
    initials: "TN",
    channel: "facebook",
    preview: "Do you offer couples coaching?",
    time: "3 days ago",
    unread: 0,
    tags: ["question"],
    stage: "Contacted",
    source: "Facebook Lead Form",
    phone: "+20 127 118 6650",
    email: "tarek.nabil@gmail.com",
    location: "Ismailia, Egypt",
    assignee: "Youssef Kamal",
    aiAutoReply: true,
    takenOver: false,
    followUp: false,
    followUpRules: rules(true, false, true),
    starred: false,
    messages: quickThread(
      "Do you offer couples coaching?",
      "Sun",
      "Great question, Tarek! Yes — we have a duo plan with shared check-ins and individual programs.",
      "Sun",
    ),
    activity: baseActivity("3 days ago", [
      { id: uid("a"), kind: "ai", text: "AI sent message", time: "3 days ago" },
    ]),
  },
];

export const makeId = uid;
