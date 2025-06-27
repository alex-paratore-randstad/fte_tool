'use client';

import { employees } from '@/lib/mock-data';
import type { Employee } from '@/types';

// For this prototype, we'll hardcode the current user.
// In a real application, this would come from an authentication context.
// Sawyer Ames is a manager in the mock data, managing the Core Platform team.
const currentUserName = 'Sawyer Ames';

export type CurrentUser = Employee & {
  role: 'manager' | 'admin';
};

// We create a user object for the manager.
const managerUser: CurrentUser = {
  ...(employees.find(e => e.name === currentUserName) as Employee),
  role: 'manager',
};

// We can also define an admin user for future use.
export const adminUser: CurrentUser = {
    id: 'admin-01',
    name: 'Super Admin',
    title: 'System Administrator',
    region: 'Central',
    manager: 'N/A',
    team: 'System',
    role: 'admin',
};

export function useCurrentUser() {
  // To demonstrate the manager view, we return the manager user.
  // To show the admin view, this hook could be updated to return the adminUser.
  const currentUser: CurrentUser = managerUser;

  const isAdmin = currentUser.role === 'admin';
  // A non-admin is considered a manager for this prototype's purposes.
  const isManager = !isAdmin;

  return { currentUser, isAdmin, isManager };
}
