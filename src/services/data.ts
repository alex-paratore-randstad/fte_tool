'use server';

import { employees, costCenters, allocations } from '@/lib/mock-data';
import type { Employee, CostCenter, Allocation } from '@/types';

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
