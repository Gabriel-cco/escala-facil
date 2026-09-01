"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { resetTour } from "@/lib/tour";
import Avatar from "@/app/components/Avatar";
import { iniciais } from "@/lib/iniciais";

async function resizeToJpeg(file: File, maxPx: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(maxPx / img.width, maxPx / img.height, 1);
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("canvas vazio"))),
        "image/jpeg",
        0.85,
      );
    };
    img.onerror = reject;
    img.src = url;
  });
}

export default function PerfilForm({
  userId,
  nomeInicial,
  email,
  birthDateInicial,
  avatarUrlInicial,
  profile,
}: {
  userId: string;
  nomeInicial: string;
  email: string;
  birthDateInicial: string;
  avatarUrlInicial: string | null;
  profile: string;
}) {
  const [nome, setNome] = useState(nomeInicial);
  const [birthDate, setBirthDate] = useState(birthDateInicial);
  const [salvando, setSalvando] = useState(false);
  const [saindo, setSaindo] = useState(false);
  const [erro, setErro] = useState("");
  const [salvo, setSalvo] = useState(false);

  const [avatarUrl, setAvatarUrl] = useState<string | null>(avatarUrlInicial);
  const [uploadando, setUploadando] = useState(false);
  const [erroAvatar, setErroAvatar] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const router = useRouter();

  const alterado =
    nome.trim() !== nomeInicial || birthDate !== birthDateInicial;
  const podeSalvar = nome.trim().length > 0 && alterado;

  async function sair() {
    setSaindo(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  async function salvar() {
    if (!podeSalvar || salvando) return;
    setErro("");
    setSalvo(false);
    setSalvando(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("users")
      .update({ name: nome.trim(), birth_date: birthDate || null })
      .eq("id", userId);
    setSalvando(false);
    if (error) {
      setErro("Erro ao salvar: " + error.message);
    } else {
      setSalvo(true);
      router.refresh();
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!fileInputRef.current) return;
    fileInputRef.current.value = "";
    if (!file) return;

    setErroAvatar("");

    if (!file.type.startsWith("image/")) {
      setErroAvatar("Selecione uma imagem (JPEG, PNG ou WebP).");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErroAvatar("A imagem deve ter no máximo 5 MB.");
      return;
    }

    setUploadando(true);
    try {
      const blob = await resizeToJpeg(file, 300);
      const supabase = createClient();

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(userId, blob, { contentType: "image/jpeg", upsert: true });

      if (uploadError) {
        setErroAvatar("Erro ao enviar foto: " + uploadError.message);
        return;
      }

      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(userId);

      // Adiciona timestamp para forçar re-fetch no browser após upsert
      const urlFinal = `${publicUrl}?t=${Date.now()}`;

      const { error: updateError } = await supabase
        .from("users")
        .update({ avatar_url: urlFinal })
        .eq("id", userId);

      if (updateError) {
        setErroAvatar("Erro ao salvar foto: " + updateError.message);
        return;
      }

      setAvatarUrl(urlFinal);
      router.refresh();
    } catch {
      setErroAvatar("Erro inesperado ao processar a imagem.");
    } finally {
      setUploadando(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Avatar */}
      <div className="flex flex-col items-center gap-2 pb-1 pt-2">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadando}
          aria-label="Alterar foto de perfil"
          className="relative"
        >
          <Avatar url={avatarUrl} iniciais={iniciais(nome || nomeInicial)} size={80} />
          <span className="absolute bottom-0 right-0 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[13px] text-white shadow">
            {uploadando ? "…" : "✎"}
          </span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleFileChange}
        />
        {erroAvatar && (
          <p className="text-center text-[12.5px] text-danger">{erroAvatar}</p>
        )}
        {uploadando && (
          <p className="text-center text-[12.5px] text-muted">Enviando foto…</p>
        )}
      </div>

      <div>
        <div className="mb-2 text-[12px] font-semibold text-muted">NOME</div>
        <input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Seu nome completo"
          className="w-full rounded-[14px] border border-black/10 bg-paper px-4 py-3.5 text-[15px] text-ink outline-none"
        />
      </div>

      <div>
        <div className="mb-2 text-[12px] font-semibold text-muted">E-MAIL</div>
        <input
          value={email}
          readOnly
          className="w-full cursor-not-allowed rounded-[14px] border border-black/[0.06] bg-surface px-4 py-3.5 text-[15px] text-muted outline-none"
        />
        <p className="mt-1.5 text-[11.5px] text-muted">
          Vinculado à sua conta Google — não pode ser alterado aqui.
        </p>
      </div>

      <div>
        <div className="mb-2 text-[12px] font-semibold text-muted">
          DATA DE NASCIMENTO (OPCIONAL)
        </div>
        <input
          type="date"
          value={birthDate}
          onChange={(e) => setBirthDate(e.target.value)}
          className="w-full rounded-[14px] border border-black/10 bg-paper px-4 py-3.5 text-[15px] text-ink outline-none"
        />
      </div>

      {erro && <p className="text-[13px] text-danger">{erro}</p>}
      {salvo && (
        <p className="text-[13px] font-medium text-primary">
          Perfil atualizado com sucesso.
        </p>
      )}

      <div className="mt-1.5">
        <button
          onClick={salvar}
          disabled={!podeSalvar || salvando}
          className="w-full rounded-2xl bg-primary py-4 text-[15px] font-semibold text-paper transition-opacity disabled:pointer-events-none disabled:opacity-40 md:w-auto md:rounded-[11px] md:px-6 md:py-3 md:text-[14px]"
        >
          {salvando ? "Salvando..." : "Salvar alterações"}
        </button>
      </div>

      <div className="mt-4 flex flex-col gap-3 border-t border-black/[0.07] pt-4">
        <button
          onClick={() => {
            resetTour(profile);
            router.push(profile === "member" ? "/minha-escala" : "/");
          }}
          className="text-left text-[13.5px] font-semibold text-primary"
        >
          Ver tour novamente
        </button>
        <button
          onClick={sair}
          disabled={saindo}
          className="text-left text-[13.5px] font-semibold text-danger disabled:opacity-50"
        >
          {saindo ? "Saindo..." : "Sair da conta"}
        </button>
      </div>
    </div>
  );
}
