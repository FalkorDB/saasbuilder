/**
 * In-memory rate limiter for tracking failed login attempts per IP
 * Tracks attempts with automatic cleanup after TTL
 */

const attemptStore = new Map();

const DEFAULT_CONFIG = {
    maxAttempts: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes in milliseconds
};

/**
 * Check if an IP has exceeded rate limit
 * @param {string} ip - IP address to check
 * @param {object} config - Configuration object {maxAttempts, windowMs}
 * @returns {boolean} - True if rate limited, false otherwise
 */
function isRateLimited(ip, config = {}) {
    const finalConfig = { ...DEFAULT_CONFIG, ...config };
    const record = attemptStore.get(ip);

    if (!record) {
        return false;
    }

    const now = Date.now();
    const isExpired = now - record.firstAttemptTime > finalConfig.windowMs;

    if (isExpired) {
        // Window expired, clean up
        attemptStore.delete(ip);
        return false;
    }

    return record.attempts >= finalConfig.maxAttempts;
}

/**
 * Record a failed login attempt for an IP
 * @param {string} ip - IP address
 * @param {object} config - Configuration object {maxAttempts, windowMs}
 * @returns {object} - {attempts: number, remainingTime: number}
 */
function recordAttempt(ip, config = {}) {
    const finalConfig = { ...DEFAULT_CONFIG, ...config };
    const now = Date.now();
    const record = attemptStore.get(ip);

    if (!record) {
        attemptStore.set(ip, {
            attempts: 1,
            firstAttemptTime: now,
            timeout: setTimeout(() => {
                attemptStore.delete(ip);
            }, finalConfig.windowMs),
        });

        return {
            attempts: 1,
            remainingTime: finalConfig.windowMs,
        };
    }

    // Check if window has expired
    if (now - record.firstAttemptTime > finalConfig.windowMs) {
        // Reset the window
        clearTimeout(record.timeout);
        attemptStore.set(ip, {
            attempts: 1,
            firstAttemptTime: now,
            timeout: setTimeout(() => {
                attemptStore.delete(ip);
            }, finalConfig.windowMs),
        });

        return {
            attempts: 1,
            remainingTime: finalConfig.windowMs,
        };
    }

    // Increment attempts within current window
    record.attempts += 1;
    const remainingTime = finalConfig.windowMs - (now - record.firstAttemptTime);

    return {
        attempts: record.attempts,
        remainingTime: Math.ceil(remainingTime / 1000), // Return in seconds
    };
}

/**
 * Reset rate limit for an IP (e.g., on successful login)
 * @param {string} ip - IP address
 */
function resetAttempts(ip) {
    const record = attemptStore.get(ip);
    if (record) {
        clearTimeout(record.timeout);
        attemptStore.delete(ip);
    }
}

module.exports = {
    isRateLimited,
    recordAttempt,
    resetAttempts,
};
