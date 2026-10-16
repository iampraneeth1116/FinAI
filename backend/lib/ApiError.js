// A small typed error so routes can fail with an explicit HTTP status code
// (e.g. throw new ApiError(404, 'Not found')) and have the central error
// handler translate it into a consistent JSON response.
export class ApiError extends Error {
    constructor(statusCode, message, details) {
        super(message);
        this.name = 'ApiError';
        this.statusCode = statusCode;
        this.details = details;
    }
}
