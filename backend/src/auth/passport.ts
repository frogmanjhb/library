import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Role } from '../types/database';
import { getUserByEmail, getUserById, createUser, updateUser, createPoint } from '../lib/db-helpers';

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3001/auth/google/callback',
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;

        if (!email) {
          return done(new Error('No email found in Google profile'), undefined);
        }

        // Restrict to @stpeters.co.za domain
        if (!email.endsWith('@stpeters.co.za')) {
          return done(new Error('Only @stpeters.co.za email addresses are allowed'), undefined);
        }

        // Find or create user
        let user = await getUserByEmail(email);

        if (!user) {
          // Create new user
          user = await createUser({
            email,
            name: profile.displayName || email.split('@')[0],
            googleId: profile.id,
            role: Role.STUDENT, // Default role, can be changed by librarian
          });

          // Create initial points entry
          await createPoint({
            userId: user.id,
            totalPoints: 0,
          });
        } else if (!user.googleId) {
          // Update existing user with Google ID
          user = await updateUser(user.id, { googleId: profile.id });
        }

        return done(null, user);
      } catch (error) {
        console.error('Error in Google OAuth strategy:', error);
        return done(error as Error, undefined);
      }
    }
  )
);

// Serialize user to session
passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await getUserById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

export default passport;

