
'use client';

import { useState, useEffect } from 'react';
import type { Employee } from '@/types';

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
      // This local domo object MUST be defined inside a client-side hook or event handler
      // to prevent server-side execution during build, which causes deployment to fail.
      const baseUrl = 'https://c5899a60-de1d-42af-b19b-99f8dff54fad.domoapps.prod10.domo.com';
      const domo = {
        get: async (url: string) => {
          const rUrl = `${baseUrl}${url}`;
          const response = await fetch(rUrl);
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          return response.json();
        }
      };

      try {
        const liveUser = await domo.get('/domo/users/v1/me');
        
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

      } catch (error) {
        // Fallback for local development or if the API fails
        console.error("Failed to fetch live user, using fallback for development:", error);
        
        // To impersonate a user for development, comment out the admin user
        // and uncomment one of the manager personas below.
        
        // --- Admin Persona (Default for Dev) ---
        setCurrentUser({ 
            id: 'dev-admin', 
            name: 'Development Admin', 
            title: 'System Administrator', 
            role: 'admin' 
        });

        // --- Manager Personas for Impersonation ---
        /*
        setCurrentUser({ 
            id: 'mgr-1', 
            name: 'Sawyer Ames', 
            title: 'Manager, Core Platform', 
            role: 'manager' 
        });
        */
        /*
        setCurrentUser({ 
            id: 'mgr-2', 
            name: 'Cheryl MacMillan', 
            title: 'Manager, Client Integrations', 
            role: 'manager' 
        });
        */
        /*
        setCurrentUser({ 
            id: 'mgr-3', 
            name: 'John Slocum', 
            title: 'Manager, Analytics', 
            role: 'manager' 
        });
        */

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
