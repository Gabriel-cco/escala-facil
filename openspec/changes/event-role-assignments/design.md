## Context

O app é um Next.js 16 (App Router) com Supabase como backend, sem camada de API própria: as páginas server-component leem direto do Supabase com a chave anônima (`lib/supabase.ts`) e os componentes client escrevem direto via o mesmo cliente. As entidades já existentes são `groups`, `members` (com `group_id`, `ativo`, `suspenso_ate`), `roles`/funções (com `group_id`) e `events` (com `group_id`, `data_hora`). Falta a entidade que liga membro ↔ função ↔ evento — a escala em si.

O padrão de código atual (ver `app/funcoes`, `app/membros`) é: página server faz `select`, passa dados para um componente client que faz `insert`/`update` e chama `router.refresh()`. Vamos seguir esse mesmo padrão para manter consistência.

## Goals / Non-Goals

**Goals:**
- Modelar e persistir atribuições (evento × função × membro) no Supabase.
- Tela de detalhe do evento onde se cria, lista e remove atribuições.
- Aplicar elegibilidade (mesmo grupo, ativo, não suspenso na data do evento) e unicidade.

**Non-Goals:**
- Autenticação/autorização e multi-tenant real (o `organization_id` segue como está hoje).
- Notificação/comunicação da escala (WhatsApp, e-mail) — fora de escopo.
- Edição "in-place" de uma atribuição (a edição é feita removendo e recriando).
- Validações de capacidade por função (ex.: nº máximo de membros por função).

## Decisions

### Modelo de dados: tabela `assignments`

Colunas: `id` (uuid, pk), `event_id` (uuid, fk → events), `role_id` (uuid, fk → roles), `member_id` (uuid, fk → members), `created_at` (timestamptz default now()).

- Restrição `UNIQUE (event_id, role_id, member_id)` garante a unicidade no banco (defesa final além da checagem na UI).
- FKs com `ON DELETE CASCADE` para que excluir evento/função/membro não deixe atribuições órfãs.

*Alternativa considerada:* guardar a escala como JSON dentro de `events`. Rejeitado — perde integridade referencial, dificulta consultas por membro e contraria o padrão relacional já usado.

### Local na UI: rota de detalhe `app/eventos/[id]/page.tsx`

A criação de atribuição precisa do contexto de um evento específico; uma rota dedicada `/eventos/[id]` é o lugar natural. A listagem `app/eventos/page.tsx` ganha um link por evento para essa rota. Seguir as convenções do App Router desta versão do Next — **consultar `node_modules/next/dist/docs/` para a API de params/rotas dinâmicas antes de codar**, pois pode divergir do conhecido (ex.: `params` assíncrono).

*Alternativa considerada:* expandir a atribuição inline na própria lista de eventos. Rejeitado — polui a listagem e complica o carregamento de funções/membros por evento.

### Elegibilidade calculada no servidor

A página server do evento descobre o `group_id` do evento e carrega `roles` e `members` desse grupo, filtrando membros por `ativo = true` e `suspenso_ate` nulo ou anterior à data do evento. A lista filtrada é passada ao componente client, que ainda restringe o `select` de membros pela função escolhida (mesmo grupo). Manter a regra no servidor evita expor membros inelegíveis e mantém o componente client simples.

### Escrita/remoção no componente client

Seguindo o padrão existente: o componente client faz `insert`/`delete` direto no Supabase e chama `router.refresh()`. A checagem de duplicidade é feita antes do insert (comparando com as atribuições já carregadas) e o erro de violação de `UNIQUE` é tratado como fallback amigável.

## Risks / Trade-offs

- **Escrita direta com chave anônima sem RLS robusta** → risco de gravação indevida. Mitigação: fora do escopo desta mudança; manter o mesmo modelo de confiança já adotado no projeto e documentar como dívida.
- **Elegibilidade por suspensão usa a data do evento, não um intervalo** → membro suspenso pode ficar elegível para eventos após o fim da suspensão. Mitigação: comportamento desejado; a regra compara `suspenso_ate` com a data do evento.
- **Race de duplicidade entre checagem na UI e insert** → mitigado pela restrição `UNIQUE` no banco, que é a fonte de verdade.
- **API de rota dinâmica desta versão do Next pode diferir** → mitigação: ler `node_modules/next/dist/docs/` antes de implementar a página `[id]`.

## Migration Plan

1. Criar a tabela `assignments` no Supabase (migration SQL) com FKs e a restrição UNIQUE.
2. Implementar a rota de detalhe e o componente de atribuições.
3. Adicionar o link de eventos → detalhe.
4. Rollback: a feature é aditiva; reverter o código e, se necessário, `DROP TABLE assignments` (nenhuma tabela existente é alterada).
