// Tipos do domínio (novo modelo de dados: users + accounts).
// As colunas do banco estão em inglês; aqui expomos camelCase para a app.

export type Profile = "admin" | "coordinator" | "member";

export interface User {
  id: string;
  authId: string | null;
  name: string;
  email: string;
  cpf: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Account {
  id: string;
  userId: string;
  profile: Profile;
  groupId: string | null;
  active: boolean;
  suspendedUntil: string | null;
  createdAt: string;
  updatedAt: string;
  user?: User; // preenchido quando a query faz JOIN em users
}
