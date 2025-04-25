const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const bcrypt = require('bcryptjs');
const User = require('../models/User'); 
require('dotenv').config();


const localLogin = new LocalStrategy(
    { usernameField: 'mobile', passwordField: 'password', passReqToCallback: true },
    async (req, mobile, password, done) => {
      try {
        const user = await User.findOne({ mobile });
  
        if (!user) {
          const error = new Error('Mobile number not found');
          error.status = 400;
          error.field = 'mobile';
          return done(error);
        }
  
        const isMatch = await bcrypt.compare(password, user.password);
  
        if (!isMatch) {
          const error = new Error('Invalid password');
          error.status = 400;
          error.field = 'password';
          return done(error);
        }
  
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }
  );
  

const opts = {
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: process.env.JWT_SECRET,
};

const jwtLogin = new JwtStrategy(
    { ...opts, passReqToCallback: true },
    async (req, jwtPayload, done) => {
      try {
        const user = await User.findOne({ _id: jwtPayload._id });
  
        if (!user) {
          return done(null, false, { message: 'User not found' });
        }
  
        const token = ExtractJwt.fromAuthHeaderAsBearerToken()(req);
  
        if (user.token !== token) {
          return done(null, false, { message: 'Token mismatch' });
        }
  
        return done(null, user);
  
      } catch (err) {
        return done(err, false, { message: 'Internal server error while verifying token' });
      }
    }
  );
  

// Serialize user (used by Passport to save user in localStorage)
passport.serializeUser((user, done) => {
  done(null, user._id);
});

// Deserialize user (retrieve user details from LocalStorage)
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

// Use the strategies
passport.use(localLogin);
passport.use(jwtLogin);

module.exports = passport;
