# OTP Email Verification

A simple web application that sends an OTP (One-Time Password) to a user's email for verification. Built with **Node.js** for the backend and **HTML/CSS/JavaScript** for the frontend. Uses **Mailgun** for sending emails.

---

## Features

- **Email Input**: Users can enter their email address to receive an OTP.
- **OTP Verification**: Users can enter the OTP received in their email to verify it.
- **Modern UI**: Clean and responsive design with a centered layout.
- **Backend API**: Built with Node.js and Express to handle OTP generation and email sending.

---

## Technologies Used

- **Frontend**: HTML, CSS, JavaScript
- **Backend**: Node.js, Express
- **Email Service**: Mailgun
- **Dependencies**:
  - `express`: For creating the backend server.
  - `cors`: To handle Cross-Origin Resource Sharing (CORS).
  - `node-fetch`: For making HTTP requests to the Mailgun API.
  - `form-data`: For creating form data to send to Mailgun.

---

## Prerequisites

Before running the project, ensure you have the following installed:

- [Node.js](https://nodejs.org/) (v14 or higher)
- [npm](https://www.npmjs.com/) (comes with Node.js)
- A Mailgun account (for sending emails)

---

## Setup Instructions

### 1. Clone the Repository

git clone https://github.com/crab241/OTP_Email_Verification.git
cd OTP_Email_Verification

### 2. Install Dependencies

npm install

### 3. Set Up Mailgun

- Sign up for a Mailgun account.
- Verify your domain or use the sandbox domain provided by Mailgun.
- Get your API Key and Domain from the Mailgun dashboard.

### 4. Configure Environment Variables

Create a `.env` file in the root of your project and add your Mailgun credentials:

MAILGUN_API_KEY=your_mailgun_api_key
MAILGUN_DOMAIN=your_mailgun_domain


### 5. Run the Backend Server

node server.js

The server will start on [http://localhost:3000](http://localhost:3000).

### 6. Open the Frontend

Open the `index.html` file in your browser or use a local server (e.g., VS Code Live Server).

---

## How It Works

1. **Enter Email**: The user enters their email address and clicks **Send OTP**.
2. **Send OTP**: The backend generates a 6-digit OTP and sends it to the user's email via Mailgun.
3. **Verify OTP**: The user enters the OTP received in their email and clicks **Verify OTP**.
4. **Success/Failure**: The app displays a success or error message based on the OTP verification.

---

## Acknowledgments

- **Mailgun**: For providing the email-sending service.
- **Node.js**: For making backend development easy and efficient.
- **Express**: For simplifying API creation.

---

## Contact

If you have any questions, feel free to reach out:

- Email: vubach24102004@gmail.com
- GitHub : [https://github.com/crab241/OTP_Email_Verification]
