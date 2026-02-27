
'use client';

import { useState, useEffect } from 'react';
import type { TeamMember } from '@/types';
import { writeLog } from '@/lib/logger';

// The 'id' property of the mock Employee type will be used to simulate
// the 'person_id' or 'manager_id' from the live data.
export type CurrentUser = {
  id: string; // Ensure id is always present
  name: string;
  role: 'manager' | 'admin' | 'vp';
  title?: string;
  region?: 'HYD' | 'EMEA' | 'NAM' | 'Central';
  manager?: string;
  team?: string;
};

const placeholderUser: CurrentUser = { 
  id: '', 
  name: 'Guest', 
  title: '...', 
  role: 'manager' 
};

export function useCurrentUser() {
  const [currentUser, setCurrentUser] = useState<CurrentUser>(placeholderUser);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      setLoading(true);
      try {
        // Access localStorage ONLY on the client-side within useEffect
        const impersonatedUserId = typeof window !== 'undefined' ? localStorage.getItem('impersonated_user_id') : null;
        
        if (impersonatedUserId) {
            const response = await fetch(`/data/v1/consolidated_hr_fte_report_view`);
            if (response.ok) {
                const allEmployees: TeamMember[] = await response.json();
                if (Array.isArray(allEmployees)) {
                    const impersonatedEmp = allEmployees.find(e => e && e.person_id === impersonatedUserId);
                    if (impersonatedEmp) {
                        const impersonatedUser: CurrentUser = {
                            id: impersonatedEmp.person_id,
                            name: impersonatedEmp.full_name,
                            title: impersonatedEmp.title,
                            role: 'manager' // Assume impersonated users are managers
                        };
                        setCurrentUser(impersonatedUser);
                        writeLog('useCurrentUser', 'info', 'User impersonation successful', { impersonatedUserId: impersonatedUser.id, name: impersonatedUser.name });
                        return; // Exit after setting impersonated user
                    }
                }
            }
            // If fetch fails or user not found, fall through to default behavior
            writeLog('useCurrentUser', 'warning', 'Impersonation failed, falling back to live user.', { impersonatedUserId });
            console.warn("Impersonation failed, falling back.");
        }
        
        const response = await fetch('/domo/users/v1/me');
        if (response.ok) {
            const liveUser = await response.json();
            if (liveUser && liveUser.id) {
                let role: 'manager' | 'admin' | 'vp' = 'manager'; // Default role
                const userRoles = Array.isArray(liveUser.roles) ? liveUser.roles.map((r: any) => r && r.name).filter(Boolean) : [];

                if (userRoles.includes('Admin')) {
                  role = 'admin';
                } else if (userRoles.includes('Privileged')) { // Assuming 'Privileged' might map to VP
                  role = 'vp';
                }
                
                setCurrentUser({
                    id: liveUser.id.toString(),
                    name: liveUser.displayName || 'User',
                    title: liveUser.title || '',
                    role: role,
                });
            } else {
                throw new Error('Invalid user data returned from Domo');
            }
        } else {
             writeLog('useCurrentUser', 'info', 'Failed to fetch live user, using dev persona', { status: response.status });
             // --- Admin Persona (Default for Dev) ---
            setCurrentUser({ 
                id: 'dev-admin', 
                name: 'Development Admin', 
                title: 'System Administrator', 
                role: 'admin' 
            });
        }
      } catch (error) {
        writeLog('useCurrentUser', 'error', 'Error fetching user, falling back to dev persona', error);
        console.warn("Error fetching user, falling back to dev persona.", error);
        // --- Admin Persona (Default for Dev) ---
        setCurrentUser({ 
            id: 'dev-admin', 
            name: 'Development Admin', 
            title: 'System Administrator', 
            role: 'admin' 
        });
      } finally {
        setLoading(false);
      }
    }

    fetchUser();
  }, []);
  
  const isAdmin = currentUser.role === 'admin';
  const isVp = currentUser.role === 'vp';
  const isManager = currentUser.role === 'manager';

  return { currentUser, isAdmin, isVp, isManager, loading };
}
