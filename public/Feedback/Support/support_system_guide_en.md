# Support System Technical Guide

This document provides a comprehensive technical overview of the Support system within the platform, covering its architecture, data lifecycle, permissions, and all associated files with their implemented features (excluding styling, fonts, and colors).

---

## 1. How the Support System Works (Architecture & Workflow)

The Support system operates as a **Real-time 1-on-1 Direct Chat system** powered by **Firebase Firestore** and **Firebase Storage**. It dynamically adapts based on the authenticated user's role:

### A. Partner Flow:
1. When a partner accesses the Support tab, the chat room is automatically identified by their user ID (`chatId = userProfile.uid`).
2. The partner directly enters their private dedicated channel with technical support/admins without needing to manually create support tickets.
3. The partner can send text messages, live-recorded voice notes, and file attachments.
4. When the partner views incoming messages, those messages are automatically marked as read (`read: true`) in Firestore.

### B. Admin Flow:
1. Admins see a dedicated partners sidebar with a real-time list of all registered partners.
2. Admins can search for any partner using an instant search filter.
3. Active chat badges indicate which partners currently have initiated conversations.
4. An admin can select any partner to inspect the full conversation history, reply in real time, quote messages, or delete messages.
5. Admins can also initiate a new chat with any partner via the "New Chat" modal.

### C. Message Lifecycle:
1. **Message Dispatch**: The user inputs text, records audio, or selects files up to 10MB.
2. **File Processing**: Attachments are uploaded to Firebase Storage under `chat_attachments/` and secure download URLs are generated.
3. **Database Insertion**: A new document is added to the `support_chats` collection containing `chatId`, `authorId`, `authorName`, `text`, `createdAt`, `files`, `replyContext`, and `read`.
4. **Real-time Sync & Notifications**:
   - An active Firestore listener (`onSnapshot`) updates the chat window instantly.
   - A global background listener in `StateContext.tsx` counts unread support messages addressed to the user and updates the top navigation bar's message badge and dropdown.

---

## 2. Related Files & Implemented Features

| File Name | Implemented Feature |
| :--- | :--- |
| `CommunitySection.tsx` | • Core real-time support chat interface.<br>• Role-based layout switching: Partner view (direct 1-on-1 support chat) vs. Admin view (partners sidebar, search bar, active chat selector, new chat modal).<br>• Real-time message exchange backed by Firebase Firestore (`support_chats`).<br>• Browser-based audio recording and voice note player (Web Audio API / MediaRecorder).<br>• File and media attachment upload and download system with a 10MB limit (Firebase Storage).<br>• Emoji picker integration.<br>• Quoted replies system (stores reply ID, sender name, text, and scrolls to original message on click).<br>• Message context menu actions (copy text, delete message).<br>• Automatic read-receipt tracking (`read: true`).<br>• Responsive mobile view switching between partner list and active chat. |
| `Dashboard.tsx` | • Registers the `community` tab as "Support" with its navigation icon.<br>• Route-level permission guards checking `hasPermission("read:support")`.<br>• Header message dropdown integration with a direct action button ("Open Support Chat") that routes to the support tab.<br>• Mounts the global floating AI Sales Coach widget. |
| `StateContext.tsx` | • Background real-time Firestore listener for `support_chats`.<br>• Filters incoming unread messages targeted to the current user and maps them into `state.messages`.<br>• Feeds the live unread message badge count in the top navigation bar. |
| `AuthContext.tsx` | • Declares Support permission flags: `show:support` and `read:support`.<br>• Exposes permission verification logic (`hasPermission`) to control access to Support features. |
| `UserManagementSection.tsx` | • Admin management interface to toggle the `show:support` permission per user. |
| `SettingsSection.tsx` | • Role-based permissions matrix to enable or restrict Support access across different user roles. |
| `firebase.ts` | • Initializes Firestore (`db`, `firestore`) for `support_chats`.<br>• Initializes Firebase Storage (`mediaStorage`) for chat attachments with fallback mock handling. |
| `FloatingChatWidget.tsx` | • Floating AI Sales Coach assistant supporting users with automated sales objection handling, call scripts, and deal guidance alongside human support.<br>• Listens to window custom events (`toggle-ai-coach`, `open-ai-coach`, `close-ai-coach`) for programmatic invocation. |

---

## 3. Database Schema

Each document in the `support_chats` collection adheres to the following structure:

```typescript
interface SupportChatMessage {
  id?: string;             // Firestore auto-generated document ID
  chatId: string;          // Partner's UID (defines the 1-on-1 support room)
  authorId: string;        // Sender UID (Partner or Admin)
  authorName: string;      // Sender display name
  text: string;            // Message text content
  createdAt: number;       // Timestamp in milliseconds
  read?: boolean;          // Read status flag
  files?: Array<{          // Attached files/media
    name: string;          // Original file name
    size: number;          // File size in bytes
    type: string;          // MIME type
    dataUrl: string;       // Download URL in Firebase Storage
  }>;
  replyContext?: {         // Quoted message reference
    replyToId: string;
    replyToSender: string;
    replyToText: string;
  };
}
```
