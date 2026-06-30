export type Role = 'builder' | 'admin'
export type SubscriptionStatus = 'inactive' | 'active' | 'cancelled' | 'past_due'
export type ProjectType = 'new_dwelling' | 'extension' | 'renovation' | 'pool' | 'demolition' | 'commercial' | 'other'
export type DAStatus = 'new' | 'matched' | 'expired'
export type MatchStatus = 'new' | 'viewed' | 'saved' | 'ignored' | 'letter_approved' | 'printed' | 'posted' | 'scanned'
export type TriggerStage = 'lodgement' | 'approval'
export type OutcomeType = 'enquiry' | 'quote' | 'job_won'
export type ProspectStatus = 'scraped' | 'reviewed' | 'approved' | 'active' | 'demo_booked' | 'trial_started' | 'paid' | 'lost' | 'not_suitable'
export type ProspectChannel = 'physical_letter' | 'interactive_email' | 'cold_email' | 'phone'

export interface Profile {
  id: string
  email: string | null
  full_name: string | null
  role: Role
  plan: string
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  subscription_status: SubscriptionStatus
  onboarding_completed: boolean
  last_sign_in_at?: string | null
  created_at: string
}

export interface BuilderProfile {
  id: string
  user_id: string
  company_name: string
  logo_url: string | null
  brand_color: string
  tagline: string | null
  phone: string | null
  website: string | null
  license_number: string | null
  service_suburbs: string[]
  service_states: string[]
  project_types: ProjectType[]
  min_value_aud: number
  max_value_aud: number | null
  letter_greeting: string
  letter_sign_off: string
  letter_compliance_disclaimer: string
  letter_template_approved: boolean
  auto_send: boolean
  letters_sent_count: number
  letters_scanned_count: number
  created_at: string
  updated_at: string
}

export interface DevelopmentApplication {
  id: string
  source: string
  source_id: string
  source_url: string | null
  council: string | null
  state: string
  suburb: string
  postcode: string | null
  street_address: string | null
  da_number: string | null
  description: string | null
  project_type: ProjectType
  project_type_confidence: number | null
  estimated_value_aud: number | null
  applicant_name: string | null
  owner_name: string | null
  status: DAStatus
  lodged_date: string | null
  determination_date: string | null
  ingested_at: string
  raw_data: Record<string, unknown> | null
}

export interface LeadMatch {
  id: string
  da_id: string
  builder_id: string
  user_id: string
  matched_at: string
  match_reasons: string[]
  trigger_stage: TriggerStage
  status: MatchStatus
  viewed_at: string | null
  saved_at: string | null
  ignored_at: string | null
  builder_note: string | null
  letter_body_text: string | null
  letter_generated_at: string | null
  letter_approved_at: string | null
  letter_sent_at: string | null
  batch_date: string | null
  qr_token: string
  scanned_at: string | null
  scan_count: number
  enquiry_name: string | null
  enquiry_phone: string | null
  enquiry_email: string | null
  enquiry_message: string | null
  enquiry_at: string | null
  // Joined
  development_application?: DevelopmentApplication
  builder_profile?: BuilderProfile
}

export interface BuilderOutcome {
  id: string
  user_id: string
  builder_id: string
  lead_match_id: string | null
  outcome_type: OutcomeType
  revenue_aud: number | null
  project_description: string | null
  occurred_at: string
  notes: string | null
}

export interface Suburb {
  id: string
  name: string
  state: string
  postcode: string | null
  city: string | null
  da_count: number
  slug: string
}

export interface Council {
  id: string
  name: string
  state: string
  slug: string
  da_count: number
}

export interface Notification {
  id: string
  user_id: string
  type: string
  title: string
  body: string | null
  link: string | null
  read: boolean
  created_at: string
}
