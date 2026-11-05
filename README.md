# Storage App Backend

An Express API for a cloud file-storage service. It supports user and Google sign-in, email OTP verification, directory and file management, S3-backed uploads, and Razorpay storage subscriptions.

## Requirements

- Node.js 24.6 or later
- MongoDB replica set (transactions are used during account creation)
- Redis Stack (sessions use RedisJSON and RediSearch)
- AWS S3 bucket

Resend, Google OAuth, and Razorpay credentials are needed for their respective features.

## Setup

1. Install dependencies:

   ```sh
   npm install
   ```

2. Create a `.env` file in the project root and set the variables below.
3. Start the API:

   ```sh
   npm run dev
   ```

The server listens on port `3000` by default. Set `PORT` to change it. `npm start` starts the server without watch mode. To apply the MongoDB collection validators, run `npm run setup` after configuring the database.

## Environment variables

| Variable                  | Purpose                                     |
| ------------------------- | ------------------------------------------- |
| `DB_URL`                  | MongoDB connection string                   |
| `REDIS_URL`               | Redis Stack connection URL                  |
| `SESSION_SECRET`          | Secret used to sign session cookies         |
| `CLIENT_URL`              | Allowed client origin for credentialed CORS |
| `AWS_S3_BUCKET`           | S3 bucket for file objects                  |
| `AWS_ACCESS_KEY`          | AWS access key                              |
| `AWS_SECRET_KEY`          | AWS secret key                              |
| `RESEND_API_KEY`          | Sending email OTPs                          |
| `GOOGLE_CLIENT_ID`        | Verifying Google sign-in tokens             |
| `RAZORPAY_KEY_ID`         | Razorpay API key ID                         |
| `RAZORPAY_KEY_SECRET`     | Razorpay API key secret                     |
| `RAZORPAY_WEBHOOK_SECRET` | Verifying Razorpay webhooks                 |
| `PORT`                    | Server port (optional; defaults to `3000`)  |

## API overview

Most user, directory, file, and subscription routes require an authenticated session cookie.

| Route                                                      | Purpose                                           |
| ---------------------------------------------------------- | ------------------------------------------------- |
| `POST /user/register`, `POST /user/login`                  | Register or log in                                |
| `GET /user`, `POST /user/logout`, `POST /user/logout-all`  | View account or end sessions                      |
| `POST /auth/send-otp`, `POST /auth/verify-otp`             | Email OTP verification                            |
| `POST /auth/google`                                        | Google sign-in                                    |
| `GET /directory[/:id]`                                     | List the root or a directory's contents           |
| `POST /directory[/:parentDirId]`                           | Create a directory                                |
| `PATCH/DELETE /directory/:id`                              | Rename or delete a directory                      |
| `POST /file/upload/initiate`, `POST /file/upload/complete` | Start and confirm an S3 upload                    |
| `GET /file/:id`                                            | Get a file; add `?action=download` to download it |
| `PATCH/DELETE /file/:id`                                   | Rename or delete a file                           |
| `GET/POST /subscriptions`                                  | View or create a subscription                     |
| `POST /webhooks/razorpay`                                  | Process Razorpay subscription events              |

`GET /` returns a simple API status message. File upload and download use short-lived signed S3 URLs.
