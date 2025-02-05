const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const fetch = require('node-fetch');
const FormData = require('form-data');
const winston = require('winston');
const redis = require('redis');
require('dotenv').config();

// Configure Winston logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(), // Use default ISO 8601 format
    winston.format.json()
  ),
  transports: [
    // Log to the console
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message }) => {
          const localTime = new Date(timestamp).toLocaleString(); // Convert to local time
          return `[UTC: ${timestamp}] [Local: ${localTime}] [${level}]: ${message}`;
        })
      ),
    }),
    // Log to a file
    new winston.transports.File({
      filename: 'logs/app.log',
      format: winston.format.combine(
        winston.format.printf(({ timestamp, level, message }) => {
          const localTime = new Date(timestamp).toLocaleString(); // Convert to local time
          return `[UTC: ${timestamp}] [Local: ${localTime}] [${level}]: ${message}`;
        })
      ),
    }),
  ],
});

// Create Redis client
const redisClient = redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379', // Use environment variable for Redis URL
});

// Handle Redis connection errors
redisClient.on('error', (err) => {
  logger.error(`Redis error: ${err.message}`);
});

// Connect to Redis
redisClient.connect().then(() => {
  logger.info('Connected to Redis');
}).catch((err) => {
  logger.error(`Failed to connect to Redis: ${err.message}`);
});

const app = express();
app.use(cors());
app.use(express.json());

// Access environment variables
const MAILGUN_API_KEY = process.env.MAILGUN_API_KEY;
const MAILGUN_DOMAIN = process.env.MAILGUN_DOMAIN;

// Rate limiting configuration
const RATE_LIMIT = {
  MAX_REQUESTS: 5, // Max 5 OTP requests
  TIME_WINDOW: 10 * 60 * 1000, // 10 minutes in milliseconds
};

// Function to generate a secure 6-digit OTP
function generateOtp() {
  return crypto.randomInt(100000, 999999);
}

// Function to hash the OTP
function hashOtp(otp) {
  return crypto.createHash('sha256').update(otp.toString()).digest('hex');
}

// Function to validate email format
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; // Basic email regex
  return emailRegex.test(email);
}
// Function to check rate limit for an email
async function checkRateLimit(email) {
  const now = Date.now();
  const key = `rate_limit:${email}`;

  // Get the current rate limit data from Redis
  const rateLimitData = await redisClient.get(key);
  if (!rateLimitData) {
    // If no data exists, initialize it
    await redisClient.set(key, JSON.stringify({ count: 1, lastRequestTime: now }));
    return true; // Allow the request
  }

  const { count, lastRequestTime } = JSON.parse(rateLimitData);

  // Check if the time window has passed
  if (now - lastRequestTime > RATE_LIMIT.TIME_WINDOW) {
    // Reset the count if the time window has passed
    await redisClient.set(key, JSON.stringify({ count: 1, lastRequestTime: now }));
    return true; // Allow the request
  }

  // Check if the request count exceeds the limit
  if (count >= RATE_LIMIT.MAX_REQUESTS) {
    return false; // Block the request
  }

  // Increment the request count
  await redisClient.set(key, JSON.stringify({ count: count + 1, lastRequestTime }));
  return true; // Allow the request
}

// Endpoint to send OTP
app.post('/send-otp', async (req, res) => {
  const { email } = req.body;

  if (!isValidEmail(email)) {
    logger.warn(`Invalid email format: ${email}`);
    return res.status(400).json({ message: 'Please enter a valid email address.' });
  }

  // Check rate limit for the email
  const isAllowed = await checkRateLimit(email);
  if (!isAllowed) {
    logger.warn(`Rate limit exceeded for email: ${email}`);
    return res.status(429).json({ message: 'Too many OTP requests. Please try again later.' });
  }

  const otp = generateOtp();
  const otpHash = hashOtp(otp);
  const expiresAt = Date.now() + 60000; // 60 seconds

  // Store OTP in Redis with a TTL (Time-to-Live)
  try {
    await redisClient.set(email, JSON.stringify({ otpHash, expiresAt, attempts: 0 }), {
      EX: 60, // Set TTL to 60 seconds
    });
    logger.info(`OTP generated for email: ${email}`);
  } catch (err) {
    logger.error(`Failed to store OTP in Redis: ${err.message}`);
    return res.status(500).json({ message: 'Failed to generate OTP.' });
  }

  const formData = new FormData();
  formData.append('from', `Group1_WebSecurity <mailgun@${MAILGUN_DOMAIN}>`);
  formData.append('to', email);
  formData.append('subject', 'Your OTP for Verification');
  formData.append('text', `Your OTP is: ${otp}`);

  try {
    const response = await fetch(`https://api.mailgun.net/v3/${MAILGUN_DOMAIN}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`api:${MAILGUN_API_KEY}`).toString('base64')}`,
      },
      body: formData,
    });

    if (response.ok) {
      logger.info(`OTP sent successfully to email: ${email}`);
      res.status(200).json({ message: 'OTP sent successfully!' });
    } else {
      const errorData = await response.json();
      logger.error(`Failed to send OTP to email: ${email}. Error: ${JSON.stringify(errorData)}`);
      res.status(500).json({ message: 'Failed to send OTP.' });
    }
  } catch (error) {
    logger.error(`Server error while sending OTP to email: ${email}. Error: ${error.message}`);
    res.status(500).json({ message: 'An error occurred.' });
  }
});

// Endpoint to verify OTP
app.post('/verify-otp', async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ message: 'Email and OTP are required.' });
  }

  try {
    // Retrieve OTP data from Redis
    const otpData = await redisClient.get(email);
    if (!otpData) {
      logger.warn(`OTP verification failed: No OTP found for email: ${email}`);
      return res.status(400).json({ message: 'OTP expired or not found. Please request a new one.' });
    }

    const { otpHash, expiresAt, attempts } = JSON.parse(otpData);

    if (Date.now() > expiresAt) {
      logger.warn(`OTP verification failed: OTP expired for email: ${email}`);
      return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });
    }

    if (attempts >= 5) {
      logger.warn(`OTP verification failed: Too many attempts for email: ${email}`);
      return res.status(400).json({ message: 'Too many failed attempts. Please request a new OTP.' });
    }

    const userOtpHash = hashOtp(otp);
    if (userOtpHash === otpHash) {
      // Delete the OTP from Redis after successful verification
      await redisClient.del(email);
      logger.info(`OTP verified successfully for email: ${email}`);
      return res.status(200).json({ message: 'OTP verified successfully!' });
    } else {
      // Increment failed attempts
      await redisClient.set(email, JSON.stringify({ otpHash, expiresAt, attempts: attempts + 1 }), {
        EX: 60, // Reset TTL
      });
      logger.warn(`OTP verification failed: Invalid OTP for email: ${email}. Attempts remaining: ${4 - attempts}`);
      return res.status(400).json({ message: `Invalid OTP. ${4 - attempts} attempts remaining.` });
    }
  } catch (err) {
    logger.error(`Error verifying OTP for email: ${email}. Error: ${err.message}`);
    return res.status(500).json({ message: 'An error occurred.' });
  }
});

// Start the server
const PORT = 3000;
app.listen(PORT, () => {
  logger.info(`Server is running on http://localhost:${PORT}`);
});