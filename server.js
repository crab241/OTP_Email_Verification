const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch'); // Import node-fetch
const FormData = require('form-data');

const app = express();
app.use(cors());
app.use(express.json());

// Replace with your Mailgun API key and domain
const MAILGUN_API_KEY = '';
const MAILGUN_DOMAIN = ''; 
app.post('/send-otp', async (req, res) => {
  const { email } = req.body;

  // Generate a random 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000);

  // Prepare form data for Mailgun API
  const formData = new FormData();
  formData.append('from', `OTP Verification <mailgun@${MAILGUN_DOMAIN}>`);
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
      res.status(200).json({ message: 'OTP sent successfully!', otp });
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

// Start the server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});