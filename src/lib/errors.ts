// Maps raw Supabase / Postgres error messages to user-friendly Uzbek text.
// Raw messages are logged to the console for developers; the UI never shows them.

const KNOWN: Array<{ match: RegExp; message: string }> = [
  { match: /Band kunlar:\s*([^\n]+)/i, message: "Xona band qilingan. Band kunlar: $1" },
  { match: /Bu xona tanlangan kunlarda allaqachon band/i, message: "Xona band qilingan. Iltimos, boshqa sanalarni tanlang." },
  { match: /user_id is immutable/i, message: "Bu maydonni o'zgartirib bo'lmaydi." },
  { match: /hotel_id is immutable/i, message: "Bu maydonni o'zgartirib bo'lmaydi." },
  { match: /room_id is immutable/i, message: "Bu maydonni o'zgartirib bo'lmaydi." },
  { match: /total_price is immutable/i, message: "Narxni o'zgartirib bo'lmaydi." },
  { match: /check_in is immutable|check_out is immutable/i, message: "Sanalarni o'zgartirib bo'lmaydi." },
  { match: /Users may only cancel/i, message: "Siz faqat o'z bronlaringizni bekor qila olasiz." },
  { match: /Hotel\/room price not found/i, message: "Mehmonxona narxi topilmadi." },
  { match: /Not allowed to change blocked status/i, message: "Bu amalni bajarishga ruxsatingiz yo'q." },
  { match: /Not allowed to update this booking/i, message: "Bu bronni o'zgartirishga ruxsatingiz yo'q." },
  { match: /row-level security|violates row-level/i, message: "Bu amalga ruxsatingiz yo'q." },
  { match: /duplicate key|unique constraint/i, message: "Bu yozuv allaqachon mavjud." },
  { match: /invalid login credentials/i, message: "Email yoki parol noto'g'ri." },
  { match: /email not confirmed/i, message: "Iltimos, avval emailingizni tasdiqlang." },
  { match: /user already registered|already been registered/i, message: "Bu email allaqachon ro'yxatdan o'tgan." },
  { match: /unable to validate email address|email.*invalid|invalid.*email|email_address_invalid/i, message: "Bunday email mavjud emas yoki noto'g'ri kiritilgan." },
  { match: /pwned|known to be weak|compromised password/i, message: "Bu parol xavfsiz emas (ommaviy ma'lumot bazasida topilgan). Iltimos, boshqa, murakkabroq parol tanlang." },
  { match: /password.*at least|weak[_\s.-]?password|password.*short|password.*weak/i, message: "Parol juda oson. Kamida 8 ta belgidan iborat, harf va raqam aralash bo'lsin." },
  { match: /signup.*disabled|signups not allowed/i, message: "Ro'yxatdan o'tish vaqtincha o'chirilgan." },
  { match: /network|fetch failed|failed to fetch/i, message: "Tarmoq xatosi. Qayta urinib ko'ring." },
];

export function friendlyError(err: unknown, fallback = "Xatolik yuz berdi. Qayta urinib ko'ring."): string {
  const raw =
    typeof err === "string"
      ? err
      : err && typeof err === "object" && "message" in err
        ? String((err as { message: unknown }).message ?? "")
        : "";

  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.error("[app error]", err);
  }

  for (const { match, message } of KNOWN) {
    const m = raw.match(match);
    if (m) return message.replace(/\$1/g, m[1] ?? "");
  }
  return fallback;
}
