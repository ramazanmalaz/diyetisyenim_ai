// Supabase şema tipleri.
// Supabase bağlandığında şu komutla OTOMATİK üretilebilir (bu dosyanın üzerine yazar):
//   npx supabase gen types typescript --local > src/types/database.ts
// O zamana kadar migration'larla elle senkron tutulur.

export type UserRole = "client" | "dietitian" | "admin";
export type PlanStatus = "draft" | "active" | "archived";
export type MealType =
  | "breakfast"
  | "snack_morning"
  | "lunch"
  | "snack_afternoon"
  | "dinner";
export type ConversationType = "group" | "direct";
export type MessageType = "user" | "ai" | "system";
export type AppointmentStatus =
  | "requested"
  | "confirmed"
  | "cancelled"
  | "completed";
export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";
export type ActivityLevel = "sedentary" | "light" | "moderate" | "active";
export type Sex = "female" | "male";

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          role: UserRole;
          full_name: string | null;
          avatar_url: string | null;
          dietitian_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          role?: UserRole;
          full_name?: string | null;
          avatar_url?: string | null;
          dietitian_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          role?: UserRole;
          full_name?: string | null;
          avatar_url?: string | null;
          dietitian_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      ai_rules: {
        Row: {
          id: string;
          key: string;
          content: string;
          is_active: boolean;
          updated_by: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          key: string;
          content?: string;
          is_active?: boolean;
          updated_by?: string | null;
          updated_at?: string;
        };
        Update: {
          id?: string;
          key?: string;
          content?: string;
          is_active?: boolean;
          updated_by?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      diet_plans: {
        Row: {
          id: string;
          client_id: string;
          created_by: string | null;
          title: string;
          status: PlanStatus;
          valid_from: string | null;
          valid_to: string | null;
          daily_calorie_target: number | null;
          estimated_weeks: number | null;
          goal_loss_kg: number | null;
          source: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          created_by?: string | null;
          title: string;
          status?: PlanStatus;
          valid_from?: string | null;
          valid_to?: string | null;
          daily_calorie_target?: number | null;
          estimated_weeks?: number | null;
          goal_loss_kg?: number | null;
          source?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          client_id?: string;
          created_by?: string | null;
          title?: string;
          status?: PlanStatus;
          valid_from?: string | null;
          valid_to?: string | null;
          daily_calorie_target?: number | null;
          estimated_weeks?: number | null;
          goal_loss_kg?: number | null;
          source?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      foods: {
        Row: {
          id: string;
          name: string;
          unit_label: string;
          kcal_per_unit: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          unit_label: string;
          kcal_per_unit: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          unit_label?: string;
          kcal_per_unit?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      intakes: {
        Row: {
          id: string;
          client_id: string;
          sex: Sex;
          age: number;
          height_cm: number;
          current_weight_kg: number;
          activity_level: ActivityLevel;
          goal_loss_kg: number;
          goal_weeks: number;
          health_notes: string | null;
          dislikes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          sex: Sex;
          age: number;
          height_cm: number;
          current_weight_kg: number;
          activity_level?: ActivityLevel;
          goal_loss_kg: number;
          goal_weeks: number;
          health_notes?: string | null;
          dislikes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          client_id?: string;
          sex?: Sex;
          age?: number;
          height_cm?: number;
          current_weight_kg?: number;
          activity_level?: ActivityLevel;
          goal_loss_kg?: number;
          goal_weeks?: number;
          health_notes?: string | null;
          dislikes?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      meals: {
        Row: {
          id: string;
          plan_id: string;
          day_of_week: number;
          meal_type: MealType;
          content: string;
          calories: number | null;
          food_id: string | null;
          quantity: number | null;
          checked: boolean;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          plan_id: string;
          day_of_week: number;
          meal_type: MealType;
          content?: string;
          calories?: number | null;
          food_id?: string | null;
          quantity?: number | null;
          checked?: boolean;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          plan_id?: string;
          day_of_week?: number;
          meal_type?: MealType;
          content?: string;
          calories?: number | null;
          food_id?: string | null;
          quantity?: number | null;
          checked?: boolean;
          sort_order?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      progress_entries: {
        Row: {
          id: string;
          client_id: string;
          entry_date: string;
          weight_kg: number | null;
          water_ml: number | null;
          waist_cm: number | null;
          hip_cm: number | null;
          note: string | null;
          photo_path: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          entry_date?: string;
          weight_kg?: number | null;
          water_ml?: number | null;
          waist_cm?: number | null;
          hip_cm?: number | null;
          note?: string | null;
          photo_path?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          client_id?: string;
          entry_date?: string;
          weight_kg?: number | null;
          water_ml?: number | null;
          waist_cm?: number | null;
          hip_cm?: number | null;
          note?: string | null;
          photo_path?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      conversations: {
        Row: {
          id: string;
          type: ConversationType;
          title: string | null;
          ai_enabled: boolean;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          type?: ConversationType;
          title?: string | null;
          ai_enabled?: boolean;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          type?: ConversationType;
          title?: string | null;
          ai_enabled?: boolean;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      conversation_members: {
        Row: {
          conversation_id: string;
          user_id: string;
          joined_at: string;
        };
        Insert: {
          conversation_id: string;
          user_id: string;
          joined_at?: string;
        };
        Update: {
          conversation_id?: string;
          user_id?: string;
          joined_at?: string;
        };
        Relationships: [];
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          sender_id: string | null;
          type: MessageType;
          content: string;
          image_path: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          sender_id?: string | null;
          type?: MessageType;
          content: string;
          image_path?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          sender_id?: string | null;
          type?: MessageType;
          content?: string;
          image_path?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      appointments: {
        Row: {
          id: string;
          client_id: string;
          dietitian_id: string | null;
          scheduled_at: string;
          status: AppointmentStatus;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          dietitian_id?: string | null;
          scheduled_at: string;
          status?: AppointmentStatus;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          client_id?: string;
          dietitian_id?: string | null;
          scheduled_at?: string;
          status?: AppointmentStatus;
          notes?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      payments: {
        Row: {
          id: string;
          client_id: string;
          amount: number;
          currency: string;
          provider: string;
          provider_ref: string | null;
          status: PaymentStatus;
          description: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          amount: number;
          currency?: string;
          provider?: string;
          provider_ref?: string | null;
          status?: PaymentStatus;
          description?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          client_id?: string;
          amount?: number;
          currency?: string;
          provider?: string;
          provider_ref?: string | null;
          status?: PaymentStatus;
          description?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_staff: {
        Args: { uid: string };
        Returns: boolean;
      };
    };
    Enums: {
      user_role: UserRole;
      plan_status: PlanStatus;
      meal_type: MealType;
      conversation_type: ConversationType;
      message_type: MessageType;
      appointment_status: AppointmentStatus;
      payment_status: PaymentStatus;
      activity_level: ActivityLevel;
      sex: Sex;
    };
    CompositeTypes: Record<string, never>;
  };
};
