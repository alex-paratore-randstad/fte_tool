'use client';

import { employees } from '@/lib/mock-data';
import type { Employee } from '@/types';

export type CurrentUser = Employee & {
  role: 'manager' | 'admin' | 'vp';
};

export function useCurrentUser() {
  // To demonstrate different roles, change this name:
  // 'Sawyer Ames' (Manager)
  // 'Caroline Reynolds' (Vice President)
  // 'Super Admin' (Administrator)
  const currentUserName = 'Caroline Reynolds';

  const loggedInEmployee = employees.find(e => e.name === currentUserName);

  let role: 'manager' | 'admin' | 'vp' = 'manager'; // Default role

  if (loggedInEmployee) {
      if (loggedInEmployee.title.includes('Administrator')) {
          role = 'admin';
      } else if (loggedInEmployee.title.includes('Vice President')) {
          role = 'vp';
      } else if (loggedInEmployee.title.includes('Manager')) {
          role = 'manager';
      }
  }

  const currentUser: CurrentUser = loggedInEmployee 
      ? { ...loggedInEmployee, role }
      : { 
          id: 'placeholder-user', 
          name: 'Loading...', 
          title: '', region: 'NAM', 
          manager: '', 
          team: '', 
          role: 'manager' 
      };

  const isAdmin = currentUser.role === 'admin';
  const isVp = currentUser.role === 'vp';
  const isManager = currentUser.role === 'manager';

  return { currentUser, isAdmin, isVp, isManager };
}
