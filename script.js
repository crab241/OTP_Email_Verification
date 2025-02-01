let generatedOtp = null;

// Function to send OTP via backend server
async function sendOtp(email) {
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
    generatedOtp = data.otp; // Store the OTP for verification
  } else {
    document.getElementById('message').textContent = data.message || 'Failed to send OTP.';
  }
}

// Function to verify OTP
function verifyOtp(enteredOtp) {
  if (enteredOtp == generatedOtp) {
    document.getElementById('message').textContent = 'OTP verified successfully!';
  } else {
    document.getElementById('message').textContent = 'Invalid OTP. Please try again.';
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
