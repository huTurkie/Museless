import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col bg-white dark:bg-neutral-950">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4">
        <span className="text-xl font-bold text-neutral-900 dark:text-neutral-50">
          Museless
        </span>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="rounded-lg px-4 py-2 text-sm font-medium text-neutral-700 transition hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-neutral-50"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-700 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-300"
          >
            Get started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto flex max-w-3xl flex-1 flex-col items-center justify-center px-6 text-center">
        <h1 className="text-5xl font-bold tracking-tight text-neutral-900 sm:text-6xl dark:text-neutral-50">
          Your personal AI assistant,{" "}
          <span className="bg-gradient-to-r from-neutral-600 to-neutral-400 bg-clip-text text-transparent dark:from-neutral-200 dark:to-neutral-500">
            your way
          </span>
        </h1>
        <p className="mt-6 max-w-xl text-lg text-neutral-600 dark:text-neutral-400">
          Museless is a friendly AI companion you can name yourself and shape
          with your own vibe. Sign in with just an email, pick a personality,
          and start chatting.
        </p>
        <div className="mt-8 flex items-center gap-4">
          <Link
            href="/signup"
            className="rounded-xl bg-neutral-900 px-8 py-3 font-medium text-white transition hover:bg-neutral-700 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-300"
          >
            Get started — it&apos;s free
          </Link>
          <Link
            href="/login"
            className="rounded-xl border border-neutral-300 px-8 py-3 font-medium text-neutral-800 transition hover:border-neutral-500 dark:border-neutral-700 dark:text-neutral-200 dark:hover:border-neutral-500"
          >
            Sign in
          </Link>
        </div>

        {/* Feature cards */}
        <div className="mt-16 grid w-full gap-4 text-left sm:grid-cols-3">
          {[
            {
              title: "Name your assistant",
              body: "Give it any name you like — suggestions included.",
            },
            {
              title: "Pick a vibe",
              body: "Warm, sharp, or playful. Your assistant adapts its tone.",
            },
            {
              title: "Chat history",
              body: "Every conversation is saved to your account, per user.",
            },
          ].map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-neutral-200 bg-neutral-50 p-5 dark:border-neutral-800 dark:bg-neutral-900"
            >
              <h3 className="font-semibold text-neutral-900 dark:text-neutral-50">
                {f.title}
              </h3>
              <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                {f.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      <footer className="px-6 py-6 text-center text-sm text-neutral-400 dark:text-neutral-500">
        Museless — a Muse-like personal assistant.
      </footer>
    </main>
  );
}
