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

  const response = await fetch('http://localhost:3000/send-otp', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email }),
  });

  const data = await response.json();
  if (response.ok) {
    document.getElementById('message').textContent = data.message;
    document.getElementById('emailSection').style.display = 'none';
    document.getElementById('otpSection').style.display = 'block';
  } else {
    document.getElementById('message').textContent = data.message || 'Failed to send OTP.';
  }
}

// Function to verify OTP
async function verifyOtp(enteredOtp) {
  const response = await fetch('http://localhost:3000/verify-otp', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ otp: enteredOtp }),
  });

  const data = await response.json();
  if (response.ok) {
    document.getElementById('message').textContent = data.message;
    document.getElementById('otpSection').style.display = 'none';
    document.getElementById('emailSection').style.display = 'block';
  } else {
    document.getElementById('message').textContent = data.message || 'Failed to verify OTP.';
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
  const otp = document.getElementById('otp').value;
  if (otp) {
    verifyOtp(otp);
  } else {
    document.getElementById('message').textContent = 'Please enter the OTP.';
  }
});