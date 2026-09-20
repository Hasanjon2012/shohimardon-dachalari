export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admin_requests: {
        Row: {
          created_at: string
          decided_at: string | null
          id: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          decided_at?: string | null
          id?: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          decided_at?: string | null
          id?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      app_config: {
        Row: {
          key: string
          value: string | null
        }
        Insert: {
          key: string
          value?: string | null
        }
        Update: {
          key?: string
          value?: string | null
        }
        Relationships: []
      }
      bookings: {
        Row: {
          cancelled_at: string | null
          check_in: string
          check_out: string
          created_at: string
          deposit_amount: number
          deposit_percent: number
          guest_name: string | null
          guest_phone: string | null
          guests: number
          hotel_id: string
          id: string
          notes: string | null
          paid_at: string | null
          payment_expires_at: string | null
          payment_method: string | null
          payment_status: string
          refund_eligible: boolean
          room_id: string | null
          status: Database["public"]["Enums"]["booking_status"]
          total_price: number
          updated_at: string
          user_id: string
        }
        Insert: {
          cancelled_at?: string | null
          check_in: string
          check_out: string
          created_at?: string
          deposit_amount?: number
          deposit_percent?: number
          guest_name?: string | null
          guest_phone?: string | null
          guests?: number
          hotel_id: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          payment_expires_at?: string | null
          payment_method?: string | null
          payment_status?: string
          refund_eligible?: boolean
          room_id?: string | null
          status?: Database["public"]["Enums"]["booking_status"]
          total_price?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          cancelled_at?: string | null
          check_in?: string
          check_out?: string
          created_at?: string
          deposit_amount?: number
          deposit_percent?: number
          guest_name?: string | null
          guest_phone?: string | null
          guests?: number
          hotel_id?: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          payment_expires_at?: string | null
          payment_method?: string | null
          payment_status?: string
          refund_eligible?: boolean
          room_id?: string | null
          status?: Database["public"]["Enums"]["booking_status"]
          total_price?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites: {
        Row: {
          created_at: string
          hotel_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          hotel_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          hotel_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string
        }
        Relationships: []
      }
      hotel_images: {
        Row: {
          caption: string | null
          created_at: string
          description: string | null
          hotel_id: string
          id: string
          sort_order: number
          url: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          description?: string | null
          hotel_id: string
          id?: string
          sort_order?: number
          url: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          description?: string | null
          hotel_id?: string
          id?: string
          sort_order?: number
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "hotel_images_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
        ]
      }
      hotel_views: {
        Row: {
          hotel_id: string
          id: string
          user_id: string
          viewed_at: string
        }
        Insert: {
          hotel_id: string
          id?: string
          user_id: string
          viewed_at?: string
        }
        Update: {
          hotel_id?: string
          id?: string
          user_id?: string
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hotel_views_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
        ]
      }
      hotels: {
        Row: {
          amenities: string[] | null
          contact_clicks: number
          cover_image: string | null
          created_at: string
          deposit_percent: number
          description: string | null
          featured: boolean
          id: string
          lat: number | null
          lng: number | null
          location: string | null
          manual_order: number | null
          name: string
          owner_id: string
          phone: string | null
          phone_clicks: number
          price_per_night: number
          published: boolean
          rating: number | null
          slug: string
          updated_at: string
          view_count: number
        }
        Insert: {
          amenities?: string[] | null
          contact_clicks?: number
          cover_image?: string | null
          created_at?: string
          deposit_percent?: number
          description?: string | null
          featured?: boolean
          id?: string
          lat?: number | null
          lng?: number | null
          location?: string | null
          manual_order?: number | null
          name: string
          owner_id: string
          phone?: string | null
          phone_clicks?: number
          price_per_night?: number
          published?: boolean
          rating?: number | null
          slug: string
          updated_at?: string
          view_count?: number
        }
        Update: {
          amenities?: string[] | null
          contact_clicks?: number
          cover_image?: string | null
          created_at?: string
          deposit_percent?: number
          description?: string | null
          featured?: boolean
          id?: string
          lat?: number | null
          lng?: number | null
          location?: string | null
          manual_order?: number | null
          name?: string
          owner_id?: string
          phone?: string | null
          phone_clicks?: number
          price_per_night?: number
          published?: boolean
          rating?: number | null
          slug?: string
          updated_at?: string
          view_count?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          blocked: boolean
          created_at: string
          full_name: string | null
          id: string
          no_show_count: number
          phone: string | null
          trust_score: number
          updated_at: string
        }
        Insert: {
          blocked?: boolean
          created_at?: string
          full_name?: string | null
          id: string
          no_show_count?: number
          phone?: string | null
          trust_score?: number
          updated_at?: string
        }
        Update: {
          blocked?: boolean
          created_at?: string
          full_name?: string | null
          id?: string
          no_show_count?: number
          phone?: string | null
          trust_score?: number
          updated_at?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string
          guest_name: string | null
          hotel_id: string
          id: string
          rating: number
          room_id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          comment?: string | null
          created_at?: string
          guest_name?: string | null
          hotel_id: string
          id?: string
          rating: number
          room_id: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          comment?: string | null
          created_at?: string
          guest_name?: string | null
          hotel_id?: string
          id?: string
          rating?: number
          room_id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      room_images: {
        Row: {
          created_at: string
          hotel_id: string
          id: string
          room_id: string
          sort_order: number
          url: string
        }
        Insert: {
          created_at?: string
          hotel_id: string
          id?: string
          room_id: string
          sort_order?: number
          url: string
        }
        Update: {
          created_at?: string
          hotel_id?: string
          id?: string
          room_id?: string
          sort_order?: number
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_images_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_images_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      room_videos: {
        Row: {
          created_at: string
          hotel_id: string
          id: string
          room_id: string
          sort_order: number
          url: string
        }
        Insert: {
          created_at?: string
          hotel_id: string
          id?: string
          room_id: string
          sort_order?: number
          url: string
        }
        Update: {
          created_at?: string
          hotel_id?: string
          id?: string
          room_id?: string
          sort_order?: number
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_videos_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_videos_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      rooms: {
        Row: {
          available: boolean
          capacity: number
          created_at: string
          description: string | null
          hotel_id: string
          id: string
          name: string
          price: number
        }
        Insert: {
          available?: boolean
          capacity?: number
          created_at?: string
          description?: string | null
          hotel_id: string
          id?: string
          name: string
          price?: number
        }
        Update: {
          available?: boolean
          capacity?: number
          created_at?: string
          description?: string | null
          hotel_id?: string
          id?: string
          name?: string
          price?: number
        }
        Relationships: [
          {
            foreignKeyName: "rooms_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      adjust_user_trust_score: {
        Args: { _delta: number; _user_id: string }
        Returns: number
      }
      bookings_enabled: { Args: never; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      hotel_owner_bookings: {
        Args: never
        Returns: {
          cancelled_at: string
          check_in: string
          check_out: string
          created_at: string
          deposit_amount: number
          deposit_percent: number
          guest_name: string
          guest_phone: string
          guests: number
          hotel_id: string
          hotel_name: string
          hotel_slug: string
          id: string
          paid_at: string
          payment_expires_at: string
          payment_method: string
          payment_status: string
          refund_eligible: boolean
          room_id: string
          room_name: string
          status: Database["public"]["Enums"]["booking_status"]
          total_price: number
          updated_at: string
          user_id: string
        }[]
      }
      hotel_phone: { Args: { _hotel_id: string }; Returns: string }
      increment_hotel_contact: {
        Args: { _hotel_id: string }
        Returns: undefined
      }
      is_blocked: { Args: { _user_id: string }; Returns: boolean }
      is_hotel_owner: {
        Args: { _hotel_id: string; _user_id: string }
        Returns: boolean
      }
      mark_booking_no_show: {
        Args: { _booking_id: string }
        Returns: undefined
      }
      reset_all_trust_scores: { Args: never; Returns: undefined }
      set_hotel_featured: {
        Args: { _featured: boolean; _hotel_id: string }
        Returns: undefined
      }
      set_hotel_manual_order: {
        Args: { _hotel_id: string; _order: number }
        Returns: undefined
      }
      track_hotel_phone_click: {
        Args: { _hotel_id: string }
        Returns: undefined
      }
      track_hotel_view: { Args: { _hotel_id: string }; Returns: undefined }
      update_hotel_phone: {
        Args: { _hotel_id: string; _phone: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "user" | "hotel_admin" | "super_owner"
      booking_status:
        | "pending"
        | "confirmed"
        | "cancelled"
        | "pending_payment"
        | "no_show"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["user", "hotel_admin", "super_owner"],
      booking_status: [
        "pending",
        "confirmed",
        "cancelled",
        "pending_payment",
        "no_show",
      ],
    },
  },
} as const
