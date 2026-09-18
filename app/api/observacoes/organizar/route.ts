import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request: Request) {
  try {
    const { texto } = await request.json();
    if (!texto || typeof texto !== "string") {
      return Response.json({ error: "Texto inválido." }, { status: 400 });
    }

    const resposta = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1000,
      messages: [
        {
          role: "user",
          content: `Reorganize o texto abaixo para ficar mais claro e fácil de ler, mantendo TODA a informação original — não remova nem resuma nada, só melhore a organização/pontuação/quebra de linha. Responda só com o texto reorganizado, sem comentário nenhum.\n\nTexto original:\n${texto}`,
        },
      ],
    });

    const textoOrganizado =
      resposta.content[0].type === "text" ? resposta.content[0].text : texto;
    return Response.json({ textoOrganizado });
  } catch {
    return Response.json(
      { error: "Não foi possível organizar agora — tente de novo." },
      { status: 500 }
    );
  }
}
