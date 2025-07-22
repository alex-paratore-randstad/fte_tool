import type { Employee, CostCenter, Allocation } from '@/types';

export const employees: Employee[] = [
  // Leadership
  { id: 'vp-1', name: 'Caroline Reynolds', title: 'Vice President, GBS', region: 'NAM', manager: 'N/A', team: 'Leadership' },
  { id: 'mgr-1', name: 'Sawyer Ames', title: 'Manager, Core Platform', region: 'NAM', manager: 'Caroline Reynolds', team: 'Core Platform' },
  { id: 'mgr-2', name: 'Cheryl MacMillan', title: 'Manager, Client Integrations', region: 'EMEA', manager: 'Caroline Reynolds', team: 'Client Integrations' },
  { id: 'mgr-3', name: 'John Slocum', title: 'Manager, Analytics', region: 'HYD', manager: 'Caroline Reynolds', team: 'Analytics' },
  { id: 'mgr-4', name: 'Heisenberg', title: 'Manager, Special Projects', region: 'Central', manager: 'Caroline Reynolds', team: 'Special Projects' },
  { id: 'admin-01', name: 'Super Admin', title: 'System Administrator', region: 'Central', manager: 'N/A', team: 'System' },

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
  { id: '12', name: 'Walter White', title: 'Chemistry Consultant', region: 'Central', manager: 'Heisenberg', team: 'Special Projects' },


  // New employees
  { id: '13', name: 'Jesse Pinkman', title: 'Associate Engineer', region: 'NAM', manager: 'Sawyer Ames', team: 'Core Platform' },
  { id: '14', name: 'Skyler White', title: 'Accountant', region: 'NAM', manager: 'Cheryl MacMillan', team: 'Client Integrations' },
  { id: '15', name: 'Saul Goodman', title: 'Legal Counsel', region: 'EMEA', manager: 'Cheryl MacMillan', team: 'Client Integrations' },
  { id: '16', name: 'Jane Margolis', title: 'UI/UX Intern', region: 'NAM', manager: 'Sawyer Ames', team: 'Core Platform' },
  { id: '17', name: 'Todd Alquist', title: 'Junior Data Analyst', region: 'HYD', manager: 'John Slocum', team: 'Analytics' },
  { id: '18', name: 'Lydia Rodarte-Quayle', title: 'Logistics Coordinator', region: 'EMEA', manager: 'Cheryl MacMillan', team: 'Client Integrations' },
  { id: '19', name: 'Hector Salamanca', title: 'Senior Consultant', region: 'NAM', manager: 'Heisenberg', team: 'Special Projects' },
  { id: '20', name: 'Tuco Salamanca', title: 'Distribution Manager', region: 'NAM', manager: 'Heisenberg', team: 'Special Projects' },
  { id: '21', name: 'Marie Schrader', title: 'HR Business Partner', region: 'NAM', manager: 'Sawyer Ames', team: 'Core Platform' },
  { id: '22', name: 'Steven Gomez', title: 'Security Analyst', region: 'NAM', manager: 'Sawyer Ames', team: 'Core Platform' }
];

export const costCenters: CostCenter[] = [
  { id: 'cc-1', code: 'P-ALPHA', name: 'Project Alpha' },
  { id: 'cc-2', code: 'P-BRAVO', name: 'Project Bravo' },
  { id: 'cc-3', code: 'P-CHARLIE', name: 'Project Charlie' },
  { id: 'cc-4', code: 'G-RD', name: 'Internal R&D' },
  { id: 'cc-pto', code: 'G-PTO', name: 'PTO' },
];

// Note: The 'manager' field in allocations now represents the manager for that specific allocation period.
// The 'manager' in the 'employees' array represents the CURRENT manager.
export const allocations: Allocation[] = [
  // Sawyer Ames' Team
  { employeeId: '1', manager: 'Sawyer Ames', allocations: [{ costCenterId: 'cc-1', fte: 0.5 }, { costCenterId: 'cc-4', fte: 0.5 }] },
  { employeeId: '4', manager: 'Sawyer Ames', allocations: [{ costCenterId: 'cc-2', fte: 1.0 }] },
  { employeeId: '6', manager: 'Sawyer Ames', allocations: [{ costCenterId: 'cc-1', fte: 0.8 }, { costCenterId: 'cc-4', fte: 0.2 }] },
  { employeeId: '7', manager: 'Sawyer Ames', allocations: [{ costCenterId: 'cc-1', fte: 0.9 }] }, // Under-allocated

  // Cheryl MacMillan's Team
  { employeeId: '2', manager: 'Cheryl MacMillan', allocations: [{ costCenterId: 'cc-1', fte: 1.0 }] },
  { employeeId: '5', manager: 'Cheryl MacMillan', allocations: [{ costCenterId: 'cc-3', fte: 0.75 }, { costCenterId: 'cc-4', fte: 0.25 }] },
  { employeeId: '8', manager: 'Cheryl MacMillan', allocations: [{ costCenterId: 'cc-2', fte: 0.5 }, { costCenterId: 'cc-3', fte: 0.5 }] },
  { employeeId: '9', manager: 'Cheryl MacMillan', allocations: [{ costCenterId: 'cc-2', fte: 1.2 }] }, // Over-allocated

  // John Slocum's Team
  { employeeId: '3', manager: 'John Slocum', allocations: [{ costCenterId: 'cc-2', fte: 0.8 }, { costCenterId: 'cc-3', fte: 0.2 }] },
  { employeeId: '10', manager: 'John Slocum', allocations: [{ costCenterId: 'cc-1', fte: 0.4 }, { costCenterId: 'cc-2', fte: 0.6 }] },
  { employeeId: '11', manager: 'John Slocum', allocations: [{ costCenterId: 'cc-3', fte: 1.0 }] },

  // Other
  { employeeId: '12', manager: 'Heisenberg', allocations: [] }, // No allocation

  // New employee allocations
  { employeeId: '13', manager: 'Sawyer Ames', allocations: [{ costCenterId: 'cc-1', fte: 1.0 }] },
  { employeeId: '14', manager: 'Cheryl MacMillan', allocations: [{ costCenterId: 'cc-2', fte: 1.0 }] },
  { employeeId: '15', manager: 'Cheryl MacMillan', allocations: [{ costCenterId: 'cc-4', fte: 0.5 }, { costCenterId: 'cc-1', fte: 0.5 }] },
  { employeeId: '16', manager: 'Sawyer Ames', allocations: [{ costCenterId: 'cc-2', fte: 0.8 }] }, // Under-allocated
  { employeeId: '17', manager: 'John Slocum', allocations: [{ costCenterId: 'cc-3', fte: 1.0 }] },
  { employeeId: '18', manager: 'Cheryl MacMillan', allocations: [{ costCenterId: 'cc-1', fte: 0.2 }, { costCenterId: 'cc-2', fte: 0.8 }] },
  { employeeId: '19', manager: 'Heisenberg', allocations: [{ costCenterId: 'cc-4', fte: 1.0 }] },
  { employeeId: '20', manager: 'Heisenberg', allocations: [] }, // No allocation
  { employeeId: '21', manager: 'Sawyer Ames', allocations: [{ costCenterId: 'cc-4', fte: 1.0 }] },
  { employeeId: '22', manager: 'Sawyer Ames', allocations: [{ costCenterId: 'cc-1', fte: 1.1 }] } // Over-allocated
];
