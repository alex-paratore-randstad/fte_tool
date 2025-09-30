
'use client';

import { useState, useEffect } from 'react';
import type { Employee, TeamMember } from '@/types';

// The 'id' property of the mock Employee type will be used to simulate
// the 'Person_Number' or 'First_Reviewer_Code' from the live data.
export type CurrentUser = Partial<Employee> & {
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
        const impersonatedUserId = localStorage.getItem('impersonated_user_id');
        
        if (impersonatedUserId) {
            const response = await fetch(`/data/v1/gbs_ind_hr_fte_report`);
            if (response.ok) {
                const allEmployees: TeamMember[] = await response.json();
                const impersonatedEmp = allEmployees.find(e => e.Person_Number === impersonatedUserId);
                if (impersonatedEmp) {
                    setCurrentUser({
                        id: impersonatedEmp.Person_Number,
                        name: impersonatedEmp.Full_Name,
                        title: impersonatedEmp.Market_Facing_Title,
                        role: 'manager' // Assume impersonated users are managers
                    });
                    return; // Exit after setting impersonated user
                }
            }
            // If fetch fails or user not found, fall through to default behavior
            console.warn("Impersonation failed, falling back.");
        }
        
        const response = await fetch('/domo/users/v1/me');
        if (response.ok) {
            const liveUser = await response.json();
            let role: 'manager' | 'admin' | 'vp' = 'manager'; // Default role
            const userRoles = liveUser.roles.map((r: any) => r.name);

            if (userRoles.includes('Admin')) {
              role = 'admin';
            } else if (userRoles.includes('Privileged')) { // Assuming 'Privileged' might map to VP
              role = 'vp';
            }
            
            setCurrentUser({
                id: liveUser.id.toString(),
                name: liveUser.displayName,
                title: liveUser.title,
                role: role,
            });
        } else {
             // --- Admin Persona (Default for Dev) ---
            setCurrentUser({ 
                id: 'dev-admin', 
                name: 'Development Admin', 
                title: 'System Administrator', 
                role: 'admin' 
            });
        }
      } catch (error) {
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
