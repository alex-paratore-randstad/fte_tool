
'use client';

import type { Employee, CostCenter, Allocation, FtePrototypeData } from '@/types';

// In a real application, these functions would fetch data from a backend API.
// For this prototype, they resolve with mock data if the domo object isn't available.

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
    return domo.get(`/domo/datastores/v1/collections/${collectionName}/documents/`);
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
    return domo.get(`/domo/datastores/v1/collections/${collectionName}/documents/${documentId}`);
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
    return domo.post(`/domo/datastores/v1/collections/${collectionName}/documents/query`, query);
  },
};


// --- Legacy Mock Data Functions ---
// These functions will be removed or replaced by AppDB calls.

export const getEmployees = async (): Promise<Employee[]> => {
  if (!isDomo) return Promise.resolve([]);
  return appDb.list<Employee>('employees');
};

export const getCostCenters = async (): Promise<CostCenter[]> => {
  if (!isDomo) return Promise.resolve([]);
  return appDb.list<CostCenter>('cost-centers');
};

export const getAllocations = async (): Promise<Allocation[]> => {
   if (!isDomo) return Promise.resolve([]);
  return appDb.list<Allocation>('allocations');
};
