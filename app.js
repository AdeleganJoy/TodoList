var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const jwt = require("jsonwebtoken");
const { body, validationResult} = require('express-validator');
var mongoose = require("mongoose")
const bcrypt = require('bcryptjs');
const Users = require('./models/Users');
const Todos = require('./models/Todos');
const jwtMiddleware = require('./auth/validateToken');
let tk = null;
let veriUser = null;
var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
const { error } = require('console');

var app = express();

// view engine setupQSS
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// MongoDB connection
const mongoDB = "mongodb://127.0.0.1:27017/testdb";
mongoose.connect(mongoDB);
mongoose.Promise = Promise;
const db = mongoose.connection;
db.on("error", console.error.bind(console, "MongoDB connection error"));

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);
// Validate email
function validateEmail() {
  return body("email")
  .isEmail()
  .withMessage("Please Enter A Valid Email")
}

// Validate password
function validatePassword(){
  return body("password")
  .notEmpty()
  .withMessage("Please Enter A Valid Password")
  .isLength({ min: 8 })
  .withMessage("Password must be at least 8 characters")
  .matches(/[a-z]/g)
  .withMessage("Password must contain a lower case letter")
  .matches(/[A-Z]/g)
  .withMessage("Password must contain an upper case letter")
  .matches(/[!@\]#\[$\=%^\+&\\*\_(),\?.\.~?"\,:{\;}|<>\-]/)

  .withMessage("Password must contain at least one symbol")

}

// Send entered email and password to the database to be verified
app.post('/api/user/register', validateEmail(), validatePassword(), async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.render('register', { error: 'Password is not strong enough' });
  }

  const { email, password } = req.body;

  try {
    // Check if the email already exists in the database
    const existingUser = await Users.findOne({ email });
    if (existingUser) {
      return res.render('register', { error: 'Email already in use' });
    }
    // Hash the password before saving it to the database
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    // Create a new user in the database
    await Users.create({
      email: email,
      password: hashedPassword
    });
    res.redirect('/login.html');
    //return res.status(200).json('Registration successful');
  } catch (error) {
    console.error(error);
    return res.status(500).json('Internal Server Error');
  }
});

// Send entered email and password to the database to be verified
app.post('/api/user/login', async (req, res) => {
  const { email, password } = req.body;
  console.log(req.body);
  try {
    // Check if the email already exists in the database
      const existingUser = await Users.findOne({ email});
      if (existingUser) {

        const passwordMatch = await bcrypt.compare(password, existingUser.password);
        // If the password matches, create a JWT token
        if (passwordMatch) {
          process.env.SECRET = 'carrotsYucky'; 
          const jwtPayload = {
            email: email,
            password: password
          }
          jwt.sign(
            jwtPayload,
            process.env.SECRET,
            {
              expiresIn: 120
            },
            (err, token) => {
              tk = token;
              veriUser = jwtPayload;
              res.json({success: true, token});
            }
          );
        }else {
          return res.json({error: 'Invalid credentials'});
        }
      }else{
        return res.json({error: 'Invalid credentials'});
      }
    } catch (error) {
      console.error(error);
    }
    
  });
// Middleware to verify JWT token
  app.get('/api/private', jwtMiddleware, async function (req, res) {
    try {
       const userData = await Users.findOne({ email: req.user.email });
       // Check if the user exists in the database
       if (!userData) {
          return res.status(404).json({ error: 'User not found' });
       }
 
       const todosData = await Todos.findOne({ user: userData._id });
        // Check if the todos data exists for the user
       if (!todosData) {
          return res.status(404).json({ error: 'Todos not found for this user' });
       }
       res.json(
          todosData.items);
    } catch (error) {
       console.error(error);
       res.status(500).json({ error: 'Internal Server Error' });
    }
 });
 
//send entered todo to the database
app.post('/api/todos', async (req, res) => {
  try {
    const storedToken = req.headers.authorization.replace("Bearer ", "");
    // Check if the token is valid
    if (storedToken == null) return res.sendStatus(403);
    jwt.verify(storedToken, process.env.SECRET, async (err, user) => {
      if (err) return res.sendStatus(401);
      // Check if the user exists in the database
      if (veriUser) {
      try {
        // Decode the token to get the user data
        const [header, payload, signature] = storedToken.split('.');
        const parsedPayload = JSON.parse(atob(payload));
        const userData = await Users.findOne({ email: parsedPayload.email });
        const todosData = await Todos.findOne({ user: userData._id });
        if (!todosData) {
          // If the todos data doesn't exist, create a new entry
          await Todos.create({
            user: userData._id,
            items: req.body.items
          })
        }else{
          // If the todos data exists, update it
          const updatedTodos = todosData.items;
          updatedTodos.push(req.body.items)
          await Todos.updateOne({ user: userData._id }, { $set: { items: updatedTodos } });
      }return res.status(200).json();
    } catch (error) {
        console.error(error);
    }
  }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json('Internal Server Error');
  }
});
// register page
app.get('/register.html', (req, res) => {
  res.render('register');
});
// login page
app.get('/login.html', (req, res) => {
  res.render('login');
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});
// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;