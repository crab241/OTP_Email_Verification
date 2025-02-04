// Function to validate email format
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; // Basic email regex
  return emailRegex.test(email);
}

// Function to send OTP via backend server
async function sendOtp(email) {
  if (!isValidEmail(email)) {
    document.getElementById('message').textContent = 'Please enter a valid email address.';
    return;
  }

  // Disable the button to prevent multiple requests
  const sendOtpButton = document.getElementById('sendOtpButton');
  sendOtpButton.disabled = true;
  sendOtpButton.textContent = 'Sending...';

  try {
    const response = await fetch('http://localhost:3000/send-otp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });

    const data = await response.json();
    if (response.ok) {
      //Display email when verifying OTP
      document.getElementById('emailDisplay').textContent = email;
      //Show sucess message and switch to OTP selection
      document.getElementById('message').textContent = data.message;
      document.getElementById('emailSection').style.display = 'none';
      document.getElementById('otpSection').style.display = 'block';
    } else {
      document.getElementById('message').textContent = data.message || 'Failed to send OTP.';
    }
  } catch (error) {
    document.getElementById('message').textContent = 'An error occurred. Please try again.';
    console.error('Error:', error);
  } finally {
    // Re-enable the button
    sendOtpButton.disabled = false;
    sendOtpButton.textContent = 'Send OTP';
  }
}

// Function to verify OTP
async function verifyOtp(email, enteredOtp) {
  const verifyOtpButton = document.getElementById('verifyOtpButton');
  verifyOtpButton.disabled = true;
  verifyOtpButton.textContent = 'Verifying...';

  try {
    const response = await fetch('http://localhost:3000/verify-otp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, otp: enteredOtp }), // Include email in the request
    });

    const data = await response.json();
    if (response.ok) {
      document.getElementById('message').textContent = data.message;
      document.getElementById('otpSection').style.display = 'none';
      document.getElementById('emailSection').style.display = 'block';
    } else {
      document.getElementById('message').textContent = data.message || 'Failed to verify OTP.';
    }
  } catch (error) {
    document.getElementById('message').textContent = 'An error occurred. Please try again.';
    console.error('Error:', error);
  } finally {
    verifyOtpButton.disabled = false;
    verifyOtpButton.textContent = 'Verify OTP';
  }
}

// Event listeners
document.getElementById('sendOtpButton').addEventListener('click', () => {
  const email = document.getElementById('email').value;
  if (email) {
    sendOtp(email);
  } else {
    document.getElementById('message').textContent = 'Please enter a valid email.';
  }
});

document.getElementById('verifyOtpButton').addEventListener('click', () => {
  const email = document.getElementById('email').value; // Get the email from the input
  const otp = document.getElementById('otp').value;
  if (email && otp) {
    verifyOtp(email, otp); // Pass both email and OTP to the verifyOtp function
  } else {
    document.getElementById('message').textContent = 'Please enter the email and OTP.';
  }
});