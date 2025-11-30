import sql from '../configs/db.js';

export const getUserCreations = async (req, res) => {
  try {
    const { userId } = await req.auth();
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
  try {
    const { userId } = await req.auth();
    const { id } = req.body;

    const [creation] = await sql`SELECT * FROM creations WHERE id = ${id}`;

    if (!creation) {
      return res.status(404).json({ success: false, message: 'Creation not found' });
    }

    const currentLikes = creation.likes;
    const userIdStr = userId.toString();
    let updatedLikes;
    let message;

    if (currentLikes.includes(userIdStr)) {
      // Unlike
      updatedLikes = currentLikes.filter((user) => user !== userIdStr);
      message = 'Creation unliked';
    } else {
      // Like
      updatedLikes = [...currentLikes, userIdStr];
      message = 'Creation liked';
    }

    const formattedArray = `{${updatedLikes.join(',')}}`;

    await sql`UPDATE creations SET likes = ${formattedArray} WHERE id = ${id}`;

    res.json({ success: true, message });
  } catch (error) {
    console.error('[toggleLikeCreation] error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

export default {
  getUserCreations,
  getPublishedCreations,
  toggleLikeCreation,
};
