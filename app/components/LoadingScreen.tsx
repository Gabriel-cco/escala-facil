export default function LoadingScreen() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-5 bg-screen">
      <div className="flex h-[52px] w-[52px] items-center justify-center rounded-[16px] bg-primary text-[24px] font-bold leading-none text-white">
        E
      </div>
      <div className="text-[20px] tracking-tight text-ink">
        <span className="font-light">escala</span>
        <span className="font-bold">fácil</span>
      </div>
      <div className="mt-1 h-5 w-5 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
    </div>
  );
}
