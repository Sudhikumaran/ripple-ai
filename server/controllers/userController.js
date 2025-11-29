import sql from "../configs/db.js";


export const getUserCreations = async (req, res) => {
  try {
    const {userId} = req.auth();

    const creations = await sql `SELECT * FROM creations WHERE user_id = ${userId} ORDER BY created_at DESC`

    res.json({success:true, creations});

  } catch (error) {
    console.log(error.message);
    res.json({success:false, message: error.message});
  }
}