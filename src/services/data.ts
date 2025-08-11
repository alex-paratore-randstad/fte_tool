
import type { Employee, CostCenter, Allocation } from '@/types';
import { employees as mockEmployees, costCenters as mockCostCenters, allocations as mockAllocations } from '@/lib/mock-data';

export const getEmployees = async (): Promise<Employee[]> => {
  return Promise.resolve(mockEmployees);
};

export const getCostCenters = async (): Promise<CostCenter[]> => {
  return Promise.resolve(mockCostCenters);
};

export const getAllocations = async (): Promise<Allocation[]> => {
  return Promise.resolve(mockAllocations);
};
