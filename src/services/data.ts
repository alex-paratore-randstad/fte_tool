
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
  try {
    const response = await fetch('/domo/datastores/v1/collections/fte_prototype/documents/');
    if (!response.ok) {
      console.error('Failed to fetch fte prototype data:', response.statusText);
      return [];
    }
    const data: FtePrototypeData[] = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching fte prototype data:', error);
    return [];
  }
};
