import sql from "../configs/db.js";


export const getUserCreations = async (req, res) => {
  try {
    const {userId} = req.auth();

    const creations = await sql `SELECT * FROM creations WHERE user_id = ${userId} ORDER BY created_at DESC`;

    res.json({success:true, creations});

  } catch (error) {
    console.log(error.message);
    res.json({success:false, message: error.message});
  }
}

export const getPublishedCreations = async (req, res) => {
  try {


    const creations = await sql `SELECT * FROM creations WHERE publish = true ORDER BY created_at DESC`;

    res.json({success:true, creations});

  } catch (error) {
    console.log(error.message);
    res.json({success:false, message: error.message});
  }
}

export const toggleLikeCreation = async (req, res) => {
  try {
    
    const {userId} = req.auth();
    const {id} = req.params;

    const [creation] = await sql `SELECT * FROM creation_likes WHERE id = ${id}`;


    if (!creation) {
        return res.status(404).json({success:false, message: "Creation like not found"});
    }

    const currentLikes = creation.likes;
    const userIdStr = userId.toString();
    let updatedLikes;
    let message;

    if(currentLikes.includes(userIdStr)) {
        // Unlike
        updatedLikes = currentLikes.filter((user) => user !== userIdStr);
        message = "Creation unliked";
    } else {
        // Like
        updatedLikes = [...currentLikes, userIdStr];
        message = "Creation liked";
    }

    const formattedArray = `{${updatedLikes.json(',')}}`;

    await sql `UPDATE creations SET likes = ${formattedArray}::text[] WHERE id = ${id}`;

    res.json({success:true, message});

  } catch (error) {
    console.log(error.message);
    res.json({success:false, message: error.message});
  }
}