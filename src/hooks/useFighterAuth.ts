import { useState, useEffect } from 'react';
import { auth, googleAuthProvider } from '../lib/firebase.ts';
import { signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { FighterProfile } from '../types/game.ts';
import { FightingStyleId } from '../game/combatRules.ts';

const LOCAL_STORAGE_KEY = 'apex_fighter_profile_v1';

export function useFighterAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<FighterProfile | null>(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch {
      // Fallback
    }
    // Generate a default fighter profile for instant playability
    const defaultUid = 'fighter_' + Math.random().toString(36).substring(2, 9);
    return {
      uid: defaultUid,
      email: 'contender@apexarena.gg',
      fighterName: 'Challenger ' + defaultUid.substring(8, 12).toUpperCase(),
      fightingStyle: 'blaze_fist' as FightingStyleId,
      eloRating: 1200,
      wins: 0,
      losses: 0,
      koCount: 0,
      winStreak: 0,
      bio: 'Ready to contend in the Grand Championship Arena.',
    };
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync profile to local storage whenever it changes
  useEffect(() => {
    if (profile) {
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(profile));
      } catch {
        // Ignore
      }
    }
  }, [profile]);

  // Sync with PostgreSQL on load or when profile changes
  const fetchFighterFromDb = async (uid: string) => {
    try {
      const res = await fetch(`/api/fighter/${uid}`);
      if (res.ok) {
        const data = await res.json();
        if (data.fighter) {
          setProfile(data.fighter);
        }
      }
    } catch (err) {
      console.warn('Could not sync fighter from DB:', err);
    }
  };

  useEffect(() => {
    if (profile?.uid) {
      fetchFighterFromDb(profile.uid);
    }
  }, [profile?.uid]);

  // Listen to Firebase auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        setIsLoading(true);
        try {
          const res = await fetch('/api/fighter/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              uid: firebaseUser.uid,
              email: firebaseUser.email || 'fighter@apex.gg',
              fighterName: firebaseUser.displayName || 'Champion ' + firebaseUser.uid.substring(0, 5),
              fightingStyle: profile?.fightingStyle || 'blaze_fist',
              bio: profile?.bio,
            }),
          });
          if (res.ok) {
            const data = await res.json();
            if (data.fighter) {
              setProfile(data.fighter);
            }
          }
        } catch (err: any) {
          console.error('Failed to register Google user:', err);
        } finally {
          setIsLoading(false);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await signInWithPopup(auth, googleAuthProvider);
    } catch (err: any) {
      console.error('Google Sign-In failed:', err);
      setError(err.message || 'Google Sign-In failed');
    } finally {
      setIsLoading(false);
    }
  };

  const registerWithEmail = async (
    email: string,
    fighterName: string,
    fightingStyle: FightingStyleId,
    bio?: string
  ) => {
    setIsLoading(true);
    setError(null);
    try {
      const uid = 'fighter_' + btoa(email.toLowerCase()).replace(/[^a-zA-Z0-9]/g, '').substring(0, 16);
      const res = await fetch('/api/fighter/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid,
          email,
          fighterName,
          fightingStyle,
          bio: bio || 'Contender registered in the Grand Championship Arena.',
        }),
      });

      if (!res.ok) {
        throw new Error('Registration failed. Please check details.');
      }

      const data = await res.json();
      if (data.fighter) {
        setProfile(data.fighter);
        return data.fighter;
      }
    } catch (err: any) {
      setError(err.message || 'Registration failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const updateProfile = async (updates: {
    fighterName?: string;
    fightingStyle?: FightingStyleId;
    bio?: string;
  }) => {
    if (!profile) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/fighter/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: profile.uid,
          ...updates,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.fighter) {
          setProfile(data.fighter);
        }
      }
    } catch (err: any) {
      console.error('Profile update failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch {
      // Ignore
    }
    // Reset to fresh guest
    const defaultUid = 'fighter_' + Math.random().toString(36).substring(2, 9);
    const guest: FighterProfile = {
      uid: defaultUid,
      email: 'contender@apexarena.gg',
      fighterName: 'Challenger ' + defaultUid.substring(8, 12).toUpperCase(),
      fightingStyle: 'blaze_fist',
      eloRating: 1200,
      wins: 0,
      losses: 0,
      koCount: 0,
      winStreak: 0,
      bio: 'New contender ready for combat.',
    };
    setProfile(guest);
  };

  return {
    user,
    profile,
    setProfile,
    isLoading,
    error,
    loginWithGoogle,
    registerWithEmail,
    updateProfile,
    handleLogout,
    refreshProfile: () => {
      if (profile?.uid) {
        fetchFighterFromDb(profile.uid);
      }
    },
  };
}
