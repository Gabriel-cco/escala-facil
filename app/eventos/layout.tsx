/**
 * Slot paralelo @modal: permite que /eventos/novo seja interceptado e exibido
 * como modal sobre a lista (web), mantendo a página standalone para carga direta.
 */
export default function EventosLayout({
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
