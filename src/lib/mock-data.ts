import type { Employee, Account, Allocation, Activity } from '@/types';

export const employees: Employee[] = [
  { id: '1', name: 'Alisha Collier', title: 'Software Engineer', region: 'NAM', manager: 'Sawyer Ames', team: 'Core Platform' },
  { id: '2', name: 'Brennan Matthews', title: 'Product Manager', region: 'EMEA', manager: 'Cheryl MacMillan', team: 'Client Integrations' },
  { id: '3', name: 'Chadwick dorsey', title: 'Data Scientist', region: 'HYD', manager: 'John Slocum', team: 'Analytics' },
  { id: '4', name: 'Dana Scully', title: 'UX Designer', region: 'NAM', manager: 'Sawyer Ames', team: 'Core Platform' },
  { id: '5', name: 'Fox Mulder', title: 'QA Engineer', region: 'EMEA', manager: 'Cheryl MacMillan', team: 'Client Integrations' },
];

export const accounts: Account[] = [
  { id: 'acc-1', name: 'Project Alpha' },
  { id: 'acc-2', name: 'Project Bravo' },
  { id: 'acc-3', name: 'Project Charlie' },
  { id: 'acc-4', name: 'Internal R&D' },
];

export const allocations: Allocation[] = [
  { employeeId: '1', allocations: [{ accountId: 'acc-1', fte: 0.5 }, { accountId: 'acc-4', fte: 0.5 }] },
  { employeeId: '2', allocations: [{ accountId: 'acc-1', fte: 1.0 }] },
  { employeeId: '3', allocations: [{ accountId: 'acc-2', fte: 0.8 }, { accountId: 'acc-3', fte: 0.2 }] },
  { employeeId: '4', allocations: [{ accountId: 'acc-2', fte: 1.0 }] },
  { employeeId: '5', allocations: [{ accountId: 'acc-3', fte: 0.75 }, { accountId: 'acc-4', fte: 0.25 }] },
];

export const recentActivities: Activity[] = [
    { id: 'act-1', user: 'Sawyer Ames', avatar: 'SA', action: 'updated allocation for', target: 'Alisha Collier', time: '2m ago' },
    { id: 'act-2', user: 'Cheryl MacMillan', avatar: 'CM', action: 'approved forecast for', target: 'Project Bravo', time: '1h ago' },
    { id: 'act-3', user: 'John Slocum', avatar: 'JS', action: 'added new team member', target: 'Chadwick Dorsey', time: '3h ago' },
    { id: 'act-4', user: 'Sawyer Ames', avatar: 'SA', action: 'submitted weekly hours for', target: 'Core Platform team', time: '8h ago' },
    { id: 'act-5', user: 'System', avatar: 'SYS', action: 'flagged missing allocation for', target: 'Fox Mulder', time: '1d ago' },
];
