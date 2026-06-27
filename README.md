# Hostinflu - Backend API

Hostinflu is a powerful Node.js/Express.js backend platform designed to seamlessly connect hosts, influencers, and users. It handles property listings, real-time messaging, collaborations, and secure payments using Stripe.

## 🚀 Features

- **Authentication & Authorization**: Secure login and registration using JWT and bcrypt.
- **Real-time Communication**: Instant messaging and live notifications powered by Socket.IO.
- **Listing Management**: Hosts can create property listings, with an admin verification workflow.
- **Collaborations & Deals**: Manage influencer-host collaborations and bookings.
- **Secure Payments (Stripe)**: End-to-end payment flow using Stripe Connect. Includes fund holding (manual capture) and automatic platform fee splits.
- **File Uploads**: Image and file handling via Multer.
- **Email Notifications**: Automated email updates using Nodemailer.

## 🛠️ Technology Stack

- **Core**: Node.js, Express.js
- **Database**: MongoDB (Mongoose)
- **Real-time**: Socket.IO
- **Payments**: Stripe API
- **Auth**: JWT, bcrypt
- **File Storage**: Multer
- **Emails**: Nodemailer

## 📦 Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone <repo-url>
   cd Hostinflu
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Environment Variables:**
   Create a `.env` file in the root directory based on `.env.example` and fill in the required values:
   ```env
   PORT=5000
   MONGODB_URI=your_mongo_db_uri
   JWT_SECRET=your_jwt_secret
   STRIPE_SECRET_KEY=your_stripe_secret
   # Add other required variables...
   ```

4. **Run the server:**
   - **Development mode:**
     ```bash
     npm run dev
     ```
   - **Production mode:**
     ```bash
     npm start
     ```

## 📂 Project Structure

- `src/index.js` - Application entry point & server setup
- `src/api/` - API route definitions and router configuration
- `src/.../` (e.g., `auth`, `payment`, `listing`) - Contains routes, controllers, and models for each feature
- `src/socket/` - Real-time Socket.IO event handlers
- `uploads/` - Locally stored user uploads

## 💳 Payment Flow

Hostinflu uses Stripe Connect for handling collaborations:
1. **Onboarding**: Influencers connect their Stripe accounts.
2. **Hold Funds**: Hosts initiate a checkout, holding the payment.
3. **Capture**: Once the job is done, the payment is captured, the platform takes a 10% commission, and the rest is transferred to the influencer.

## 📄 License

This project is licensed under the ISC License.