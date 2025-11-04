# Firebase Studio

This is a NextJS starter in Firebase Studio.

To get started, take a look at src/app/page.tsx.

---

## 🛑 IMPORTANT INSTRUCTIONS FOR THE AI 🛑

This application is built to run on the Domo platform and has specific configurations that are vital for its functionality. **DO NOT MODIFY** the following files or patterns unless explicitly asked to do so by the user.

1.  **`manifest.json` (The Manifest)**: This file is the manifest and is the single source of truth for the configuration of any datasets or collections that are going to be called by the application. It is necessary for it to be set up correctly for the application to function.
    *   **Source of Truth**: The manifest defines the `id` (alias) for each dataset and the exact `name` of each column within that dataset. All API calls and data parsing logic must reference these values directly.
    *   **Do not** alter the `id` or `guid` of existing data sources.
    *   **Always** use the `id` field from the manifest as the **alias** when making API calls to a dataset (e.g., `/data/v1/{alias}`).
    *   **Always** use the exact column `name` from the manifest when accessing properties on the returned data objects (e.g., `item['Column_Name_From_Manifest']`).

2.  **API Calls to Domo**: All data fetching from Domo must be done on the **client-side** using a `useEffect` hook.
    *   The application uses static export (`output: 'export'`), so any data fetching attempted during the server-side build will cause an "Internal ServerError".
    *   The proven, working pattern is to use the standard `fetch` API inside a `useEffect` hook to call the relative path for the data source. For datasets, use the alias from the manifest (e.g., `fetch('/data/v1/my_dataset_alias')`). For AppDB collections, use the Domo datastore endpoint (e.g., `fetch('/domo/datastores/v1/collections/my_collection/documents')`). **Follow this pattern precisely for all new data-fetching implementations.**

3.  **`package.json`**: Do not add, remove, or change dependencies unless the user specifically requests it. The existing stack is configured for the Domo environment.

4.  **`public/thumbnail.png`**: This file is a user-provided image asset that serves as the application's thumbnail in the Domo Appstore. It has been added manually by the user. **Do not** modify, move, or delete this file.

By adhering to these rules, you will avoid breaking the application's connection to the Domo platform.
