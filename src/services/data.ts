
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
  try {
    const response = await fetch('/data/v1/store_example_data');
    if (!response.ok) {
      console.error('Failed to fetch store data:', response.statusText);
      // Return an empty array or throw an error, depending on desired behavior
      return []; 
    }
    const data: SalesData[] = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching store data:', error);
    // Return an empty array or throw an error
    return [];
  }
};
