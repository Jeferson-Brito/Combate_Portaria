import path from 'path';
import fs from 'fs';
import QRCode from 'qrcode';
import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  proto,
} from '@whiskeysockets/baileys';
import pino from 'pino';
import {
  IWhatsAppProvider,
  WhatsAppStatusInfo,
  ApprovalRequestMessageData,
  ReminderMessageData,
  IncomingMessageEvent,
} from '../interfaces/whatsapp-provider.interface.js';
import {
  parseMessageTemplate,
  DEFAULT_APPROVAL_TEMPLATE,
  DEFAULT_REMINDER_TEMPLATE,
} from '../templates/template.parser.js';
import { env } from '../../../config/env.js';

export class BaileysProvider implements IWhatsAppProvider {
  private sock: any = null;
  private statusInfo: WhatsAppStatusInfo = {
    status: 'DISCONNECTED',
  };
  private messageListeners: Array<(msg: IncomingMessageEvent) => Promise<void>> = [];
  private baseSessionDir: string;

  constructor(sessionDir?: string) {
    this.baseSessionDir = sessionDir || env.WHATSAPP_SESSION_PATH;
    if (!fs.existsSync(this.baseSessionDir)) {
      fs.mkdirSync(this.baseSessionDir, { recursive: true });
    }
  }

