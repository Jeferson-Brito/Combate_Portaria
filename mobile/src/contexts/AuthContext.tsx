import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../config/api';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'SUPERVISOR' | 'CONCIERGE';
  organizationId: string;
  organizationName: string;
}

interface AuthContextData {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadStorageData() {
      try {
        const storedToken = await AsyncStorage.getItem('@combate_portaria:token');
        const storedUser = await AsyncStorage.getItem('@combate_portaria:user');

        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
        }
      } catch (err) {
        console.error('Erro ao restaurar sessão local:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadStorageData();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      const { user: loggedUser, token: authToken, refreshToken } = response.data.data;

      setUser(loggedUser);
      setToken(authToken);

      await AsyncStorage.setItem('@combate_portaria:token', authToken);
      await AsyncStorage.setItem('@combate_portaria:refreshToken', refreshToken);
      await AsyncStorage.setItem('@combate_portaria:user', JSON.stringify(loggedUser));
    } catch (err: any) {
      const errorMsg =
        err.response?.data?.error?.message ||
        'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.';
      throw new Error(errorMsg);
    }
  };

  const signOut = async () => {
    try {
      await AsyncStorage.removeItem('@combate_portaria:token');
      await AsyncStorage.removeItem('@combate_portaria:refreshToken');
      await AsyncStorage.removeItem('@combate_portaria:user');
    } finally {
      setUser(null);
      setToken(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser utilizado dentro de um AuthProvider');
  }
  return context;
}
