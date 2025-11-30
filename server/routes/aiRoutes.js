import express from "express";
import { generateArticle, generateImage, generateBlogTitle, removeImageBackground, removeImageObject, resumeReview } from "../controllers/aiController.js";
import { auth } from "../middlewares/auth.js";
import upload from "../configs/multer.js";

const aiRouter = express.Router();

aiRouter.post('/generate-article',auth, generateArticle)
aiRouter.post('/generate-blog-title',auth, generateBlogTitle)
aiRouter.post('/generate-image',auth, generateImage)

aiRouter.post('/remove-background',upload.single('image'),auth, removeImageBackground)

aiRouter.post('/remove-object',upload.single('image'),auth, removeImageObject)

aiRouter.post('/review-resume',upload.single('resume'),auth, resumeReview)

export default aiRouter