  async connect(organizationId: string): Promise<void> {
    const orgSessionPath = path.join(this.baseSessionDir, `org_${organizationId}`);
    if (!fs.existsSync(orgSessionPath)) {
      fs.mkdirSync(orgSessionPath, { recursive: true });
    }

    this.statusInfo.status = 'CONNECTING';

    const { state, saveCreds } = await useMultiFileAuthState(orgSessionPath);
    const { version } = await fetchLatestBaileysVersion();

    const logger = pino({ level: 'silent' });

    this.sock = makeWASocket({
      version,
      logger,
      auth: state,
      printQRInTerminal: false,
      browser: ['Combate Portaria', 'Chrome', '1.0.0'],
      syncFullHistory: false,
    });

    this.sock.ev.on('creds.update', saveCreds);

    this.sock.ev.on('connection.update', async (update: any) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        // Converte o QR Code raw em imagem Base64 para exibir no app do Admin
        try {
          const qrBase64 = await QRCode.toDataURL(qr);
          this.statusInfo = {
            status: 'QR_READY',
            qrCode: qrBase64,
          };
        } catch (e) {
          console.warn('Erro ao gerar QR Code Base64:', e);
        }
      }

      if (connection === 'close') {
        const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

        this.statusInfo = {
          status: 'DISCONNECTED',
        };

        if (shouldReconnect && env.WHATSAPP_AUTO_RECONNECT) {
          console.log('🔄 Reconectando Baileys automaticamente...');
          setTimeout(() => this.connect(organizationId), 3000);
        }
      } else if (connection === 'open') {
        const userJid = this.sock?.user?.id || '';
        const phone = userJid.split(':')[0] || userJid.split('@')[0];

        this.statusInfo = {
          status: 'CONNECTED',
          phoneConnected: phone,
          lastConnectedAt: new Date(),
        };

        console.log(`✅ WhatsApp Baileys conectado com sucesso para o número: ${phone}`);
      }
    });

    // Escuta mensagens recebidas (respostas dos moradores)
    this.sock.ev.on('messages.upsert', async ({ messages }: { messages: proto.IWebMessageInfo[] }) => {
      for (const msg of messages) {
        if (!msg.message || msg.key.fromMe) continue;

        const remoteJid = msg.key.remoteJid || '';
        if (remoteJid.endsWith('@g.us')) continue; // Ignora grupos de WhatsApp

        const fromPhone = remoteJid.replace(/[^0-9]/g, '');

        let message = msg.message;
        // Desempacota mensagens encapsuladas (ephemeralMessage, viewOnce, editedMessage, documentWithCaption)
        while (
          message.ephemeralMessage?.message ||
          message.viewOnceMessage?.message ||
          message.viewOnceMessageV2?.message ||
          message.documentWithCaptionMessage?.message ||
          (message as any).editedMessage?.message?.protocolMessage?.editedMessage
        ) {
          message =
            message.ephemeralMessage?.message ||
            message.viewOnceMessage?.message ||
            message.viewOnceMessageV2?.message ||
            message.documentWithCaptionMessage?.message ||
            (message as any).editedMessage?.message?.protocolMessage?.editedMessage;
        }

        const text = (
          message.conversation ||
          message.extendedTextMessage?.text ||
          message.buttonsResponseMessage?.selectedButtonId ||
          message.buttonsResponseMessage?.selectedDisplayText ||
          message.templateButtonReplyMessage?.selectedId ||
          message.templateButtonReplyMessage?.selectedDisplayText ||
          message.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson ||
          message.listResponseMessage?.singleSelectReply?.selectedRowId ||
          message.reactionMessage?.text ||
          ''
        ).trim();

        // Extrai mensagem citada (se respondeu citando)
        const context = message.extendedTextMessage?.contextInfo;
        const quotedMsg = context?.quotedMessage;
        let quotedText = '';
        if (quotedMsg) {
          quotedText = (
            quotedMsg.conversation ||
            quotedMsg.extendedTextMessage?.text ||
            ''
          ).trim();
        }

        // Tenta achar código na citação (ex: #VIS-12345 ou 123456)
        let quotedCode: string | undefined;
        if (quotedText) {
          const match = quotedText.match(/#?([A-Z0-9]{4,8})/);
          if (match) quotedCode = match[1];
        }

        console.log(`📩 [Baileys] Mensagem recebida de ${remoteJid} (${fromPhone}): "${text}" (pushName: ${msg.pushName || 'N/A'})`);

        if (text && text.trim().length > 0) {
          const event: IncomingMessageEvent = {
            fromPhone,
            fromJid: remoteJid,
            text: text.trim(),
            pushName: msg.pushName || undefined,
            quotedCode,
            quotedText: quotedText || undefined,
            timestamp: new Date((msg.messageTimestamp as number) * 1000 || Date.now()),
            rawMessage: msg,
          };

          for (const listener of this.messageListeners) {
            try {
              await listener(event);
            } catch (err) {
              console.error('Erro ao processar mensagem do WhatsApp:', err);
            }
          }
        }
      }
    });
  }

  async disconnect(organizationId: string): Promise<void> {
    if (this.sock) {
      await this.sock.logout();
      this.sock = null;
    }
    this.statusInfo = { status: 'DISCONNECTED' };

    // Limpa credenciais locais
    const orgSessionPath = path.join(this.baseSessionDir, `org_${organizationId}`);
    if (fs.existsSync(orgSessionPath)) {
      fs.rmSync(orgSessionPath, { recursive: true, force: true });
    }
  }

  async getStatus(_organizationId: string): Promise<WhatsAppStatusInfo> {
    return this.statusInfo;
  }

  private async resolveJid(phone: string): Promise<string> {
    const clean = phone.replace(/\D/g, '');

    if (this.sock) {
      try {
        // 1. Tenta verificar o número original informado
        const [direct] = (await this.sock.onWhatsApp(clean)) || [];
        if (direct && direct.exists) {
          console.log(`📱 [Baileys] JID verificado para ${clean}: ${direct.jid}`);
          return direct.jid;
        }

        // 2. Se for número do Brasil com 13 dígitos (55 + DDD + 9 dígitos, ex: 5583993858515)
        // No WhatsApp de muitos DDDs do Brasil (como 83, 81, 71, etc.), o JID é registrado sem o 9º dígito (12 dígitos)
        if (clean.startsWith('55') && clean.length === 13 && clean[4] === '9') {
          const withoutNine = `${clean.slice(0, 4)}${clean.slice(5)}`;
          const [resWithout] = (await this.sock.onWhatsApp(withoutNine)) || [];
          if (resWithout && resWithout.exists) {
            console.log(`📱 [Baileys] JID resolvido sem 9º dígito (${withoutNine}): ${resWithout.jid}`);
            return resWithout.jid;
          }
        }

        // 3. Se foi informado com 12 dígitos (sem o 9º dígito), tenta com o 9º dígito
        if (clean.startsWith('55') && clean.length === 12) {
          const withNine = `${clean.slice(0, 4)}9${clean.slice(4)}`;
          const [resWith] = (await this.sock.onWhatsApp(withNine)) || [];
          if (resWith && resWith.exists) {
            console.log(`📱 [Baileys] JID resolvido com 9º dígito (${withNine}): ${resWith.jid}`);
            return resWith.jid;
          }
        }
      } catch (err: any) {
        console.warn('⚠️ [Baileys] Erro ao consultar onWhatsApp:', err?.message || err);
      }
    }

    // Fallback para números brasileiros fora da área de SP/RJ (DDD > 28)
    if (clean.startsWith('55') && clean.length === 13 && clean[4] === '9') {
      const ddd = parseInt(clean.slice(2, 4), 10);
      if (ddd > 28) {
        const withoutNine = `${clean.slice(0, 4)}${clean.slice(5)}@s.whatsapp.net`;
        console.log(`📱 [Baileys] Fallback JID sem 9º dígito para DDD ${ddd}: ${withoutNine}`);
        return withoutNine;
      }
    }

    return `${clean}@s.whatsapp.net`;
  }

  async sendApprovalRequest(data: ApprovalRequestMessageData): Promise<{ messageId: string }> {
    if (this.statusInfo.status !== 'CONNECTED' || !this.sock) {
      throw new Error('WhatsApp não está conectado no momento.');
    }

    const jid = await this.resolveJid(data.clientPhone);

    const text = parseMessageTemplate(data.customTemplate || DEFAULT_APPROVAL_TEMPLATE, {
      cliente: data.clientName,
      visitante: data.visitorName,
      empresa: data.visitorCompany,
      tipo: data.visitorType,
      motivo: data.visitReason,
      horario: data.arrivalFormattedTime,
      veiculo: data.vehicleModel,
      placa: data.vehiclePlate,
      codigo: data.requestCode,
    });

    console.log(`🚀 [Baileys] Enviando mensagem de autorização para ${data.clientName} (JID: ${jid})...`);
    const sent = await this.sock.sendMessage(jid, { text });
    console.log(`✅ [Baileys] Mensagem enviada com sucesso! ID: ${sent?.key?.id}`);
    return { messageId: sent.key.id || '' };
  }

  async sendReminder(data: ReminderMessageData): Promise<{ messageId: string }> {
    if (this.statusInfo.status !== 'CONNECTED' || !this.sock) {
      throw new Error('WhatsApp não está conectado no momento.');
    }

    const jid = await this.resolveJid(data.clientPhone);

    const text = parseMessageTemplate(data.customTemplate || DEFAULT_REMINDER_TEMPLATE, {
      cliente: data.clientName,
      visitante: data.visitorName,
      motivo: 'Lembrete de liberação',
      horario: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      codigo: data.requestCode,
    });

    console.log(`🚀 [Baileys] Enviando lembrete para ${data.clientName} (JID: ${jid})...`);
    const sent = await this.sock.sendMessage(jid, { text });
    console.log(`✅ [Baileys] Lembrete enviado com sucesso! ID: ${sent?.key?.id}`);
    return { messageId: sent.key.id || '' };
  }

  async sendMessage(toPhone: string, text: string): Promise<{ messageId: string }> {
    if (this.statusInfo.status !== 'CONNECTED' || !this.sock) {
      throw new Error('WhatsApp não está conectado no momento.');
    }

    const jid = toPhone.includes('@') ? toPhone : await this.resolveJid(toPhone);
    console.log(`🚀 [Baileys] Enviando mensagem de texto para JID: ${jid}...`);
    const sent = await this.sock.sendMessage(jid, { text });
    console.log(`✅ [Baileys] Mensagem enviada com sucesso! ID: ${sent?.key?.id}`);
    return { messageId: sent?.key.id || `msg_${Date.now()}` };
  }

  onMessageReceived(callback: (msg: IncomingMessageEvent) => Promise<void>): void {
    this.messageListeners.push(callback);
  }
}
