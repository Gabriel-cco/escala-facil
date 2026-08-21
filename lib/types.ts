// Tipos do domínio (novo modelo de dados: users + accounts).
// As colunas do banco estão em inglês; aqui expomos camelCase para a app.

export type Profile = "admin" | "coordinator" | "member";

export interface User {
  id: string;
  authId: string | null;
  name: string;
  email: string;
  cpf: string | null;
  birthDate: string | null;
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

export type NotificationType =
  | "general"
  | "schedule"
  | "swap_request"
  | "swap_accepted"
  | "swap_cancelled";

export type NotificationReferenceType = "event" | "group" | "swap_request";

export interface SwapRequest {
  id: string;
  assignmentId: string;
  eventId: string;
  roleId: string;
  requesterAccountId: string;
  accepterAccountId: string | null;
  status: "pending" | "accepted" | "cancelled";
  reason: string | null;
  createdAt: string;
  resolvedAt: string | null;
  // campos de join
  eventName?: string;
  eventDate?: string;
  roleName?: string;
  requesterName?: string;
  accepterName?: string;
}

export interface Notification {
  id: string;
  accountId: string;
  title: string;
  body: string;
  type: NotificationType;
  referenceType: NotificationReferenceType | null;
  referenceId: string | null;
  read: boolean;
  readAt: string | null;
  createdAt: string;
  senderAccountId: string | null;
}
