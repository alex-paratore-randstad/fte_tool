
'use client';

import { useState, useEffect } from 'react';
import { employees } from '@/lib/mock-data';
import type { Employee } from '@/types';

// The 'id' property of the mock Employee type will be used to simulate
// the 'Person_Number' or 'First_Reviewer_Code' from the live data.
export type CurrentUser = Employee & {
  id: string; // Ensure id is always present
  role: 'manager' | 'admin' | 'vp';
};

const placeholderUser: CurrentUser = { 
  id: '', 
  name: '', 
  title: '', 
  region: 'NAM', 
  manager: '', 
  team: '', 
  role: 'manager' 
};

export function useCurrentUser() {
  const [currentUser, setCurrentUser] = useState<CurrentUser>(placeholderUser);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // This effect runs only on the client, ensuring no server-side execution of this logic.
    // To demonstrate different roles, change this name:
    // 'Sawyer Ames' (Manager, id: 'mgr-1')
    // 'Caroline Reynolds' (Vice President, id: 'vp-1')
    // 'Super Admin' (Administrator, id: 'admin-01')
    const currentUserName = 'Sawyer Ames';
    const loggedInEmployee = employees.find(e => e.name === currentUserName);

    if (loggedInEmployee) {
      let role: 'manager' | 'admin' | 'vp' = 'manager'; // Default role
      if (loggedInEmployee.title.includes('Administrator') || loggedInEmployee.name === 'Super Admin') {
          role = 'admin';
      } else if (loggedInEmployee.title.includes('Vice President')) {
          role = 'vp';
      } else if (loggedInEmployee.title.includes('Manager')) {
          role = 'manager';
      }
      setCurrentUser({ ...loggedInEmployee, role });
    } else {
        // Handle case where user isn't found, which is unlikely with mock data.
        // Fallback to a default user to prevent crashes.
        const defaultUser = employees[0] || placeholderUser;
        setCurrentUser({ ...defaultUser, role: 'manager' });
    }
    
    setLoading(false);
  }, []);
  
  const isAdmin = currentUser.role === 'admin';
  const isVp = currentUser.role === 'vp';
  const isManager = currentUser.role === 'manager';

  return { currentUser, isAdmin, isVp, isManager, loading };
}
