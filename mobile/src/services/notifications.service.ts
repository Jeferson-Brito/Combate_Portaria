import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { api } from '../config/api';

export const isExpoGo =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient ||
  (Constants as any).appOwnership === 'expo';

// Configuração padrão de exibição de notificações apenas no app compilado (não no Expo Go)
if (!isExpoGo) {
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
  } catch (e) {
    // Ignora erro em ambientes de desenvolvimento
  }
}

export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (Platform.OS === 'web' || isExpoGo) {
    // No Expo Go a partir do SDK 53, notificações remotas push são desativadas pela Meta/Google.
    // Elas funcionam automaticamente na compilação do APK nativo.
    return null;
  }

  try {
    // Canal de notificação do Android com som e prioridade máxima
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
  if (isExpoGo) return;
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
