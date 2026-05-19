export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      categories: {
        Row: {
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          org_id: string
          parent_id: string | null
          sort_order: number | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          org_id: string
          parent_id?: string | null
          sort_order?: number | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          org_id?: string
          parent_id?: string | null
          sort_order?: number | null
        }
      }
      category_schemas: {
        Row: {
          category_id: string
          fields: Json
          id: string
          updated_at: string | null
          version: number | null
        }
        Insert: {
          category_id: string
          fields?: Json
          id?: string
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          category_id?: string
          fields?: Json
          id?: string
          updated_at?: string | null
          version?: number | null
        }
      }
      items: {
        Row: {
          acquired_at: string | null
          attributes: Json
          category_id: string
          created_at: string | null
          id: string
          is_consumable: boolean | null
          name: string
          notes: string | null
          org_id: string
          qr_code: string | null
          quantity: number | null
          quantity_available: number | null
          serial_number: string | null
          sku: string
          status: string
        }
        Insert: {
          acquired_at?: string | null
          attributes?: Json
          category_id: string
          created_at?: string | null
          id?: string
          is_consumable?: boolean | null
          name: string
          notes?: string | null
          org_id: string
          qr_code?: string | null
          quantity?: number | null
          quantity_available?: number | null
          serial_number?: string | null
          sku: string
          status?: string
        }
        Update: {
          acquired_at?: string | null
          attributes?: Json
          category_id?: string
          created_at?: string | null
          id?: string
          is_consumable?: boolean | null
          name?: string
          notes?: string | null
          org_id?: string
          qr_code?: string | null
          quantity?: number | null
          quantity_available?: number | null
          serial_number?: string | null
          sku?: string
          status?: string
        }
      }
      item_images: {
        Row: {
          created_at: string | null
          id: string
          is_primary: boolean
          item_id: string
          path: string
          url: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_primary?: boolean
          item_id: string
          path: string
          url: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_primary?: boolean
          item_id?: string
          path?: string
          url?: string
        }
      }
      org_members: {
        Row: {
          id: string
          joined_at: string | null
          org_id: string
          role: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string | null
          org_id: string
          role?: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string | null
          org_id?: string
          role?: string
          user_id?: string
        }
      }
      organizations: {
        Row: {
          created_at: string | null
          id: string
          logo_url: string | null
          name: string
          settings: Json | null
          slug: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          logo_url?: string | null
          name: string
          settings?: Json | null
          slug: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          settings?: Json | null
          slug?: string
          updated_at?: string | null
        }
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string
          full_name: string
          id: string
          phone: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email: string
          full_name: string
          id: string
          phone?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          full_name?: string
          id?: string
          phone?: string | null
        }
      }
      transaction_items: {
        Row: {
          condition_in: string | null
          condition_out: string | null
          id: string
          item_id: string
          quantity: number | null
          transaction_id: string
        }
        Insert: {
          condition_in?: string | null
          condition_out?: string | null
          id?: string
          item_id: string
          quantity?: number | null
          transaction_id: string
        }
        Update: {
          condition_in?: string | null
          condition_out?: string | null
          id?: string
          item_id?: string
          quantity?: number | null
          transaction_id?: string
        }
      }
      transactions: {
        Row: {
          checked_out_at: string | null
          created_at: string | null
          due_date: string | null
          id: string
          loan_code: string | null
          notes: string | null
          org_id: string
          returned_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          checked_out_at?: string | null
          created_at?: string | null
          due_date?: string | null
          id?: string
          loan_code?: string | null
          notes?: string | null
          org_id: string
          returned_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          checked_out_at?: string | null
          created_at?: string | null
          due_date?: string | null
          id?: string
          loan_code?: string | null
          notes?: string | null
          org_id?: string
          returned_at?: string | null
          status?: string
          user_id?: string
        }
      }
    }
  }
}
