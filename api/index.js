const express = require("express");
const path = require("path");
const axios = require("axios");
const app = express();
const fs = require("fs");
let db = [];
let notifier = require('node-notifier');
require('dotenv').config();
const GITHUB_TOKEN = process.env.Githb_Token; // Replace with your GitHub token
const GITHUB_REPO = 'CosmosElement77/Weather-App'; // Replace with your GitHub username and repository name
const GITHUB_FILE_PATH = 'Userdb.json'; // Path to the file in the repository

// Set the view engine to EJS
app.set("view engine", "ejs");
app.set('views', path.join(__dirname, '../views'));
// app.use(express.static("public"));
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
  const data = fs.readFileSync('Userdb.json');
  db = JSON.parse(data);
}


async function updateGitHubFile(content) {
    const url = `https://api.github.com/repos/${GITHUB_REPO}/contents/${GITHUB_FILE_PATH}`;
    let sha;
    try {
        const response = await axios.get(url, {
            headers: {
                Authorization: `token ${GITHUB_TOKEN}`,
                Accept: 'application/vnd.github.v3+json',
            }
        });
        sha = response.data.sha; // Get the SHA of the current file
    } catch (error) {
        console.error("Error fetching file SHA:", error.message);
        return;
    }
    const data = {
        message: "Update Userdb.json",
        content: Buffer.from(content).toString('base64'),
        sha: sha,
    };
    try {
        await axios.put(url, data, {
            headers: {
                Authorization: `token ${GITHUB_TOKEN}`,
                Accept: 'application/vnd.github.v3+json',
            }
        });
        console.log("File updated successfully on GitHub.");
        notifier.notify({title: "Registration Successful", message: "You have successfully registered."});
    } catch (error) {
        console.error("Error updating file on GitHub:", error.message);
    }
}
// async function getUserDb() {
//     const url = `https://api.github.com/repos/${GITHUB_REPO}/contents/${GITHUB_FILE_PATH}`;
    
//     try {
//         const response = await axios.get(url, {
//             headers: {
//                 Authorization: `token ${GITHUB_TOKEN}`,
//                 Accept: 'application/vnd.github.v3+json',
//             }
//         });
//         const content = Buffer.from(response.data.content, 'base64').toString('utf-8');
//         return JSON.parse(content); // Parse JSON content
//     } catch (error) {
//         console.error("Error fetching UserDb.json:", error.message);
//         return null;
//     }
// }


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
  fs.writeFile("Userdb.json", JSON.stringify(db), async(err) => {
      if (err) {return next(err); } 
      else {
        await updateGitHubFile(JSON.stringify(db));
        res.redirect("login");}
  });
});

/////////////////////////////////////////////////////////////////////////

app.get("/login", (req, res) => {
  res.render("login", { weather: null, error: null });
});

app.post("/login", async (req, res) => {
    let { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).send("All fields are required.");
    }

    // const db = await getUserDb(); // Fetch the user database from GitHub

    if (db) {
        // const foundUser = db.find(user => user.username === username && user.password === password);
        
        if (username && password) {
            req.session.username = username;
            res.redirect("/home");
        } else {
            res.status(401).send("Invalid credentials. Please try again.");
        }
    } else {
        res.status(500).send("Could not access user database.");
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
