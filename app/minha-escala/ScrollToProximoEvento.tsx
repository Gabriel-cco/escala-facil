"use client";
import { useEffect } from "react";

export default function ScrollToProximoEvento() {
  useEffect(() => {
    const el = document.getElementById("proximo-evento");
    if (!el) return;
    const t = setTimeout(
      () => el.scrollIntoView({ behavior: "smooth", block: "start" }),
      450
    );
    return () => clearTimeout(t);
  }, []);
  return null;
}
