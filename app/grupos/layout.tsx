/**
 * Slot paralelo @modal: /grupos/novo interceptado como modal sobre a lista (web).
 */
export default function GruposLayout({
  children,
  modal,
}: {
  children: React.ReactNode;
  modal: React.ReactNode;
}) {
  return (
    <>
      {children}
      {modal}
    </>
  );
}
