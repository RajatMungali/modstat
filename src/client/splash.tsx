import './index.css';

import { navigateTo, context, requestExpandedMode } from '@devvit/web/client';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

const IconChart = ({ className = 'h-6 w-6' }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path d="M3 3v18h18" />
    <path d="M7 14v4" />
    <path d="M12 10v8" />
    <path d="M17 6v12" />
    <path d="M6 8l4-3 4 2 5-4" />
  </svg>
);

const IconClock = ({ className = 'h-6 w-6' }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>
);

const IconShield = ({ className = 'h-6 w-6' }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path d="M12 3l7 3v5c0 5-3.5 9.2-7 10-3.5-.8-7-5-7-10V6l7-3z" />
    <path d="M9.5 12l1.8 1.8 3.7-3.8" />
  </svg>
);

const IconArrow = ({ className = 'h-5 w-5' }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path d="M5 12h14" />
    <path d="M13 5l7 7-7 7" />
  </svg>
);

const Splash = () => {
  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-white to-orange-50 px-6 py-8 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Background glow */}
      <div className="absolute inset-0">
        <div className="absolute left-1/2 top-24 h-80 w-80 -translate-x-1/2 rounded-full bg-orange-500/15 blur-3xl" />
        <div className="absolute bottom-10 right-10 h-64 w-64 rounded-full bg-orange-400/10 blur-3xl" />
      </div>

      {/* Main card */}
      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-5xl items-center justify-center">
        <div className="w-full rounded-[32px] border border-slate-200/70 bg-white/90 p-8 shadow-[0_25px_80px_rgba(15,23,42,0.12)] backdrop-blur-xl dark:border-slate-700/50 dark:bg-slate-900/90 sm:p-12">
          {/* Header */}
          <div className="text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-orange-500 to-red-500 shadow-[0_20px_40px_rgba(249,115,22,0.35)]">
              <IconChart className="h-10 w-10 text-white" />
            </div>

            <h1 className="text-5xl font-black tracking-tight sm:text-6xl">
              <span className="text-slate-900 dark:text-white">mod</span>
              <span className="bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">
                stat
              </span>
            </h1>

            <p className="mt-3 text-sm font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
              Reddit Analytics & Trends
            </p>

            <p className="mt-6 text-sm text-slate-500 dark:text-slate-400">
              Welcome back,
              <span className="ml-1 font-semibold text-slate-800 dark:text-white">
                {context.username ?? 'Moderator'}
              </span>
            </p>

            <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-slate-600 dark:text-slate-300 sm:text-lg">
              Automatically track removal reasons, repeat offenders, and rule
              trends in your subreddit. Install once and receive a private
              weekly moderation digest with zero effort.
            </p>
          </div>

          {/* Feature cards */}
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {[
              {
                title: 'Weekly Analytics',
                Icon: IconChart,
                description: 'Track removal reasons and moderation trends.',
              },
              {
                title: 'Fully Automatic',
                Icon: IconClock,
                description: 'Runs in the background 24/7.',
              },
              {
                title: 'Zero Effort',
                Icon: IconShield,
                description: 'Install once and get weekly reports.',
              },
            ].map(({ title, Icon, description }) => (
              <div
                key={title}
                className="group rounded-3xl border border-slate-200/70 bg-slate-50/80 p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg dark:border-slate-700/50 dark:bg-slate-800/50"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-100 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400">
                  <Icon className="h-6 w-6" />
                </div>

                <h3 className="mt-4 text-sm font-semibold text-slate-900 dark:text-white">
                  {title}
                </h3>

                <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                  {description}
                </p>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="mt-12 flex justify-center">
            <button
              onClick={(e) => requestExpandedMode(e.nativeEvent, 'game')}
              className="group inline-flex items-center gap-3 rounded-full bg-gradient-to-r from-orange-500 to-red-500 px-8 py-4 text-sm font-semibold text-white shadow-[0_20px_40px_rgba(249,115,22,0.35)] transition-all duration-300 hover:scale-105 hover:shadow-[0_25px_50px_rgba(249,115,22,0.45)]"
            >
              Launch Dashboard
              <IconArrow className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
            </button>
          </div>

          {/* Footer */}
          <footer className="mt-10 flex flex-wrap items-center justify-center gap-4 text-sm text-slate-500 dark:text-slate-400">
            <button
              className="transition-colors hover:text-slate-900 dark:hover:text-white"
              onClick={() => navigateTo('https://developers.reddit.com/docs')}
            >
              Documentation
            </button>

            <span className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-600" />

            <button
              className="transition-colors hover:text-slate-900 dark:hover:text-white"
              onClick={() => navigateTo('https://www.reddit.com/r/Devvit')}
            >
              Devvit Community
            </button>

            <span className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-600" />

            <button
              className="transition-colors hover:text-slate-900 dark:hover:text-white"
              onClick={() =>
                navigateTo('https://discord.com/invite/R7yu2wh9Qz')
              }
            >
              Support
            </button>
          </footer>
        </div>
      </div>
    </div>
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Splash />
  </StrictMode>
);
