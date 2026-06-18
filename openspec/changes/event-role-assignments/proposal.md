## Why

Hoje o app já cadastra eventos, membros, funções e grupos isoladamente, mas não há como montar a escala em si: dizer *quem* (membro) faz *o quê* (função) em *qual* evento. Sem isso o produto não cumpre seu propósito ("escala fácil") — a informação central que o coordenador precisa produzir e comunicar ainda fica fora do sistema.

## What Changes

- Nova entidade de **atribuição** (escala) que liga um evento a um membro em uma função específica.
- Na página de um evento, o coordenador pode **adicionar uma atribuição** escolhendo uma função e um membro elegível.
- Listagem das atribuições já feitas para o evento, agrupadas/legíveis por função.
- Possibilidade de **remover** uma atribuição.
- Regras de elegibilidade ao escolher o membro: apenas membros do mesmo grupo da função, ativos e **não suspensos** na data do evento; impedir atribuir o mesmo membro à mesma função duas vezes no mesmo evento.
- Nova tabela `assignments` no Supabase com as restrições de integridade correspondentes.

## Capabilities

### New Capabilities
- `event-assignments`: criação, listagem e remoção de atribuições de membros a funções dentro de um evento, incluindo as regras de elegibilidade e unicidade.

### Modified Capabilities
<!-- Nenhuma capability existente possui spec formal ainda; nada a modificar. -->

## Impact

- **Banco (Supabase)**: nova tabela `assignments` (event_id, role_id, member_id + timestamps) com FKs para `events`, `roles`, `members` e restrição de unicidade (event_id, role_id, member_id).
- **Código**: nova rota de detalhe do evento `app/eventos/[id]/page.tsx` (server) e um componente cliente para o formulário/lista de atribuições; link a partir da listagem de eventos em `app/eventos/page.tsx`.
- **Dados consumidos**: leitura de `roles` e `members` filtrados pelo grupo do evento; escrita/leitura/exclusão em `assignments` via `lib/supabase.ts`.
- **Sem breaking changes** nas telas existentes.
