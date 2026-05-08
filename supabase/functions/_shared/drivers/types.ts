// Universal WhatsApp driver interface
export type DriverCreds = {
  baseUrl: string;
  apiKey: string;        // global apikey of the provider
  config?: Record<string, any>;
};

export type DriverStatus = {
  connected: boolean;
  loggedIn: boolean;
  qrCode: string | null;
};

export type SendMediaInput = {
  token: string;
  to: string;
  mediaUrl: string;
  type: 'image' | 'video' | 'audio' | 'document' | 'sticker';
  caption?: string;
  fileName?: string;
};

export interface WhatsAppDriver {
  slug: string;
  createInstance(p: { instanceName: string; userId: string }): Promise<{ token: string; logs: string[] }>;
  getStatus(p: { instanceName: string; token: string }): Promise<DriverStatus & { logs: string[] }>;
  resetInstance(p: { instanceName: string; token: string }): Promise<void>;
  sendText(p: { token: string; to: string; text: string }): Promise<void>;
  sendMedia(p: SendMediaInput): Promise<void>;
  fetchGroups(p: { token: string }): Promise<Array<{ id: string; name: string; participants?: number }>>;
  testConnection?(): Promise<{ ok: boolean; message: string }>;
}
