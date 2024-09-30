const express = require("express");
const path = require("path");
const axios = require("axios");
const app = express();
const fs = require("fs");
let db = [];

// Set the view engine to EJS
app.set("view engine", "ejs");
app.set('/views', '../views');
app.use(express.static("public"));
app.use('/public', express.static(path.join(__dirname, '../public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const session = require('express-session');
app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } ,
    maxAge: Date.now() + (30 * 24 * 3600 * 1000)
}));
if (fs.existsSync('Userdb.json')) {
  const data = fs.readFileSync('UserDb.json');
  db = JSON.parse(data);
}

app.get("/home", (req, res) => {
  const username = req.session.username;
  console.log("Meow "+username);
  res.render("index", { weather: null, error: null ,username: username });
});

/////////////////////////////////////////////////////////////////////////

app.get("/", (req, res) => {
  res.render("register", { weather: null, error: null });
});
app.post("/", (req, res, next) => {
  let { username, email, password } = req.body;
  if (!username || !email || !password) { return res.status(400).send("All fields are required.");}

  const existingUser = db.find(user => user.email === email);
  if (existingUser) {return res.status(400).send("User already exists with this email.");}

  let user = {
      id: new Date().getTime().toString().slice(5),
      username: username,
      email: email,
      password: password
  };
  // Add user to database
  db.push(user);
  fs.writeFile("Userdb.json", JSON.stringify(db), (err) => {
      if (err) {return next(err); } 
      else {res.redirect("login");}
  });
});

/////////////////////////////////////////////////////////////////////////
app.get("/login", (req, res) => {
  res.render("login", { weather: null, error: null });
});
app.post("/login", (req, res) => {
  let { username, password } = req.body;
  
  if (!username || !password) {
      return res.status(400).send("All fields are required.");
  }
  // Check for existing user
  const foundUser = db.find(user => user.username === username && user.password === password);

  if (foundUser) {
    // res.render("index", { weather: null, error: null , username: foundUser.username});
    req.session.username = foundUser.username;
    res.redirect("/home");
  } else {
      res.status(401).send("Invalid credentials. Please try again.");
  }
});

/////////////////////////////////////////////////////////////////////////

// Handle the /weather route
app.get("/weather", async (req, res) => {
  // Get the city from the query parameters
  const city = req.query.city;  
  let username = req.session.username;
  const apiKey = "7e27156b2e8131e10937932a2a1a7abe";
  // console.log(city);
  // Add your logic here to fetch weather data from the API
  const APIUrl = `https://api.openweathermap.org/data/2.5/weather?q=${city}&units=metric&appid=${apiKey}`;
  let weather;
  let error = null;
  try {
    const response = await axios.get(APIUrl);
    weather = response.data;
  } catch (error) { 
    weather = null;
    error = "Error, Please try again";
  }
  // Render the index template with the weather data and error message
  res.render("index", { weather, error ,username});
});

// Start the server and listen on port 3000 or the value of the PORT environment variable
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`App is running on port http://localhost:${port}`);
});
