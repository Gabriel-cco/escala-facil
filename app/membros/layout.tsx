/**
 * Slot paralelo @modal: /membros/novo interceptado como modal sobre a lista (web).
 */
export default function MembrosLayout({
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
