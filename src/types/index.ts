
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

    // Retroactive-correction record, written only by the Weekly Allocation grid when an
    // allocation in a closed month is edited. Absent on every document written before
    // this shipped, and on documents that have never been corrected.
    //
    // All three are STRING, matching how allocation_amount carries a number — the collection
    // schema in public/manifest.json declares only STRING and DATE, and the ETL casts to DOUBLE
    // at load. A field missing from that declaration never reaches the dataset at all.
    baseline_fte_value?: string; // the amount before the first correction of the cycle
    correction_month?: string; // 'YYYY-MM' — the month that cycle started
    correction_count?: string; // corrections made within that cycle
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

export type SummaryEntry = { 
  id: string; 
  name: string;
  number: string;
  percentage: number;
  isNew?: boolean;
};

export type EmployeeEntry = {
    id: string; 
    employeeId: string;
    name: string;
    isNew?: boolean;
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
