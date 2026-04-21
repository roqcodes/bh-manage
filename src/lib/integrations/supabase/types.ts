export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      categories: {
        Row: {
          id: string;
          name: string | null;
          parent_id: string | null;
          image_url: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          name?: string | null;
          parent_id?: string | null;
          image_url?: string | null;
        };
        Update: {
          name?: string | null;
          parent_id?: string | null;
          image_url?: string | null;
        };
        Relationships: [];
      };
      inventory: {
        Row: {
          variant_id: string;
          stock: number | null;
          updated_at: string | null;
        };
        Insert: {
          variant_id: string;
          stock?: number | null;
        };
        Update: {
          stock?: number | null;
        };
        Relationships: [];
      };
      order_items: {
        Row: {
          id: string;
          order_id: string | null;
          variant_id: string | null;
          quantity: number | null;
          price: number | null;
          vendor_id: string | null;
          base_price: number | null;
          final_price: number | null;
          margin_amount: number | null;
          product_name: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          order_id?: string | null;
          variant_id?: string | null;
          quantity?: number | null;
          price?: number | null;
          vendor_id?: string | null;
          base_price?: number | null;
          final_price?: number | null;
          margin_amount?: number | null;
          product_name?: string | null;
          created_at?: string | null;
        };
        /** Snapshot/pricing columns are enforced at insert and blocked on update (service + DB trigger). */
        Update: {
          order_id?: string | null;
          variant_id?: string | null;
          quantity?: number | null;
        };
        Relationships: [];
      };
      orders: {
        Row: {
          id: string;
          user_id: string | null;
          address_id: string | null;
          total_amount: number | null;
          status: string;
          payment_status: string | null;
          created_at: string | null;
          delivery_user_id: string | null;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          total_amount?: number | null;
          status?: string;
          payment_status?: string | null;
          created_at?: string | null;
          delivery_user_id?: string | null;
        };
        Update: {
          status?: string;
          payment_status?: string | null;
          delivery_user_id?: string | null;
        };
        Relationships: [];
      };
      product_variants: {
        Row: {
          id: string;
          product_id: string | null;
          name: string | null;
          price: number | null;
          mrp: number | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          product_id?: string | null;
          name?: string | null;
          price?: number | null;
          mrp?: number | null;
        };
        Update: {
          name?: string | null;
          price?: number | null;
          mrp?: number | null;
        };
        Relationships: [];
      };
      products: {
        Row: {
          id: string;
          name: string | null;
          description: string | null;
          category_id: string | null;
          image_url: string | null;
          is_active: boolean | null;
          created_at: string | null;
          is_veg: boolean | null;
        };
        Insert: {
          id?: string;
          name?: string | null;
          description?: string | null;
          category_id?: string | null;
          image_url?: string | null;
          is_active?: boolean | null;
          is_veg?: boolean | null;
        };
        Update: {
          name?: string | null;
          description?: string | null;
          category_id?: string | null;
          image_url?: string | null;
          is_active?: boolean | null;
          is_veg?: boolean | null;
        };
        Relationships: [];
      };
      users: {
        Row: {
          id: string;
          name: string | null;
          email: string | null;
          phone: string | null;
          created_at: string | null;
          role: string | null;
          is_verified: boolean | null;
        };
        Insert: {
          id?: string;
          name?: string | null;
          email?: string | null;
          phone?: string | null;
          created_at?: string | null;
          role?: string | null;
          is_verified?: boolean | null;
        };
        Update: {
          id?: string;
          name?: string | null;
          email?: string | null;
          phone?: string | null;
          created_at?: string | null;
          role?: string | null;
          is_verified?: boolean | null;
        };
        Relationships: [];
      };
      vendor_products: {
        Row: {
          id: string;
          vendor_id: string | null;
          variant_id: string | null;
          base_price: number;
          stock: number | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          vendor_id?: string | null;
          variant_id?: string | null;
          base_price: number;
          stock?: number | null;
        };
        Update: {
          base_price?: number;
          stock?: number | null;
        };
        Relationships: [];
      };
      vendors: {
        Row: {
          id: string;
          name: string | null;
          contact: string | null;
          is_active: boolean | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          name?: string | null;
          contact?: string | null;
          is_active?: boolean | null;
        };
        Update: {
          name?: string | null;
          contact?: string | null;
          is_active?: boolean | null;
        };
        Relationships: [];
      };
      pricing_rules: {
        Row: {
          id: string;
          product_id: string | null;
          margin_percent: number | null;
          fixed_markup: number | null;
          is_active: boolean | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          product_id?: string | null;
          margin_percent?: number | null;
          fixed_markup?: number | null;
          is_active?: boolean | null;
        };
        Update: {
          margin_percent?: number | null;
          fixed_markup?: number | null;
          is_active?: boolean | null;
        };
        Relationships: [];
      };
      vendor_pricing_overrides: {
        Row: {
          id: string;
          vendor_id: string | null;
          variant_id: string | null;
          override_price: number | null;
          override_margin: number | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          vendor_id?: string | null;
          variant_id?: string | null;
          override_price?: number | null;
          override_margin?: number | null;
        };
        Update: {
          override_price?: number | null;
          override_margin?: number | null;
        };
        Relationships: [];
      };
      purchase_orders: {
        Row: {
          id: string;
          vendor_id: string | null;
          status: string | null;
          total_amount: number | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          vendor_id?: string | null;
          status?: string | null;
          total_amount?: number | null;
        };
        Update: {
          status?: string | null;
          total_amount?: number | null;
        };
        Relationships: [];
      };
      purchase_order_items: {
        Row: {
          id: string;
          po_id: string | null;
          variant_id: string | null;
          quantity: number | null;
          price: number | null;
        };
        Insert: {
          id?: string;
          po_id?: string | null;
          variant_id?: string | null;
          quantity?: number | null;
          price?: number | null;
        };
        Update: {
          quantity?: number | null;
          price?: number | null;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
