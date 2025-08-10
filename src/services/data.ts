
'use client';

import type { Employee, CostCenter, Allocation, FtePrototypeData } from '@/types';
import { employees as mockEmployees, costCenters as mockCostCenters, allocations as mockAllocations } from '@/lib/mock-data';
//import 'public/assets/domo.js';
declare var domo: any;

// A simple client-side check to determine if the code is running in a Domo environment.
const isDomo = typeof domo !== 'undefined';

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
    if (!isDomo) {
      console.log(`[AppDB] Not in DOMO environment. Skipping list for ${collectionName}.`);
      return Promise.resolve([]);
    }
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
     if (!isDomo) {
      console.log(`[AppDB] Not in DOMO environment. Simulating create for ${collectionName}.`);
      // Simulate the structure of a created document for local testing
      const simulatedId = `simulated-${Date.now()}`;
      return Promise.resolve({ id: simulatedId, content: documentContent } as T);
    }
    return domo.post(`/domo/datastores/v1/collections/${collectionName}/documents/`, { content: documentContent });
  },
  
  /**
   * Retrieves a single document from a Collection given its document ID.
   * @param collectionName The name given to the collection in the manifest.
   * @param documentId The id of the document.
   * @returns A promise that resolves with the document.
   */
  get: async <T>(collectionName: string, documentId: string): Promise<T> => {
    if (!isDomo) {
      console.log(`[AppDB] Not in DOMO environment. Skipping get for ${collectionName}/${documentId}.`);
      return Promise.resolve({} as T);
    }
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
    if (!isDomo) {
      console.log(`[AppDB] Not in DOMO environment. Simulating update for ${collectionName}/${documentId}.`);
       return Promise.resolve({ id: documentId, content: documentContent } as T);
    }
    return domo.put(`/domo/datastores/v1/collections/${collectionName}/documents/${documentId}`, { content: documentContent });
  },

  /**
   * Permanently deletes a document from a Collection.
   * @param collectionName The name given to the collection in the manifest.
   * @param documentId The id of the document to delete.
   * @returns A promise that resolves when the document is deleted.
   */
  delete: async (collectionName: string, documentId: string): Promise<void> => {
    if (!isDomo) {
      console.log(`[AppDB] Not in DOMO environment. Simulating delete for ${collectionName}/${documentId}.`);
      return Promise.resolve();
    }
    return domo.delete(`/domo/datastores/v1/collections/${collectionName}/documents/${documentId}`);
  },

  /**
   * Queries for documents in a Collection.
   * @param collectionName The name given to the collection in the manifest.
   * @param query The MongoDB query object.
   * @returns A promise that resolves with an array of matching documents.
   */
  query: async <T>(collectionName: string, query: object): Promise<T[]> => {
    if (!isDomo) {
      console.log(`[AppDB] Not in DOMO environment. Skipping query for ${collectionName}.`);
      return Promise.resolve([]);
    }
    const result = await domo.post(`/domo/datastores/v1/collections/${collectionName}/documents/query`, query);
    return result.map((r: any) => ({...r.content, id: r.id }));
  },
};


// --- Legacy Mock Data Functions ---
// These functions will be removed or replaced by AppDB calls.

export const getEmployees = async (): Promise<Employee[]> => {
  if (!isDomo) return Promise.resolve(mockEmployees);
  return appDb.list<Employee>('employees');
};

export const getCostCenters = async (): Promise<CostCenter[]> => {
  if (!isDomo) return Promise.resolve(mockCostCenters);
  return appDb.list<CostCenter>('cost-centers');
};

export const getAllocations = async (): Promise<Allocation[]> => {
   if (!isDomo) return Promise.resolve(mockAllocations);
  return appDb.list<Allocation>('allocations');
};
