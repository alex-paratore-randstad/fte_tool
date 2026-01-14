

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
  'Person_Number': string;
  'Full_Name': string;
  'Employment_Status': string;
  'Employment_Mode': string;
  'HO/FO': string;
  'Legal_Employer': string;
  LOB: string;
  'Team_Name': string;
  'Vertical_Name': string;
  'Sub_Vertical_Name': string;
  'Delivery_Mode': string;
  Client: string;
  Band: string;
  'Level_Description': string;
  'Incentive_Role': string;
  'Market_Facing_Title': string;
  Location: string;
  'Core_Center': string;
  Region: string;
  'Team_Code': string;
  'Cost_Center': string;
  'First_Reviewer_Code': string;
  'First_Reviewer_Name': string;
  'Vertical_Head_Code': string;
  'Vertical_Head_Name': string;
  'Official_Email': string;
  'Personal_Email': string;
  'Date_Of_Joining': string; // Stays as string for simplicity
  Gender: string;
  'Associate_Ecode': string;
  'Group_DOJ': string; // Stays as string for simplicity
  'Notified_Date': string; // Stays as string for simplicity
  'Last_Working_Day': string; // Stays as string for simplicity
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
    target_date: string;
    target_name: string;
    target_cost_center_number: string;
    target_cost_center_name: string;
    target_amount: string;
  }
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
