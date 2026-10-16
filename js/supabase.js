import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Supabase configuration - read from meta tags
const SUPABASE_URL = document.querySelector('meta[name="supabase-url"]')?.content || 
    'https://kmeqjvhscqjisososezt.supabase.co';

const SUPABASE_ANON_KEY = document.querySelector('meta[name="supabase-anon-key"]')?.content || 
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttZXFqdmhzY3FqaXNvc29zZXp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwMTI0MzAsImV4cCI6MjA3NDU4ODQzMH0.xxxxx'; // Replace with actual anon key

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

// Storage helpers
export const uploadAsset = async (file, bucket = 'otitech-assets', path) => {
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    });
  return { data, error };
};

export const deleteAsset = async (bucket, path) => {
  const { data, error } = await supabase.storage
    .from(bucket)
    .remove([path]);
  return { data, error };
};

export const getPublicUrl = (bucket, path) => {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

// Auth helpers
export const signIn = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { data, error };
};

export const signUp = async (email, password, metadata = {}) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: metadata,
      emailRedirectTo: `${window.location.origin}/admin/`,
    },
  });
  return { data, error };
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  return { error };
};

export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  return { user, error };
};

export const getSession = async () => {
  const { data: { session }, error } = await supabase.auth.getSession();
  return { session, error };
}

// Real-time subscription helpers
export const subscribeToPropertyChanges = (callback) => {
  return supabase
    .channel('property-changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'properties' },
      callback
    )
    .subscribe();
};

export const subscribeToEnquiryChanges = (callback) => {
  return supabase
    .channel('enquiry-changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'enquiries' },
      callback
    )
    .subscribe();
};

export default supabase;