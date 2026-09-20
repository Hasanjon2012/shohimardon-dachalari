import { supabase } from "@/integrations/supabase/client";

const VIEW_TTL_MS = 60 * 60 * 1000; // 1 hour
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

function getAnonViewMap(): Record<string, number> {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem("hotel_view_ts") || "{}"); } catch { return {}; }
}
function setAnonViewMap(map: Record<string, number>) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem("hotel_view_ts", JSON.stringify(map)); } catch {}
}

/** Track a hotel page view. De-duplicates per user (server) and per browser (1h). */
export async function trackHotelView(hotelId: string) {
  if (!hotelId) return;
  const map = getAnonViewMap();
  const last = map[hotelId] ?? 0;
  if (Date.now() - last < VIEW_TTL_MS) return;
  map[hotelId] = Date.now();
  setAnonViewMap(map);
  try { await supabase.rpc("track_hotel_view", { _hotel_id: hotelId }); } catch {}
}

/** Every click counts. Wait for tracking before opening the phone dialer. */
export async function trackPhoneClick(hotelId: string) {
  if (!hotelId || typeof window === "undefined") return;
  try {
    // Get the current access token if signed in; fall back to anon key.
    const storageKey = `sb-${new URL(SUPABASE_URL).hostname.split(".")[0]}-auth-token`;
    let token = SUPABASE_KEY;
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.access_token) token = parsed.access_token;
      }
    } catch {}

    const headers = {
      "Content-Type": "application/json",
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${token}`,
    };
    const body = JSON.stringify({ _hotel_id: hotelId });

    await Promise.allSettled([
      fetch(`${SUPABASE_URL}/rest/v1/rpc/track_hotel_phone_click`, { method: "POST", keepalive: true, headers, body }),
      fetch(`${SUPABASE_URL}/rest/v1/rpc/increment_hotel_contact`, { method: "POST", keepalive: true, headers, body }),
    ]);
  } catch {}
}

export function openTrackedPhoneCall(event: { preventDefault: () => void }, hotelId: string, phone: string) {
  event.preventDefault();
  void (async () => {
    await trackPhoneClick(hotelId);
    window.location.href = `tel:${phone}`;
  })();
}

export async function openProtectedHotelPhoneCall(hotelId: string) {
  const { data: phone, error } = await supabase.rpc("hotel_phone", { _hotel_id: hotelId });
  if (error || !phone) {
    try {
      const { toast } = await import("sonner");
      toast.error("Telefon raqami hozircha ochilmadi");
    } catch {}
    return;
  }

  await trackPhoneClick(hotelId);
  window.location.href = `tel:${phone}`;
}
