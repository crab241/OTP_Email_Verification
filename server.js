const express = require('express');
const cors = require('cors');
const crypto = require('crypto'); // For secure OTP generation
const fetch = require('node-fetch');
const FormData = require('form-data');
require('dotenv').config(); // Load environment variables from .env

const app = express();
app.use(cors());
app.use(express.json());

// Access environment variables
const MAILGUN_API_KEY = process.env.MAILGUN_API_KEY;
const MAILGUN_DOMAIN = process.env.MAILGUN_DOMAIN;

// Store OTP and its expiration time
let otpData = {
  otpHash: null, // Store hashed OTP instead of plain OTP
  expiresAt: null,
  attempts: 0, // Track failed OTP attempts
};

// Store rate limit data (email -> { count, lastRequestTime })
const rateLimitMap = new Map();

// Rate limit configuration
const RATE_LIMIT = {
  MAX_REQUESTS: 3, // Max 3 requests
  TIME_WINDOW: 10 * 60 * 1000, // 10 minutes in milliseconds
};

// Function to validate email format
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; // Basic email regex
  return emailRegex.test(email);
}

// Function to generate a secure 6-digit OTP
function generateOtp() {
  return crypto.randomInt(100000, 999999); // Cryptographically secure
}

// Function to hash the OTP
function hashOtp(otp) {
  return crypto.createHash('sha256').update(otp.toString()).digest('hex');
}

// Function to log messages
function log(message, level = 'info') {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}`);
}

// Endpoint to send OTP
app.post('/send-otp', async (req, res) => {
  const { email } = req.body;

  // Validate email format
  if (!isValidEmail(email)) {
    log(`Invalid email format: ${email}`, 'warn');
    return res.status(400).json({ message: 'Please enter a valid email address.' });
  }

  // Check rate limit for the email
  const now = Date.now();
  const rateLimit = rateLimitMap.get(email) || { count: 0, lastRequestTime: 0 };

  if (rateLimit.count >= RATE_LIMIT.MAX_REQUESTS && now - rateLimit.lastRequestTime < RATE_LIMIT.TIME_WINDOW) {
    log(`Rate limit exceeded for email: ${email}`, 'warn');
    return res.status(429).json({ message: 'Too many requests. Please try again later.' });
  }

  // Update rate limit data
  if (now - rateLimit.lastRequestTime > RATE_LIMIT.TIME_WINDOW) {
    rateLimit.count = 0; // Reset count if the time window has passed
  }
  rateLimit.count += 1;
  rateLimit.lastRequestTime = now;
  rateLimitMap.set(email, rateLimit);

  // Generate a secure 6-digit OTP
  const otp = generateOtp();

  // Set OTP expiration time (60 seconds from now)
  const expiresAt = Date.now() + 60000; // 60 seconds

  // Hash the OTP before storing it
  const otpHash = hashOtp(otp);

  // Update OTP data
  otpData = {
    otpHash,
    expiresAt,
    attempts: 0, // Reset attempts when a new OTP is sent
  };

  // Log OTP generation
  log(`OTP generated for email: ${email}`, 'info');

  // Prepare form data for Mailgun API
  const formData = new FormData();
  formData.append('from', `Group1_WebSecurity <mailgun@${MAILGUN_DOMAIN}>`);
  formData.append('to', email);
  formData.append('subject', 'Your OTP for Verification');
  formData.append('text', `Your OTP is: ${otp}`);

  try {
    // Send the email via Mailgun API
    const response = await fetch(`https://api.mailgun.net/v3/${MAILGUN_DOMAIN}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`api:${MAILGUN_API_KEY}`).toString('base64')}`,
      },
      body: formData,
    });

    if (response.ok) {
      // If the email is sent successfully, return a success message
      log(`OTP sent successfully to email: ${email}`, 'info');
      res.status(200).json({ message: 'OTP sent successfully!' });
    } else {
      // If Mailgun API returns an error, log it and return an error message
      const errorData = await response.json();
      log(`Failed to send OTP to email: ${email}. Error: ${JSON.stringify(errorData)}`, 'error');
      res.status(500).json({ message: 'Failed to send OTP.' });
    }
  } catch (error) {
    // If there's a server error, log it and return an error message
    log(`Server error while sending OTP to email: ${email}. Error: ${error.message}`, 'error');
    res.status(500).json({ message: 'An error occurred.' });
  }
});

// Endpoint to verify OTP
app.post('/verify-otp', (req, res) => {
  const { otp } = req.body;

  // Check if OTP exists and is not expired
  if (!otpData.otpHash || Date.now() > otpData.expiresAt) {
    log('OTP verification failed: OTP expired', 'warn');
    return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });
  }

  // Check if the user has exceeded the attempt limit
  if (otpData.attempts >= 4) {
    log('OTP verification failed: Too many attempts', 'warn');
    return res.status(400).json({ message: 'Too many failed attempts. Please request a new OTP.' });
  }

  // Hash the user-provided OTP and compare it to the stored hash
  const userOtpHash = hashOtp(otp);
  if (userOtpHash === otpData.otpHash) {
    // Reset OTP data after successful verification
    otpData = {
      otpHash: null,
      expiresAt: null,
      attempts: 0,
    };
    log('OTP verified successfully', 'info');
    return res.status(200).json({ message: 'OTP verified successfully!' });
  } else {
    // Increment failed attempts
    otpData.attempts += 1;
    log(`OTP verification failed: Invalid OTP. Attempts remaining: ${4 - otpData.attempts}`, 'warn');
    return res.status(400).json({ message: `Invalid OTP. ${4 - otpData.attempts} attempts remaining.` });
  }
});

// Start the server
const PORT = 3000;
app.listen(PORT, () => {
  log(`Server is running on http://localhost:${PORT}`, 'info');
});