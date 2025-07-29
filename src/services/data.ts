
import { employees, costCenters, allocations } from '@/lib/mock-data';
import type { Employee, CostCenter, Allocation, FtePrototypeData } from '@/types';

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

export const getFtePrototypeData = async (): Promise<FtePrototypeData[]> => {
  const mockData: FtePrototypeData[] = [
    { _id: '1', content: { name: 'Total FTEs', value: '1,254' } },
    { _id: '2', content: { name: 'Allocated FTEs', value: '1,120' } },
    { _id: '3', content: { name: 'Unallocated FTEs', value: '134' } },
    { _id: '4', content: { name: 'FTE Target', value: '1,300' } },
    { _id: '5', content: { name: 'Data as of', value: new Date().toLocaleDateString() } },
  ];
  return Promise.resolve(mockData);
};
