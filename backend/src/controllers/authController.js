import jwt from 'jsonwebtoken';
import { User, UserRole } from '../models/User.js';
import { logAudit } from '../utils/auditLogger.js';

const generateToken = (user) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not configured.');
  }
  return jwt.sign(
    {
      id: user._id,
      email: user.email,
      role: user.role
    },
    secret,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    }
  );
};

export const register = async (req, res) => {
  try {
    const { name, email, password, role, merchantId } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, email, and password.'
      });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'A user with this email already exists.'
      });
    }

    if (role && !Object.values(UserRole).includes(role)) {
      return res.status(400).json({
        success: false,
        message: `Invalid role. Allowed roles: ${Object.values(UserRole).join(', ')}`
      });
    }

    const passwordHash = await User.hashPassword(password);

    const newUser = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash,
      role: role || UserRole.MERCHANT,
      merchantId: merchantId || null
    });

    const token = generateToken(newUser);

    await logAudit({
      user: newUser,
      action: 'USER_REGISTERED',
      entityType: 'USER',
      entityId: String(newUser._id),
      details: { email: newUser.email, role: newUser.role }
    });

    return res.status(201).json({
      success: true,
      message: 'User registered successfully.',
      token,
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        merchantId: newUser.merchantId,
        isActive: newUser.isActive,
        createdAt: newUser.createdAt
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Server error during registration.'
    });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password.'
      });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+passwordHash');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials.'
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials.'
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Account is deactivated. Contact system administrator.'
      });
    }

    const token = generateToken(user);

    await logAudit({
      user,
      action: 'USER_LOGIN',
      entityType: 'USER',
      entityId: String(user._id),
      details: { email: user.email, role: user.role }
    });

    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        merchantId: user.merchantId,
        isActive: user.isActive,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Server error during login.'
    });
  }
};

export const logout = async (req, res) => {
  try {
    await logAudit({
      user: req.user,
      action: 'USER_LOGOUT',
      entityType: 'USER',
      entityId: String(req.user._id),
      details: { email: req.user.email }
    });

    return res.status(200).json({
      success: true,
      message: 'Logged out successfully.'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error during logout.'
    });
  }
};

export const getMe = async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        merchantId: req.user.merchantId,
        isActive: req.user.isActive,
        createdAt: req.user.createdAt,
        updatedAt: req.user.updatedAt
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error fetching profile.'
    });
  }
};
