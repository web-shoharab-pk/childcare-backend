# Childcare Backend API

A robust Express.js API built with TypeScript for managing childcare activities and attendance tracking, featuring secure authentication, data validation, and comprehensive logging.

## Features

- TypeScript for enhanced type safety and developer experience
- Express.js web framework with RESTful API endpoints
- Clerk authentication for secure user management
- MongoDB with Mongoose for data persistence
- Activity management (create, read, update, delete)
- Attendance tracking for activities
- Activity reporting and analytics
- Request validation middleware
- Error handling middleware
- Detailed application logging
- Environment-based configuration

## Prerequisites

- Node.js (version must be greater than 16 and less than 21)
- MongoDB installed and running locally
- Clerk account with API keys

## Getting Started

1. Clone the repository:

   ```bash
   git clone https://github.com/web-shoharab-pk/childcare-backend.git
   ```

2. Install dependencies:

   ```bash
   cd childcare-backend
   npm install
   ```

3. Configure environment variables:
   Create a `.env` file in the root directory with the following:

   ```
   PORT=
   NODE_ENV= # development, production
   MONGO_URI=
   JWT_SECRET=

   CLERK_SECRET_KEY=

   # Cookie settings
   COOKIE_MAX_AGE=
   COOKIE_HTTP_ONLY=
   COOKIE_SECURE=
   COOKIE_NAME=

   SERVER_URL=
   FRONTEND_URL=
   # Stripe
   STRIPE_SECRET_KEY=
   STRIPE_WEBHOOK_SECRET=

   # Email Config
   SMPT_MAIL=
   SMPT_SERVICE=
   SMPT_PASSWORD=
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

The API will be available at `http://localhost:5000`

## API Endpoints

### Health Check

- `GET /health`: Check API health status
  ```json
  {
    "status": "healthy",
    "timestamp": "2024-01-01T00:00:00.000Z",
    "environment": "development",
    "version": "1.0.0",
    "uptime": 1234.56,
    "memory": {
      "heapTotal": 123456789,
      "heapUsed": 987654321,
      "external": 12345,
      "arrayBuffers": 67890
    },
    "cpu": {
      "user": 123456,
      "system": 78901
    },
    "pid": 1234,
    "platform": "darwin",
    "nodeVersion": "v16.x.x"
  }
  ```

## API Documentation

For detailed API documentation, please visit:
[Postman Documentation](https://documenter.getpostman.com/view/16481716/2sAY4vh2sG)

<!-- When you hit the deployed application because it's deployed for free hosting, that's why when user is inactive for a long time, the application is going to sleep and when someone hits the application, it takes time to wake up -->

## Application URL

- The deployed application can be accessed at:
  ```
  https://childcare-backend-uyed.onrender.com
  ```
- When you hit the deployed application because it's deployed for free hosting, that's why when user is inactive for a long time, the application is going to sleep and when someone hits the application, it takes time to wake up

<!-- When you send requests to the deployed application, the requests are automatically forwarded to the load balancer -->

## Load Balancer

- Although the application is currently running as a monolithic server, you can still reference the load balancer for future scalability:
  ```
  LOAD_BALANCER_URL=http://localhost:5000
  ```
