const mongoose = require('mongoose');
const passport = require('passport');
const LocalStrategy = require('passport-local');

var db = require('./models');

passport.use(new LocalStrategy({
    usernameField: 'user[username]',
    passwordField: 'user[password]',
}, (username, password, done) => {
    db.User.findOne({ username })
        .then((user) => {
            if(!user || !user.validatePassword(password)) {
                return done(null, false, { errors: { 'username or password': 'is invalid' } });
            }

            return done(null, user);
        }).catch(done);
}));
