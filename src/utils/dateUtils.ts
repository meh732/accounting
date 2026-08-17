/**
 * Jalali (Solar Hijri) Date Converter and Helper Functions
 */

export function gregorianToJalali(gy: number, gm: number, gd: number): [number, number, number] {
  const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  let jy = (gy <= 1600) ? 0 : 979;
  gy -= (gy <= 1600) ? 621 : 1600;
  const gy2 = (gm > 2) ? (gy + 1) : gy;
  let days = (365 * gy) + Math.floor((gy2 + 3) / 4) - Math.floor((gy2 + 99) / 100) + Math.floor((gy2 + 399) / 400) - 80 + gd + g_d_m[gm - 1];
  jy += 33 * Math.floor(days / 12053);
  days %= 12053;
  jy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    jy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  const jm = (days < 186) ? 1 + Math.floor(days / 31) : 7 + Math.floor((days - 186) / 30);
  const jd = 1 + ((days < 186) ? (days % 31) : ((days - 186) % 30));
  return [jy, jm, jd];
}

export function getCurrentShamsiDate(): string {
  const now = new Date();
  const [jy, jm, jd] = gregorianToJalali(now.getFullYear(), now.getMonth() + 1, now.getDate());
  const monthStr = jm < 10 ? `0${jm}` : `${jm}`;
  const dayStr = jd < 10 ? `0${jd}` : `${jd}`;
  return `${jy}/${monthStr}/${dayStr}`;
}

export function formatShamsiDate(dateString?: string): string {
  if (!dateString) return getCurrentShamsiDate();
  if (dateString.includes('/')) return dateString;
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    const [jy, jm, jd] = gregorianToJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
    const monthStr = jm < 10 ? `0${jm}` : `${jm}`;
    const dayStr = jd < 10 ? `0${jd}` : `${jd}`;
    return `${jy}/${monthStr}/${dayStr}`;
  } catch {
    return dateString;
  }
}

export function toPersianDigits(num: number | string | undefined | null): string {
  if (num === undefined || num === null) return '';
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return num.toString().replace(/\d/g, (x) => persianDigits[parseInt(x, 10)]);
}

export function formatCurrency(amount: number | undefined | null, currency: string = 'تومان', usePersianDigits: boolean = false): string {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return usePersianDigits ? '۰ ' + currency : '0 ' + currency;
  }
  const formatted = Math.round(amount).toLocaleString('en-US');
  if (usePersianDigits) {
    return `${toPersianDigits(formatted)} ${currency}`;
  }
  return `${formatted} ${currency}`;
}

export function formatNumberWithCommas(val: number | string): string {
  if (val === '' || val === null || val === undefined) return '';
  const num = typeof val === 'string' ? parseFloat(val.replace(/,/g, '')) : val;
  if (isNaN(num)) return '';
  return num.toLocaleString('en-US');
}

export function parseNumberFromInput(val: string): number {
  if (!val) return 0;
  // Convert Persian numbers to English
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  let clean = val;
  persianDigits.forEach((digit, index) => {
    clean = clean.replace(new RegExp(digit, 'g'), index.toString());
  });
  clean = clean.replace(/,/g, '').trim();
  const res = parseFloat(clean);
  return isNaN(res) ? 0 : res;
}

/**
 * Persian number to words converter for invoices, cheques, and official vouchers
 */
export function numberToWordsPersian(num: number): string {
  if (num === 0) return 'صفر';
  if (num < 0) return 'منفی ' + numberToWordsPersian(Math.abs(num));

  const yekan = ['', 'یک', 'دو', 'سه', 'چهار', 'پنج', 'شش', 'هفت', 'هشت', 'نه'];
  const dahha = ['', 'ده', 'بیست', 'سی', 'چهل', 'پنجاه', 'شصت', 'هفتاد', 'هشتاد', 'نود'];
  const dahhaKhas = ['ده', 'یازده', 'دوازده', 'سیزده', 'چهارده', 'پانزده', 'شانزده', 'هفده', 'هجده', 'نوزده'];
  const sadha = ['', 'یکصد', 'دویست', 'سیصد', 'چهارصد', 'پانصد', 'ششصد', 'هفتصد', 'هشتصد', 'نهصد'];
  const tabaghat = ['', 'هزار', 'میلیون', 'میلیارد', 'تریلیون'];

  num = Math.floor(num);
  let parts: number[] = [];
  while (num > 0) {
    parts.push(num % 1000);
    num = Math.floor(num / 1000);
  }

  let words: string[] = [];
  for (let i = parts.length - 1; i >= 0; i--) {
    const chunk = parts[i];
    if (chunk === 0) continue;

    let chunkWords: string[] = [];
    const s = Math.floor(chunk / 100);
    const d = Math.floor((chunk % 100) / 10);
    const y = chunk % 10;

    if (s > 0) {
      chunkWords.push(sadha[s]);
    }

    if (d === 1) {
      chunkWords.push(dahhaKhas[y]);
    } else {
      if (d > 1) chunkWords.push(dahha[d]);
      if (y > 0) chunkWords.push(yekan[y]);
    }

    let chunkText = chunkWords.join(' و ');
    if (tabaghat[i]) {
      chunkText += ' ' + tabaghat[i];
    }
    words.push(chunkText);
  }

  return words.join(' و ');
}
