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
      buyers: {
        Row: {
          created_at: string
          delivery_address: string | null
          email: string
          id: string
          latitude: number | null
          longitude: number | null
          name: string
          phone: string | null
          updated_at: string
          zone_id: string | null
        }
        Insert: {
          created_at?: string
          delivery_address?: string | null
          email: string
          id: string
          latitude?: number | null
          longitude?: number | null
          name: string
          phone?: string | null
          updated_at?: string
          zone_id?: string | null
        }
        Update: {
          created_at?: string
          delivery_address?: string | null
          email?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          name?: string
          phone?: string | null
          updated_at?: string
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "buyers_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
        ]
      }
      cart_items: {
        Row: {
          created_at: string
          id: string
          product_id: string
          qty: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          qty?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          qty?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_tiers: {
        Row: {
          created_at: string
          delivery_fee: number
          id: string
          max_km: number
          min_km: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          delivery_fee: number
          id?: string
          max_km: number
          min_km: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          delivery_fee?: number
          id?: string
          max_km?: number
          min_km?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      disputes: {
        Row: {
          buyer_id: string
          created_at: string
          id: string
          order_id: string
          reason: string
          resolution: string | null
          status: string
          updated_at: string
        }
        Insert: {
          buyer_id: string
          created_at?: string
          id?: string
          order_id: string
          reason: string
          resolution?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          buyer_id?: string
          created_at?: string
          id?: string
          order_id?: string
          reason?: string
          resolution?: string | null
          status?: string
          updated_at?: string
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
      notifications: {
        Row: {
          body: string | null
          created_at: string
          deeplink: string | null
          id: string
          is_read: boolean
          title: string
          user_id: string
          user_type: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          deeplink?: string | null
          id?: string
          is_read?: boolean
          title: string
          user_id: string
          user_type: string
        }
        Update: {
          body?: string | null
          created_at?: string
          deeplink?: string | null
          id?: string
          is_read?: boolean
          title?: string
          user_id?: string
          user_type?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string
          fulfilled_quantity: number | null
          id: string
          name_snapshot: string
          order_id: string
          product_id: string | null
          quantity: number
          refund_amount: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          fulfilled_quantity?: number | null
          id?: string
          name_snapshot: string
          order_id: string
          product_id?: string | null
          quantity: number
          refund_amount?: number
          unit_price: number
        }
        Update: {
          created_at?: string
          fulfilled_quantity?: number | null
          id?: string
          name_snapshot?: string
          order_id?: string
          product_id?: string | null
          quantity?: number
          refund_amount?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          buyer_id: string
          created_at: string
          delivered_at: string | null
          delivery_fee: number
          delivery_lat: number | null
          delivery_lng: number | null
          delivery_status: string
          distance_km: number | null
          escrow_release_at: string | null
          escrow_status: string
          id: string
          order_number: string
          paid_at: string | null
          payment_reference: string | null
          payment_status: string
          subtotal: number
          total: number
          updated_at: string
          vendor_id: string | null
          zone_id: string | null
        }
        Insert: {
          buyer_id: string
          created_at?: string
          delivered_at?: string | null
          delivery_fee?: number
          delivery_lat?: number | null
          delivery_lng?: number | null
          delivery_status?: string
          distance_km?: number | null
          escrow_release_at?: string | null
          escrow_status?: string
          id?: string
          order_number?: string
          paid_at?: string | null
          payment_reference?: string | null
          payment_status?: string
          subtotal: number
          total: number
          updated_at?: string
          vendor_id?: string | null
          zone_id?: string | null
        }
        Update: {
          buyer_id?: string
          created_at?: string
          delivered_at?: string | null
          delivery_fee?: number
          delivery_lat?: number | null
          delivery_lng?: number | null
          delivery_status?: string
          distance_km?: number | null
          escrow_release_at?: string | null
          escrow_status?: string
          id?: string
          order_number?: string
          paid_at?: string | null
          payment_reference?: string | null
          payment_status?: string
          subtotal?: number
          total?: number
          updated_at?: string
          vendor_id?: string | null
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
        ]
      }
      paystack_events: {
        Row: {
          event_id: string
          event_type: string
          id: string
          payload: Json
          processed_at: string
          reference: string | null
        }
        Insert: {
          event_id: string
          event_type: string
          id?: string
          payload: Json
          processed_at?: string
          reference?: string | null
        }
        Update: {
          event_id?: string
          event_type?: string
          id?: string
          payload?: Json
          processed_at?: string
          reference?: string | null
        }
        Relationships: []
      }
      product_zones: {
        Row: {
          id: string
          product_id: string
          zone_id: string
        }
        Insert: {
          id?: string
          product_id: string
          zone_id: string
        }
        Update: {
          id?: string
          product_id?: string
          zone_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_zones_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_zones_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          created_at: string
          description: string | null
          farm_delivery_fee: number | null
          id: string
          is_farm_product: boolean
          is_sold_out: boolean
          name: string
          photo_url: string | null
          price: number
          quantity: number
          updated_at: string
          vendor_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          farm_delivery_fee?: number | null
          id?: string
          is_farm_product?: boolean
          is_sold_out?: boolean
          name: string
          photo_url?: string | null
          price: number
          quantity?: number
          updated_at?: string
          vendor_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          farm_delivery_fee?: number | null
          id?: string
          is_farm_product?: boolean
          is_sold_out?: boolean
          name?: string
          photo_url?: string | null
          price?: number
          quantity?: number
          updated_at?: string
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
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
      vendors: {
        Row: {
          account_name: string | null
          account_number: string | null
          address: string | null
          bank_name: string | null
          created_at: string
          email: string
          id: string
          latitude: number | null
          longitude: number | null
          name: string
          paystack_recipient_code: string | null
          paystack_subaccount_code: string | null
          phone: string
          photo_url: string | null
          rejection_reason: string | null
          status: string
          updated_at: string
        }
        Insert: {
          account_name?: string | null
          account_number?: string | null
          address?: string | null
          bank_name?: string | null
          created_at?: string
          email: string
          id: string
          latitude?: number | null
          longitude?: number | null
          name: string
          paystack_recipient_code?: string | null
          paystack_subaccount_code?: string | null
          phone: string
          photo_url?: string | null
          rejection_reason?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          account_name?: string | null
          account_number?: string | null
          address?: string | null
          bank_name?: string | null
          created_at?: string
          email?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          name?: string
          paystack_recipient_code?: string | null
          paystack_subaccount_code?: string | null
          phone?: string
          photo_url?: string | null
          rejection_reason?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      zones: {
        Row: {
          active: boolean
          created_at: string
          delivery_fee: number
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          delivery_fee?: number
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          delivery_fee?: number
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      gen_order_number: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user" | "vendor" | "buyer"
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
      app_role: ["admin", "moderator", "user", "vendor", "buyer"],
    },
  },
} as const
