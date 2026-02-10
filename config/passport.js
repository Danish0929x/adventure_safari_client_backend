const GoogleStrategy = require("passport-google-oauth20").Strategy;
const AppleStrategy = require("passport-apple").Strategy;
const User = require("../models/User");

module.exports = (passport) => {
  // Debug: Log environment variables
  console.log("GOOGLE_CLIENT_ID:", process.env.GOOGLE_CLIENT_ID);
  console.log(
    "GOOGLE_CLIENT_SECRET:",
    process.env.GOOGLE_CLIENT_SECRET ? "***" : "NOT SET"
  );
  console.log("GOOGLE_CALLBACK_URL:", process.env.GOOGLE_CALLBACK_URL);
  console.log("APPLE_CLIENT_ID:", process.env.APPLE_CLIENT_ID);
  console.log("APPLE_TEAM_ID:", process.env.APPLE_TEAM_ID);
  console.log("APPLE_KEY_ID:", process.env.APPLE_KEY_ID);

  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    console.error(
      "ERROR: Google OAuth credentials not found in environment variables!"
    );
    console.error(
      "Please ensure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are set in .env file"
    );
    throw new Error("Missing Google OAuth credentials");
  }

  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL,
        passReqToCallback: true,
      },
      async (req, accessToken, refreshToken, profile, done) => {
        try {
          // 1. Check for existing Google user
          let user = await User.findOneAndUpdate(
            { googleId: profile.id },
            { $set: { lastLogin: new Date() } },
            { new: true }
          );

          if (user) return done(null, user);

          // 2. Check for existing email user
          const email = profile.emails[0].value;
          user = await User.findOneAndUpdate(
            { email },
            {
              $set: {
                googleId: profile.id,
                lastLogin: new Date(),
                isVerified: true, // Auto-verify email for Google users
              },
            },
            { new: true }
          );

          if (user) {
            return done(null, user);
          }

          // 3. Create new Google user
          user = await User.create({
            googleId: profile.id,
            name: profile.displayName,
            email,
            isVerified: true,
            lastLogin: new Date(),
          });

          return done(null, user);
        } catch (error) {
          console.error("Google OAuth error:", error);
          return done(error, null);
        }
      }
    )
  );

  // Apple OAuth Strategy
  if (
    process.env.APPLE_CLIENT_ID &&
    process.env.APPLE_TEAM_ID &&
    process.env.APPLE_KEY_ID &&
    (process.env.APPLE_PRIVATE_KEY_PATH || process.env.APPLE_PRIVATE_KEY)
  ) {
    const path = require("path");
    const fs = require("fs");

    // Support both file path and direct key content from env variable
    let appleStrategyConfig = {
      clientID: process.env.APPLE_CLIENT_ID,
      teamID: process.env.APPLE_TEAM_ID,
      keyID: process.env.APPLE_KEY_ID,
      callbackURL: process.env.APPLE_CALLBACK_URL,
      passReqToCallback: true,
    };

    // Use APPLE_PRIVATE_KEY env variable if available (for cloud deployment like Render)
    if (process.env.APPLE_PRIVATE_KEY) {
      console.log("Using Apple private key from environment variable");
      appleStrategyConfig.privateKeyString =
        process.env.APPLE_PRIVATE_KEY.replace(/\\n/g, "\n");
    }
    // Otherwise use file path (for local development)
    else if (process.env.APPLE_PRIVATE_KEY_PATH) {
      let privateKeyPath = process.env.APPLE_PRIVATE_KEY_PATH;
      if (!path.isAbsolute(privateKeyPath)) {
        privateKeyPath = path.resolve(__dirname, "..", privateKeyPath);
      }
      console.log("Apple Private Key Path:", privateKeyPath);
      console.log("Apple Private Key Exists:", fs.existsSync(privateKeyPath));
      appleStrategyConfig.privateKeyLocation = privateKeyPath;
    }

    passport.use(
      new AppleStrategy(
        appleStrategyConfig,
        async (req, accessToken, refreshToken, idToken, profile, done) => {
          try {
            console.log("Apple OAuth callback triggered");
            console.log("Profile:", JSON.stringify(profile, null, 2));
            console.log("ID Token:", idToken);

            // Decode the ID token to get user information
            // Apple's passport strategy doesn't always populate profile correctly
            let appleId = profile.id;
            let email = profile.email;
            // hello

            // If profile is empty, decode the ID token manually
            if (!appleId || !email) {
              try {
                // Decode JWT token (without verification for simplicity)
                const tokenParts = idToken.split(".");
                const payload = JSON.parse(
                  Buffer.from(tokenParts[1], "base64").toString()
                );

                console.log("Decoded ID Token Payload:", payload);

                appleId = payload.sub; // Apple's user ID is in 'sub' claim
                email = payload.email;
              } catch (decodeError) {
                console.error("Error decoding ID token:", decodeError);
              }
            }

            console.log("Apple ID:", appleId);
            console.log("Email:", email);

            // Validate required fields
            if (!appleId) {
              throw new Error("Apple ID not found in authentication response");
            }

            // Generate a name from email or use a default
            const name = profile.name
              ? `${profile.name.firstName || ""} ${
                  profile.name.lastName || ""
                }`.trim()
              : email
              ? email.split("@")[0]
              : `AppleUser_${appleId.substring(0, 8)}`;

            // 1. Check for existing Apple user
            let user = await User.findOneAndUpdate(
              { appleId: appleId },
              { $set: { lastLogin: new Date() } },
              { new: true }
            );

            if (user) {
              console.log("Found existing Apple user:", user.email);
              return done(null, user);
            }

            // 2. Check for existing email user (if email provided)
            if (email) {
              user = await User.findOneAndUpdate(
                { email },
                {
                  $set: {
                    appleId: appleId,
                    lastLogin: new Date(),
                    isVerified: true, // Auto-verify email for Apple users
                  },
                },
                { new: true }
              );

              if (user) {
                console.log("Linked Apple ID to existing user:", user.email);
                return done(null, user);
              }
            }

            // 3. Create new Apple user
            const newUserData = {
              appleId: appleId,
              name: name,
              email: email || `apple_${appleId}@adventuresafari.temp`,
              isVerified: true,
              lastLogin: new Date(),
            };

            console.log("Creating new Apple user:", newUserData);
            user = await User.create(newUserData);
            console.log("Successfully created new Apple user:", user.email);

            return done(null, user);
          } catch (error) {
            console.error("Apple OAuth error details:", {
              message: error.message,
              stack: error.stack,
              name: error.name,
            });
            return done(error, null);
          }
        }
      )
    );
  } else {
    console.log("Apple OAuth not configured - skipping Apple strategy");
    console.log("Missing config:", {
      APPLE_CLIENT_ID: !!process.env.APPLE_CLIENT_ID,
      APPLE_TEAM_ID: !!process.env.APPLE_TEAM_ID,
      APPLE_KEY_ID: !!process.env.APPLE_KEY_ID,
      APPLE_PRIVATE_KEY_PATH: !!process.env.APPLE_PRIVATE_KEY_PATH,
      APPLE_PRIVATE_KEY: !!process.env.APPLE_PRIVATE_KEY,
    });
  }

  // Session serialization
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id);
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });
};
