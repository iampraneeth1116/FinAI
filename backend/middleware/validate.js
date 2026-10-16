import { ZodError } from 'zod';

/**
 * Express middleware factory that validates and coerces parts of a request
 * against zod schemas. Validated/parsed data replaces the original request
 * values so downstream handlers receive clean, typed input.
 *
 * Usage:
 *   router.post('/', validate({ body: createSchema }), handler)
 */
export const validate = (schemas) => (req, res, next) => {
    try {
        if (schemas.body) req.body = schemas.body.parse(req.body ?? {});
        if (schemas.params) req.params = schemas.params.parse(req.params ?? {});
        if (schemas.query) {
            // req.query can be a read-only getter on some Express versions, so
            // assign parsed values onto the existing object rather than replacing.
            const parsed = schemas.query.parse(req.query ?? {});
            Object.keys(parsed).forEach((k) => { req.query[k] = parsed[k]; });
        }
        next();
    } catch (err) {
        if (err instanceof ZodError) {
            return res.status(400).json({
                error: 'Validation failed',
                details: err.issues.map((i) => ({
                    field: i.path.join('.') || '(root)',
                    message: i.message,
                })),
            });
        }
        next(err);
    }
};
