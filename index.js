const express = require('express');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const app = express();
const bcrypt = require('bcrypt');
const bodyParser = require('body-parser');
const { MongoClient } = require('mongodb');
const multer = require('multer');
const path = require('path');

// Connection URL
const url = 'mongodb://127.0.0.1:27017/';
const client = new MongoClient(url, { useNewUrlParser: true, useUnifiedTopology: true });

// Database Name
const dbName = 'mriirs';

// Secret key for JWT
const jwtSecret = 'your_jwt_secret_key';

// Connect to MongoDB once when the application starts
async function connectToMongo() {
  try {
    await client.connect();
    console.log('Connected successfully to MongoDB server');
  } catch (err) {
    console.error('Failed to connect to MongoDB', err);
  }
}
connectToMongo();

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './uploads/');
  },
  filename: function (req, file, cb) {
    const uniquePrefix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniquePrefix + '-' + file.originalname);
  }
});

const upload = multer({ storage: storage });

// Serve static files from the main folder
app.use(express.static(__dirname));

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }));

// parse application/json
app.use(bodyParser.json());

app.use(cookieParser());

app.get('/', function (req, res) {
  res.sendFile(path.join(__dirname, 'templates', 'home.html'));
});

app.get('/admin', function (req, res) {
  res.sendFile(path.join(__dirname, 'templates', 'admin.html'));
});

app.get('/signup', function (req, res) {
  res.sendFile(path.join(__dirname, 'templates', 'signup.html'));
});

app.get('/login', function (req, res) {
  res.sendFile(path.join(__dirname, 'templates', 'login.html'));
});

app.get('/api/complaints', async function (req, res) {
  try {
    const db = client.db(dbName);
    const collection = db.collection('complaints');
    const complaints = await collection.find({}).toArray();
    res.json(complaints);
  } catch (e) {
    console.error(e);
    res.status(500).send('Error fetching complaints');
  }
});

app.post('/', upload.single('uploaded_file'), verifyToken, async function (req, res) {
  let a = req.body['user_email'];
  let b = req.body['user_name'];
  let c = req.body['user_location'];
  let d = req.body['user_message'];
  let e = req.file.path;

  try {
    const db = client.db(dbName);
    const collection = db.collection('complaints');
    await collection.insertOne({ email: a, name: b, location: c, message: d, img_path: e });
    console.log('Complaint logged successfully');
    res.redirect('/');
  } catch (e) {
    console.error(e);
    res.status(500).send('Error logging complaint');
  }
});

app.post('/signup', async function (req, res) {
  let email = req.body['user_email'];
  let pwd1 = req.body['user_pwd1'];
  let pwd2 = req.body['user_pwd2'];

  if (pwd1 !== pwd2) {
    return res.status(400).send('Passwords do not match');
  }

  try {
    const db = client.db(dbName);
    const collection = db.collection('users');

    // Check if the email already exists
    const existingUser = await collection.findOne({ email: email });
    if (existingUser) {
      return res.status(400).send('Email already in use');
    }

    const saltRounds = 10;
    bcrypt.hash(pwd1, saltRounds, async function (err, hash) {
      if (err) {
        console.error('Error hashing password', err);
        return res.status(500).send('Error hashing password');
      }

      try {
        await collection.insertOne({ email: email, password: hash });
        res.redirect('/login');
      } catch (e) {
        console.error(e);
        res.status(500).send('Error during signup');
      }
    });
  } catch (e) {
    console.error(e);
    res.status(500).send('Error during signup');
  }
});

app.post('/login', async function (req, res) {
  let email = req.body['user_email'];
  let pwd = req.body['user_pwd'];

  try {
    const db = client.db(dbName);
    const collection = db.collection('users');
    const user = await collection.findOne({ email: email });

    if (!user) {
      return res.status(400).send('User not found');
    }

    bcrypt.compare(pwd, user.password, function (err, result) {
      if (err) {
        console.error('Error comparing passwords', err);
        return res.status(500).send('Error comparing passwords');
      }
      if (result) {
        const token = jwt.sign({ email: user.email }, jwtSecret, { expiresIn: '1h' });
        // Set token into cookie
        res.cookie('token', token, { httpOnly: true });
        res.redirect('/');
      } else {
        res.status(400).send('Invalid password');
      }
    });
  } catch (e) {
    console.error(e);
    res.status(500).send('Error during login');
  }
});

// Middleware to verify token
function verifyToken(req, res, next) {
  const token = req.cookies.token || req.body.token || req.query.token || req.headers['x-access-token'];
  
  if (!token) {
    return res.status(403).send('A token is required for authentication');
  }
  try {
    const decoded = jwt.verify(token, jwtSecret);
    req.user = decoded;
  } catch (err) {
    return res.status(401).send('Invalid Token');
  }
  return next();
}

const port = 3000;
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
});
