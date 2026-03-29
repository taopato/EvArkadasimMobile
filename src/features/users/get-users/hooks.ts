import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getAllUsers, 
  getUserById, 
  createUser, 
  updateUser, 
  getUserPaymentHistory 
} from './api';

export function useAllUsers() {
  return useQuery({
    queryKey: ['users', 'all'],
    queryFn: getAllUsers,
  });
}

export function useUserById(userId: number) {
  return useQuery({
    queryKey: ['users', 'id', userId],
    queryFn: () => getUserById(userId),
    enabled: !!userId,
  });
}

export function useUserPaymentHistory(userId: number, houseId?: number, limit?: number) {
  return useQuery({
    queryKey: ['users', 'payment-history', userId, houseId, limit],
    queryFn: () => getUserPaymentHistory(userId, houseId, limit),
    enabled: !!userId,
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      // Invalidate users list
      queryClient.invalidateQueries({ queryKey: ['users', 'all'] });
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ userId, userData }: { userId: number; userData: any }) => 
      updateUser(userId, userData),
    onSuccess: (data, variables) => {
      // Invalidate specific user and users list
      queryClient.invalidateQueries({ queryKey: ['users', 'id', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['users', 'all'] });
    },
  });
}
