"use client";

import { useState } from "react";

export default function AvisoObservacoes({ texto }: { texto: string }) {
  const [expandido, setExpandido] = useState(false);
  return (
    <div className="rounded-[12px] border border-[#fde68a] bg-[#fffbeb] px-3.5 py-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[13px] font-semibold text-[#92400e]">
          ⚠️ Aviso para este dia
        </div>
        <button
          onClick={() => setExpandido((v) => !v)}
          className="text-[12px] font-medium text-[#92400e] underline"
        >
          {expandido ? "Ocultar" : "Ver detalhes"}
        </button>
      </div>
      {expandido && (
        <p className="mt-2 whitespace-pre-wrap text-[12.5px] text-[#92400e]">
          {texto}
        </p>
      )}
    </div>
  );
}
