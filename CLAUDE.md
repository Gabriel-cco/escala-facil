CLAUDE.md — Escala Fácil
O que é

App web para coordenadores de grupos paroquiais montarem escalas de serviço litúrgico. Quem faz o quê em cada missa/evento.

Stack
Next.js 16 (App Router) + React 19 + TypeScript
Tailwind 4
Supabase (Postgres + Auth + RLS)
Projeto Supabase: pzbsvifgblzedqstkore
Modelo de dados (6 tabelas + 2 de suporte)
auth.users (Supabase Auth, Google OAuth — gerenciado automaticamente)
  ↓
users (nossa tabela — duplica nome/email do auth para independência de provider)
  id, auth_id → auth.users, name, email, cpf (opcional), created_at, updated_at
  ↓
accounts (papel do usuário na aplicação)
  id, user_id → users (UNIQUE), profile (admin|coordinator|member),
  group_id → groups (NULL para admin), active, suspended_until, created_at, updated_at
  CONSTRAINT: profile = 'admin' OR group_id IS NOT NULL

groups: id, name, description, active, created_at, updated_at
roles: id, name, group_id → groups, active, created_at, updated_at
events: id, name, date (DATE), time (TIME), group_id → groups, created_at, updated_at
assignments: id, event_id → events, role_id → roles, account_id → accounts
  UNIQUE(event_id, role_id) — 1 membro por função
  UNIQUE(event_id, account_id) — 1 função por membro por evento

group_public_links: id, group_id → groups (UNIQUE), token (UNIQUE), created_at
generated_months: id, group_id → groups, year, month, generated_by → accounts
  UNIQUE(group_id, year, month)
Perfis e permissões
admin: visão global, gerencia tudo, pode trocar de grupo no shell
coordinator: visão filtrada pelo grupo dele, gerencia seu grupo
member: somente leitura, vê a escala do grupo dele
Autenticação
Google OAuth exclusivamente
Callback em app/auth/callback/route.ts
Trigger on_auth_user_created no banco auto-cria o registro em users
Se não tem account → redireciona pra /acesso-pendente
Hook: useCurrentAccount() retorna user + account do logado
Contexto de grupo
GroupContext provider (contexts/GroupContext.tsx)
Admin: pode trocar grupo ativo ou "visão geral"
Coordinator/member: grupo fixo do account
Persistido em cookie ef_active_group
Server-side: getActiveGroupId() em lib/active-group-server.ts
Estrutura do Supabase client
Usar APENAS lib/supabase/* (padrão novo com createBrowserClient / createServerClient)
lib/supabase.ts (legado) foi removido — não recriar
Convenções
Colunas do banco em inglês (name, date, time, active, suspended_until)
Types em lib/types.ts (User, Account, etc.)
Modais de criação/edição usam rotas interceptoras (@modal)
Soft delete = setar active = false (grupos, accounts, roles). Eventos usam hard delete.
Elegibilidade na escala: active = true AND (suspended_until IS NULL OR suspended_until < event.date)
Listas filtram active = true por padrão, com toggle "Mostrar inativos"
O que JÁ está implementado
Login Google OAuth + onboarding automático + /acesso-pendente
CRUD completo: grupos, membros (users+accounts), funções, eventos, atribuições
Editar todas as entidades (modais pré-preenchidos)
Soft delete + toggle "mostrar inativos" + reativar
Suspender membro (suspended_until + badge + remover suspensão)
Aviso visual na escala quando membro suspenso tem atribuição
Dashboard com stats + próximos eventos
GroupContext + seletor de grupo no shell
Shell responsivo (Sidebar desktop + TabBar mobile)
Permissões por perfil (member não vê botões de gestão)
O que FALTA implementar (V1)
Fase 3: Template mensal (gerar eventos do mês por padrões recorrentes)
Fase 4: Seleção de grupo pós-login (admin), gestão de usuários, visão do membro logado
Fase 5: Link coletivo público por grupo (/escala/[token])
Fase 6: Polish — grupo como hub (criar membro/função de dentro do grupo), dashboard por perfil, design visual final, cleanup
Instruções para implementação
NÃO reanalisar a estrutura do projeto. Use este arquivo como referência.
Implementar diretamente a spec fornecida sem explorar arquivos desnecessários.
Verificar com: tsc --noEmit, eslint, next build