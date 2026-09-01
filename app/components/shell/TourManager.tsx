"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Joyride, STATUS, type EventData } from "react-joyride";
import { hasCompletedTour, markTourCompleted, resetTour } from "@/lib/tour";
import { markTourCompletedAction } from "@/app/actions/tour";
import { coordinatorSteps, memberSteps } from "@/app/components/OnboardingTour";
import { TourContext } from "@/contexts/TourContext";

export default function TourManager({
  profile,
  tourCompleted,
  children,
}: {
  profile: string | null;
  tourCompleted: boolean;
  children: React.ReactNode;
}) {
  const [runTour, setRunTour] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    // DB é a fonte de verdade; localStorage é cache rápido para evitar re-trigger
    if (!profile || tourCompleted || hasCompletedTour(profile)) return;
    const mainPage = profile === "member" ? "/minha-escala" : "/";
    if (pathname !== mainPage) return;
    const t = setTimeout(() => setRunTour(true), 500);
    return () => clearTimeout(t);
  }, [profile, pathname, tourCompleted]);

  function handleEvent(data: EventData) {
    if (data.status === STATUS.FINISHED || data.status === STATUS.SKIPPED) {
      if (profile) {
        markTourCompleted(profile); // cache local imediato
        markTourCompletedAction();  // persiste no banco (fire-and-forget)
      }
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
