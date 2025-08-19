

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
  'Person Number': string;
  'Full Name': string;
  'Employment Status': string;
  'Employment Mode': string;
  'HO/FO': string;
  'Legal Employer': string;
  LOB: string;
  'Team Name': string;
  'Vertical Name': string;
  'Sub Vertical Name': string;
  'Delivery Mode': string;
  Client: string;
  Band: string;
  'Level Description': string;
  'Incentive Role': string;
  'Market Facing Title': string;
  Location: string;
  'Core Center': string;
  Region: string;
  'Team Code': string;
  'Cost Center': string;
  'First Reviewer Code': string;
  'First Reviewer Name': string;
  'Vertical Head Code': string;
  'Vertical Head Name': string;
  'Official Email': string;
  'Personal Email': string;
  'Date Of Joining': string; // Stays as string for simplicity
  Gender: string;
  'Associate Ecode': string;
  'Group DOJ': string; // Stays as string for simplicity
  'Notified Date': string; // Stays as string for simplicity
  'Last Working Day': string; // Stays as string for simplicity
};

export type WeeklyAllocation = {
  id: string;
  content: {
    allocation_date: string; // e.g., '2024-08-25'
    allocation_name: string; // Employee full name
    cost_center_number: string;
    cost_center_name: string;
    allocation_amount: number; // 0.0 to 1.0
  }
};
