
//'use server';

import { employees, costCenters, allocations } from '@/lib/mock-data';
import type { Employee, CostCenter, Allocation, SalesData } from '@/types';

// In a real application, these functions would fetch data from a backend API.
// For this prototype, they resolve with mock data.

export const getEmployees = async (): Promise<Employee[]> => {
  return Promise.resolve(employees);
};

export const getCostCenters = async (): Promise<CostCenter[]> => {
  return Promise.resolve(costCenters);
};

export const getAllocations = async (): Promise<Allocation[]> => {
  return Promise.resolve(allocations);
};

export const getStoreExampleData = async (): Promise<SalesData[]> => {
  const data: SalesData[] = [
    {
      date_ymd: '2022-09-02',
      revenue: 734.62,
      sales_rep: 'Taylor Lowe',
      department: 'Mens Apparel',
      state: 'New York',
    },
    {
      date_ymd: '2022-09-02',
      revenue: 716.7,
      sales_rep: 'Cameron Hermann',
      department: 'Mens Shoes',
      state: 'South Carolina',
    },
    {
      date_ymd: '2022-09-03',
      revenue: 1045.8,
      sales_rep: 'Taylor Lowe',
      department: 'Womens Shoes',
      state: 'New York',
    },
    {
      date_ymd: '2022-09-03',
      revenue: 543.21,
      sales_rep: 'Cameron Hermann',
      department: 'Womens Apparel',
      state: 'South Carolina',
    },
     {
      date_ymd: '2022-09-04',
      revenue: 890.45,
      sales_rep: 'Riley Jones',
      department: 'Kids Apparel',
      state: 'California',
    },
    {
      date_ymd: '2022-09-04',
      revenue: 1250.00,
      sales_rep: 'Alex Smith',
      department: 'Electronics',
      state: 'Texas',
    },
  ];
  // Simulate network delay
  return new Promise(resolve => setTimeout(() => resolve(data), 500));
};
