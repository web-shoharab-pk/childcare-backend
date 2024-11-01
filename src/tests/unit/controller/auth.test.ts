import bcrypt from "bcrypt";
import { Server } from "http";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import request from "supertest";
import server from "../../../app";
import clerkClient from "../../../config/clerk";
import { envConfig } from "../../../config/environment";
import { User } from "../../../models/User";
import { Role } from "../../../types/Role";

jest.mock("../../../config/clerk", () => ({
  users: {
    createUser: jest.fn().mockResolvedValue({ id: "clerk_123" }),
    deleteUser: jest.fn().mockResolvedValue({}),
    updateUser: jest.fn().mockResolvedValue({}),
  },
}));

jest.mock("../../../utils/logger", () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

describe("Auth Controller", () => {
  let mongoServer: MongoMemoryServer;
  let app: Server;

  beforeEach(async () => {
    app = server.listen(envConfig.PORT, () => {
      console.log(`Test server running on port ${envConfig.PORT}`);
    });
  });

  afterEach(async () => {
    await app.close(); // Ensure the server is closed after each test
  });

  beforeAll(async () => {
    // Use test environment MongoDB URI if provided, otherwise use in-memory server
    if (envConfig.MONGO_URI && process.env.NODE_ENV === "test") {
      await mongoose.connect(envConfig.MONGO_URI);
    } else {
      mongoServer = await MongoMemoryServer.create();
      await mongoose.connect(mongoServer.getUri());
    }
  });

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  // Update the beforeEach to properly reset mocks
  beforeEach(async () => {
    await User.deleteMany({});
    jest.clearAllMocks();
  });

  describe("POST /auth/register", () => {
    const registerEndpoint = "/api/v1/auth/register";
    const validUserData = {
      email: "test@example.com",
      password: "Password123!",
      role: Role.USER,
    };

    it("should create a new user successfully", async () => {
      const mockClerkUser = { id: "clerk_123" };
      (clerkClient.users.createUser as jest.Mock).mockResolvedValueOnce(
        mockClerkUser
      );

      const response = await request(app)
        .post(registerEndpoint)
        .send(validUserData);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty("success", true);
      expect(response.body.data).toHaveProperty("email", validUserData.email);
      expect(response.body.data).toHaveProperty("role", validUserData.role);
      expect(response.body.data).not.toHaveProperty("password");

      // Verify user was created in database
      const user = await User.findOne({ email: validUserData.email });
      expect(user).toBeTruthy();
      expect(user?.clerkId).toBe(mockClerkUser.id);
    });

    it("should return 400 for invalid email format", async () => {
      const response = await request(app)
        .post(registerEndpoint)
        .send({
          ...validUserData,
          email: "invalid-email",
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("success", false);
      expect(response.body).toHaveProperty("message");
      expect(response.body.errors).toContainEqual(
        expect.objectContaining({
          field: "email",
          message: expect.any(String),
        })
      );
    });

    it("should return 400 for weak password", async () => {
      const response = await request(app)
        .post(registerEndpoint)
        .send({
          ...validUserData,
          password: "weak",
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("success", false);
      expect(response.body.errors).toContainEqual(
        expect.objectContaining({
          field: "password",
          message: expect.any(String),
        })
      );
    });

    it("should return 409 for duplicate email", async () => {
      const mockClerkUser = { id: "clerk_123" };
      (clerkClient.users.createUser as jest.Mock).mockResolvedValueOnce(
        mockClerkUser
      );

      // First registration
      await request(app).post(registerEndpoint).send(validUserData);

      // Second registration with same email
      const response = await request(app)
        .post(registerEndpoint)
        .send(validUserData);

      expect(response.status).toBe(409);
      expect(response.body).toHaveProperty("success", false);
      expect(response.body).toHaveProperty(
        "message",
        "Email already registered"
      );
    });
  });

  describe("POST /auth/login", () => {
    const loginEndpoint = "/api/v1/auth/login";
    const userCredentials = {
      email: "test@example.com",
      password: "Password123!",
    };

    beforeEach(async () => {
      // Create a test user
      const mockClerkUser = { id: "clerk_123" };
      (clerkClient.users.createUser as jest.Mock).mockResolvedValueOnce(
        mockClerkUser
      );

      await request(app)
        .post("/api/v1/auth/register")
        .send({
          ...userCredentials,
          role: Role.USER,
        });
    });

    it("should login successfully with valid credentials", async () => {
      const response = await request(app)
        .post(loginEndpoint)
        .send(userCredentials);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("success", true);
      expect(response.body).toHaveProperty(
        "message",
        "Authentication successful"
      );
      expect(response.body.data).toHaveProperty("email", userCredentials.email);
      expect(response.headers["set-cookie"]).toBeDefined();
    });

    it("should return 401 for invalid password", async () => {
      const response = await request(app).post(loginEndpoint).send({
        email: userCredentials.email,
        password: "wrongpassword",
      });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty("success", false);
      expect(response.body).toHaveProperty("message", "Invalid credentials");
    });

    it("should return 401 for non-existent email", async () => {
      const response = await request(app).post(loginEndpoint).send({
        email: "nonexistent@example.com",
        password: userCredentials.password,
      });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty("success", false);
      expect(response.body).toHaveProperty("message", "Invalid credentials");
    });
  });

  describe("POST /auth/logout", () => {
    it("should clear auth cookie and return success", async () => {
      // Create a test user first
      const registerResponse = await request(app)
        .post("/api/v1/auth/register")
        .send({
          email: "test@example.com",
          password: "Password123!",
          role: Role.USER,
        });

      // Login to get auth token
      const loginResponse = await request(app).post("/api/v1/auth/login").send({
        email: "test@example.com",
        password: "Password123!",
      });

      // Extract auth token from cookie
      const authToken = loginResponse.headers["set-cookie"][0]
        .split(";")[0]
        .split("=")[1];

      const response = await request(app)
        .post("/api/v1/auth/logout")
        .set("Cookie", [`auth_token=${authToken}`]);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("success", true);
      expect(response.body).toHaveProperty(
        "message",
        "Logged out successfully"
      );
      expect(response.headers["set-cookie"][0]).toMatch(/auth_token=;/);
    });

    it("should return 401 when not authenticated", async () => {
      const response = await request(app).post("/api/v1/auth/logout");

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty("success", false);
      expect(response.body).toHaveProperty(
        "message",
        "Authentication failed - No token provided"
      );
    });
  });

  describe("PATCH /auth/reset-password", () => {
    const resetPasswordEndpoint = "/api/v1/auth/reset-password";
    let authToken: string;

    beforeEach(async () => {
      // Create a test user first
      const registerResponse = await request(app)
        .post("/api/v1/auth/register")
        .send({
          email: "test@example.com",
          password: "Password123!",
          role: Role.USER,
        });

      // Login to get auth token
      const loginResponse = await request(app).post("/api/v1/auth/login").send({
        email: "test@example.com",
        password: "Password123!",
      });

      // Extract auth token from cookie
      authToken = loginResponse.headers["set-cookie"][0]
        .split(";")[0]
        .split("=")[1];
    });

    it("should successfully reset password with valid credentials", async () => {
      const response = await request(app)
        .patch(resetPasswordEndpoint)
        .set("Cookie", [`auth_token=${authToken}`])
        .send({
          email: "test@example.com",
          oldPassword: "Password123!",
          newPassword: "NewPassword123!",
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("success", true);
      expect(response.body).toHaveProperty(
        "message",
        "Password reset successful"
      );

      // Verify password was actually changed
      const updatedUser = await User.findOne({
        email: "test@example.com",
      }).select("+password");
      const canLoginWithNewPassword = await bcrypt.compare(
        "NewPassword123!",
        updatedUser!.password!
      );
      expect(canLoginWithNewPassword).toBe(true);
    });

    it("should return 401 when not authenticated", async () => {
      const response = await request(app).patch(resetPasswordEndpoint).send({
        email: "test@example.com",
        oldPassword: "Password123!",
        newPassword: "NewPassword123!",
      });

      expect(response.status).toBe(401);
    });

    it("should return 401 when old password is incorrect", async () => {
      const response = await request(app)
        .patch(resetPasswordEndpoint)
        .set("Cookie", [`auth_token=${authToken}`])
        .send({
          email: "test@example.com",
          oldPassword: "WrongPassword123!",
          newPassword: "NewPassword123!",
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty("message", "Invalid credentials");
    });

    it("should return 404 when user email not found", async () => {
      const response = await request(app)
        .patch(resetPasswordEndpoint)
        .set("Cookie", [`auth_token=${authToken}`])
        .send({
          email: "nonexistent@example.com",
          oldPassword: "Password123!",
          newPassword: "NewPassword123!",
        });

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty("message", "User not found");
    });

    it("should validate password requirements", async () => {
      const response = await request(app)
        .patch(resetPasswordEndpoint)
        .set("Cookie", [`auth_token=${authToken}`])
        .send({
          email: "test@example.com",
          oldPassword: "Password123!",
          newPassword: "weak", // Invalid password
        });

      expect(response.status).toBe(400);
      expect(response.body.errors).toContainEqual(
        expect.objectContaining({
          field: "newPassword",
          message: expect.any(String),
        })
      );
    });
  });
});
