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
      bundle_items: {
        Row: {
          bundle_id: string
          created_at: string | null
          id: string
          item_name: string
          quantity: string
        }
        Insert: {
          bundle_id: string
          created_at?: string | null
          id?: string
          item_name: string
          quantity: string
        }
        Update: {
          bundle_id?: string
          created_at?: string | null
          id?: string
          item_name?: string
          quantity?: string
        }
        Relationships: [
          {
            foreignKeyName: "bundle_items_bundle_id_fkey"
            columns: ["bundle_id"]
            isOneToOne: false
            referencedRelation: "bundles"
            referencedColumns: ["id"]
          },
        ]
      }
      bundles: {
        Row: {
          category: string | null
          cover_image: string | null
          created_at: string | null
          description: string | null
          farmer_id: string
          id: string
          price: number
          status: string | null
          target_audience: string | null
          title: string
        }
        Insert: {
          category?: string | null
          cover_image?: string | null
          created_at?: string | null
          description?: string | null
          farmer_id: string
          id?: string
          price: number
          status?: string | null
          target_audience?: string | null
          title: string
        }
        Update: {
          category?: string | null
          cover_image?: string | null
          created_at?: string | null
          description?: string | null
          farmer_id?: string
          id?: string
          price?: number
          status?: string | null
          target_audience?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "bundles_farmer_id_fkey"
            columns: ["farmer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      disputes: {
        Row: {
          created_at: string
          id: string
          opened_by: string
          order_id: string
          reason: string | null
          resolution_note: string | null
          resolved_at: string | null
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          opened_by: string
          order_id: string
          reason?: string | null
          resolution_note?: string | null
          resolved_at?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          opened_by?: string
          order_id?: string
          reason?: string | null
          resolution_note?: string | null
          resolved_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "disputes_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      listings: {
        Row: {
          available_today: boolean
          category: string
          created_at: string | null
          description: string | null
          farmer_id: string
          id: string
          images: string[] | null
          pickup_latitude: number | null
          pickup_location: string | null
          pickup_longitude: number | null
          price: number
          quantity_available: number
          split_enabled: boolean | null
          split_slots: number | null
          status: string | null
          title: string
          town: string | null
          unit: string
        }
        Insert: {
          available_today?: boolean
          category: string
          created_at?: string | null
          description?: string | null
          farmer_id: string
          id?: string
          images?: string[] | null
          pickup_latitude?: number | null
          pickup_location?: string | null
          pickup_longitude?: number | null
          price: number
          quantity_available: number
          split_enabled?: boolean | null
          split_slots?: number | null
          status?: string | null
          title: string
          town?: string | null
          unit: string
        }
        Update: {
          available_today?: boolean
          category?: string
          created_at?: string | null
          description?: string | null
          farmer_id?: string
          id?: string
          images?: string[] | null
          pickup_latitude?: number | null
          pickup_location?: string | null
          pickup_longitude?: number | null
          price?: number
          quantity_available?: number
          split_enabled?: boolean | null
          split_slots?: number | null
          status?: string | null
          title?: string
          town?: string | null
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "listings_farmer_id_fkey"
            columns: ["farmer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          order_id: string
          read: boolean | null
          receiver_id: string
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          order_id: string
          read?: boolean | null
          receiver_id: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          order_id?: string
          read?: boolean | null
          receiver_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          created_at: string | null
          id: string
          read: boolean | null
          reference_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string | null
          id?: string
          read?: boolean | null
          reference_id?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string | null
          id?: string
          read?: boolean | null
          reference_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          accepted_at: string | null
          bundle_id: string | null
          buyer_confirmed_at: string | null
          buyer_id: string
          cancel_reason: string | null
          cancelled_by: string | null
          commission_amount: number | null
          created_at: string | null
          delivered_at: string | null
          delivery_address: string | null
          delivery_method: string | null
          delivery_slot: string | null
          escrow_status: string
          farmer_id: string
          id: string
          listing_id: string | null
          meetup_at: string | null
          meetup_location: string | null
          order_type: string
          paid_at: string | null
          payment_method: string | null
          payment_reference: string | null
          payment_status: string
          payout_reference: string | null
          pickup_details: string | null
          quantity: number | null
          reject_reason: string | null
          released_at: string | null
          split_id: string | null
          status: string | null
          total_price: number
          vendor_payout_amount: number | null
          vendor_payout_status: string
        }
        Insert: {
          accepted_at?: string | null
          bundle_id?: string | null
          buyer_confirmed_at?: string | null
          buyer_id: string
          cancel_reason?: string | null
          cancelled_by?: string | null
          commission_amount?: number | null
          created_at?: string | null
          delivered_at?: string | null
          delivery_address?: string | null
          delivery_method?: string | null
          delivery_slot?: string | null
          escrow_status?: string
          farmer_id: string
          id?: string
          listing_id?: string | null
          meetup_at?: string | null
          meetup_location?: string | null
          order_type: string
          paid_at?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          payment_status?: string
          payout_reference?: string | null
          pickup_details?: string | null
          quantity?: number | null
          reject_reason?: string | null
          released_at?: string | null
          split_id?: string | null
          status?: string | null
          total_price: number
          vendor_payout_amount?: number | null
          vendor_payout_status?: string
        }
        Update: {
          accepted_at?: string | null
          bundle_id?: string | null
          buyer_confirmed_at?: string | null
          buyer_id?: string
          cancel_reason?: string | null
          cancelled_by?: string | null
          commission_amount?: number | null
          created_at?: string | null
          delivered_at?: string | null
          delivery_address?: string | null
          delivery_method?: string | null
          delivery_slot?: string | null
          escrow_status?: string
          farmer_id?: string
          id?: string
          listing_id?: string | null
          meetup_at?: string | null
          meetup_location?: string | null
          order_type?: string
          paid_at?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          payment_status?: string
          payout_reference?: string | null
          pickup_details?: string | null
          quantity?: number | null
          reject_reason?: string | null
          released_at?: string | null
          split_id?: string | null
          status?: string | null
          total_price?: number
          vendor_payout_amount?: number | null
          vendor_payout_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_bundle_id_fkey"
            columns: ["bundle_id"]
            isOneToOne: false
            referencedRelation: "bundles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_farmer_id_fkey"
            columns: ["farmer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_split_id_fkey"
            columns: ["split_id"]
            isOneToOne: false
            referencedRelation: "splits"
            referencedColumns: ["id"]
          },
        ]
      }
      ratings: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          order_id: string
          ratee_id: string
          rater_id: string
          role: string
          stars: number
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          order_id: string
          ratee_id: string
          rater_id: string
          role: string
          stars: number
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          order_id?: string
          ratee_id?: string
          rater_id?: string
          role?: string
          stars?: number
        }
        Relationships: [
          {
            foreignKeyName: "ratings_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      split_participants: {
        Row: {
          buyer_id: string
          id: string
          joined_at: string | null
          order_id: string
          split_id: string
        }
        Insert: {
          buyer_id: string
          id?: string
          joined_at?: string | null
          order_id: string
          split_id: string
        }
        Update: {
          buyer_id?: string
          id?: string
          joined_at?: string | null
          order_id?: string
          split_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "split_participants_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "split_participants_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "split_participants_split_id_fkey"
            columns: ["split_id"]
            isOneToOne: false
            referencedRelation: "splits"
            referencedColumns: ["id"]
          },
        ]
      }
      splits: {
        Row: {
          created_at: string | null
          farmer_id: string
          filled_slots: number | null
          id: string
          listing_id: string
          status: string | null
          total_slots: number
        }
        Insert: {
          created_at?: string | null
          farmer_id: string
          filled_slots?: number | null
          id?: string
          listing_id: string
          status?: string | null
          total_slots: number
        }
        Update: {
          created_at?: string | null
          farmer_id?: string
          filled_slots?: number | null
          id?: string
          listing_id?: string
          status?: string | null
          total_slots?: number
        }
        Relationships: [
          {
            foreignKeyName: "splits_farmer_id_fkey"
            columns: ["farmer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "splits_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
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
      users: {
        Row: {
          account_name: string | null
          account_number: string | null
          account_type: string
          avatar_url: string | null
          bank_code: string | null
          bank_name: string | null
          created_at: string | null
          delivery_address: string | null
          email: string
          full_name: string
          id: string
          landmark: string | null
          latitude: number | null
          lga: string | null
          location: string | null
          longitude: number | null
          paystack_recipient_code: string | null
          phone: string | null
          state: string | null
          terms_accepted_at: string | null
          town: string | null
        }
        Insert: {
          account_name?: string | null
          account_number?: string | null
          account_type: string
          avatar_url?: string | null
          bank_code?: string | null
          bank_name?: string | null
          created_at?: string | null
          delivery_address?: string | null
          email: string
          full_name: string
          id: string
          landmark?: string | null
          latitude?: number | null
          lga?: string | null
          location?: string | null
          longitude?: number | null
          paystack_recipient_code?: string | null
          phone?: string | null
          state?: string | null
          terms_accepted_at?: string | null
          town?: string | null
        }
        Update: {
          account_name?: string | null
          account_number?: string | null
          account_type?: string
          avatar_url?: string | null
          bank_code?: string | null
          bank_name?: string | null
          created_at?: string | null
          delivery_address?: string | null
          email?: string
          full_name?: string
          id?: string
          landmark?: string | null
          latitude?: number | null
          lga?: string | null
          location?: string | null
          longitude?: number | null
          paystack_recipient_code?: string | null
          phone?: string | null
          state?: string | null
          terms_accepted_at?: string | null
          town?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
