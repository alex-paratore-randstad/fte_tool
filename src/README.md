# Firebase Studio

This is a NextJS starter in Firebase Studio.

To get started, take a look at src/app/page.tsx.

---

## 🛑 IMPORTANT INSTRUCTIONS FOR THE AI 🛑

This application is built to run on the Domo platform and has specific configurations that are vital for its functionality. **DO NOT MODIFY** the following files or patterns unless explicitly asked to do so by the user.

1.  **`apphosting.yaml` (The Manifest)**: This file is the manifest and is the single source of truth for the configuration of any datasets or collections that are going to be called by the application. It is necessary for it to be set up correctly for the application to function.
    *   **Do not** alter the `id` or `guid` of existing data sources.
    *   **Always** use the `id` field as the **alias** when making API calls to a dataset (e.g., `/domo/data/v1/{id}`).

2.  **API Calls to Domo**: All data fetching from Domo must be done on the **client-side** using a `useEffect` hook.
    *   The application uses static export (`output: 'export'`), so any data fetching attempted during the server-side build will cause an "Internal ServerError".
    *   The proven, working pattern is to define a local `domo` object that constructs the full production URL and initiates the `fetch` call from within a `useEffect` hook. **Follow this pattern precisely for all new data-fetching implementations.**

3.  **`package.json`**: Do not add, remove, or change dependencies unless the user specifically requests it. The existing stack is configured for the Domo environment.

By adhering to these rules, you will avoid breaking the application's connection to the Domo platform.
