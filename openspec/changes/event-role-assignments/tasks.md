## 1. Banco de dados

- [x] 1.1 Criar migration da tabela `assignments` (`id` uuid pk, `event_id`, `role_id`, `member_id`, `created_at`) — já existente no Supabase
- [x] 1.2 Adicionar FKs para `events`, `roles` e `members` com `ON DELETE CASCADE` — já existentes
- [x] 1.3 Adicionar restrição `UNIQUE (event_id, role_id, member_id)` — já existente
- [x] 1.4 Aplicar a migration no Supabase e confirmar a tabela com `list_tables` — feito pelo usuário (inclui `events.group_id`)

## 2. Página de detalhe do evento

- [x] 2.1 Consultar `node_modules/next/dist/docs/` sobre rotas dinâmicas/`params` desta versão do Next — Next 16: `params` é `Promise`, requer `await`
- [x] 2.2 Criar `app/eventos/[id]/page.tsx` (server) carregando o evento e seu `group_id`
- [x] 2.3 Carregar `roles` do grupo do evento
- [x] 2.4 Carregar `members` elegíveis (mesmo grupo, `ativo = true`, não suspensos na data do evento)
- [x] 2.5 Carregar as `assignments` existentes do evento com nomes de função e membro (join)
- [x] 2.6 Renderizar a lista de atribuições por função e a mensagem de estado vazio

## 3. Formulário de atribuição (client)

- [x] 3.1 Criar componente client de atribuição recebendo evento, funções e membros elegíveis
- [x] 3.2 Selecionar função e, ao escolher, filtrar membros pelo grupo da função (membros já filtrados pelo grupo do evento no server)
- [x] 3.3 Validar campos obrigatórios (função e membro) antes de enviar
- [x] 3.4 Checar duplicidade contra as atribuições já carregadas antes do insert
- [x] 3.5 Inserir em `assignments` e tratar o erro de violação de UNIQUE com mensagem amigável
- [x] 3.6 Chamar `router.refresh()` após criar e limpar o formulário

## 4. Remoção e navegação

- [x] 4.1 Adicionar ação de remover atribuição (`delete` + `router.refresh()`)
- [x] 4.2 Adicionar link de cada evento em `app/eventos/page.tsx` para `/eventos/[id]`

## 5. Verificação

- [x] 5.1 Rodar `npm run lint` e `npm run build` sem erros
- [ ] 5.2 Validar manualmente cada cenário do spec (criar, listar, vazio, duplicado, elegibilidade, remover) — requer rodar `npm run dev` e testar no navegador
