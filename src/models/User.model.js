const bcrypt = require('bcrypt');
const prisma = require('./prismaClient');
const createError = require('http-errors');

/**
 * Register a new user
 * @param {string} name - User's name
 * @param {string} email - User's email
 * @param {string} password - User's plain text password
 * @returns {Promise<Object>} Created user object (without password)
 */
module.exports.registerUser = async function registerUser(name, email, password) {
  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
    },
  });

  if (existingUser) {
    throw createError(409, 'User with this email already exists');
  }

  // Hash the password
  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(password, saltRounds);

  // Create the user
  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
    },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
    },
  });

  return user;
};

/**
 * Login a user
 * @param {string} email - User's email
 * @param {string} password - User's plain text password
 * @returns {Promise<Object>} User object (without password)
 */
module.exports.loginUser = async function loginUser(email, password) {
  // Find user by email
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      name: true,
      email: true,
      password: true,
      createdAt: true,
    },
  });

  if (!user) {
    throw createError(401, 'Invalid email or password');
  }

  // Verify password
  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    throw createError(401, 'Invalid email or password');
  }

  // Return user without password
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt,
  };
};

