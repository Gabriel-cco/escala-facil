"use client";

interface AvatarProps {
  url?: string | null;
  iniciais: string;
  size: number;
  className?: string;
}

export default function Avatar({ url, iniciais, size, className = "" }: AvatarProps) {
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt=""
        className={`flex-none rounded-full object-cover ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className={`flex flex-none items-center justify-center rounded-full bg-primary-light font-semibold text-primary ${className}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.35) }}
    >
      {iniciais || "··"}
    </div>
  );
}
