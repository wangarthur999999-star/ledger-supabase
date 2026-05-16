// Profile stored in localStorage with AES-GCM encryption for PII fields
// (display_name, email, phone).
//
// Background: originally used Supabase user_profiles table, but without
// Supabase Auth, RLS policy (auth.uid() = id) always returns false causing
// PGRST116 errors. These settings are local preferences and do not need
// cross-device sync.
//
// If Supabase Auth is connected in the future, swap this implementation
// back to the Supabase client — callers need no changes.

export interface UserProfile {
  id: string;
  display_name: string;
  email: string;
  phone: string;
  avatar_url: string;
  language: string;
  dark_mode: boolean;
  rate_alerts: boolean;
}

const STORAGE_KEY = 'ledger_suriname_profile_v2';

const ENC_KEY_BYTES = new Uint8Array([
  0x4c, 0x65, 0x64, 0x67, 0x65, 0x72, 0x53, 0x52,
  0x50, 0x72, 0x6f, 0x66, 0x69, 0x6c, 0x65, 0x00,
]);

async function getCryptoKey(): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw', ENC_KEY_BYTES,
    { name: 'AES-GCM' },
    false, ['encrypt', 'decrypt']
  );
}

async function encrypt(data: string): Promise<string> {
  const key = await getCryptoKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(data);
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv }, key, encoded
  );
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);
  return btoa(String.fromCharCode(...combined));
}

async function decrypt(encoded: string): Promise<string> {
  const key = await getCryptoKey();
  const combined = Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv }, key, ciphertext
  );
  return new TextDecoder().decode(decrypted);
}

const DEFAULT_PROFILE: UserProfile = {
  id: 'local',
  display_name: '',
  email: '',
  phone: '',
  avatar_url: '',
  language: 'NL',
  dark_mode: false,
  rate_alerts: false,
};

async function readStorage(): Promise<UserProfile> {
  try {
    // Try encrypted storage first
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // Migration: check for legacy plaintext key
      const legacy = localStorage.getItem('ledger_suriname_profile_v1');
      if (legacy) {
        try {
          const parsed = JSON.parse(legacy);
          localStorage.removeItem('ledger_suriname_profile_v1');
          const profile = { ...DEFAULT_PROFILE, ...parsed };
          await writeStorage(profile);
          return profile;
        } catch { /* corrupted legacy data, ignore */ }
      }
      return { ...DEFAULT_PROFILE };
    }
    const decrypted = await decrypt(raw);
    const parsed = JSON.parse(decrypted);
    return { ...DEFAULT_PROFILE, ...parsed };
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return { ...DEFAULT_PROFILE };
  }
}

async function writeStorage(profile: UserProfile): Promise<void> {
  try {
    const encrypted = await encrypt(JSON.stringify(profile));
    localStorage.setItem(STORAGE_KEY, encrypted);
  } catch (error) {
    console.error('Error encrypting profile:', error);
    throw error;
  }
}

export async function fetchProfile(): Promise<UserProfile | null> {
  return readStorage();
}

export async function updateProfile(
  updates: Partial<UserProfile>
): Promise<UserProfile | null> {
  try {
    const current = await readStorage();
    const merged: UserProfile = { ...current, ...updates };
    await writeStorage(merged);
    return merged;
  } catch (error) {
    console.error('Error updating profile:', error);
    return null;
  }
}
