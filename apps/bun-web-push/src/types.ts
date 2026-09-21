export interface VapidKeys {
  publicKey: string;
  privateKey: string;
}

export interface NotificationAction {
  action: string;
  title: string;
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  image?: string;
  tag?: string;
  actions?: NotificationAction[];
}

export interface SendPushRequestBody {
  title?: string;
  body?: string;
  icon?: string;
  image?: string;
  tag?: string;
  actions?: NotificationAction[];
  delaySeconds?: number | string;
}

export interface PushDispatchResult {
  successCount: number;
  failCount: number;
}
