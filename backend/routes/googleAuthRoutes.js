import express from 'express';
const router = express.Router();

import db from '../models/index.js';


const { GoogleAuth } = db;
// IMPORTANT: Add your authentication middleware here
// Example: const { protect, authorize } = require('../middleware/auth');
// router.use(protect);   // ← protects all routes in this file

// 1. GET /api/google-auth/my-accounts
//    List all Google accounts linked to the current logged-in user
router.get('/my-accounts', async (req, res) => {
  try {
    // Security: only return accounts belonging to the authenticated user
    const accounts = await GoogleAuth.findAll({
      where: {
        userId: req.user.userId,   // ← assumes your auth middleware sets req.user.userId
      },
      attributes: [
        'googleAuthId',
        'googleId',
        'email',
        'firstName',
        'lastName',
        'profilePic',
        'lastLogin',
        'createdAt',
      ],
      order: [['lastLogin', 'DESC']],
    });

    res.json(accounts);
  } catch (error) {
    console.error('Error fetching my Google accounts:', error);
    res.status(500).json({ message: 'Failed to fetch linked Google accounts' });
  }
});

// 2. DELETE /api/google-auth/my-accounts/:googleAuthId
//    Unlink / disconnect one specific Google account (only if it belongs to the user)
router.delete('/my-accounts/:googleAuthId', async (req, res) => {
  try {
    const googleAuthId = req.params.googleAuthId;

    const account = await GoogleAuth.findOne({
      where: {
        googleAuthId,
        userId: req.user.userId,   // ← critical security check: only own records
      },
    });

    if (!account) {
      return res.status(404).json({ message: 'Google account not found or does not belong to you' });
    }

    // Recommended: soft unlink (keep record for audit/security purposes)
    await account.update({ userId: null });

    // If you prefer hard delete instead:
    // await account.destroy();

    res.json({ success: true, message: 'Google account unlinked successfully' });
  } catch (error) {
    console.error('Error unlinking Google account:', error);
    res.status(500).json({ message: 'Failed to unlink Google account' });
  }
});

export default router;