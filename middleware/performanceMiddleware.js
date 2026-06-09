/**
 * Performance Monitoring Middleware
 * Measures and logs endpoint response times, tracking latency metrics in-memory.
 */

// In-memory metrics storage
const metrics = {
  totalRequests: 0,
  totalDuration: 0,
  averageDuration: 0,
  statusCodes: {},
  slowEndpoints: [] // Array of { method, route, duration, status, timestamp }
};

const SLOW_THRESHOLD_MS = 200; // Log queries exceeding 200ms
const MAX_SLOW_LOGS = 50;

/**
 * Express middleware to track response times
 */
const performanceLogger = (req, res, next) => {
  const start = process.hrtime();
  
  // Hook into finish event
  res.on('finish', () => {
    const diff = process.hrtime(start);
    const durationMs = Math.round((diff[0] * 1e3 + diff[1] * 1e-6) * 10) / 10; // Precision 1 decimal
    const route = req.route ? req.route.path : req.path;
    const method = req.method;
    const status = res.statusCode;

    // Exclude health checks from bloating metrics
    if (route === '/health') return;

    // Update global metrics
    metrics.totalRequests++;
    metrics.totalDuration += durationMs;
    metrics.averageDuration = Math.round((metrics.totalDuration / metrics.totalRequests) * 10) / 10;

    // Update status code counters
    metrics.statusCodes[status] = (metrics.statusCodes[status] || 0) + 1;

    // Track slow endpoints
    if (durationMs > SLOW_THRESHOLD_MS) {
      console.warn(`[SLOW API] ${method} ${route} took ${durationMs}ms with status ${status}`);
      
      metrics.slowEndpoints.push({
        method,
        route,
        duration: durationMs,
        status,
        timestamp: new Date()
      });

      // Keep logs size bounded
      metrics.slowEndpoints.sort((a, b) => b.duration - a.duration);
      if (metrics.slowEndpoints.length > MAX_SLOW_LOGS) {
        metrics.slowEndpoints.pop();
      }
    }
  });

  next();
};

/**
 * Retrieve current metrics telemetry
 */
const getMetrics = () => {
  return {
    totalRequests: metrics.totalRequests,
    averageDuration: metrics.averageDuration,
    statusCodes: metrics.statusCodes,
    slowEndpoints: metrics.slowEndpoints
  };
};

module.exports = {
  performanceLogger,
  getMetrics
};
