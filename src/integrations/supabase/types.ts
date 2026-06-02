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
      notificacion: {
        Row: {
          created_at: string
          id: string
          leida: boolean
          mensaje: string
          persona_id: string
          titulo: string
        }
        Insert: {
          created_at?: string
          id?: string
          leida?: boolean
          mensaje: string
          persona_id: string
          titulo: string
        }
        Update: {
          created_at?: string
          id?: string
          leida?: boolean
          mensaje?: string
          persona_id?: string
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "notificacion_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "persona"
            referencedColumns: ["id"]
          },
        ]
      }
      persona: {
        Row: {
          apellido: string
          created_at: string
          documento: string | null
          email: string
          fecha_nacimiento: string | null
          id: string
          nombre: string
          telefono: string | null
          tipo_documento: Database["public"]["Enums"]["tipo_documento"] | null
          updated_at: string
        }
        Insert: {
          apellido?: string
          created_at?: string
          documento?: string | null
          email: string
          fecha_nacimiento?: string | null
          id: string
          nombre?: string
          telefono?: string | null
          tipo_documento?: Database["public"]["Enums"]["tipo_documento"] | null
          updated_at?: string
        }
        Update: {
          apellido?: string
          created_at?: string
          documento?: string | null
          email?: string
          fecha_nacimiento?: string | null
          id?: string
          nombre?: string
          telefono?: string | null
          tipo_documento?: Database["public"]["Enums"]["tipo_documento"] | null
          updated_at?: string
        }
        Relationships: []
      }
      rol: {
        Row: {
          created_at: string
          id: string
          persona_id: string
          rol: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          created_at?: string
          id?: string
          persona_id: string
          rol: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          created_at?: string
          id?: string
          persona_id?: string
          rol?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: [
          {
            foreignKeyName: "rol_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "persona"
            referencedColumns: ["id"]
          },
        ]
      }
      tiquete: {
        Row: {
          created_at: string
          estado: string
          id: string
          numero_asiento: number
          persona_id: string
          precio: number
          viaje_id: string
        }
        Insert: {
          created_at?: string
          estado?: string
          id?: string
          numero_asiento: number
          persona_id: string
          precio: number
          viaje_id: string
        }
        Update: {
          created_at?: string
          estado?: string
          id?: string
          numero_asiento?: number
          persona_id?: string
          precio?: number
          viaje_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tiquete_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "persona"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tiquete_viaje_id_fkey"
            columns: ["viaje_id"]
            isOneToOne: false
            referencedRelation: "viaje"
            referencedColumns: ["id"]
          },
        ]
      }
      vehiculo: {
        Row: {
          activo: boolean
          capacidad: number
          conductor_id: string | null
          created_at: string
          id: string
          placa: string
          tipo: Database["public"]["Enums"]["tipo_vehiculo"]
        }
        Insert: {
          activo?: boolean
          capacidad: number
          conductor_id?: string | null
          created_at?: string
          id?: string
          placa: string
          tipo: Database["public"]["Enums"]["tipo_vehiculo"]
        }
        Update: {
          activo?: boolean
          capacidad?: number
          conductor_id?: string | null
          created_at?: string
          id?: string
          placa?: string
          tipo?: Database["public"]["Enums"]["tipo_vehiculo"]
        }
        Relationships: [
          {
            foreignKeyName: "vehiculo_conductor_id_fkey"
            columns: ["conductor_id"]
            isOneToOne: false
            referencedRelation: "persona"
            referencedColumns: ["id"]
          },
        ]
      }
      viaje: {
        Row: {
          capacidad_total: number
          created_at: string
          cupos_disponibles: number
          destino: string
          fecha: string
          hora: string
          id: string
          origen: string
          precio: number
          tipo: Database["public"]["Enums"]["tipo_vehiculo"]
          vehiculo_id: string | null
        }
        Insert: {
          capacidad_total: number
          created_at?: string
          cupos_disponibles: number
          destino?: string
          fecha: string
          hora: string
          id?: string
          origen?: string
          precio: number
          tipo: Database["public"]["Enums"]["tipo_vehiculo"]
          vehiculo_id?: string | null
        }
        Update: {
          capacidad_total?: number
          created_at?: string
          cupos_disponibles?: number
          destino?: string
          fecha?: string
          hora?: string
          id?: string
          origen?: string
          precio?: number
          tipo?: Database["public"]["Enums"]["tipo_vehiculo"]
          vehiculo_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "viaje_vehiculo_id_fkey"
            columns: ["vehiculo_id"]
            isOneToOne: false
            referencedRelation: "vehiculo"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      comprar_tiquete: {
        Args: { _persona_id: string; _viaje_id: string }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      obtener_o_crear_viaje: {
        Args: {
          _fecha: string
          _hora: string
          _tipo: Database["public"]["Enums"]["tipo_vehiculo"]
        }
        Returns: string
      }
    }
    Enums: {
      app_role: "pasajero" | "conductor" | "administrador"
      tipo_documento:
        | "cedula"
        | "tarjeta_identidad"
        | "pasaporte"
        | "cedula_extranjeria"
      tipo_vehiculo: "taxi" | "buseta"
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
      app_role: ["pasajero", "conductor", "administrador"],
      tipo_documento: [
        "cedula",
        "tarjeta_identidad",
        "pasaporte",
        "cedula_extranjeria",
      ],
      tipo_vehiculo: ["taxi", "buseta"],
    },
  },
} as const
