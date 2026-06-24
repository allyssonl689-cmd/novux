import { apiFetch } from './api';

interface TwoFAStatus { enabled: boolean }
interface TwoFASetup  { qrDataUrl: string; secret: string }

export const twoFactorService = {
  async status(): Promise<TwoFAStatus> {
    const res = await apiFetch<{ success: boolean; data: TwoFAStatus }>('/api/auth/2fa/status');
    return res.data;
  },
  async setup(): Promise<TwoFASetup> {
    const res = await apiFetch<{ success: boolean; data: TwoFASetup }>('/api/auth/2fa/setup', { method: 'POST' });
    return res.data;
  },
  async verify(token: string): Promise<{ recoveryCodes: string[] }> {
    const res = await apiFetch<{ success: boolean; data: { recoveryCodes: string[] } }>(
      '/api/auth/2fa/verify', { method: 'POST', body: JSON.stringify({ token }) });
    return res.data;
  },
  async disable(token: string, currentPassword?: string): Promise<void> {
    await apiFetch('/api/auth/2fa/disable', { method: 'POST', body: JSON.stringify({ token, currentPassword }) });
  },
};

// Browser Notification API helpers
export const notificationService = {
  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) return false;
    if (Notification.permission === 'granted') return true;
    const result = await Notification.requestPermission();
    return result === 'granted';
  },

  isGranted(): boolean {
    return 'Notification' in window && Notification.permission === 'granted';
  },

  show(title: string, body: string, icon = '/icon-192.png') {
    if (!this.isGranted()) return;
    new Notification(title, { body, icon });
  },

  scheduleDailyReminder() {
    // Check for due transactions once a day (when app is open)
    const key = 'novux_last_reminder';
    const last = localStorage.getItem(key);
    const today = new Date().toISOString().slice(0, 10);
    if (last === today) return;
    localStorage.setItem(key, today);
    setTimeout(() => {
      this.show('Novux Finance', 'Não se esqueça de registrar seus lançamentos de hoje!');
    }, 3000);
  },
};
