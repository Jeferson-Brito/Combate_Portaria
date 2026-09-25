import fs from 'fs';
import path from 'path';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env } from '../../config/env.js';

export interface IStorageService {
  upload(fileName: string, buffer: Buffer, mimeType: string): Promise<string>;
  getFile(filePath: string): Promise<{ buffer: Buffer; mimeType: string } | null>;
  getSignedUrl(filePath: string, expiresInSeconds?: number): Promise<string>;
}

// -------------------------------------------------------------
// Armazenamento Local (Desenvolvimento Local & Offline)
// -------------------------------------------------------------
export class LocalStorageService implements IStorageService {
  private baseDir: string;

  constructor() {
    this.baseDir = path.resolve(process.cwd(), 'uploads', 'visitors');
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  async upload(fileName: string, buffer: Buffer, _mimeType: string): Promise<string> {
    const safeFileName = `${Date.now()}_${fileName.replace(/[^a-zA-Z0-9._-]/g, '')}`;
    const targetPath = path.join(this.baseDir, safeFileName);
    await fs.promises.writeFile(targetPath, buffer);
    return safeFileName;
  }

  async getFile(fileName: string): Promise<{ buffer: Buffer; mimeType: string } | null> {
    const targetPath = path.join(this.baseDir, fileName);
    if (!fs.existsSync(targetPath)) {
      return null;
    }
    const buffer = await fs.promises.readFile(targetPath);
    const ext = path.extname(fileName).toLowerCase();
    const mimeType = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
    return { buffer, mimeType };
  }

  async getSignedUrl(fileName: string): Promise<string> {
    // Em dev local, a rota autenticada da API serve a foto
    return `${env.API_URL}/api/v1/visitors/photo/${fileName}`;
  }
}

// -------------------------------------------------------------
// Armazenamento Supabase Storage (Produção / Cloud)
// -------------------------------------------------------------
export class SupabaseStorageService implements IStorageService {
  private client: SupabaseClient;
  private bucket: string;

  constructor() {
    if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Supabase URL e Service Role Key são necessários para SupabaseStorageService');
    }
    this.client = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
    this.bucket = env.SUPABASE_BUCKET_VISITORS;
  }

  async upload(fileName: string, buffer: Buffer, mimeType: string): Promise<string> {
    const safeFileName = `${Date.now()}_${fileName.replace(/[^a-zA-Z0-9._-]/g, '')}`;
    const { data, error } = await this.client.storage
      .from(this.bucket)
      .upload(safeFileName, buffer, {
        contentType: mimeType,
        upsert: false,
      });

    if (error) {
      throw new Error(`Erro ao enviar foto para Supabase Storage: ${error.message}`);
    }

    return data.path;
  }

  async getFile(filePath: string): Promise<{ buffer: Buffer; mimeType: string } | null> {
    const { data, error } = await this.client.storage.from(this.bucket).download(filePath);
    if (error || !data) {
      return null;
    }
    const arrayBuffer = await data.arrayBuffer();
    return {
      buffer: Buffer.from(arrayBuffer),
      mimeType: data.type || 'image/jpeg',
    };
  }

  async getSignedUrl(filePath: string, expiresInSeconds = 900): Promise<string> {
    // URL assinada temporária (15 minutos) conforme regras de LGPD
    const { data, error } = await this.client.storage
      .from(this.bucket)
      .createSignedUrl(filePath, expiresInSeconds);

    if (error || !data) {
      throw new Error(`Erro ao gerar URL assinada: ${error?.message}`);
    }

    return data.signedUrl;
  }
}

// Factory para alternar automaticamente entre Local e Supabase
export function getStorageService(): IStorageService {
  if (env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
    return new SupabaseStorageService();
  }
  return new LocalStorageService();
}
