import OpenAI from "openai";
import sql from "../configs/db.js";
import { clerkClient } from "@clerk/express";
import { response } from "express";
import {v2 as cloudinary} from 'cloudinary'
import axios from 'axios'
import FormData from 'form-data'
import fs from 'fs'
import pdf from 'pdf-parse/lib/pdf-parse.js'

const AI = new OpenAI({
  apiKey: process.env.GEMINI_API_KEY,
  baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
});

export const generateArticle = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { prompt, length } = req.body;
    const plan = req.plan;
    const free_usage = req.free_usage;

    if (plan !== "premium" && free_usage >= 10) {
      return res.json({
        success: false,
        message: "Limit reached. Upgrade to continue.",
      });
    }

    const response = await AI.chat.completions.create({
      model: "gemini-2.0-flash",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: length,
    });

    const content = response.choices[0].message.content;

    await sql`INSERT INTO creations (user_id, prompt, content, type) VALUES (${userId}, ${prompt}, ${content}, 'article')`;

    if (plan !== "premium") {
      await clerkClient.users.updateUserMetadata(userId, {
        privateMetadata: {
          free_usage: free_usage + 1,
        },
      });
    }

    res.json({ success: true, content });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};

export const generateBlogTitle = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { prompt} = req.body;
    const plan = req.plan;
    const free_usage = req.free_usage;

    if (plan !== "premium" && free_usage >= 10) {
      return res.json({
        success: false,
        message: "Limit reached. Upgrade to continue.",
      });
    }

    const response = await AI.chat.completions.create({
      model: "gemini-2.0-flash",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 100,
    });

    const content = response.choices[0].message.content;

    await sql`INSERT INTO creations (user_id, prompt, content, type) VALUES (${userId}, ${prompt}, ${content}, 'blog-title')`;

    if (plan !== "premium") {
      await clerkClient.users.updateUserMetadata(userId, {
        privateMetadata: {
          free_usage: free_usage + 1,
        },
      });
    }

    res.json({ success: true, content });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};


export const generateImage = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { prompt, publish} = req.body;
    const plan = req.plan;

    // Only premium users may generate images
    if (plan !== "premium") {
      return res.status(403).json({
        success: false,
        message: "This feature is only available for premium subscriptions",
      });
    }

    // Validate required server-side keys before attempting external calls
    if (!process.env.CLIPDROP_API_KEY) {
      return res.status(500).json({ success: false, message: 'Server misconfiguration: CLIPDROP_API_KEY is missing' })
    }
    if (!process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET || !process.env.CLOUDINARY_CLOUD_NAME) {
      return res.status(500).json({ success: false, message: 'Server misconfiguration: Cloudinary credentials are missing' })
    }

    const formData = new FormData();
    formData.append('prompt', prompt);

    const clipResp = await axios.post('https://clipdrop-api.co/text-to-image/v1', formData, {
      headers: {
        'x-api-key': process.env.CLIPDROP_API_KEY,
        ...formData.getHeaders(),
      },
      responseType: 'arraybuffer',
    });

    const base64Image = `data:image/png;base64,${Buffer.from(clipResp.data, 'binary').toString('base64')}`;

    const {secure_url} =  await cloudinary.uploader.upload(base64Image)

    await sql`INSERT INTO creations (user_id, prompt, content, type, publish) VALUES (${userId}, ${prompt}, ${secure_url}, 'image', ${publish ?? false})`;


    res.json({ success: true, content: secure_url });
  } catch (error) {
    const status = error?.response?.status;
    const data = error?.response?.data;
    console.error('generateImage error:', { status, message: error.message, data });
    const message = status === 402
      ? 'ClipDrop: Payment required or invalid API key/credits'
      : status === 403
      ? 'ClipDrop: Forbidden — invalid API key or insufficient permissions'
      : error.message
    res.status(status || 500).json({ success: false, message });
  }
};

export const removeImageBackground = async (req, res) => {
  try {
    const {userId} = req.auth();
    const {image } = req.file;
    const plan = req.plan;

    if (plan !== "premium") {
      return res.status(403).json({
        success: false,
        message: "This feature is only available for premium subscriptions",
      });
    }

    const {secure_url} = await cloudinary.uploader.upload(image.path, {
      transformation: [{
        effect: "background_removal",
        background_removal: "remove_the_background"
        
      }
    ]
    })

    await sql`INSERT INTO creations (user_id, prompt, content, type) VALUES (${userId}, 'Background Removal', ${secure_url}, 'image')`;

    res.json({success:true, content: secure_url})

  } catch (error) {
    console.log(error.message);
    res.json({success:false, message: error.message});
  }
}

export const removeImageObject = async (req, res) => {
  try {
    const {userId} = req.auth();
    const {object} = req.body;
    const {image } = req.file;
    const plan = req.plan;

    if (plan !== "premium") {
      return res.status(403).json({
        success: false,
        message: "This feature is only available for premium subscriptions",
      });
    }

    const {public_id} = await cloudinary.uploader.upload(image.path)

    const imageUrl = cloudinary.url(public_id, { 
        transformation:[{effect:`gen_remove:${object}`}],
        effect: "object_removal",})

    await sql`INSERT INTO creations (user_id, prompt, content, type) VALUES (${userId}, ${`Removed ${object} from image`}, ${imageUrl}, 'image')`;

    res.json({success:true, content: imageUrl})

  } catch (error) {
    console.log(error.message);
    res.json({success:false, message: error.message});
  }
}

export const resumeReview = async (req, res) => {
  try {
    const {userId} = req.auth();
    const resume = req.file;
    const plan = req.plan;

    if (plan !== "premium") {
      return res.status(403).json({
        success: false,
        message: "This feature is only available for premium subscriptions",
      });
    }

    if(resume.size > 5 * 1024 * 1024){
      return  res.status(400).json({
        success: false,
        message: "File size exceeds 5MB limit",
      });
    }

    const dataBuffer = fs.readFileSync(resume.path);
    const pdfData = await pdf(dataBuffer);
    const prompt = `Review the following resume and provide feedback to improve it:\n\n${pdfData.text}`;

        const response = await AI.chat.completions.create({
      model: "gemini-2.0-flash",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    const content = response.choices[0].message.content;


  

    await sql`INSERT INTO creations (user_id, prompt, content, type) VALUES (${userId},'Review the uploaded resume', ${content}, 'resume-review')`;

    res.json({success:true, content})

  } catch (error) {
    console.log(error.message);
    res.json({success:false, message: error.message});
  }
}


