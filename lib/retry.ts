// Retry simples com backoff, para chamadas de rede que podem falhar de forma
// transitória (Server Action lenta pra compilar/acordar, blip de rede etc.).

export async function withRetry<T>(
  fn: () => Promise<T>,
  { tentativas = 3, delayMs = 800 }: { tentativas?: number; delayMs?: number } = {}
): Promise<T> {
  let ultimoErro: unknown;
  for (let i = 0; i < tentativas; i++) {
    try {
      return await fn();
    } catch (e) {
      ultimoErro = e;
      if (i < tentativas - 1) {
        // Backoff linear simples (800ms, 1600ms, ...) — suficiente pra dar
        // tempo de um cold start ou blip passar sem segurar demais a UI.
        await new Promise((resolve) => setTimeout(resolve, delayMs * (i + 1)));
      }
    }
  }
  throw ultimoErro;
}
