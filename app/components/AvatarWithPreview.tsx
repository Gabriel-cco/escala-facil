"use client";

import { useState } from "react";
import Avatar from "./Avatar";

export default function AvatarWithPreview({
  url,
  iniciais,
  size,
}: {
  url: string | null;
  iniciais: string;
  size: number;
}) {
  const [preview, setPreview] = useState(false);

  return (
    <>
      {preview && url && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
          onClick={() => setPreview(false)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt="Foto de perfil"
            className="max-h-[80dvh] max-w-[80vw] rounded-2xl object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-[22px] leading-none text-white backdrop-blur-sm"
            onClick={() => setPreview(false)}
            aria-label="Fechar"
          >
            ×
          </button>
        </div>
      )}
      <button
        type="button"
        onClick={() => url && setPreview(true)}
        disabled={!url}
        className={url ? "cursor-pointer" : "cursor-default"}
        aria-label={url ? "Ver foto de perfil" : undefined}
      >
        <Avatar url={url} iniciais={iniciais} size={size} />
      </button>
    </>
  );
}
