import { supabase } from '../lib/supabase';

export interface UserProfile {
  id: string;
  display_name: string;
  email: string;
  phone: string;
  avatar_url: string;
  language: string;
  dark_mode: boolean;
  rate_alerts: boolean;
  folder_alerts: boolean;
}

const DEFAULT_PROFILE_ID = '99999999-9999-9999-9999-999999999999';

export async function fetchProfile(): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', DEFAULT_PROFILE_ID)
    .single();

  if (error) {
    console.error("Error fetching profile:", error);
    return null;
  }

  return data as UserProfile;
}

export async function updateProfile(updates: Partial<UserProfile>): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('user_profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', DEFAULT_PROFILE_ID)
    .select()
    .single();

  if (error) {
    console.error("Error updating profile:", error);
    return null;
  }

  return data as UserProfile;
}
