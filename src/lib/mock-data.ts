import type { Employee, Account, Allocation, Activity } from '@/types';

export const employees: Employee[] = [
  // Sawyer Ames' Team: Core Platform
  { id: '1', name: 'Alisha Collier', title: 'Software Engineer', region: 'NAM', manager: 'Sawyer Ames', team: 'Core Platform' },
  { id: '4', name: 'Dana Scully', title: 'UX Designer', region: 'NAM', manager: 'Sawyer Ames', team: 'Core Platform' },
  { id: '6', name: 'Gus Fring', title: 'Principal Engineer', region: 'NAM', manager: 'Sawyer Ames', team: 'Core Platform' },
  { id: '7', name: 'Hank Schrader', title: 'DevOps Engineer', region: 'NAM', manager: 'Sawyer Ames', team: 'Core Platform' },

  // Cheryl MacMillan's Team: Client Integrations
  { id: '2', name: 'Brennan Matthews', title: 'Product Manager', region: 'EMEA', manager: 'Cheryl MacMillan', team: 'Client Integrations' },
  { id: '5', name: 'Fox Mulder', title: 'QA Engineer', region: 'EMEA', manager: 'Cheryl MacMillan', team: 'Client Integrations' },
  { id: '8', name: 'Kim Wexler', title: 'Solutions Architect', region: 'EMEA', manager: 'Cheryl MacMillan', team: 'Client Integrations' },
  { id: '9', name: 'Lalo Salamanca', title: 'Technical Writer', region: 'EMEA', manager: 'Cheryl MacMillan', team: 'Client Integrations' },

  // John Slocum's Team: Analytics
  { id: '3', name: 'Chadwick Dorsey', title: 'Data Scientist', region: 'HYD', manager: 'John Slocum', team: 'Analytics' },
  { id: '10', name: 'Mike Ehrmantraut', title: 'Data Engineer', region: 'HYD', manager: 'John Slocum', team: 'Analytics' },
  { id: '11', name: 'Nacho Varga', title: 'BI Developer', region: 'HYD', manager: 'John Slocum', team: 'Analytics' },

  // Unassigned or different manager
  { id: '12', name: 'Walter White', title: 'Chemistry Consultant', region: 'Central', manager: 'Heisenberg', team: 'Special Projects' },
];

export const accounts: Account[] = [
  { id: 'acc-1', name: 'Project Alpha' },
  { id: 'acc-2', name: 'Project Bravo' },
  { id: 'acc-3', name: 'Project Charlie' },
  { id: 'acc-4', name: 'Internal R&D' },
];

export const allocations: Allocation[] = [
  // Sawyer Ames' Team
  { employeeId: '1', allocations: [{ accountId: 'acc-1', fte: 0.5 }, { accountId: 'acc-4', fte: 0.5 }] },
  { employeeId: '4', allocations: [{ accountId: 'acc-2', fte: 1.0 }] },
  { employeeId: '6', allocations: [{ accountId: 'acc-1', fte: 0.8 }, { accountId: 'acc-4', fte: 0.2 }] },
  { employeeId: '7', allocations: [{ accountId: 'acc-1', fte: 0.9 }] }, // Under-allocated

  // Cheryl MacMillan's Team
  { employeeId: '2', allocations: [{ accountId: 'acc-1', fte: 1.0 }] },
  { employeeId: '5', allocations: [{ accountId: 'acc-3', fte: 0.75 }, { accountId: 'acc-4', fte: 0.25 }] },
  { employeeId: '8', allocations: [{ accountId: 'acc-2', fte: 0.5 }, { accountId: 'acc-3', fte: 0.5 }] },
  { employeeId: '9', allocations: [{ accountId: 'acc-2', fte: 1.2 }] }, // Over-allocated

  // John Slocum's Team
  { employeeId: '3', allocations: [{ accountId: 'acc-2', fte: 0.8 }, { accountId: 'acc-3', fte: 0.2 }] },
  { employeeId: '10', allocations: [{ accountId: 'acc-1', fte: 0.4 }, { accountId: 'acc-2', fte: 0.6 }] },
  { employeeId: '11', allocations: [{ accountId: 'acc-3', fte: 1.0 }] },

  // Other
  { employeeId: '12', allocations: [] }, // No allocation
];


export const recentActivities: Activity[] = [
    { id: 'act-1', user: 'Sawyer Ames', avatar: 'SA', action: 'updated allocation for', target: 'Alisha Collier', time: '2m ago' },
    { id: 'act-2', user: 'Cheryl MacMillan', avatar: 'CM', action: 'approved forecast for', target: 'Project Bravo', time: '1h ago' },
    { id: 'act-3', user: 'John Slocum', avatar: 'JS', action: 'added new team member', target: 'Nacho Varga', time: '3h ago' },
    { id: 'act-4', user: 'Sawyer Ames', avatar: 'SA', action: 'submitted weekly hours for', target: 'Core Platform team', time: '8h ago' },
    { id: 'act-5', user: 'System', avatar: 'SYS', action: 'flagged missing allocation for', target: 'Hank Schrader', time: '1d ago' },
    { id: 'act-6', user: 'Cheryl MacMillan', avatar: 'CM', action: 'flagged over-allocation for', target: 'Lalo Salamanca', time: '1d ago' },
    { id: 'act-7', user: 'John Slocum', avatar: 'JS', action: 'updated allocation for', target: 'Mike Ehrmantraut', time: '2d ago' },
];
