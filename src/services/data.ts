
import type { Employee, CostCenter, Allocation, FtePrototypeData } from '@/types';
import { employees as mockEmployees, costCenters as mockCostCenters, allocations as mockAllocations } from '@/lib/mock-data';
//import 'public/assets/domo.js';
declare var domo: any;

/**
 * A wrapper for the DOMO AppDB API to provide a more convenient interface.
 * This should only be used in client-side components.
 */
export const appDb = {
  /**
   * Lists all documents from a given Collection.
   * @param collectionName The name given to the collection in the manifest.
   * @returns A promise that resolves with an array of documents.
   */
  list: async <T>(collectionName: string): Promise<T[]> => {
    const result = await domo.get(`/domo/datastores/v1/collections/${collectionName}/documents/`);
    return result.map((r: any) => ({...r.content, id: r.id }));
  },

  /**
   * Create a single document in a collection.
   * @param collectionName The name given to the collection in the manifest.
   * @param documentContent The content of the document to create.
   * @returns A promise that resolves with the created document.
   */
  create: async <T>(collectionName: string, documentContent: object): Promise<T> => {
    return domo.post(`/domo/datastores/v1/collections/${collectionName}/documents/`, { content: documentContent });
  },
  
  /**
   * Retrieves a single document from a Collection given its document ID.
   * @param collectionName The name given to the collection in the manifest.
   * @param documentId The id of the document.
   * @returns A promise that resolves with the document.
   */
  get: async <T>(collectionName: string, documentId: string): Promise<T> => {
    const result = await domo.get(`/domo/datastores/v1/collections/${collectionName}/documents/${documentId}`);
    return {...result.content, id: result.id };
  },

  /**
   * Updates an existing document in a Collection given its document ID.
   * @param collectionName The name given to the collection in the manifest.
   * @param documentId The id of the document to update.
   * @param documentContent The new content for the document.
   * @returns A promise that resolves with the modified document.
   */
  update: async <T>(collectionName: string, documentId: string, documentContent: object): Promise<T> => {
    return domo.put(`/domo/datastores/v1/collections/${collectionName}/documents/${documentId}`, { content: documentContent });
  },

  /**
   * Permanently deletes a document from a Collection.
   * @param collectionName The name given to the collection in the manifest.
   * @param documentId The id of the document to delete.
   * @returns A promise that resolves when the document is deleted.
   */
  delete: async (collectionName: string, documentId: string): Promise<void> => {
    return domo.delete(`/domo/datastores/v1/collections/${collectionName}/documents/${documentId}`);
  },

  /**
   * Queries for documents in a Collection.
   * @param collectionName The name given to the collection in the manifest.
   * @param query The MongoDB query object.
   * @returns A promise that resolves with an array of matching documents.
   */
  query: async <T>(collectionName: string, query: object): Promise<T[]> => {
    const result = await domo.post(`/domo/datastores/v1/collections/${collectionName}/documents/query`, query);
    return result.map((r: any) => ({...r.content, id: r.id }));
  },
};


// --- Legacy Mock Data Functions ---
// These functions will be removed or replaced by AppDB calls.

export const getEmployees = async (): Promise<Employee[]> => {
  if (typeof domo === 'undefined') return Promise.resolve(mockEmployees);
  return appDb.list<Employee>('employees');
};

export const getCostCenters = async (): Promise<CostCenter[]> => {
  if (typeof domo === 'undefined') return Promise.resolve(mockCostCenters);
  return appDb.list<CostCenter>('cost-centers');
};

export const getAllocations = async (): Promise<Allocation[]> => {
   if (typeof domo === 'undefined') return Promise.resolve(mockAllocations);
  return appDb.list<Allocation>('allocations');
};
