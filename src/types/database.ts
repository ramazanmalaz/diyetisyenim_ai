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
export type SlotStatus = "open" | "booked" | "closed";

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
          premium_until: string | null;
          water_reminder_enabled: boolean;
          meal_reminders_enabled: boolean;
          breakfast_time: string;
          lunch_time: string;
          dinner_time: string;
          pomodoro_reminders_enabled: boolean;
          water_start_hour: number;
          water_end_hour: number;
          water_interval_hours: number;
          water_amount_ml: number;
          water_goal_ml: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          role?: UserRole;
          full_name?: string | null;
          avatar_url?: string | null;
          dietitian_id?: string | null;
          premium_until?: string | null;
          water_reminder_enabled?: boolean;
          meal_reminders_enabled?: boolean;
          breakfast_time?: string;
          lunch_time?: string;
          dinner_time?: string;
          pomodoro_reminders_enabled?: boolean;
          water_start_hour?: number;
          water_end_hour?: number;
          water_interval_hours?: number;
          water_amount_ml?: number;
          water_goal_ml?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          role?: UserRole;
          full_name?: string | null;
          avatar_url?: string | null;
          dietitian_id?: string | null;
          premium_until?: string | null;
          water_reminder_enabled?: boolean;
          meal_reminders_enabled?: boolean;
          breakfast_time?: string;
          lunch_time?: string;
          dinner_time?: string;
          pomodoro_reminders_enabled?: boolean;
          water_start_hour?: number;
          water_end_hour?: number;
          water_interval_hours?: number;
          water_amount_ml?: number;
          water_goal_ml?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      push_subscriptions: {
        Row: {
          endpoint: string;
          client_id: string;
          p256dh: string;
          auth: string;
          created_at: string;
        };
        Insert: {
          endpoint: string;
          client_id: string;
          p256dh: string;
          auth: string;
          created_at?: string;
        };
        Update: {
          endpoint?: string;
          client_id?: string;
          p256dh?: string;
          auth?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      app_settings: {
        Row: {
          key: string;
          value: string;
          updated_at: string;
        };
        Insert: {
          key: string;
          value: string;
          updated_at?: string;
        };
        Update: {
          key?: string;
          value?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      ai_usage: {
        Row: {
          client_id: string;
          day: string;
          chat_count: number;
          vision_count: number;
          updated_at: string;
        };
        Insert: {
          client_id: string;
          day: string;
          chat_count?: number;
          vision_count?: number;
          updated_at?: string;
        };
        Update: {
          client_id?: string;
          day?: string;
          chat_count?: number;
          vision_count?: number;
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
          photo_paths: string[] | null;
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
          photo_paths?: string[] | null;
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
          photo_paths?: string[] | null;
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
          week_index: number;
          protein_g: number | null;
          carb_g: number | null;
          fat_g: number | null;
          recipe: string | null;
          tip: string | null;
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
          week_index?: number;
          protein_g?: number | null;
          carb_g?: number | null;
          fat_g?: number | null;
          recipe?: string | null;
          tip?: string | null;
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
          week_index?: number;
          protein_g?: number | null;
          carb_g?: number | null;
          fat_g?: number | null;
          recipe?: string | null;
          tip?: string | null;
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
          dietitian_ref: string | null;
          slot_id: string | null;
          scheduled_at: string;
          status: AppointmentStatus;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          dietitian_id?: string | null;
          dietitian_ref?: string | null;
          slot_id?: string | null;
          scheduled_at: string;
          status?: AppointmentStatus;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          client_id?: string;
          dietitian_id?: string | null;
          dietitian_ref?: string | null;
          slot_id?: string | null;
          scheduled_at?: string;
          status?: AppointmentStatus;
          notes?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      dietitians: {
        Row: {
          id: string;
          full_name: string;
          title: string;
          bio: string | null;
          specialties: string[];
          city: string | null;
          photo_url: string | null;
          years_experience: number | null;
          is_active: boolean;
          featured: boolean;
          sort_order: number;
          contact_phone: string | null;
          contact_email: string | null;
          slogan: string | null;
          services: string[];
          working_hours: Record<string, string> | null;
          address: string | null;
          instagram: string | null;
          whatsapp: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          full_name: string;
          title?: string;
          bio?: string | null;
          specialties?: string[];
          city?: string | null;
          photo_url?: string | null;
          years_experience?: number | null;
          is_active?: boolean;
          featured?: boolean;
          sort_order?: number;
          contact_phone?: string | null;
          contact_email?: string | null;
          slogan?: string | null;
          services?: string[];
          working_hours?: Record<string, string> | null;
          address?: string | null;
          instagram?: string | null;
          whatsapp?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string;
          title?: string;
          bio?: string | null;
          specialties?: string[];
          city?: string | null;
          photo_url?: string | null;
          years_experience?: number | null;
          is_active?: boolean;
          featured?: boolean;
          sort_order?: number;
          contact_phone?: string | null;
          contact_email?: string | null;
          slogan?: string | null;
          services?: string[];
          working_hours?: Record<string, string> | null;
          address?: string | null;
          instagram?: string | null;
          whatsapp?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      water_intake: {
        Row: {
          client_id: string;
          day: string;
          total_ml: number;
          updated_at: string;
        };
        Insert: {
          client_id: string;
          day: string;
          total_ml?: number;
          updated_at?: string;
        };
        Update: {
          client_id?: string;
          day?: string;
          total_ml?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      meal_logs: {
        Row: {
          id: string;
          client_id: string;
          meal_id: string;
          log_date: string;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          meal_id: string;
          log_date: string;
          status?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          client_id?: string;
          meal_id?: string;
          log_date?: string;
          status?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      workout_plans: {
        Row: {
          id: string;
          client_id: string;
          mode: string;
          level: string | null;
          goal: string | null;
          days_per_week: number;
          equipment: string[];
          program: Record<string, unknown>;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          mode: string;
          level?: string | null;
          goal?: string | null;
          days_per_week?: number;
          equipment?: string[];
          program: Record<string, unknown>;
          status?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          client_id?: string;
          mode?: string;
          level?: string | null;
          goal?: string | null;
          days_per_week?: number;
          equipment?: string[];
          program?: Record<string, unknown>;
          status?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      workout_logs: {
        Row: {
          id: string;
          client_id: string;
          day_index: number;
          log_date: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          day_index: number;
          log_date: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          client_id?: string;
          day_index?: number;
          log_date?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      pomodoro_plans: {
        Row: {
          client_id: string;
          plan_date: string;
          start_min: number;
          end_min: number;
          work_min: number;
          break_min: number;
          muted: boolean;
          completed_sessions: number;
          updated_at: string;
        };
        Insert: {
          client_id: string;
          plan_date: string;
          start_min: number;
          end_min: number;
          work_min: number;
          break_min?: number;
          muted?: boolean;
          completed_sessions?: number;
          updated_at?: string;
        };
        Update: {
          client_id?: string;
          plan_date?: string;
          start_min?: number;
          end_min?: number;
          work_min?: number;
          break_min?: number;
          muted?: boolean;
          completed_sessions?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      dietitian_slots: {
        Row: {
          id: string;
          dietitian_id: string;
          start_at: string;
          duration_min: number;
          status: SlotStatus;
          created_at: string;
        };
        Insert: {
          id?: string;
          dietitian_id: string;
          start_at: string;
          duration_min?: number;
          status?: SlotStatus;
          created_at?: string;
        };
        Update: {
          id?: string;
          dietitian_id?: string;
          start_at?: string;
          duration_min?: number;
          status?: SlotStatus;
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
          premium_days: number | null;
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
          premium_days?: number | null;
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
          premium_days?: number | null;
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
