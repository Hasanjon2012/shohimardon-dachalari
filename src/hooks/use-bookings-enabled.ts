import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useBookingsEnabled() {
  const { data } = useQuery({
    queryKey: ["bookings-enabled"],
    queryFn: async () => {
      const { data } = await supabase
        .from("app_config")
        .select("value")
        .eq("key", "bookings_enabled")
        .maybeSingle();
      return (data?.value ?? "true") === "true";
    },
    staleTime: 60_000,
  });
  return data ?? true;
}
