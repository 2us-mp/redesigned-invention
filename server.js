import express from 'express';
import session from 'express-session';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import jwt from 'jsonwebtoken';
import cors from 'cors';

const app = express();

/* ===================== CONFIG ===================== */

const FRONTEND_URL = 'https://wcv3.pages.dev';
const CALLBACK_URL =
  'https://wired-center-auth.onrender.com/auth/google/callback';

/* ===================== MIDDLEWARE ===================== */

app.use(cors({
  origin: FRONTEND_URL,
  credentials: true
}));

app.use(session({
  secret: 'wired-center-secret',
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

/* ===================== PASSPORT ===================== */

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

passport.use(new GoogleStrategy(
  {
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: CALLBACK_URL
  },
  async (_accessToken, _refreshToken, profile, done) => {
    const user = {
      id: profile.id,
      email: profile.emails?.[0]?.value,
      name: profile.displayName,
      avatar: profile.photos?.[0]?.value
    };

    return done(null, user);
  }
));

/* ===================== ROUTES ===================== */

/** Health check (for Render) */
app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

/** Start Google login */
app.get('/auth/google',
  passport.authenticate('google', {
    scope: ['profile', 'email']
  })
);

/** 🔴 THIS WAS MISSING BEFORE 🔴 */
app.get('/auth/google/callback',
  passport.authenticate('google', { session: false }),
  (req, res) => {
    const token = jwt.sign(req.user, 'wired-center-jwt', {
      expiresIn: '7d'
    });

    res.redirect(
      `${FRONTEND_URL}/login-success?token=${token}`
    );
  }
);

/* ===================== START ===================== */

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Auth server running on ${PORT}`);
});
