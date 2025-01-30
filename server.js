const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const FormData = require('form-data');

const app = express();
app.use(cors());
app.use(express.json());

const MAILGUN_API_KEY = ''; // The API key for my Mailgun account, the most important thing
const MAILGUN_DOMAIN = ''; 

// Endpoint to send OTP
app.post('/send-otp', async (req, res) => {
  const { email } = req.body;

  const formData = new FormData();
  formData.append('from', `OTP Verification <mailgun@${MAILGUN_DOMAIN}>`);
  formData.append('to', email);
  formData.append('subject', 'Your OTP for Verification');
  formData.append('text', `Your OTP is: ${Math.floor(100000 + Math.random() * 900000)}`);

  try {
    const response = await fetch(`https://api.mailgun.net/v3/${MAILGUN_DOMAIN}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`api:${MAILGUN_API_KEY}`).toString('base64')}`,
      },
      body: formData,
    });

    if (response.ok) {
      res.status(200).json({ message: 'OTP sent successfully!' });
    } else {
      res.status(500).json({ message: 'Failed to send OTP.' });
    }
  } catch (error) {
    res.status(500).json({ message: 'An error occurred.' });
  }
});

// Start the server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});