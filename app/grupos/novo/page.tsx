import Header from "../../components/shell/Header";
import NovoGrupoForm from "./NovoGrupoForm";

export default function NovoGrupoPage() {
  return (
    <>
      <Header variant="back" title="Novo grupo" />
      <main className="flex flex-1 flex-col px-[22px] pb-6 pt-0.5 md:p-0">
        <NovoGrupoForm />
      </main>
    </>
  );
}
