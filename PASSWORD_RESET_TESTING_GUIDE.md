# Password Reset Feature - Testing Guide

## Prerequisites

⚠️ **IMPORTANT**: You need to run the database migration first before testing!

### Step 1: Run Migration

Due to Node.js version compatibility, you may need to run the migration manually. Try one of these methods:

**Method 1** (Recommended if you have Node.js 20+):
```bash
npm run migration:dev
```
When prompted, enter: `add_password_reset_table`

**Method 2** (If Method 1 fails):
1. Open your `.env.development` file
2. Copy the `DATABASE_URL` value
3. Run:
```bash
$env:DATABASE_URL="your-database-url-here"; npx prisma migrate dev --name add_password_reset_table
```

**Method 3** (Direct Prisma):
```bash
npx prisma migrate dev --name add_password_reset_table
```
(Make sure your `.env.development` file is in the project root)

### Step 2: Start the Server

```bash
npm start
```

The server should start on `http://localhost:3000` (or your configured PORT).

---

## Testing Checklist

### ✅ Frontend Pages

1. **Forgot Password Page**
   - Navigate to: `http://localhost:3000/forgot-password.html`
   - ✅ Page loads without errors
   - ✅ Floating icons are visible and animated
   - ✅ Form has email input field
   - ✅ "Send Reset Link" button is present
   - ✅ Links to login and register pages work

2. **Reset Password Page**
   - Navigate to: `http://localhost:3000/reset-password.html?token=test123`
   - ✅ Page loads (will show error for invalid token, which is expected)
   - ✅ Form has "New Password" and "Confirm Password" fields
   - ✅ "Reset Password" button is present
   - ✅ Link to login page works

3. **Login Page**
   - Navigate to: `http://localhost:3000/login.html`
   - ✅ "Forgot Password?" link appears above the submit button
   - ✅ Link navigates to forgot-password.html

4. **Register Page**
   - Navigate to: `http://localhost:3000/register.html`
   - ✅ "Forgot Password?" link appears in footer
   - ✅ Link navigates to forgot-password.html

---

### ✅ API Endpoints (Using Browser Console or Postman)

#### 1. Request Password Reset

**Endpoint**: `POST /api/password-reset/request`

**Request Body**:
```json
{
  "email": "alice@example.com"
}
```

**Expected Response** (Development):
```json
{
  "message": "Password reset link generated (check console for development)",
  "resetUrl": "http://localhost:3000/reset-password.html?token=...",
  "token": "long-hex-token-here"
}
```

**Test Cases**:
- ✅ Valid email (existing user) → Returns reset URL and token
- ✅ Invalid email (non-existent) → Returns success message (doesn't reveal if email exists)
- ✅ Missing email → Returns 400 error
- ✅ Check server console for logged reset URL

#### 2. Verify Reset Token

**Endpoint**: `GET /api/password-reset/verify?token=YOUR_TOKEN_HERE`

**Expected Response** (Valid token):
```json
{
  "message": "Token is valid"
}
```

**Expected Response** (Invalid/expired token):
```json
{
  "error": "Invalid or expired reset token"
}
```

**Test Cases**:
- ✅ Valid token → Returns success
- ✅ Invalid token → Returns error
- ✅ Expired token (wait 1+ hour) → Returns error
- ✅ Missing token → Returns 400 error

#### 3. Reset Password

**Endpoint**: `POST /api/password-reset/reset`

**Request Body**:
```json
{
  "token": "your-token-from-step-1",
  "newPassword": "newpassword123"
}
```

**Expected Response**:
```json
{
  "message": "Password reset successfully. You can now login with your new password."
}
```

**Test Cases**:
- ✅ Valid token + password → Success, password updated
- ✅ Invalid token → Returns error
- ✅ Expired token → Returns error
- ✅ Password < 6 characters → Returns 400 error
- ✅ Missing token or password → Returns 400 error
- ✅ After successful reset, token cannot be reused → Returns error on second attempt

---

### ✅ Full User Flow Test

1. **Request Reset**
   - Go to `http://localhost:3000/forgot-password.html`
   - Enter an email (e.g., `alice@example.com` from seed data)
   - Click "Send Reset Link"
   - ✅ Success message appears
   - ✅ Copy the reset URL from console or response

2. **Reset Password**
   - Open the reset URL (or navigate to `reset-password.html?token=YOUR_TOKEN`)
   - ✅ Page loads with password form
   - Enter new password (min 6 characters)
   - Enter confirm password (must match)
   - Click "Reset Password"
   - ✅ Success message appears
   - ✅ Redirects to login page after 2 seconds

3. **Login with New Password**
   - Go to login page
   - Enter email and NEW password
   - ✅ Login successful with new password
   - ✅ Old password should NOT work

4. **Token Reuse Prevention**
   - Try to use the same reset token again
   - ✅ Should fail with "Invalid or expired reset token"

---

### ✅ Edge Cases

- ✅ Token expires after 1 hour
- ✅ Multiple reset requests create new tokens (old ones still work until expired)
- ✅ Password validation (minimum 6 characters)
- ✅ Password confirmation must match
- ✅ Non-existent email doesn't reveal user existence
- ✅ Used tokens cannot be reused

---

## Troubleshooting

### Migration Issues

If migration fails:
1. Check your Node.js version: `node --version` (should be 14+)
2. Check `.env.development` file exists and has `DATABASE_URL`
3. Try running: `npx prisma generate` first
4. Then try migration again

### Server Errors

If you see database errors:
- ✅ Migration was run successfully
- ✅ Database connection is working
- ✅ Prisma client is generated (`npx prisma generate`)

### Frontend Errors

- ✅ Check browser console for JavaScript errors
- ✅ Verify all files are in correct locations:
  - `src/public/forgot-password.html`
  - `src/public/reset-password.html`
  - `src/public/forgot-password.js`
  - `src/public/reset-password.js`

---

## Notes

- In **development mode**, the reset URL is returned in the API response for easy testing
- In **production**, you would integrate an email service (e.g., SendGrid, Nodemailer) to send the reset link via email
- Tokens expire after **1 hour**
- Tokens are **one-time use** (marked as used after password reset)
