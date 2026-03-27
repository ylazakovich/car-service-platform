import api from "./client";

export type UserItem = {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  is_staff: boolean;
  is_active: boolean;
  created_at: string;
  has_usable_password: boolean;
};

export type InviteResponse = {
  id: number;
  email: string;
  role: string;
  invite_url: string;
};

export async function fetchUsers(): Promise<UserItem[]> {
  const response = await api.get<UserItem[]>("/users/");
  return response.data;
}

export async function createInvite(email: string, role: string): Promise<InviteResponse> {
  const response = await api.post<InviteResponse>("/users/invite/", { email, role });
  return response.data;
}

export async function acceptInvite(token: string, password: string): Promise<void> {
  await api.post("/users/invite/accept", { token, password });
}

export async function resetInvite(userId: number): Promise<{ invite_url: string }> {
  const response = await api.post<{ invite_url: string }>(`/users/${userId}/reset-invite/`);
  return response.data;
}
