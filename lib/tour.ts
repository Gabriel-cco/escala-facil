const TOUR_KEY_PREFIX = "escala-facil-tour-completo";

export function hasCompletedTour(profile: string): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(`${TOUR_KEY_PREFIX}-${profile}`) === "true";
}

export function markTourCompleted(profile: string): void {
  localStorage.setItem(`${TOUR_KEY_PREFIX}-${profile}`, "true");
}

export function resetTour(profile: string): void {
  localStorage.removeItem(`${TOUR_KEY_PREFIX}-${profile}`);
}
