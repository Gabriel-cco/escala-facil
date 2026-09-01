"use client";

import { Joyride, STATUS, type EventData, type Step } from "react-joyride";
import { markTourCompleted } from "@/lib/tour";

export const coordinatorSteps: Step[] = [
  {
    target: "body",
    placement: "center",
    content:
      "Bem-vindo ao Escala Fácil! Vamos te mostrar rapidinho como tudo funciona. Leva menos de um minuto.",
  },
  {
    target: '[data-tour="proximo-evento"]',
    content: "Aqui você vê o próximo evento e o andamento da escala dele.",
  },
  {
    target: '[data-tour="acoes-pendentes"]',
    content:
      "E aqui, tudo que precisa da sua atenção: funções vagas, trocas pendentes, suspensões terminando.",
  },
  {
    target: '[data-tour="hamburger"]',
    content:
      "Toda a navegação fica aqui: eventos, trocas, funções, membros e muito mais — tudo em um único menu.",
  },
  {
    target: '[data-tour="sino-notificacoes"]',
    content:
      "Você recebe avisos automáticos aqui, inclusive no celular, mesmo com o app fechado.",
  },
  {
    target: "body",
    placement: "center",
    content: "Pronto! Isso já cobre o essencial. Bom trabalho à frente!",
  },
];

export const memberSteps: Step[] = [
  {
    target: "body",
    placement: "center",
    content: "Bem-vindo(a) ao Escala Fácil!",
  },
  {
    target: '[data-tour="minha-escala-lista"]',
    content: "Aqui você vê quando está escalado — seus dias aparecem destacados.",
  },
  {
    target: '[data-tour="sino-notificacoes"]',
    content: "Você recebe um aviso automático quando for a sua vez de servir.",
  },
  {
    target: '[data-tour="solicitar-troca"]',
    content:
      "Não pode servir num dia? Solicite uma troca aqui — outro membro do grupo pode assumir.",
  },
  {
    target: "body",
    placement: "center",
    content: "Pronto! Qualquer dúvida, fale com o coordenador do seu grupo.",
  },
];

export function OnboardingTour({
  profile,
  steps,
  run,
  onFinish,
}: {
  profile: string;
  steps: Step[];
  run: boolean;
  onFinish: () => void;
}) {
  function handleEvent(data: EventData) {
    if (data.status === STATUS.FINISHED || data.status === STATUS.SKIPPED) {
      markTourCompleted(profile);
      onFinish();
    }
  }

  return (
    <Joyride
      steps={steps}
      run={run}
      continuous
      onEvent={handleEvent}
      options={{
        primaryColor: "#4F46E5",
        showProgress: true,
        skipBeacon: true,
        closeButtonAction: "skip",
        buttons: ["back", "close", "primary", "skip"],
        zIndex: 10000,
      }}
      locale={{
        back: "Voltar",
        close: "Fechar",
        last: "Concluir",
        next: "Próximo",
        skip: "Pular",
      }}
    />
  );
}
