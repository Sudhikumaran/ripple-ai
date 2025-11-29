//Middleware to check userId and has permium plan

import { clerkClient } from "@clerk/express";

export const auth = async (req, res, next) => {
  try {
    console.log('[auth middleware] headers:', { auth: req.headers.authorization?.substring(0, 20), cookie: req.headers.cookie ? 'SET' : 'MISSING' });
    const auth = req.auth();
    console.log('[auth middleware] req.auth():', auth);
    if (!auth || !auth.userId) {
      console.error('[auth] req.auth() is empty or missing userId:', auth);
      return res.status(401).json({ success: false, message: 'Unauthorized: Missing or invalid authentication', debug: { auth, headers: req.headers } });
    }

    const { userId } = auth;
    const user = await clerkClient.users.getUser(userId);
    const pm = user?.privateMetadata || {};
    const pub = user?.publicMetadata || {};

    const isPremiumString = (v) => {
      if (typeof v !== 'string') return false;
      const s = v.toLowerCase();
      return s.includes('premium') || s.includes('pro') || s.includes('paid') || s.includes('plus');
    };

    const fields = ['plan','subscription','tier','membership','role'];
    const anyPremiumField = (obj) => fields.some((k) => isPremiumString(obj?.[k]));
    const anyPremiumValue = (obj) => Object.values(obj || {}).some((v) => {
      if (typeof v === 'string') return isPremiumString(v);
      if (Array.isArray(v)) return v.some((x) => typeof x === 'string' && isPremiumString(x));
      return false;
    });

    let hasPremiumPlan = (
      pm.hasPremiumPlan === true ||
      pub.hasPremiumPlan === true ||
      anyPremiumField(pm) ||
      anyPremiumField(pub) ||
      anyPremiumValue(pm) ||
      anyPremiumValue(pub)
    );

    // Dev overrides via env
    const forcePremium = process.env.FORCE_PREMIUM === '1' || process.env.FORCE_PREMIUM === 'true';
    const allowIds = (process.env.PREMIUM_USER_IDS || '').split(',').map(s => s.trim()).filter(Boolean);
    if (!hasPremiumPlan && (forcePremium || allowIds.includes(userId))) {
      hasPremiumPlan = true;
    }

    const currentFree = Number(pm.free_usage ?? 0) || 0;
    if (hasPremiumPlan) {
      // Premium: normalize free_usage to 0 if needed
      if (currentFree !== 0) {
        await clerkClient.users.updateUserMetadata(userId, {
          privateMetadata: { free_usage: 0 },
        });
      }
      req.free_usage = 0;
    } else {
      req.free_usage = currentFree;
    }

    req.plan = hasPremiumPlan ? "premium" : "free";
    console.log('[auth]', { plan: req.plan, pm, pub });
    next();
  } catch (error) {
    console.error('[auth] error:', error.message);
    res.status(401).json({ success: false, message: 'Unauthorized: ' + error.message });
  }
};
