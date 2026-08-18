"use client";
import { useEffect } from "react";

export default function ScrollToProximoEvento() {
  useEffect(() => {
    const el = document.getElementById("proximo-evento");
    if (el) el.scrollIntoView({ behavior: "instant", block: "start" });
  }, []);
  return null;
}
