import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import  {clerkMiddleware, requireAuth} from '@clerk/express'
import aiRouter from './routes/aiRoutes.js';
import connectCloudinary from './configs/cloudinary.js';
import userRouter from './routes/userRoutes.js';
const app = express()
// Warn about missing important environment variables to help debugging 403s/401s
const requiredEnvVars = [
    'CLIPDROP_API_KEY',
    'GEMINI_API_KEY',
    'CLOUDINARY_CLOUD_NAME',
    'CLOUDINARY_API_KEY',
    'CLOUDINARY_API_SECRET',
    'DATABASE_URL',
]
const missingEnvs = requiredEnvVars.filter(k => !process.env[k])
if (missingEnvs.length) {
    console.warn('Warning: missing environment variables:', missingEnvs.join(', '))
    console.warn('Some features (image generation, DB, cloud uploads) may fail until these are set.')
}

await connectCloudinary()
app.use(cors())
app.use(express.json())
app.use(clerkMiddleware())

app.get('/', (req,res)=>res.send('Server is Live'))

// Note: requireAuth() moved to individual routes via custom 'auth' middleware
// app.use(requireAuth())  // This was causing 403 on all requests before custom auth could check plan/usage

app.use('/api/ai', aiRouter)

app.use('/api/user', userRouter)


const PORT = process.env.PORT || 3000;

app.listen(PORT, ()=>{
    console.log('Server is running on port',PORT);
})
