import sql from '../configs/db.js';

export const getUserCreations = async (req, res) => {
  try {
    const { userId } = req.auth();
    const rows = await sql`SELECT * FROM creations WHERE user_id = ${userId} ORDER BY created_at DESC`;
    res.json({ success: true, creations: rows });
  } catch (error) {
    console.error('[getUserCreations] error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getPublishedCreations = async (req, res) => {
  try {
    const rows = await sql`SELECT * FROM creations WHERE publish = true ORDER BY created_at DESC`;
    res.json({ success: true, creations: rows });
  } catch (error) {
    console.error('[getPublishedCreations] error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const toggleLikeCreation = async (req, res) => {
  // Not implemented: placeholder to avoid startup errors
  res.status(501).json({ success: false, message: 'toggleLikeCreation not implemented' });
};

export default {
  getUserCreations,
  getPublishedCreations,
  toggleLikeCreation,
};