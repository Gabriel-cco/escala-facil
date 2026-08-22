"use client";
import { useState } from "react";

const STORAGE_KEY = (token: string) => `ef_avulsa_${token}`;

export default function ScanForm({ token }: { token: string }) {
  const [nome, setNome] = useState("");
  const [estado, setEstado] = useState<"idle" | "salvando" | "ok" | "erro" | "jaRegistrado">(() => {
    if (typeof window !== "undefined" && localStorage.getItem(STORAGE_KEY(token))) {
      return "jaRegistrado";
    }
    return "idle";
  });
  const [msgErro, setMsgErro] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) return;

    setEstado("salvando");
    setMsgErro("");

    try {
      const res = await fetch(`/api/frequencia/avulsa/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: nome.trim() }),
      });
      const json = await res.json();
      if (!res.ok) {
        setMsgErro(json.error ?? "Erro ao registrar.");
        setEstado("erro");
      } else {
        localStorage.setItem(STORAGE_KEY(token), "1");
        setEstado("ok");
      }
    } catch {
      setMsgErro("Sem conexão. Tente novamente.");
      setEstado("erro");
    }
  };

  if (estado === "jaRegistrado") {
    return (
      <div className="rounded-[16px] border border-[#A7F3D0] bg-[#ECFDF5] px-6 py-8 text-center">
        <div className="text-[40px] mb-3">✅</div>
        <p className="text-[18px] font-bold text-[#065F46]">Presença já registrada</p>
        <p className="mt-1 text-[14px] text-[#047857]">
          Você já confirmou sua presença nesta lista.
        </p>
      </div>
    );
  }

  if (estado === "ok") {
    return (
      <div className="rounded-[16px] border border-[#A7F3D0] bg-[#ECFDF5] px-6 py-8 text-center">
        <div className="text-[40px] mb-3">✅</div>
        <p className="text-[18px] font-bold text-[#065F46]">Presença registrada!</p>
        <p className="mt-1 text-[14px] text-[#047857]">Obrigado por registrar sua presença.</p>
      </div>
    );
  }

  if (estado === "erro" && msgErro === "Esta lista foi encerrada.") {
    return (
      <div className="rounded-[16px] border border-[#FECACA] bg-[#FEF2F2] px-6 py-8 text-center">
        <div className="text-[40px] mb-3">🔒</div>
        <p className="text-[16px] font-bold text-[#991B1B]">Lista encerrada</p>
        <p className="mt-1 text-[14px] text-[#B91C1C]">
          O coordenador encerrou esta lista de presença.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <label className="mb-1.5 block text-[13px] font-semibold text-[#404040]">
          Seu nome completo
        </label>
        <input
          type="text"
          autoFocus
          autoComplete="name"
          placeholder="Digite seu nome…"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          className="w-full rounded-[10px] border border-[#D4D4D4] px-4 py-3 text-[15px] text-ink focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      {estado === "erro" && msgErro && (
        <p className="text-[13px] text-danger">{msgErro}</p>
      )}

      <button
        type="submit"
        disabled={!nome.trim() || estado === "salvando"}
        className="rounded-[12px] bg-primary py-3.5 text-[15px] font-semibold text-white disabled:opacity-60"
      >
        {estado === "salvando" ? "Registrando…" : "Confirmar presença"}
      </button>

      <p className="text-center text-[12px] text-muted">
        Escala Fácil · Lista de presença avulsa
      </p>
    </form>
  );
}
