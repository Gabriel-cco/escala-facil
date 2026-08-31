"use client";

import { createContext, useContext } from "react";

type TourContextValue = {
  resetAndRun: () => void;
};

export const TourContext = createContext<TourContextValue>({ resetAndRun: () => {} });
export const useTour = () => useContext(TourContext);
