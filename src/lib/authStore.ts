import { create } from 'zustand';
import { supabase } from './supabase';
import type { User, Session } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  session: Session | null;
  profile: { id: string; full_name: string; email: string; avatar_url: string | null } | null;
  orgId: string | null;
  orgName: string | null;
  role: string | null;
  loading: boolean;
  initialized: boolean;

  // Actions
  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  updateProfile: (data: { full_name?: string; avatar_url?: string | null }) => Promise<{ error: string | null }>;
}

const pickMembership = (memberships: any[] | null | undefined) => {
  if (!memberships?.length) return null;
  return (
    memberships.find(m => m.role === 'super_admin') ??
    memberships.find(m => (m.organizations as { slug?: string; name?: string } | null)?.slug === 'xignis') ??
    memberships.find(m => (m.organizations as { slug?: string; name?: string } | null)?.name?.toLowerCase() === 'xignis') ??
    memberships[0]
  );
};

const getOrgName = (membership: any) =>
  (membership?.organizations as { name?: string } | null)?.name ?? null;

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  profile: null,
  orgId: null,
  orgName: null,
  role: null,
  loading: true,
  initialized: false,

  initialize: async () => {
    try {
      // Get current session
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        set({ user: session.user, session });
        // Fetch profile safely
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .maybeSingle();

        // Fetch org membership safely (get first one if multiple exist)
        const { data: memberships, error: memError } = await supabase
          .from('org_members')
          .select('org_id, role, organizations:org_id(name, slug)')
          .eq('user_id', session.user.id)
          .order('joined_at', { ascending: true });
          
        if (memError) console.error("Error fetching memberships:", memError);
          
        const membership = pickMembership(memberships);

        set({
          profile: profile ?? null,
          orgId: membership?.org_id ?? null,
          orgName: getOrgName(membership),
          role: membership?.role ?? null,
        });
      }

      // Listen for auth changes
      supabase.auth.onAuthStateChange(async (event, session) => {
        set({ user: session?.user ?? null, session });

        if (event === 'SIGNED_OUT') {
          set({ profile: null, orgId: null, orgName: null, role: null });
        }

        if (event === 'SIGNED_IN' && session?.user) {
          set({ loading: true });

          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .maybeSingle();

          const { data: memberships, error: memError } = await supabase
            .from('org_members')
            .select('org_id, role, organizations:org_id(name, slug)')
            .eq('user_id', session.user.id)
            .order('joined_at', { ascending: true });
            
          if (memError) console.error("Error in onAuthStateChange:", memError);
            
          const membership = pickMembership(memberships);

          set({
            profile: profile ?? null,
            orgId: membership?.org_id ?? null,
            orgName: getOrgName(membership),
            role: membership?.role ?? null,
            loading: false,
          });
        }
      });
    } finally {
      set({ loading: false, initialized: true });
    }
  },

  signIn: async (email, password) => {
    set({ loading: true });
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    set({ loading: false });
    return { error: error?.message ?? null };
  },

  signOut: async () => {
    set({ user: null, session: null, profile: null, orgId: null, orgName: null, role: null });
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Error signing out from Supabase:', err);
    }
  },

  updateProfile: async (data) => {
    const { profile } = get();
    if (!profile) return { error: 'No hay sesión activa' };

    const { error: updateError } = await supabase
      .from('profiles')
      .update(data)
      .eq('id', profile.id);

    if (updateError) {
      console.error('Error updating profile:', updateError);
      return { error: updateError.message };
    }

    set({
      profile: { ...profile, ...data },
    });

    return { error: null };
  },
}));
