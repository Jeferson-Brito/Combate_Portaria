import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Detecta dinamicamente o IP da máquina que hospeda o servidor
export const getHostIp = (): string => {
  const hostUri =
    Constants.expoConfig?.hostUri ||
    (Constants as any).manifest2?.extra?.expoGo?.debuggerHost ||
    (Constants as any).manifest?.debuggerHost;

  if (hostUri) {
    const ip = hostUri.split(':')[0];
    if (ip && ip !== 'localhost' && ip !== '127.0.0.1') {
      return ip;
    }
  }

  // Fallback padrão para a rede local da portaria
  return '192.168.15.115';
};

export const getBaseUrl = () => {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  // Web local no navegador do próprio PC
  if (Platform.OS === 'web') {
    return 'http://localhost:3333/api/v1';
  }

  // Aparelho físico no Expo Go ou emulador: conecta no IP da rede local
  const hostIp = getHostIp();
  return `http://${hostIp}:3333/api/v1`;
};

export const getSocketUrl = () => {
  const url = getBaseUrl();
  return url.replace('/api/v1', '');
};

export const api = axios.create({
  baseURL: getBaseUrl(),
  timeout: 10000,
});

api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('@combate_portaria:token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (e) {
      console.warn('Erro ao ler token do AsyncStorage:', e);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Sessão expirada
      await AsyncStorage.removeItem('@combate_portaria:token');
      await AsyncStorage.removeItem('@combate_portaria:user');
    }
    return Promise.reject(error);
  }
);
