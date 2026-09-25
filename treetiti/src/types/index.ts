export type LeadStatus = "new" | "contacted" | "qualified" | "tour" | "negotiation" | "closed" | "lost";
export type LeadScore = "hot" | "warm" | "cold";
export type ChannelType = "whatsapp" | "telegram" | "web" | "email" | "phone" | "social" | "referral";
export type UnitType = "studio" | "1bed" | "2bed" | "3bed" | "penthouse" | "villa";
export type ProjectStatus = "pre_launch" | "under_construction" | "completed";
export type AppointmentType = "site_tour" | "virtual_tour" | "meeting" | "video_call";
export type AppointmentStatus = "scheduled" | "confirmed" | "completed" | "cancelled" | "no_show";
export type Language = "fa" | "en" | "ar" | "tr";

export interface Lead {
  id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  email: string | null;
  language: Language;
  source_channel: ChannelType;
  source_campaign: string | null;
  budget_min: number | null;
  budget_max: number | null;
  preferred_areas: string[];
  unit_type: UnitType | null;
  timeline: string | null;
  investor_type: "end_user" | "investor" | "overseas" | null;
  lead_score: number;
  lead_status: LeadStatus;
  assigned_to: string | null;
  notes: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Interaction {
  id: string;
  lead_id: string;
  channel: ChannelType;
  direction: "inbound" | "outbound";
  message_text: string;
  message_type: "text" | "image" | "video" | "document" | "location";
  ai_handled: boolean;
  ai_confidence: number | null;
  consultant_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface Appointment {
  id: string;
  lead_id: string;
  consultant_id: string;
  appointment_type: AppointmentType;
  scheduled_at: string;
  duration_minutes: number;
  status: AppointmentStatus;
  location: string | null;
  virtual_meeting_link: string | null;
  notes: string | null;
  created_at: string;
}

export interface Project {
  id: string;
  title: Record<Language, string>;
  description: Record<Language, string>;
  location: {
    lat: number;
    lng: number;
    address: Record<Language, string>;
    neighborhood: Record<Language, string>;
  };
  total_units: number;
  total_floors: number;
  completion_date: string | null;
  developer: string | null;
  status: ProjectStatus;
  featured: boolean;
  sort_order: number;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Unit {
  id: string;
  project_id: string;
  unit_number: string;
  unit_type: UnitType;
  floor_number: number;
  area_sqm: number;
  bedrooms: number;
  bathrooms: number;
  has_balcony: boolean;
  balcony_area: number | null;
  direction: string | null;
  floor_plan_url: string | null;
  virtual_tour_url: string | null;
  status: "available" | "reserved" | "sold";
  base_price: number;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Consultant {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  phone: string | null;
  role: "consultant" | "manager" | "admin";
  languages: Language[];
  specialties: string[];
  is_active: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface Campaign {
  id: string;
  name: string;
  channel: ChannelType;
  type: "broadcast" | "targeted" | "automated";
  target_audience: Record<string, unknown>;
  content: Record<Language, unknown>;
  status: "draft" | "scheduled" | "active" | "completed";
  scheduled_at: string | null;
  sent_count: number;
  open_count: number;
  reply_count: number;
  conversion_count: number;
  created_at: string;
}

export interface Tag {
  id: string;
  name: string;
  category: "interest" | "behavior" | "demographic";
  color: string;
  created_at: string;
}
