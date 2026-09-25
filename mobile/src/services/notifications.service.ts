import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { api } from '../config/api';

// Configuração padrão de exibição de notificações quando o app está em primeiro plano
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export const isExpoGo =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient ||
  (Constants as any).appOwnership === 'expo';

export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (Platform.OS === 'web') return null;

  try {
    // Canal de notificação do Android com som e prioridade máxima (Seção 22)
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('portaria-alerts', {
        name: 'Alertas de Acesso da Portaria',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#2563EB',
        sound: 'default',
        enableVibrate: true,
      });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('⚠️ Permissão de notificações negada pelo usuário.');
      return null;
    }

    // No Expo Go a partir do SDK 53, notificações remotas push (FCM) são desativadas pela Meta/Google.
    // Elas funcionam automaticamente na compilação do APK nativo (build de desenvolvimento ou produção).
    if (isExpoGo) {
      console.log('ℹ️ [Notifications] Executando no Expo Go: usando notificações locais e banner instantâneo.');
      return null;
    }

    // Obtém o token do Expo Push (apenas em APK standalone / development build)
    const tokenData = await Notifications.getExpoPushTokenAsync().catch((err) => {
      console.warn('Aviso: getExpoPushTokenAsync:', err.message);
      return null;
    });

    const token = tokenData?.data || null;

    if (token) {
      console.log('📱 [Notifications] Expo Push Token obtido:', token);
      // Envia token para o backend
      try {
        await api.post('/users/push-token', { pushToken: token });
      } catch (err) {
        // Ignora se o endpoint não estiver pronto
      }
    }

    return token;
  } catch (error: any) {
    console.warn('Erro ao registrar notificações:', error?.message || error);
    return null;
  }
}

export async function triggerLocalAlertNotification(title: string, body: string, isAuthorized: boolean) {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.MAX,
        color: isAuthorized ? '#10B981' : '#EF4444',
      },
      trigger: null, // Disparo imediato
    });
  } catch (err: any) {
    console.warn('Erro ao disparar notificação local:', err?.message || err);
  }
}
