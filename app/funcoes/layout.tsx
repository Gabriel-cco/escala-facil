/**
 * Slot paralelo @modal: /funcoes/nova interceptado como modal sobre a lista (web).
 */
export default function FuncoesLayout({
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
