import Header from "../components/shell/Header";
import NotificacoesCliente from "./NotificacoesCliente";

export default function NotificacoesPage() {
  return (
    <>
      <Header variant="back" title="Notificações" />
      <NotificacoesCliente />
    </>
  );
}
