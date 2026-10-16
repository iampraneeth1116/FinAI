// Wraps an async Express handler so any thrown/rejected error is forwarded to
// the centralized error-handling middleware instead of crashing the process
// or hanging the request. Removes the need for try/catch in every route.
export const asyncHandler = (fn) => (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);
