const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const cors = require('cors');
const createError = require('http-errors');
const passport = require('../middleware/passport'); 
const routes = require('../routes/index.js')
const session = require('express-session');

app.use(session({
    secret: 'Fleet-Notify',
    resave: false,
    saveUninitialized: false
  }));
  


app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// app.use(cookieParser());
// app.use(compress());
// app.use(methodOverride());

// Define allowed ports
const allowedOrigins = [
    'http://localhost:3000',
];


// Configure CORS
const corsOptions = {
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true); // Allow the request
        } else {
            callback(new Error('Not allowed by CORS')); 
        }
    }
};

app.use(cors(corsOptions));

 // Initialize Passport and restore authentication state from session
 app.use(passport.initialize());
 app.use(passport.session());



// API router
 app.use('/api/', routes);

 


// catch 404 and forward to error handler
app.use((req, res, next) => {
    next(createError(404, "Not Found"));
});


// Error handler middleware
app.use((err, req, res, next) => {
    res.status(err.status || 500).json({
        message: err.message || "Internal Server Error",
    });
});



module.exports = app;