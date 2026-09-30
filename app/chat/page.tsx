"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import AuthGate from "@/components/AuthGate";

type Profile = {
  displayName: string;
  assistantName: string;
  vibe: string;
  onboarded?: boolean;
};

type Conversation = { id: string; title: string };

type ChatMessage = { id: string; role: string; content: string };

const VIBE_TONES: Record<string, string> = {
  Warm: "warm, friendly, and encouraging",
  Sharp: "concise, direct, and precise",
  Playful: "playful, witty, and light-hearted",
};

function ChatApp() {
  const router = useRouter();
  const user = auth.currentUser;
  const [profile, setProfile] = useState<Profile | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load profile; redirect to onboarding if not done.
  useEffect(() => {
    if (!user) return;
    getDoc(doc(db, "users", user.uid)).then((snap) => {
      if (!snap.exists() || !snap.data().onboarded) {
        router.replace("/onboarding");
        return;
      }
      setProfile(snap.data() as Profile);
    });
  }, [user, router]);

  // Subscribe to conversations.
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "users", user.uid, "conversations"),
      orderBy("updatedAt", "desc")
    );
    return onSnapshot(q, (snap) => {
      setConversations(
        snap.docs.map((d) => ({
          id: d.id,
          title: (d.data().title as string) || "New chat",
        }))
      );
    });
  }, [user]);

  // Subscribe to messages of the active conversation.
  useEffect(() => {
    if (!user || !activeId) return;
    const q = query(
      collection(db, "users", user.uid, "conversations", activeId, "messages"),
      orderBy("createdAt", "asc")
    );
    return onSnapshot(q, (snap) => {
      setMessages(
        snap.docs.map((d) => ({
          id: d.id,
          role: d.data().role as string,
          content: d.data().content as string,
        }))
      );
    });
  }, [user, activeId]);

  // Auto-scroll to latest message.
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  async function sendMessage() {
    const content = input.trim();
    if (!content || sending || !user || !profile) return;
    setInput("");
    setError("");
    setSending(true);

    try {
      let cid = activeId;
      const history = messages.map((m) => ({ role: m.role, content: m.content }));

      // Create the conversation on the first message of a new chat.
      if (!cid) {
        const title =
          content.length > 40 ? `${content.slice(0, 40)}…` : content;
        const convRef = await addDoc(
          collection(db, "users", user.uid, "conversations"),
          {
            title,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          }
        );
        cid = convRef.id;
        setActiveId(cid);
      }

      await addDoc(
        collection(db, "users", user.uid, "conversations", cid, "messages"),
        { role: "user", content, createdAt: serverTimestamp() }
      );
      history.push({ role: "user", content });

      const tone = VIBE_TONES[profile.vibe] ?? "helpful and friendly";
      const systemPrompt =
        `You are ${profile.assistantName}, a helpful personal AI assistant. ` +
        `You are speaking with ${profile.displayName}. ` +
        `Adopt a ${tone} tone. Format answers clearly and use markdown where it helps.`;

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "system", content: systemPrompt }, ...history],
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          (data as { error?: string }).error || "Chat request failed."
        );
      }

      const reply = (data as { reply?: string }).reply ?? "";
      await addDoc(
        collection(db, "users", user.uid, "conversations", cid, "messages"),
        { role: "assistant", content: reply, createdAt: serverTimestamp() }
      );
      await updateDoc(doc(db, "users", user.uid, "conversations", cid), {
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  async function deleteConversation(cid: string) {
    if (!user) return;
    if (!window.confirm("Delete this conversation?")) return;
    const msgsSnap = await getDocs(
      collection(db, "users", user.uid, "conversations", cid, "messages")
    );
    const batch = writeBatch(db);
    msgsSnap.docs.forEach((d) => batch.delete(d.ref));
    batch.delete(doc(db, "users", user.uid, "conversations", cid));
    await batch.commit();
    if (activeId === cid) {
      setActiveId(null);
      setMessages([]);
    }
  }

  function startNewChat() {
    setActiveId(null);
    setMessages([]);
    setError("");
  }

  async function handleSignOut() {
    await signOut(auth);
    router.push("/login");
  }

  const sidebar = (
    <div className="flex h-full w-full flex-col border-r border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900/50">
      <div className="flex items-center justify-between p-4">
        <span className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
          Museless
        </span>
        <button
          onClick={startNewChat}
          className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 transition hover:border-neutral-500 dark:border-neutral-700 dark:text-neutral-300 dark:hover:border-neutral-500"
        >
          + New chat
        </button>
      </div>
      <div className="flex-1 space-y-1 overflow-y-auto px-2 pb-2">
        {conversations.map((c) => (
          <div
            key={c.id}
            className={`group flex items-center gap-1 rounded-lg px-3 py-2 text-sm ${
              c.id === activeId
                ? "bg-neutral-200 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-50"
                : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800/60"
            }`}
          >
            <button
              onClick={() => setActiveId(c.id)}
              className="min-w-0 flex-1 truncate text-left"
              title={c.title}
            >
              {c.title}
            </button>
            <button
              onClick={() => deleteConversation(c.id)}
              title="Delete conversation"
              className="shrink-0 rounded px-1 text-neutral-400 opacity-0 transition group-hover:opacity-100 hover:text-red-600 dark:hover:text-red-400"
            >
              ✕
            </button>
          </div>
        ))}
        {conversations.length === 0 && (
          <p className="px-3 py-4 text-sm text-neutral-400 dark:text-neutral-500">
            No conversations yet. Start one below.
          </p>
        )}
      </div>
      <div className="flex items-center justify-between border-t border-neutral-200 p-4 dark:border-neutral-800">
        <span className="truncate text-sm text-neutral-600 dark:text-neutral-400">
          {profile?.displayName ?? "…"}
        </span>
        <button
          onClick={handleSignOut}
          className="text-sm text-neutral-500 underline-offset-2 hover:underline dark:text-neutral-400"
        >
          Sign out
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-white text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
      {/* Desktop sidebar */}
      <aside className="hidden w-72 shrink-0 md:block">{sidebar}</aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile header */}
        <header className="flex items-center justify-between border-b border-neutral-200 p-3 md:hidden dark:border-neutral-800">
          <span className="font-semibold">Museless</span>
          <button
            onClick={startNewChat}
            className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm font-medium dark:border-neutral-700"
          >
            + New chat
          </button>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-3xl space-y-4 px-4 py-6">
            {messages.length === 0 && !sending && (
              <div className="mt-16 text-center">
                <h1 className="text-2xl font-semibold">
                  {profile
                    ? `Hey ${profile.displayName}, I'm ${profile.assistantName}.`
                    : "Welcome."}
                </h1>
                <p className="mt-2 text-neutral-500 dark:text-neutral-400">
                  Ask me anything to get started.
                </p>
              </div>
            )}
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed ${
                    m.role === "user"
                      ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
                      : "bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex justify-start">
                <div className="flex items-center gap-1.5 rounded-2xl bg-neutral-100 px-4 py-3 dark:bg-neutral-800">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-neutral-400" />
                  <span
                    className="h-2 w-2 animate-bounce rounded-full bg-neutral-400"
                    style={{ animationDelay: "150ms" }}
                  />
                  <span
                    className="h-2 w-2 animate-bounce rounded-full bg-neutral-400"
                    style={{ animationDelay: "300ms" }}
                  />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Composer */}
        <div className="border-t border-neutral-200 p-4 dark:border-neutral-800">
          <div className="mx-auto max-w-3xl">
            {error && (
              <p className="mb-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300">
                {error}
              </p>
            )}
            <div className="flex items-end gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                placeholder="Message your assistant…"
                className="max-h-40 min-h-[44px] flex-1 resize-none rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-[15px] text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-neutral-800 focus:ring-2 focus:ring-neutral-800/10 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:focus:border-neutral-300"
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || sending}
                className="shrink-0 rounded-xl bg-neutral-900 px-5 py-2.5 font-medium text-white transition hover:bg-neutral-700 disabled:opacity-40 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-300"
              >
                {sending ? "…" : "Send"}
              </button>
            </div>
            <p className="mt-1.5 text-center text-xs text-neutral-400 dark:text-neutral-500">
              Enter to send · Shift+Enter for a new line
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <AuthGate>
      <ChatApp />
    </AuthGate>
  );
}
