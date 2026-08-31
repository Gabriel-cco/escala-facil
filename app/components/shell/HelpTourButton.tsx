"use client";

import { useTour } from "@/contexts/TourContext";

export default function HelpTourButton() {
  const { resetAndRun } = useTour();

  return (
    <button
      onClick={resetAndRun}
      aria-label="Rever tutorial"
      className="flex h-9 w-9 items-center justify-center rounded-[10px] text-ink-soft transition-colors hover:bg-surface hover:text-ink"
    >
      <svg
        width={18}
        height={18}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
        <circle cx="12" cy="17" r="0.5" fill="currentColor" />
      </svg>
    </button>
  );
}
