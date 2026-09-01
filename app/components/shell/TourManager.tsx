"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Joyride, STATUS, type EventData } from "react-joyride";
import { hasCompletedTour, markTourCompleted, resetTour } from "@/lib/tour";
import { coordinatorSteps, memberSteps } from "@/app/components/OnboardingTour";
import { TourContext } from "@/contexts/TourContext";

export default function TourManager({
  profile,
  children,
}: {
  profile: string | null;
  children: React.ReactNode;
}) {
  const [runTour, setRunTour] = useState(false);
  const pathname = usePathname();

  // Auto-trigger on first visit to the main page for each profile
  useEffect(() => {
    if (!profile || hasCompletedTour(profile)) return;
    const mainPage = profile === "member" ? "/minha-escala" : "/";
    if (pathname !== mainPage) return;
    const t = setTimeout(() => setRunTour(true), 500);
    return () => clearTimeout(t);
  }, [profile, pathname]);

  function handleEvent(data: EventData) {
    if (data.status === STATUS.FINISHED || data.status === STATUS.SKIPPED) {
      if (profile) markTourCompleted(profile);
      setRunTour(false);
    }
  }

  function resetAndRun() {
    if (!profile) return;
    resetTour(profile);
    setRunTour(true);
  }

  const steps = profile === "member" ? memberSteps : coordinatorSteps;

  return (
    <TourContext.Provider value={{ resetAndRun }}>
      {children}
      {profile && (
        <Joyride
          steps={steps}
          run={runTour}
          continuous
          onEvent={handleEvent}
          options={{
            primaryColor: "#4F46E5",
            showProgress: true,
            skipBeacon: true,
            closeButtonAction: "skip",
            buttons: ["back", "close", "primary", "skip"],
            zIndex: 10000,
          }}
          locale={{
            back: "Voltar",
            close: "Fechar",
            last: "Concluir",
            next: "Avançar",
            nextWithProgress: "Avançar",
            skip: "Pular",
          }}
        />
      )}
    </TourContext.Provider>
  );
}
