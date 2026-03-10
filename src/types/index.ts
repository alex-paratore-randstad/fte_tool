
export type Employee = {
  id: string;
  name: string;
  title: string;
  region: 'HYD' | 'EMEA' | 'NAM' | 'Central';
  manager: string; // Represents the current manager
  team: string;
};

export type CostCenter = {
  id: string;
  code: string;
  name: string;
};

export type Allocation = {
  employeeId: string;
  // This manager field will allow us to track who the manager was for a given allocation period.
  // This is key to ensuring historical data integrity when manager assignments change.
  manager: string; 
  allocations: { costCenterId: string; fte: number }[];
};

export type FtePrototypeData = {
  id: string; // Document ID from AppDB
  content: {
    name: string;
    value: string;
  };
};

export type TeamMember = {
  person_id: string;
  full_name: string;
  status: string;
  employment_type: string;
  department: string;
  department_detail?: string;
  title: string;
  manager_id: string;
  manager: string;
  manager_email: string;
  person_email: string;
  start_date: string;
  end_date: string;
  country: string;
  region?: string;
  fte: string;
};

export type WeeklyAllocation = {
  id: string;
  content: {
    allocation_date: string; // e.g., '2024-08-25'
    allocation_name: string; // Employee full name
    employee_id?: string; // Employee Person_Number
    cost_center_number: string;
    cost_center_name: string;
    allocation_amount: string; // This is a string from the datastore
  }
};

export type WeeklyTarget = {
  id: string;
  content: {
    targets_allocation_date: string;
    targets_allocation_name: string;
    targets_cost_center_number: string;
    targets_cost_center_name: string;
    targets_allocation_amount: string;
  }
};

export type BulkFteDoc = {
  id: string;
  content: {
    bulk_allocation_id: string;
    employee_id: string;
    employee_name: string;
    allocation_monthyear: string;
    bulk_allocation_date: string;
  };
};

export type BulkSummaryDoc = {
  id: string;
  content: {
    bulk_allocation_id: string;
    cost_center_number: string;
    cost_center_name:string;
    allocation_percentage: string;
    bulk_allocation_date: string;
    allocation_group?: string;
  };
};


export type NavItem = {
  href: string;
  label: string;
  roles?: ('admin' | 'manager' | 'vp')[];
};

export type NavGroup = {
  title: string;
  roles: ('admin' | 'manager' | 'vp')[];
  items: NavItem[];
};
