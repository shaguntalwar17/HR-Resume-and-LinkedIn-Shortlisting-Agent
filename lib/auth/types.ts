import { UserRole } from "@prisma/client";

export interface SessionUser {
  userId: string;
  name: string;
  email: string;
  role: UserRole;
  organizationId: string;
  organizationName: string;
}
