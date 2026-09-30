"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import AuthGate from "@/components/AuthGate";

const NAME_SUGGESTIONS = ["Muse", "Nova", "Echo"];

const VIBES = [
  { id: "Warm", description: "Friendly, encouraging, and supportive." },
  { id: "Sharp", description: "Concise, direct, and to the point." },
  { id: "Playful", description: "Witty, light-hearted, and fun." },
];

function OnboardingFlow() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [displayName, setDisplayName] = useState("");
  const [assistantName, setAssistantName] = useState("");
  const [vibe, setVibe] = useState("Warm");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Skip onboarding if already completed.
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;
    getDoc(doc(db, "users", user.uid)).then((snap) => {
      if (snap.exists() && snap.data().onboarded) router.replace("/chat");
    });
  }, [router]);

  async function finish() {
    const user = auth.currentUser;
    if (!user) return;
    setSaving(true);
    setError("");
    try {
      await setDoc(
        doc(db, "users", user.uid),
        {
          displayName: displayName.trim(),
          assistantName: assistantName.trim(),
          vibe,
          onboarded: true,
          createdAt: serverTimestamp(),
        },
        { merge: true }
      );
      router.push("/chat");
    } catch {
      setError("Couldn't save your profile. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const canContinue =
    (step === 0 && displayName.trim().length > 0) ||
    (step === 1 && assistantName.trim().length > 0) ||
    step === 2;

  function next() {
    if (!canContinue) return;
    if (step < 2) setStep(step + 1);
    else finish();
  }

  const inputCls =
    "w-full rounded-lg border border-neutral-300 bg-white px-4 py-2.5 text-neutral-900 placeholder-neutral-400 outline-none transition focus:border-neutral-800 focus:ring-2 focus:ring-neutral-800/10 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:focus:border-neutral-300";

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-4 dark:bg-neutral-950">
      <div className="w-full max-w-lg rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <div className="mb-6">
          <p className="text-xs font-medium uppercase tracking-wider text-neutral-400">
            Step {step + 1} of 3
          </p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
            <div
              className="h-full rounded-full bg-neutral-900 transition-all dark:bg-neutral-100"
              style={{ width: `${((step + 1) / 3) * 100}%` }}
            />
          </div>
        </div>

        {step === 0 && (
          <div>
            <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-50">
              What should we call you?
            </h1>
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
              Your display name — your assistant will use it when talking to you.
            </p>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Alex"
              maxLength={50}
              className={`${inputCls} mt-4`}
              autoFocus
            />
          </div>
        )}

        {step === 1 && (
          <div>
            <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-50">
              Name your assistant
            </h1>
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
              Pick a suggestion or invent your own.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {NAME_SUGGESTIONS.map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => setAssistantName(name)}
                  className={`rounded-full border px-4 py-1.5 text-sm transition ${
                    assistantName === name
                      ? "border-neutral-900 bg-neutral-900 text-white dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-900"
                      : "border-neutral-300 text-neutral-700 hover:border-neutral-500 dark:border-neutral-700 dark:text-neutral-300 dark:hover:border-neutral-500"
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={assistantName}
              onChange={(e) => setAssistantName(e.target.value)}
              placeholder="Or type a custom name…"
              maxLength={50}
              className={`${inputCls} mt-3`}
            />
          </div>
        )}

        {step === 2 && (
          <div>
            <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-50">
              Pick a vibe
            </h1>
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
              How should {assistantName.trim() || "your assistant"} talk to you?
            </p>
            <div className="mt-4 space-y-2">
              {VIBES.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setVibe(v.id)}
                  className={`w-full rounded-xl border p-4 text-left transition ${
                    vibe === v.id
                      ? "border-neutral-900 bg-neutral-50 dark:border-neutral-100 dark:bg-neutral-800"
                      : "border-neutral-200 hover:border-neutral-400 dark:border-neutral-800 dark:hover:border-neutral-600"
                  }`}
                >
                  <span className="font-medium text-neutral-900 dark:text-neutral-50">
                    {v.id}
                  </span>
                  <span className="mt-0.5 block text-sm text-neutral-500 dark:text-neutral-400">
                    {v.description}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {error && (
          <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300">
            {error}
          </p>
        )}

        <div className="mt-6 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setStep(Math.max(0, step - 1))}
            disabled={step === 0 || saving}
            className="rounded-lg px-4 py-2 text-sm font-medium text-neutral-600 hover:text-neutral-900 disabled:opacity-40 dark:text-neutral-400 dark:hover:text-neutral-100"
          >
            Back
          </button>
          <button
            type="button"
            onClick={next}
            disabled={!canContinue || saving}
            className="rounded-lg bg-neutral-900 px-6 py-2.5 font-medium text-white transition hover:bg-neutral-700 disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-300"
          >
            {saving ? "Saving…" : step === 2 ? "Start chatting" : "Continue"}
          </button>
        </div>
      </div>
    </main>
  );
}

export default function OnboardingPage() {
  return (
    <AuthGate>
      <OnboardingFlow />
    </AuthGate>
  );
}
