# PRD — Escala Fácil

## 1. Contexto e Problema

Grupos de serviço litúrgico (leitores, cantores, acólitos, ministros, etc.) são parte central da vida paroquial. Cada missa ou celebração exige que funções específicas sejam ocupadas por membros escalados com antecedência.

Hoje, a maioria das paróquias resolve isso com **planilhas Excel compartilhadas via WhatsApp**, cadernos físicos, ou planilhas Google com acesso desorganizado. Esse processo gera problemas recorrentes:

- **Conflitos de escala**: a mesma pessoa escalada duas vezes no mesmo evento, ou uma função sem ninguém.
- **Visibilidade zero para os membros**: o membro não sabe quando está escalado sem consultar manualmente a planilha.
- **Dificuldade de troca**: quando alguém não pode servir, a troca acontece por mensagens informais que o coordenador muitas vezes não fica sabendo.
- **Escalas desatualizadas circulando**: versões antigas do Excel sendo usadas depois de edições.
- **Esforço manual do coordenador**: montar, distribuir e atualizar a escala todo mês consome horas de trabalho voluntário.
- **Falta de controle de suspensões**: membros afastados temporariamente (viagem, luto, etc.) continuam aparecendo como disponíveis.

Não existe, no mercado brasileiro, uma ferramenta simples e gratuita voltada especificamente para essa realidade paroquial.

---

## 2. O Que o Escala Fácil Resolve

O Escala Fácil é um **sistema de gestão de escalas de serviço litúrgico** para paróquias. Ele centraliza, em uma única aplicação web, tudo que envolve montar e comunicar quem faz o quê em cada missa ou evento.

### Problemas resolvidos diretamente

| Problema | Solução |
|---|---|
| Planilha descentralizada e sem controle de acesso | App web com login e perfis de permissão |
| Membro não sabe quando está escalado | Tela "Minha Escala" + notificações |
| Troca informal e sem rastreio | Fluxo de pedido de troca dentro do app |
| Coordenador monta escala manualmente todo mês | Geração mensal automática por padrões recorrentes |
| Membro suspenso continua na escala | Campo `suspended_until` bloqueia atribuições e alerta o coordenador |
| Escala inacessível a visitantes | Link público de leitura por grupo |

---

## 3. Quem Usa

### Personas

**Coordenador de grupo** _(usuário principal)_
Voluntário responsável por um grupo de serviço (ex.: "Coral", "Leitores da 9h"). Monta a escala todo mês, comunica os membros, resolve faltas e trocas. Tem pouco tempo, usa o celular mais do que o computador.

**Membro do grupo**
Voluntário que serve em missas. Quer saber com antecedência quando está escalado e conseguir trocar facilmente quando não puder ir.

**Administrador da paróquia**
Responsável por configurar e supervisionar todos os grupos. Tem visão global, cria grupos, gerencia coordenadores.

---

## 4. O Que o App Tem

### 4.1 Autenticação e Onboarding

- Login exclusivo via Google OAuth (sem senha para gerenciar).
- Na primeira vez, o sistema cria automaticamente o cadastro do usuário.
- Se o usuário ainda não foi adicionado a nenhum grupo, é redirecionado para uma tela de acesso pendente até que um coordenador/admin o vincule.

### 4.2 Grupos

Cada paróquia pode ter múltiplos grupos de serviço independentes (Coral, Leitores, Ministros, etc.). Cada grupo tem seus próprios membros, funções e eventos. O admin gerencia todos; o coordenador enxerga só o seu.

### 4.3 Funções (Roles)

Dentro de cada grupo, são cadastradas as funções possíveis na missa (Leitor 1, Leitor 2, Cantor, Monitor de Áudio, etc.). Funções podem ser desativadas sem apagar o histórico.

### 4.4 Membros

Membros são vinculados a um grupo com um perfil (`admin`, `coordinator`, `member`). Podem ser:
- **Desativados** (saíram do grupo permanentemente).
- **Suspensos temporariamente** (com data de retorno) — enquanto suspensos, não aparecem como disponíveis na escala e, se já estiverem atribuídos a um evento futuro, um aviso é exibido ao coordenador.

### 4.5 Eventos

Cada evento representa uma missa ou celebração:
- Nome, data, horário, grupo.
- Exibe o **progresso de atribuição** (ex.: "3 de 5 funções preenchidas").
- Suporte a metadados do calendário litúrgico (nome da celebração, cor litúrgica).
- Criação em lote: o coordenador pode gerar todos os eventos do mês de uma vez, com base em padrões recorrentes.

### 4.6 Escala (Atribuições)

O coordenador abre um evento e atribui cada função a um membro. Regras aplicadas:
- Uma função pode ter apenas 1 membro por evento.
- Um membro pode ter apenas 1 função por evento.
- Membros suspensos ficam bloqueados e geram alerta se já atribuídos.

### 4.7 Minha Escala

O membro acessa uma visão pessoal com o calendário do mês mostrando todos os eventos do grupo, destacando aqueles em que está escalado e quem mais está em cada evento.

### 4.8 Pedidos de Troca

Quando um membro não pode servir em um evento, ele solicita uma troca diretamente no app:
- Escolhe outro membro disponível para assumir.
- Informa o motivo (opcional).
- O outro membro recebe uma notificação e aceita ou recusa.
- O coordenador é informado do resultado.
- Todas as trocas ficam registradas com histórico.

### 4.9 Notificações

- Notificações automáticas para trocas (pedido, aceite, recusa).
- Coordenador/admin pode enviar avisos manuais para todo o grupo ou para grupos específicos.
- Suporte a push notifications (PWA) no celular e desktop.
- Sino no cabeçalho mostra o número de notificações não lidas.

### 4.10 Link Público do Grupo

Cada grupo tem um link público (sem login) que exibe a escala de forma somente leitura — para compartilhar com paroquianos que não usam o app.

---

## 5. O Que Ainda Falta (V1 Completa)

| Fase | O que é |
|---|---|
| **Template mensal** | Geração automática de eventos do mês por padrões recorrentes (ex.: toda sexta às 19h) |
| **Visão do membro logado** | Dashboard personalizado para o perfil `member` |
| **Seleção de grupo pós-login (admin)** | Admin escolhe qual grupo quer gerenciar ao entrar |
| **Link coletivo público** | Página pública `/escala/[token]` com a escala do grupo sem login |
| **Polish e design final** | Criar membro/função de dentro do grupo, dashboard por perfil, refinamento visual |

---

## 6. Modelo de Negócio (Atual)

O Escala Fácil é atualmente um projeto **sem monetização** — desenvolvido para uso em paróquias específicas. A infraestrutura roda no plano gratuito da Supabase.

Potencial futuro: modelo SaaS com plano gratuito para paróquias pequenas e plano pago para múltiplos grupos / funcionalidades avançadas.

---

## 7. Restrições e Decisões de Design

- **Grupos únicos por coordenador**: cada coordenador pertence a exatamente um grupo — sem multi-grupo para esse perfil.
- **Sem senha própria**: o login é 100% Google OAuth para simplificar onboarding e segurança.
- **Sem multi-função por membro por evento**: um membro assume no máximo uma função por evento, evitando sobrecarga e conflitos de escala.
- **Soft delete**: grupos, membros e funções não são deletados — apenas desativados, preservando o histórico de escalas.
- **Eventos usam hard delete**: eventos deletados removem também suas atribuições.
