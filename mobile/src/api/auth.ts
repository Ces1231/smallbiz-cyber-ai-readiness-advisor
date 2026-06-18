import { api } from './client';

export interface User {
  id: string;
  email: string;
  business_name?: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export async function signup(
  email: string,
  password: string,
  businessName: string
): Promise<AuthResponse> {
  return api.post<AuthResponse>('/auth/signup', {
    email,
    password,
    business_name: businessName,
  });
}

export async function login(
  email: string,
  password: string
): Promise<AuthResponse> {
  return api.post<AuthResponse>('/auth/login', { email, password });
}

export async function getMe(token: string): Promise<User> {
  return api.get<User>('/auth/me', token);
}
