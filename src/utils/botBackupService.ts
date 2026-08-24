export interface BotBackupConfig {
  enabled: boolean;
  intervalHours: number; // e.g. 1, 2, 4, 6, 12, 24
  lastSentTimestamp?: number;
  lastSentStatus?: 'success' | 'failed';
  lastSentMessage?: string;
  
  // Telegram Configuration
  telegramEnabled: boolean;
  telegramBotToken: string; // e.g. 123456:ABC-DEF...
  telegramAdminChatIds: string; // comma or newline separated chat IDs e.g. 12345678, 87654321
  
  // Bale Configuration (messenger.bale.ai)
  baleEnabled: boolean;
  baleBotToken: string; // Bale bot token
  baleAdminChatIds: string; // comma or newline separated Bale chat IDs
}

export interface BotSendResult {
  platform: 'telegram' | 'bale';
  targetChatId: string;
  success: boolean;
  message?: string;
}

/**
 * Send backup file/document to Telegram Bot API
 */
export async function sendBackupToTelegram(
  botToken: string,
  chatId: string,
  backupJSONString: string,
  companyName: string
): Promise<{ success: boolean; message: string }> {
  if (!botToken.trim() || !chatId.trim()) {
    return { success: false, message: 'توکن ربات یا شناسه چت تلگرام خالی است.' };
  }

  try {
    const cleanToken = botToken.trim();
    const cleanChatId = chatId.trim();
    const fileName = `backup_${companyName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.json`;
    const caption = `🛡️ **پشتیبان خودکار سیستم حسابداری مه**\n🏢 شرکت: ${companyName}\n📅 تاریخ: ${new Date().toLocaleDateString('fa-IR')}\n⏰ ساعت: ${new Date().toLocaleTimeString('fa-IR')}\n💾 حجم فایل: ${(backupJSONString.length / 1024).toFixed(1)} KB`;

    const blob = new Blob([backupJSONString], { type: 'application/json' });
    const formData = new FormData();
    formData.append('chat_id', cleanChatId);
    formData.append('caption', caption);
    formData.append('document', blob, fileName);

    const res = await fetch(`https://api.telegram.org/bot${cleanToken}/sendDocument`, {
      method: 'POST',
      body: formData,
    });

    const data = await res.json();
    if (data.ok) {
      return { success: true, message: 'فایل پشتیبان با موفقیت به تلگرام ارسال شد.' };
    } else {
      return { success: false, message: `خطای تلگرام: ${data.description || 'نامشخص'}` };
    }
  } catch (err: any) {
    return { success: false, message: `خطای ارتباط با سرور تلگرام: ${err?.message || err}` };
  }
}

/**
 * Send backup file/document to Bale Bot API (https://tapi.bale.ai)
 */
export async function sendBackupToBale(
  botToken: string,
  chatId: string,
  backupJSONString: string,
  companyName: string
): Promise<{ success: boolean; message: string }> {
  if (!botToken.trim() || !chatId.trim()) {
    return { success: false, message: 'توکن ربات یا شناسه چت بله خالی است.' };
  }

  try {
    const cleanToken = botToken.trim();
    const cleanChatId = chatId.trim();
    const fileName = `backup_${companyName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.json`;
    const caption = `🛡️ پشتیبان خودکار سیستم حسابداری مه\n🏢 شرکت: ${companyName}\n📅 تاریخ: ${new Date().toLocaleDateString('fa-IR')}\n⏰ ساعت: ${new Date().toLocaleTimeString('fa-IR')}\n💾 حجم فایل: ${(backupJSONString.length / 1024).toFixed(1)} KB`;

    const blob = new Blob([backupJSONString], { type: 'application/json' });
    const formData = new FormData();
    formData.append('chat_id', cleanChatId);
    formData.append('caption', caption);
    formData.append('document', blob, fileName);

    const res = await fetch(`https://tapi.bale.ai/bot${cleanToken}/sendDocument`, {
      method: 'POST',
      body: formData,
    });

    const data = await res.json();
    if (data.ok) {
      return { success: true, message: 'فایل پشتیبان با موفقیت به پیام‌رسان بله ارسال شد.' };
    } else {
      return { success: false, message: `خطای بله: ${data.description || 'نامشخص'}` };
    }
  } catch (err: any) {
    return { success: false, message: `خطای ارتباط با سرور بله: ${err?.message || err}` };
  }
}

/**
 * Send backup to all configured Telegram and Bale admin chat IDs
 */
export async function dispatchBackupToAllAdmins(
  config: BotBackupConfig,
  backupJSONString: string,
  companyName: string
): Promise<BotSendResult[]> {
  const results: BotSendResult[] = [];

  // 1. Dispatch Telegram
  if (config.telegramEnabled && config.telegramBotToken.trim()) {
    const tgIds = config.telegramAdminChatIds
      .split(/[\n,;]+/)
      .map((id) => id.trim())
      .filter(Boolean);

    for (const chatId of tgIds) {
      const res = await sendBackupToTelegram(config.telegramBotToken, chatId, backupJSONString, companyName);
      results.push({
        platform: 'telegram',
        targetChatId: chatId,
        success: res.success,
        message: res.message,
      });
    }
  }

  // 2. Dispatch Bale
  if (config.baleEnabled && config.baleBotToken.trim()) {
    const baleIds = config.baleAdminChatIds
      .split(/[\n,;]+/)
      .map((id) => id.trim())
      .filter(Boolean);

    for (const chatId of baleIds) {
      const res = await sendBackupToBale(config.baleBotToken, chatId, backupJSONString, companyName);
      results.push({
        platform: 'bale',
        targetChatId: chatId,
        success: res.success,
        message: res.message,
      });
    }
  }

  return results;
}
