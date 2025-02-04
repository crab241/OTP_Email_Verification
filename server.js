const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const fetch = require('node-fetch');
const FormData = require('form-data');
const winston = require('winston');
require('dotenv').config();

// Configure Winston logger
const logger = winston.createLogger({
  level: 'info', // Log level (e.g., 'info', 'warn', 'error')
  format: winston.format.combine(
    winston.format.timestamp(), // Add timestamp to logs
    winston.format.json() // Log in JSON format
  ),
  transports: [
    // Log to the console
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(), // Add colors to console logs
        winston.format.simple() // Simple format for console
      ),
    }),
    // Log to a file
    new winston.transports.File({
      filename: 'logs/app.log', // Log file path
      level: 'info', // Log level for the file
    }),
  ],
});

const app = express();
app.use(cors());
app.use(express.json());

// Access environment variables
const MAILGUN_API_KEY = process.env.MAILGUN_API_KEY;
const MAILGUN_DOMAIN = process.env.MAILGUN_DOMAIN;

// Store OTP and its expiration time
let otpData = {
  otpHash: null,
  expiresAt: null,
  attempts: 0,
};

// Function to validate email format
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; // Basic email regex
  return emailRegex.test(email);
}

// Function to generate a secure 6-digit OTP
function generateOtp() {
  return crypto.randomInt(100000, 999999);
}

// Function to hash the OTP
function hashOtp(otp) {
  return crypto.createHash('sha256').update(otp.toString()).digest('hex');
}

// Endpoint to send OTP
app.post('/send-otp', async (req, res) => {
  const { email } = req.body;

  if (!isValidEmail(email)) {
    logger.warn(`Invalid email format: ${email}`);
    return res.status(400).json({ message: 'Please enter a valid email address.' });
  }

  const otp = generateOtp();
  const expiresAt = Date.now() + 60000; // 60 seconds
  const otpHash = hashOtp(otp);

  otpData = {
    otpHash,
    expiresAt,
    attempts: 0,
  };

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
app.post('/verify-otp', (req, res) => {
  const { otp } = req.body;

  if (!otpData.otpHash || Date.now() > otpData.expiresAt) {
    logger.warn('OTP verification failed: OTP expired');
    return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });
  }

  if (otpData.attempts >= 4) {
    logger.warn('OTP verification failed: Too many attempts');
    return res.status(400).json({ message: 'Too many failed attempts. Please request a new OTP.' });
  }

  const userOtpHash = hashOtp(otp);
  if (userOtpHash === otpData.otpHash) {
    otpData = {
      otpHash: null,
      expiresAt: null,
      attempts: 0,
    };
    logger.info('OTP verified successfully');
    return res.status(200).json({ message: 'OTP verified successfully!' });
  } else {
    otpData.attempts += 1;
    logger.warn(`OTP verification failed: Invalid OTP. Attempts remaining: ${5 - otpData.attempts}`);
    return res.status(400).json({ message: `Invalid OTP. ${5 - otpData.attempts} attempts remaining.` });
  }
});

// Start the server
const PORT = 3000;
app.listen(PORT, () => {
  logger.info(`Server is running on http://localhost:${PORT}`);
});