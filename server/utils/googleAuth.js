import { GoogleAuth } from 'google-auth-library';

// Initialize GoogleAuth with service account credentials
const auth = new GoogleAuth({
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
  scopes: ['https://www.googleapis.com/auth/cloud-platform'],
});

/**
 * Get a short-lived access token from the service account
 * @returns {Promise<string>} Access token for Google APIs
 */
export async function getAccessToken() {
  try {
    const client = await auth.getClient();
    const resp = await client.getAccessToken();
    // Handle both string and object responses
    const token = typeof resp === 'string' ? resp : resp?.token;
    if (!token) {
      throw new Error('Failed to obtain access token from service account');
    }
    console.log('[googleAuth] obtained access token successfully');
    return token;
  } catch (error) {
    console.error('[googleAuth] error obtaining token:', error.message);
    throw error;
  }
}

export default { getAccessToken };
