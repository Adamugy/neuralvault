/**
 * Shared configuration and security limits.
 */
export const SECURITY_CONFIG = {
    // Denial of Service (DoS) Limits
    MAX_FILE_SIZE_BYTES: 20 * 1024 * 1024, // 20MB
    MAX_RESOURCES_PER_USER: 50,
    MAX_FILES_PER_USER: 10,
    MAX_IMAGE_DIMENSION: 4096, // pixels (width or height)
    MAX_DOCUMENTS_PER_USER: 200,
    MAX_SESSIONS_PER_USER: 50,
    MAX_MESSAGES_PER_SESSION: 100,

    // Rate Limiting
    API_WINDOW_MS: 15 * 60 * 1000,    // 15 minutes
    API_MAX_REQUESTS: 100,            // 100 requests per window
    UPLOAD_WINDOW_MS: 60 * 60 * 1000, // 1 hour
    UPLOAD_MAX_REQUESTS: 10,          // 10 uploads per window
};
