
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
    // This function is no longer called by the main page but is kept for potential future use.
    // In a real application, you would ensure this endpoint is reliable or remove it.
    return Promise.resolve([]);
};
