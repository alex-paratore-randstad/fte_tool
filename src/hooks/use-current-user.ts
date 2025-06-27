'use client';

import { employees } from '@/lib/mock-data';
import type { Employee } from '@/types';

export type CurrentUser = Employee & {
  role: 'manager' | 'admin';
};

export function useCurrentUser() {
  // For this prototype, we'll hardcode the current user name.
  // In a real application, this would come from an authentication context.
  const currentUserName = 'Sawyer Ames';

  // We can define an admin user for testing different roles.
  const adminUser: CurrentUser = {
      id: 'admin-01',
      name: 'Super Admin',
      title: 'System Administrator',
      region: 'Central',
      manager: 'N/A',
      team: 'System',
      role: 'admin',
  };

  // Find the manager from the employees list.
  const managerEmployee = employees.find(e => e.name === currentUserName);

  // If the manager isn't found, we can create a placeholder to avoid crashing.
  const managerUser: CurrentUser = managerEmployee 
      ? { ...managerEmployee, role: 'manager' }
      : { 
          id: 'placeholder-manager', 
          name: 'Loading...', 
          title: '', region: 'NAM', 
          manager: '', 
          team: '', 
          role: 'manager' 
        };

  // To demonstrate the manager view, we return the manager user.
  // To show the admin view, change this line to: `const currentUser: CurrentUser = adminUser;`
  const currentUser: CurrentUser = adminUser;

  const isAdmin = currentUser.role === 'admin';
  const isManager = !isAdmin;

  return { currentUser, isAdmin, isManager };
}
