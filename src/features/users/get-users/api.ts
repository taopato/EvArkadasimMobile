import api from '../../../services/api';

export interface User {
  id: number;
  fullName: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserRequest {
  fullName: string;
  email: string;
  password: string;
}

export interface UpdateUserRequest {
  fullName?: string;
  email?: string;
}

export interface PaymentHistory {
  id: number;
  amount: number;
  description: string;
  type: 'sent' | 'received';
  status: 'Pending' | 'Approved' | 'Rejected';
  createdAt: string;
  relatedUser: {
    id: number;
    fullName: string;
    email: string;
  };
}

export async function getAllUsers(): Promise<User[]> {
  const { data } = await api.get<User[]>('/Users/GetAllUsers');
  return data;
}

export async function getUserById(userId: number): Promise<User> {
  const { data } = await api.get<User>(`/Users/${userId}`);
  return data;
}

export async function createUser(userData: CreateUserRequest): Promise<User> {
  const { data } = await api.post<User>('/Users', userData);
  return data;
}

export async function updateUser(userId: number, userData: UpdateUserRequest): Promise<User> {
  const { data } = await api.put<User>(`/Users/${userId}`, userData);
  return data;
}

export async function getUserPaymentHistory(userId: number, houseId?: number, limit?: number): Promise<PaymentHistory[]> {
  const params = new URLSearchParams();
  if (houseId) params.append('houseId', houseId.toString());
  if (limit) params.append('limit', limit.toString());
  
  const { data } = await api.get<PaymentHistory[]>(
    `/Users/${userId}/payment-history?${params.toString()}`
  );
  return data;
}
