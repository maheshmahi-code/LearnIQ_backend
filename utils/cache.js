/**
 * Hybrid Caching Utility
 * Connects to Redis if REDIS_URL is configured, otherwise falls back
 * to a lightweight, TTL-based in-memory cache.
 */

const redis = require('redis');
const { REDIS_URL } = require('../config/environment');

let redisClient = null;
let isRedisConnected = false;

// Initialize Redis client if configured
if (REDIS_URL) {
  redisClient = redis.createClient({
    url: REDIS_URL,
    socket: {
      connectTimeoutMS: 5000,
      reconnectStrategy: (retries) => {
        if (retries > 3) {
          console.warn('Redis reconnection failed. Falling back to in-memory cache.');
          isRedisConnected = false;
          return new Error('Max retries reached');
        }
        return 1000;
      }
    }
  });

  redisClient.on('error', (err) => {
    console.warn('Redis client error:', err.message);
    isRedisConnected = false;
  });

  redisClient.on('connect', () => {
    console.log('Redis Cache: Connected successfully');
    isRedisConnected = true;
  });

  redisClient.connect().catch((err) => {
    console.warn('Failed to establish initial Redis connection:', err.message);
    isRedisConnected = false;
  });
}

// In-Memory cache fallback structure
const memoryCache = new Map();

/**
 * Retrieve a value from the cache
 */
const get = async (key) => {
  if (isRedisConnected && redisClient) {
    try {
      const value = await redisClient.get(key);
      return value ? JSON.parse(value) : null;
    } catch (err) {
      console.error('Redis GET error:', err);
    }
  }

  // Memory fallback
  const cached = memoryCache.get(key);
  if (cached) {
    if (cached.expiry > Date.now()) {
      return cached.value;
    }
    memoryCache.delete(key); // Evict expired key
  }
  return null;
};

/**
 * Write a value to the cache with a TTL (Time-To-Live)
 */
const set = async (key, value, ttlSeconds = 300) => {
  if (isRedisConnected && redisClient) {
    try {
      await redisClient.set(key, JSON.stringify(value), { EX: ttlSeconds });
      return;
    } catch (err) {
      console.error('Redis SET error:', err);
    }
  }

  // Memory fallback
  memoryCache.set(key, {
    value,
    expiry: Date.now() + ttlSeconds * 1000
  });
};

/**
 * Delete a specific key from the cache
 */
const del = async (key) => {
  if (isRedisConnected && redisClient) {
    try {
      await redisClient.del(key);
      return;
    } catch (err) {
      console.error('Redis DEL error:', err);
    }
  }

  memoryCache.delete(key);
};

/**
 * Clear all cache keys that match a specific prefix pattern
 */
const clearPattern = async (pattern) => {
  if (isRedisConnected && redisClient) {
    try {
      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) {
        await redisClient.del(keys);
      }
      return;
    } catch (err) {
      console.error('Redis keys clearance error:', err);
    }
  }

  // Memory fallback prefix matching
  const regexPattern = new RegExp('^' + pattern.replace('*', '.*'));
  for (const key of memoryCache.keys()) {
    if (regexPattern.test(key)) {
      memoryCache.delete(key);
    }
  }
};

module.exports = {
  get,
  set,
  del,
  clearPattern,
  isRedisActive: () => isRedisConnected
};
