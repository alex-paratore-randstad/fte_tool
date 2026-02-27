'use client';

import { v4 as uuidv4 } from 'uuid';

type LogType = 'error' | 'warning' | 'info' | 'success';

type LogPayload = {
    log_id: string;
    page_name: string;
    log_date: string;
    log_type: LogType;
    log_message: string;
    log_raw: string;
};

/**
 * Logs a message to the fte_logging collection in AppDB.
 * This is a "fire and forget" operation. It will not block the UI.
 * @param pageName - The name of the page/component where the event occurred.
 * @param logType - The type of log (e.g., 'error', 'warning').
 * @param logMessage - A human-readable message describing the event.
 * @param rawData - The raw error object or any other data to be stringified.
 */
export function writeLog(
    pageName: string,
    logType: LogType,
    logMessage: string,
    rawData: any
) {
    let logRaw = 'no-data';
    try {
        if (rawData !== null && rawData !== undefined) {
            // Safe stringification even if rawData is an Error or null
            if (typeof rawData === 'string') {
                logRaw = rawData;
            } else if (rawData instanceof Error) {
                // Use a robust error stringification that handles non-enumerable properties
                logRaw = JSON.stringify({
                    name: rawData.name,
                    message: rawData.message,
                    stack: rawData.stack,
                    ...rawData
                });
            } else {
                // Use a safe stringify approach to avoid crashes on circular refs
                const cache = new Set();
                logRaw = JSON.stringify(rawData, (key, value) => {
                    if (typeof value === 'object' && value !== null) {
                        if (cache.has(value)) return '[Circular]';
                        cache.add(value);
                    }
                    return value;
                });
            }
        }
    } catch (e) {
        logRaw = 'failed-to-stringify';
    }

    const payload: LogPayload = {
        log_id: uuidv4(),
        page_name: pageName || 'Unknown Page',
        log_date: new Date().toISOString(),
        log_type: logType || 'info',
        log_message: logMessage || 'No message provided',
        log_raw: logRaw,
    };

    // Fire and forget - ensure this only runs in the browser
    if (typeof window !== 'undefined') {
        fetch('/domo/datastores/v1/collections/fte_logging/documents/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: payload }),
        }).catch(error => {
            // If logging itself fails, log to console as a last resort.
            console.error('Failed to write to fte_logging collection.', {
                loggingError: error,
                originalPayload: payload,
            });
        });
    }
}
