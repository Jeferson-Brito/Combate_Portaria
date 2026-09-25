import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';

export interface RealtimeAlertPayload {
  title: string;
  message: string;
  type: 'AUTHORIZED' | 'DENIED' | 'INFO' | 'WARNING';
  visitRequestId?: string;
  visitorName?: string;
  clientName?: string;
  destinationName?: string;
  timestamp: string;
}

export class RealtimeService {
  private static instance: RealtimeService;
  private io: SocketIOServer | null = null;

  private constructor() {
    // Singleton
  }

  public static getInstance(): RealtimeService {
    if (!RealtimeService.instance) {
      RealtimeService.instance = new RealtimeService();
    }
    return RealtimeService.instance;
  }

  public init(httpServer: HTTPServer): SocketIOServer {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
      },
      pingTimeout: 30000,
      pingInterval: 25000,
    });

    this.io.on('connection', (socket: Socket) => {
      const orgId = socket.handshake.query.organizationId as string;
      const userId = socket.handshake.query.userId as string;

      if (orgId) {
        socket.join(`org_${orgId}`);
        console.log(`🔌 [Realtime] Socket ${socket.id} entrou na sala da organização: org_${orgId}`);
      }

      if (userId) {
        socket.join(`user_${userId}`);
      }

      socket.on('join_org', (newOrgId: string) => {
        if (newOrgId) {
          socket.join(`org_${newOrgId}`);
        }
      });

      socket.on('disconnect', (reason) => {
        console.log(`🔌 [Realtime] Socket ${socket.id} desconectado (${reason})`);
      });
    });

    return this.io;
  }

  public getIO(): SocketIOServer | null {
    return this.io;
  }

  // Notifica toda a portaria de uma organização sobre nova solicitação criada
  public notifyVisitRequestCreated(organizationId: string, payload: any) {
    if (!this.io) return;
    this.io.to(`org_${organizationId}`).emit('visit_request:created', {
      ...payload,
      emittedAt: new Date().toISOString(),
    });
  }

  // Notifica toda a portaria sobre atualização de status (Autorizado, Recusado, Entrou, Saiu)
  public notifyVisitRequestUpdated(organizationId: string, payload: any) {
    if (!this.io) return;
    this.io.to(`org_${organizationId}`).emit('visit_request:updated', {
      ...payload,
      emittedAt: new Date().toISOString(),
    });
  }

  private pushTokens: Map<string, Set<string>> = new Map();

  public registerPushToken(organizationId: string, token: string) {
    if (!token) return;
    let tokens = this.pushTokens.get(organizationId);
    if (!tokens) {
      tokens = new Set();
      this.pushTokens.set(organizationId, tokens);
    }
    tokens.add(token);
    console.log(`📱 [Push] Token registrado para org ${organizationId}: ${token}`);
  }

  // Notifica alerta sonoro/visual para os porteiros
  public notifyAlert(organizationId: string, alert: Omit<RealtimeAlertPayload, 'timestamp'>) {
    const fullPayload: RealtimeAlertPayload = {
      ...alert,
      timestamp: new Date().toISOString(),
    };

    if (this.io) {
      this.io.to(`org_${organizationId}`).emit('notification:alert', fullPayload);
    }

    // Dispara Push Notification via Expo Push Service (para quando o app estiver fechado)
    const tokens = this.pushTokens.get(organizationId);
    if (tokens && tokens.size > 0) {
      this.sendExpoPushNotifications(
        Array.from(tokens),
        alert.title,
        alert.message,
        {
          type: alert.type,
          visitRequestId: alert.visitRequestId,
        }
      );
    }
  }

  private async sendExpoPushNotifications(tokens: string[], title: string, body: string, data: any) {
    try {
      const messages = tokens.map((to) => ({
        to,
        sound: 'default',
        title,
        body,
        data,
        priority: 'high',
        channelId: 'portaria-alerts',
      }));

      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messages),
      });
      console.log(`📲 [Push] Notificações push despachadas para ${tokens.length} dispositivos.`);
    } catch (err: any) {
      console.warn('⚠️ [Push] Erro ao despachar Expo Push Notification:', err?.message || err);
    }
  }

  // Notifica alteração no status de pareamento do WhatsApp
  public notifyWhatsAppStatus(organizationId: string, status: any) {
    if (!this.io) return;
    this.io.to(`org_${organizationId}`).emit('whatsapp:status', {
      ...status,
      emittedAt: new Date().toISOString(),
    });
  }

  // Emite evento genérico para a sala da organização
  public emitToOrganization(organizationId: string, event: string, payload: any) {
    if (!this.io) return;
    this.io.to(`org_${organizationId}`).emit(event, {
      ...payload,
      emittedAt: new Date().toISOString(),
    });
  }
}

export const realtimeService = RealtimeService.getInstance();
