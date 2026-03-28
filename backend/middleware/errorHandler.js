/**
 * Error Handler Middleware
 */

function errorHandler(err, req, res, next) {
    console.error('❌ Error:', err.message);
    console.error('Stack:', err.stack);

    const statusCode = err.statusCode || err.status || 500;
    const message = err.message || 'Internal Server Error';

    res.status(statusCode).json({
        success: false,
        error: {
            message,
            code: err.code || 'INTERNAL_ERROR',
            ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
        }
    });
}

/**
 * Async handler wrapper to catch errors
 */
function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}

/**
 * Not found handler
 */
function notFoundHandler(req, res, next) {
    res.status(404).json({
        success: false,
        error: {
            message: `Route ${req.originalUrl} not found`,
            code: 'NOT_FOUND'
        }
    });
}

module.exports = {
    errorHandler,
    asyncHandler,
    notFoundHandler
};
