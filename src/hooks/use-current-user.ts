
'use client';

import { useState, useEffect } from 'react';
import { employees } from '@/lib/mock-data';
import type { Employee } from '@/types';

export type CurrentUser = Employee & {
  role: 'manager' | 'admin' | 'vp';
};

const placeholderUser: CurrentUser = { 
  id: 'placeholder-user', 
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
    // This effect runs only on the client
    // To demonstrate different roles, change this name:
    // 'Sawyer Ames' (Manager)
    // 'Caroline Reynolds' (Vice President)
    // 'Super Admin' (Administrator)
    const currentUserName = 'Super Admin';
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
        // Handle case where user isn't found, though it shouldn't happen with mock data
        const defaultUser = employees[0];
        setCurrentUser({ ...defaultUser, role: 'manager' });
    }
    
    setLoading(false);
  }, []);
  
  const isAdmin = currentUser.role === 'admin';
  const isVp = currentUser.role === 'vp';
  const isManager = currentUser.role === 'manager';

  return { currentUser, isAdmin, isVp, isManager, loading };
}
