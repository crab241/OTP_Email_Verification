const express = require('express');
const cors = require('cors');
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
  otp: null,
  expiresAt: null,
  attempts: 0, // Track failed OTP attempts
};

// Endpoint to send OTP
app.post('/send-otp', async (req, res) => {
  const { email } = req.body;

  // Generate a random 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000);

  // Set OTP expiration time (60 seconds from now)
  const expiresAt = Date.now() + 60000; // 60 seconds

  // Update OTP data
  otpData = {
    otp,
    expiresAt,
    attempts: 0, // Reset attempts when a new OTP is sent
  };

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
      res.status(200).json({ message: 'OTP sent successfully!' });
    } else {
      // If Mailgun API returns an error, log it and return an error message
      const errorData = await response.json();
      console.error('Mailgun API Error:', errorData);
      res.status(500).json({ message: 'Failed to send OTP.' });
    }
  } catch (error) {
    // If there's a server error, log it and return an error message
    console.error('Server Error:', error);
    res.status(500).json({ message: 'An error occurred.' });
  }
});

// Endpoint to verify OTP
app.post('/verify-otp', (req, res) => {
  const { otp } = req.body;

  // Check if OTP exists and is not expired
  if (!otpData.otp || Date.now() > otpData.expiresAt) {
    return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });
  }

  // Check if the user has exceeded the attempt limit
  if (otpData.attempts >= 4) {
    return res.status(400).json({ message: 'Too many failed attempts. Please request a new OTP.' });
  }

  // Verify the OTP
  if (otp == otpData.otp) {
    // Reset OTP data after successful verification
    otpData = {
      otp: null,
      expiresAt: null,
      attempts: 0,
    };
    return res.status(200).json({ message: 'OTP verified successfully!' });
  } else {
    // Increment failed attempts
    otpData.attempts += 1;
    return res.status(400).json({ message: `Invalid OTP. ${4 - otpData.attempts} attempts remaining.` });
  }
});

// Start the server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});