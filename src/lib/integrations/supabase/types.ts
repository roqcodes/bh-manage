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
      carts: {
        Row: {
          id: string;
          user_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "carts_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      cart_items: {
        Row: {
          id: string;
          cart_id: string;
          variant_id: string;
          quantity: number;
          added_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          cart_id: string;
          variant_id: string;
          quantity?: number;
          added_at?: string;
          updated_at?: string;
        };
        Update: {
          cart_id?: string;
          variant_id?: string;
          quantity?: number;
          added_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "cart_items_cart_id_fkey";
            columns: ["cart_id"];
            referencedRelation: "carts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cart_items_variant_id_fkey";
            columns: ["variant_id"];
            referencedRelation: "product_variants";
            referencedColumns: ["id"];
          },
        ];
      };
      addresses: {
        Row: {
          id: string;
          user_id: string;
          label: string;
          line1: string;
          line2: string | null;
          city: string;
          state: string;
          pincode: string;
          phone: string;
          is_default: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          label: string;
          line1: string;
          line2?: string | null;
          city: string;
          state: string;
          pincode: string;
          phone: string;
          is_default?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          label?: string;
          line1?: string;
          line2?: string | null;
          city?: string;
          state?: string;
          pincode?: string;
          phone?: string;
          is_default?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "addresses_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      brands: {
        Row: {
          id: string;
          name: string;
          logo_url: string | null;
          image_url: string | null;
          sort_order: number;
          is_active: boolean;
          slug: string | null;
          description: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          logo_url?: string | null;
          image_url?: string | null;
          sort_order?: number;
          is_active?: boolean;
          slug?: string | null;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          logo_url?: string | null;
          image_url?: string | null;
          sort_order?: number;
          is_active?: boolean;
          slug?: string | null;
          description?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      categories: {
        Row: {
          id: string;
          name: string | null;
          parent_id: string | null;
          thumbnail_url: string | null;
          image_url: string | null;
          sort_order: number | null;
          is_active: boolean | null;
          slug: string | null;
          description: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          name?: string | null;
          parent_id?: string | null;
          thumbnail_url?: string | null;
          image_url?: string | null;
          sort_order?: number | null;
          is_active?: boolean | null;
          slug?: string | null;
          description?: string | null;
        };
        Update: {
          name?: string | null;
          parent_id?: string | null;
          thumbnail_url?: string | null;
          image_url?: string | null;
          sort_order?: number | null;
          is_active?: boolean | null;
          slug?: string | null;
          description?: string | null;
        };
        Relationships: [];
      };
      inventory: {
        Row: {
          variant_id: string;
          stock: number | null;
          reorder_point: number;
          reorder_quantity: number;
          last_reorder_quantity: number | null;
          updated_at: string | null;
        };
        Insert: {
          variant_id: string;
          stock?: number | null;
          reorder_point?: number;
          reorder_quantity?: number;
          last_reorder_quantity?: number | null;
        };
        Update: {
          stock?: number | null;
          reorder_point?: number;
          reorder_quantity?: number;
          last_reorder_quantity?: number | null;
        };
        Relationships: [];
      };
      procurement_settings: {
        Row: {
          id: number;
          default_reorder_point: number;
          default_reorder_quantity: number;
          updated_at: string | null;
        };
        Insert: {
          id?: number;
          default_reorder_point?: number;
          default_reorder_quantity?: number;
          updated_at?: string | null;
        };
        Update: {
          default_reorder_point?: number;
          default_reorder_quantity?: number;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      app_settings: {
        Row: {
          id: number;
          country_code: string;
          country_name: string;
          currency_code: string;
          currency_symbol: string;
          locale: string;
          show_mrp: boolean;
          updated_at: string | null;
        };
        Insert: {
          id?: number;
          country_code?: string;
          country_name?: string;
          currency_code?: string;
          currency_symbol?: string;
          locale?: string;
          show_mrp?: boolean;
          updated_at?: string | null;
        };
        Update: {
          country_code?: string;
          country_name?: string;
          currency_code?: string;
          currency_symbol?: string;
          locale?: string;
          show_mrp?: boolean;
          updated_at?: string | null;
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
          customer_name: string | null;
          phone: string | null;
          company: string | null;
          gst_number: string | null;
          source: string | null;
          subtotal: number | null;
          tax: number | null;
          discount: number | null;
          created_by_admin_id: string | null;
          merchant_note: string | null;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          address_id?: string | null;
          total_amount?: number | null;
          status?: string;
          payment_status?: string | null;
          created_at?: string | null;
          delivery_user_id?: string | null;
          customer_name?: string | null;
          phone?: string | null;
          company?: string | null;
          gst_number?: string | null;
          source?: string | null;
          subtotal?: number | null;
          tax?: number | null;
          discount?: number | null;
          created_by_admin_id?: string | null;
          merchant_note?: string | null;
        };
        Update: {
          status?: string;
          payment_status?: string | null;
          delivery_user_id?: string | null;
          customer_name?: string | null;
          phone?: string | null;
          company?: string | null;
          gst_number?: string | null;
          source?: string | null;
          subtotal?: number | null;
          tax?: number | null;
          discount?: number | null;
          merchant_note?: string | null;
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
          variant_group_id: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          product_id?: string | null;
          name?: string | null;
          price?: number | null;
          mrp?: number | null;
          variant_group_id?: string | null;
        };
        Update: {
          name?: string | null;
          price?: number | null;
          mrp?: number | null;
          variant_group_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey";
            columns: ["product_id"];
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "product_variants_variant_group_id_fkey";
            columns: ["variant_group_id"];
            referencedRelation: "variant_groups";
            referencedColumns: ["id"];
          },
        ];
      };
      variant_groups: {
        Row: {
          id: string;
          product_id: string;
          name: string;
          sort_order: number;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          product_id: string;
          name: string;
          sort_order?: number;
          created_at?: string | null;
        };
        Update: {
          product_id?: string;
          name?: string;
          sort_order?: number;
        };
        Relationships: [
          {
            foreignKeyName: "variant_groups_product_id_fkey";
            columns: ["product_id"];
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      product_images: {
        Row: {
          id: string;
          product_id: string;
          url: string;
          is_preview: boolean;
          sort_order: number;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          product_id: string;
          url: string;
          is_preview?: boolean;
          sort_order?: number;
          created_at?: string | null;
        };
        Update: {
          product_id?: string;
          url?: string;
          is_preview?: boolean;
          sort_order?: number;
        };
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey";
            columns: ["product_id"];
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      product_videos: {
        Row: {
          id: string;
          product_id: string;
          url: string;
          sort_order: number;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          product_id: string;
          url: string;
          sort_order?: number;
          created_at?: string | null;
        };
        Update: {
          product_id?: string;
          url?: string;
          sort_order?: number;
        };
        Relationships: [
          {
            foreignKeyName: "product_videos_product_id_fkey";
            columns: ["product_id"];
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      variant_images: {
        Row: {
          id: string;
          variant_id: string;
          url: string;
          is_preview: boolean;
          sort_order: number;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          variant_id: string;
          url: string;
          is_preview?: boolean;
          sort_order?: number;
          created_at?: string | null;
        };
        Update: {
          variant_id?: string;
          url?: string;
          is_preview?: boolean;
          sort_order?: number;
        };
        Relationships: [
          {
            foreignKeyName: "variant_images_variant_id_fkey";
            columns: ["variant_id"];
            referencedRelation: "product_variants";
            referencedColumns: ["id"];
          },
        ];
      };
      products: {
        Row: {
          id: string;
          name: string | null;
          description: string | null;
          category_id: string | null;
          brand_id: string | null;
          image_url: string | null;
          is_active: boolean | null;
          use_smart_pricing: boolean;
          variant_layout: "flat" | "grouped";
          specs: Json;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          name?: string | null;
          description?: string | null;
          category_id?: string | null;
          brand_id?: string | null;
          image_url?: string | null;
          is_active?: boolean | null;
          use_smart_pricing?: boolean;
          variant_layout?: "flat" | "grouped";
          specs?: Json;
        };
        Update: {
          name?: string | null;
          description?: string | null;
          category_id?: string | null;
          brand_id?: string | null;
          image_url?: string | null;
          is_active?: boolean | null;
          use_smart_pricing?: boolean;
          variant_layout?: "flat" | "grouped";
          specs?: Json;
        };
        Relationships: [
          {
            foreignKeyName: "products_brand_id_fkey";
            columns: ["brand_id"];
            referencedRelation: "brands";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "products_category_id_fkey";
            columns: ["category_id"];
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
        ];
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
      wallet: {
        Row: {
          id: string;
          user_id: string;
          balance: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          balance?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          balance?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "wallet_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      transactions: {
        Row: {
          id: string;
          user_id: string;
          amount: number | null;
          type: string;
          reference: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          amount?: number | null;
          type?: string;
          reference?: string | null;
          created_at?: string;
        };
        Update: {
          user_id?: string;
          amount?: number | null;
          type?: string;
          reference?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "transactions_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      invoices: {
        Row: {
          id: string;
          order_id: string;
          user_id: string;
          invoice_number: string;
          gst_number: string | null;
          subtotal: number | null;
          gst_amount: number | null;
          total_amount: number | null;
          status: string;
          created_at: string;
          due_date: string | null;
          pdf_url: string | null;
          issued_at: string | null;
        };
        Insert: {
          id?: string;
          order_id: string;
          user_id: string;
          invoice_number: string;
          gst_number?: string | null;
          subtotal?: number | null;
          gst_amount?: number | null;
          total_amount?: number | null;
          status?: string;
          created_at?: string;
          due_date?: string | null;
          pdf_url?: string | null;
          issued_at?: string | null;
        };
        Update: {
          order_id?: string;
          user_id?: string;
          invoice_number?: string;
          gst_number?: string | null;
          subtotal?: number | null;
          gst_amount?: number | null;
          total_amount?: number | null;
          status?: string;
          created_at?: string;
          due_date?: string | null;
          pdf_url?: string | null;
          issued_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "invoices_order_id_fkey";
            columns: ["order_id"];
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invoices_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      invoice_items: {
        Row: {
          id: string;
          invoice_id: string;
          variant_id: string | null;
          product_name: string;
          quantity: number | null;
          unit_price: number | null;
          base_price: number | null;
          gst_rate: number | null;
          gst_amount: number | null;
          total_amount: number | null;
          vendor_id: string | null;
        };
        Insert: {
          id?: string;
          invoice_id: string;
          variant_id?: string | null;
          product_name: string;
          quantity?: number | null;
          unit_price?: number | null;
          base_price?: number | null;
          gst_rate?: number | null;
          gst_amount?: number | null;
          total_amount?: number | null;
          vendor_id?: string | null;
        };
        Update: {
          invoice_id?: string;
          variant_id?: string | null;
          product_name?: string;
          quantity?: number | null;
          unit_price?: number | null;
          base_price?: number | null;
          gst_rate?: number | null;
          gst_amount?: number | null;
          total_amount?: number | null;
          vendor_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey";
            columns: ["invoice_id"];
            referencedRelation: "invoices";
            referencedColumns: ["id"];
          },
        ];
      };
      stock_movements: {
        Row: {
          id: string;
          variant_id: string;
          quantity: number;
          type: string;
          reference_id: string | null;
          reference_type: string | null;
          reason: string | null;
          user_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          variant_id: string;
          quantity: number;
          type: string;
          reference_id?: string | null;
          reference_type?: string | null;
          reason?: string | null;
          user_id?: string | null;
          created_at?: string;
        };
        Update: {
          variant_id?: string;
          quantity?: number;
          type?: string;
          reference_id?: string | null;
          reference_type?: string | null;
          reason?: string | null;
          user_id?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "stock_movements_variant_id_fkey";
            columns: ["variant_id"];
            referencedRelation: "product_variants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "stock_movements_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      returns: {
        Row: {
          id: string;
          order_id: string;
          order_item_id: string;
          user_id: string;
          variant_id: string;
          quantity: number;
          reason: string;
          status: string;
          refund_amount: number | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          order_item_id: string;
          user_id: string;
          variant_id: string;
          quantity?: number;
          reason: string;
          status?: string;
          refund_amount?: number | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          order_id?: string;
          order_item_id?: string;
          user_id?: string;
          variant_id?: string;
          quantity?: number;
          reason?: string;
          status?: string;
          refund_amount?: number | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "returns_order_id_fkey";
            columns: ["order_id"];
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "returns_order_item_id_fkey";
            columns: ["order_item_id"];
            referencedRelation: "order_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "returns_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "returns_variant_id_fkey";
            columns: ["variant_id"];
            referencedRelation: "product_variants";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: string;
          title: string;
          message: string;
          is_read: boolean;
          entity_type: string | null;
          entity_id: string | null;
          created_at: string;
          read_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: string;
          title: string;
          message: string;
          is_read?: boolean;
          entity_type?: string | null;
          entity_id?: string | null;
          created_at?: string;
          read_at?: string | null;
        };
        Update: {
          user_id?: string;
          type?: string;
          title?: string;
          message?: string;
          is_read?: boolean;
          entity_type?: string | null;
          entity_id?: string | null;
          created_at?: string;
          read_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      customer_credit_limits: {
        Row: {
          id: string;
          user_id: string;
          credit_limit: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          credit_limit?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          credit_limit?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "customer_credit_limits_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      tax_rates: {
        Row: {
          id: string;
          name: string;
          rate_percent: number;
          description: string | null;
          is_default: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          rate_percent: number;
          description?: string | null;
          is_default?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          rate_percent?: number;
          description?: string | null;
          is_default?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      get_or_create_cart: {
        Args: { p_user_id: string };
        Returns: string;
      };
      add_to_cart: {
        Args: {
          p_user_id: string;
          p_variant_id: string;
          p_quantity?: number;
        };
        Returns: Json;
      };
      update_cart_item: {
        Args: {
          p_user_id: string;
          p_variant_id: string;
          p_quantity: number;
        };
        Returns: Json;
      };
      remove_from_cart: {
        Args: {
          p_user_id: string;
          p_variant_id: string;
        };
        Returns: boolean;
      };
      clear_cart: {
        Args: { p_user_id: string };
        Returns: boolean;
      };
      get_cart_with_items: {
        Args: { p_user_id: string };
        Returns: Json;
      };
      get_addresses_for_user: {
        Args: { p_user_id: string };
        Returns: Json;
      };
      create_address: {
        Args: {
          p_user_id: string;
          p_label: string;
          p_line1: string;
          p_line2?: string;
          p_city: string;
          p_state: string;
          p_pincode: string;
          p_phone: string;
          p_is_default?: boolean;
        };
        Returns: Json;
      };
      update_address: {
        Args: {
          p_user_id: string;
          p_address_id: string;
          p_label: string;
          p_line1: string;
          p_line2?: string;
          p_city: string;
          p_state: string;
          p_pincode: string;
          p_phone: string;
          p_is_default: boolean;
        };
        Returns: Json;
      };
      delete_address: {
        Args: { p_user_id: string; p_address_id: string };
        Returns: boolean;
      };
      set_default_address: {
        Args: { p_user_id: string; p_address_id: string };
        Returns: Json;
      };
      get_wallet_balance: {
        Args: { p_user_id: string };
        Returns: number;
      };
      get_transactions_for_user: {
        Args: {
          p_user_id: string;
          p_limit?: number;
          p_offset?: number;
        };
        Returns: Json;
      };
      get_transactions_count: {
        Args: { p_user_id: string };
        Returns: number;
      };
      wallet_top_up: {
        Args: {
          p_amount: number;
          p_reference?: string;
        };
        Returns: number;
      };
      wallet_debit: {
        Args: {
          p_amount: number;
          p_reference: string;
        };
        Returns: number;
      };
      wallet_credit_user: {
        Args: {
          p_user_id: string;
          p_amount: number;
          p_reference: string;
        };
        Returns: number;
      };
      inventory_apply_order_stock: {
        Args: {
          p_order_id: string;
          p_multiplier?: number;
        };
        Returns: undefined;
      };
      generate_invoice_number: {
        Args: Record<string, never>;
        Returns: string;
      };
      generate_invoice_for_order: {
        Args: {
          p_order_id: string;
          p_gst_number?: string;
        };
        Returns: Json;
      };
      get_invoice_by_id: {
        Args: {
          p_invoice_id: string;
          p_user_id: string;
        };
        Returns: Json;
      };
      get_invoices_for_user: {
        Args: {
          p_user_id: string;
          p_limit?: number;
          p_offset?: number;
        };
        Returns: Json;
      };
      get_invoices_count: {
        Args: { p_user_id: string };
        Returns: number;
      };
      log_stock_movement: {
        Args: {
          p_variant_id: string;
          p_quantity: number;
          p_type: string;
          p_reference_id?: string;
          p_reference_type?: string;
          p_reason?: string;
        };
        Returns: string;
      };
      get_movements_for_variant: {
        Args: {
          p_variant_id: string;
          p_limit?: number;
          p_offset?: number;
        };
        Returns: Json;
      };
      get_movements_count: {
        Args: { p_variant_id: string };
        Returns: number;
      };
      get_all_movements: {
        Args: {
          p_limit?: number;
          p_offset?: number;
          p_type_filter?: string;
        };
        Returns: Json;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
