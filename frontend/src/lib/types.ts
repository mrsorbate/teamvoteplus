export interface HomeVenue {
  name: string;
  street?: string;
  zip_city?: string;
  pitch_type?: string;
}

export interface TeamSettings {
  fussballde_id?: string | null;
  fussballde_team_name?: string | null;
  fussballde_ids?: string[];
  fussballde_team_names?: string[];
  default_response?: 'pending' | 'accepted' | 'tentative' | 'declined';
  default_rsvp_deadline_hours?: number | null;
  default_rsvp_deadline_hours_training?: number | null;
  default_rsvp_deadline_hours_match?: number | null;
  default_rsvp_deadline_hours_other?: number | null;
  default_arrival_minutes?: number | null;
  default_arrival_minutes_training?: number | null;
  default_arrival_minutes_match?: number | null;
  default_arrival_minutes_other?: number | null;
  default_duration_minutes?: number | null;
  default_duration_minutes_training?: number | null;
  default_duration_minutes_match?: number | null;
  default_duration_minutes_other?: number | null;
  home_venues?: HomeVenue[];
  default_home_venue_name?: string | null;
  calendar_feed_url?: string | null;
  calendar_webcal_url?: string | null;
}

export interface TeamMember {
  id: number;
  name: string;
  role: string;
  jersey_number?: number | null;
  position?: string | null;
  profile_picture?: string | null;
  username?: string;
  email?: string;
  birth_date?: string | null;
  trainer_custom_team_name?: string | null;
}

export interface EventResponseEntry {
  id: number;
  user_id: number;
  user_name: string;
  status: 'accepted' | 'declined' | 'tentative' | 'pending';
  comment?: string | null;
  user_profile_picture?: string | null;
}

export interface EventListItem {
  id: number;
  team_id: number;
  team_name?: string | null;
  title: string;
  type: 'training' | 'match' | 'other';
  start_time: string;
  end_time: string;
  location?: string | null;
  location_venue?: string | null;
  location_street?: string | null;
  location_zip_city?: string | null;
  pitch_type?: string | null;
  arrival_minutes?: number | null;
  rsvp_deadline?: string | null;
  visibility_all?: boolean | number;
  my_status?: 'accepted' | 'declined' | 'tentative' | 'pending' | null;
  my_comment?: string | null;
  opponent_crest_url?: string | null;
  opponent_name?: string | null;
  is_series?: boolean;
}

export interface TrainerTeam {
  id: number;
  name: string;
  trainer_custom_team_name?: string | null;
}
