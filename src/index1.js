// index.js
const multer = require('multer');
const express = require("express");
const path = require("path");
const collection = require("./config");
const bcrypt = require('bcrypt');
const session = require("express-session");
const authMiddleware = require("./authMiddleware");
const { body, validationResult } = require('express-validator');
const { MongoClient, Admin } = require('mongodb');
const http = require('http');
const mqtt = require('mqtt');
const fs = require('fs');
const cors = require("cors");
require('dotenv').config();
const { Admin1, User, FDAS } = require("./config");;
const mongoose = require('mongoose');



const app = express();
app.use(express.json());
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));
app.set("view engine", "ejs");
// Example assuming CSS files are in the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static('D:/Downloads/Fuego1/uploads'));




const generateFDASID = (year, count) => {
  const formattedCount = count.toString().padStart(3, '0');
  return `${year}-${formattedCount}`;
};







const mqttOptions = {
  host: process.env.MQTT_HOST,
  port: process.env.MQTT_PORT,
  clientId: process.env.MQTT_CLIENT_ID,
  username: process.env.MQTT_USERNAME,
  password: process.env.MQTT_PASSWORD,
  protocol: process.env.MQTT_PROTOCOL,
  rejectUnauthorized: true,
  ca: [fs.readFileSync(process.env.MQTT_CA_PATH)],
};


const isLoggedIn = (req, res, next) => {
  if (req.isAuthenticated()) {
      return next();
  }
  res.redirect('/login'); // Redirect to the login page if not authenticated
};

app.use(cors({
  origin: '*',
}));
const httpServer = http.createServer(app);
const mqttClient = mqtt.connect(mqttOptions);
const port = 5000;
const io = require('socket.io')(httpServer, {
  cors: {
    origin: '*',
  },
});
const WebURL = '192.168.116.189';

const mongoHost = 'mongodb+srv://systembfp8:iwantaccess@bfp.ezea3nm.mongodb.net/?retryWrites=true&w=majority/accounts';

// Start HTTP server
httpServer.listen(port, WebURL, () => {
  console.log(`Server listening at http://${WebURL}:${port}.`);
})
  .on('error', (err) => {
      console.error(`Error starting HTTP server: ${err.message}`);
      // Handle HTTP server start error here
  });

// Connect to MQTT
mqttClient.on('connect', () => {
  console.log(`Connected to MQTT.`);
})
  .on('error', (err) => {
      console.error(`Error connecting to MQTT: ${err.message}`);
      // Handle MQTT connection error here
  });
  const topic = [
    "esp32/test",
    "Temp",
    "Humid",
    "Time"
  ];
  const subscribePromises = topic.map(currentTopic => {
    return new Promise((resolve, reject) => {
      mqttClient.subscribe(currentTopic, err => {
        if (err) {
          reject(err);
        } else {
        //   console.log(`Subscribed to topic: ${currentTopic}`);
          resolve();
        }
      });
    });
  });
  
  Promise.all(subscribePromises)
    .then(() => {
      console.log('All subscriptions completed successfully.');
    })
    .catch(err => {
      console.error(`Error subscribing to topics: ${err.message}`);
    });
    mqttClient.on('message', async (topic, message) => {
      try {
        console.log(`Received MQTT message - Topic: ${topic}, Message: ${message.toString()}`);

    
        if (topic === 'Time') {
          const timestamp = message.toString();
          const payload = { topic, timestamp };
    
          // Save the timestamp string to the MongoDB collection
          await handleTimeRoute(timestamp);
    
          // Emit the payload to all connected clients
          io.emit('mqttMessage', payload);
        } else if (topic === 'Temp' || topic === 'Humid' || topic === 'esp32/test') {
          const payload = { topic, message: message.toString() };
    
          // Emit the payload to all connected clients
          io.emit('mqttMessage', payload);
        }
      } catch (error) {
        console.error(`Error processing MQTT message for topic '${topic}':`, error);

      }
    });
    
    const handleTimeRoute = async (timestamp) => {
      let client;  // Declare client outside the try block
    
      try {
        client = await connectToDatabase();
    
        const db = client.db('accounts');
        const timeCollection = db.collection('time');
    
        // Specify the write concern as 'majority'
        const writeConcern = { w: 'majority' };
    
        const result = await timeCollection.insertOne({ timestamp }, { writeConcern });
    
        console.log('Timestamp added to the "time" collection successfully:', result);
      } catch (error) {
        console.error('Error handling Time data:', error);
      } finally {
        if (client) {
          client.close();
        }
      }
    };
    
    
    async function saveTimestampToDatabase(timestamp) {
      let client;
      try {
        client = await connectToDatabase();
        const db = client.db('accounts');
        const timeCollection = db.collection('time');
    
        const result = await timeCollection.insertOne({ timestamp });
    
        if (result.insertedCount > 0) {
          console.log('Timestamp added to the "time" collection successfully.');
        } else {
          console.error('Failed to insert timestamp into the "time" collection.');
        }
      } catch (error) {
        console.error('Error saving timestamp to database:', error.message);
      } finally {
        if (client) {
          client.close();
        }
      }
    }
const connectToDatabase = async () => {
    try {
        const client = new MongoClient(mongoHost, { useUnifiedTopology: true });
        await client.connect();
        return client;
    } catch (error) {
        console.error('Error connecting to the database:', error);
        throw error;
    }
};

const handleServerError = (res, error, message) => {
    console.error('Error:', error);
    res.status(500).json({ success: false, error: `${message} - ${error.message}` });
};

const handleRoute = async (req, res, collectionName) => {
    let client;
    try {
        const { title, latitude, longitude } = req.body;
        if (!title || !latitude || !longitude) {
            return res.status(400).json({ success: false, error: 'Missing required fields' });
        }

        client = await connectToDatabase();
        const db = client.db('accounts');
        const collection = db.collection(collectionName);

        console.log(`Received ${collectionName} data:`, req.body);

        const result = await collection.insertOne({
            title,
            latitude: parseFloat(latitude),
            longitude: parseFloat(longitude),
        });

        console.log('MongoDB Insert Result:', result);

        if (result.insertedCount > 0) {
            res.json({ success: true, message: `${collectionName} added successfully`, data: result.ops[0] });
        } else {
            console.error('MongoDB Insert Error:', result);
            res.status(500).json({ success: false, error: `Done ${collectionName}` });
        }
    } catch (error) {
        console.error(`Error handling /${collectionName} route:`, error);
        res.status(500).json({ success: false, error: `Failed to handle /${collectionName} endpoint` });
    } finally {
        if (client) {
            client.close();
        }
    }
};


const markerTypes = ['conventional', 'sprinkler', 'hydrants', 'extinguisher','fdas'];
markerTypes.forEach((type) => {
    app.post(`/${type}`, async (req, res) => {
        await handleRoute(req, res, type);
    });

    app.get(`/${type}`, async (req, res) => {
        try {
            const client = await connectToDatabase();
            const db = client.db('accounts');
            const collection = db.collection(type);

            const result = await collection.find({}).toArray();

            client.close();

            const markers = result.map(row => ({
                latitude: row.latitude,
                longitude: row.longitude,
                title: row.title,
            }));

            res.json(markers);
        } catch (error) {
            handleServerError(res, error, `Failed to retrieve ${type}`);
        }
    });
});




const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/'); // Set the folder where files will be uploaded
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname); // Use the original name for the uploaded file
  }
});

// Function to determine the upload path dynamically based on request data
function determineUploadPath(req) {
  // Logic to determine the upload path based on req or any other criteria
  // For example, you might extract path information from the request or use user-specific data
  
  // Return the path where you want to store the uploaded file
  return path.join(__dirname, '/uploads');// Replace this with your desired upload path
}

const upload = multer({ storage });


app.use(
  session({
    secret: "mySecretKeyForSessionHandling123",
    resave: false,
    saveUninitialized: false,
  })
);



app.get("/", (req, res) => {
    res.render("login"); 
});



app.get('/register', (req, res) => {
  res.render('register', { errors: [] }); // Pass an empty errors array
});



app.get("/location", authMiddleware.requireLogin, async (req, res) => {
  try {
    const userId = req.session.user._id; // Assuming the user ID is stored in the session
    const userData = await Admin1.findById(userId); // Fetch user data based on ID

    // Ensure userData is defined before rendering the view
    if (userData) {
      res.render("location", { user: userData });
    } else {
      // Handle the case where user data is not found
      res.status(404).send("User data not found");
    }
  } catch (error) {
    console.error('Error fetching user data:', error);
    res.status(500).send('Error fetching user data: ' + error.message);
  }
});




app.get("/user", authMiddleware.requireLogin, async (req, res) => {
  try {
    const userId = req.session.user._id; // Assuming the user ID is stored in the session
    const userData = await Admin1.findById(userId); // Fetch user data based on ID

    // Ensure userData is defined before rendering the view
    if (userData) {
      res.render("user", { user: userData });
    } else {
      // Handle the case where user data is not found
      res.status(404).send("User data not found");
    }
  } catch (error) {
    console.error('Error fetching user data:', error);
    res.status(500).send('Error fetching user data: ' + error.message);
  }
});


app.get('/test', async (req, res) => {
  try {
      const client = await connectToDatabase();
      const db = client.db('accounts');
      
      // Fetch data from the 'user' collection
      const usersCollection = db.collection('users');
      const users = await usersCollection.find({}).toArray();

      // Fetch data from the 'fdas' collection
      const fdasCollection = db.collection('fdas');
      const fdas = await fdasCollection.find({}).toArray();

      client.close();

      // Render the test.ejs template with user and FDAS data
      res.render('test', { users, fdas });
  } catch (error) {
      // Handle the error (e.g., display an error message)
      console.error('Error fetching data for test page:', error);
      res.status(500).send('Error fetching data for test page: ' + error.message);
  }
});


app.get("/combinedData", authMiddleware.requireLogin, async (req, res) => {
  try {
    const userId = req.session.user._id;
    const userData = await User.findById(userId);

    // Fetch data from 'users' collection
    const usersData = await User.find({}, { _id: 0, email: 1, username: 1, FDASID: 1 });

    // Fetch data from 'fdas' collection
    const fdasData = await FDAS.find({}, { _id: 0, title: 1, latitude: 1, longitude: 1 });

    // Ensure userData is defined before rendering the view
    if (userData) {
      res.render("combinedData", { user: userData, usersData, fdasData });
    } else {
      res.status(404).send("User data not found");
    }
  } catch (error) {
    console.error('Error fetching user data:', error);
    res.status(500).send('Error fetching user data: ' + error.message);
  }
});










app.get("/userUser", authMiddleware.requireLogin, async (req, res) => {
  try {
    const userId = req.session.user._id; // Assuming the user ID is stored in the session
    const userData = await User.findById(userId); // Fetch user data based on ID

    // Ensure userData is defined before rendering the view
    if (userData) {
      res.render("userUser", { user: userData });
    } else {
      // Handle the case where user data is not found
      res.status(404).send("User data not found");
    }
  } catch (error) {
    console.error('Error fetching user data:', error);
    res.status(500).send('Error fetching user data: ' + error.message);
  }
});


app.get("/alert", authMiddleware.requireLogin, async (req, res) => {
  try {
    const userId = req.session.user._id; // Assuming the user ID is stored in the session
    const userData = await Admin1.findById(userId); // Fetch user data based on ID

    // Ensure userData is defined before rendering the view
    if (userData) {
      res.render("alert", { user: userData });
    } else {
      // Handle the case where user data is not found
      res.status(404).send("User data not found");
    }
  } catch (error) {
    console.error('Error fetching user data:', error);
    res.status(500).send('Error fetching user data: ' + error.message);
  }
});

app.get("/database", authMiddleware.requireLogin, async (req, res) => {
  try {
    const userId = req.session.user._id; // Assuming the user ID is stored in the session
    const userData = await Admin1.findById(userId); // Fetch user data based on ID

    // Ensure userData is defined before rendering the view
    if (userData) {
      res.render("database", { user: userData });
    } else {
      // Handle the case where user data is not found
      res.status(404).send("User data not found");
    }
  } catch (error) {
    console.error('Error fetching user data:', error);
    res.status(500).send('Error fetching user data: ' + error.message);
  }
});


app.get("/AboutUs", authMiddleware.requireLogin, async (req, res) => {
  try {
    const userId = req.session.user._id; // Assuming the user ID is stored in the session
    const userData = await Admin1.findById(userId); // Fetch user data based on ID

    // Ensure userData is defined before rendering the view
    if (userData) {
      res.render("AboutUs", { user: userData });
    } else {
      // Handle the case where user data is not found
      res.status(404).send("User data not found");
    }
  } catch (error) {
    console.error('Error fetching user data:', error);
    res.status(500).send('Error fetching user data: ' + error.message);
  }
});


app.get("/userAboutUs", authMiddleware.requireLogin, async (req, res) => {
  try {
    const userId = req.session.user._id; // Assuming the user ID is stored in the session
    const userData = await User.findById(userId); // Fetch user data based on ID

    // Ensure userData is defined before rendering the view
    if (userData) {
      res.render("userAboutUs", { user: userData });
    } else {
      // Handle the case where user data is not found
      res.status(404).send("User data not found");
    }
  } catch (error) {
    console.error('Error fetching user data:', error);
    res.status(500).send('Error fetching user data: ' + error.message);
  }
});

app.get("/charts", authMiddleware.requireLogin, async (req, res) => {
  try {
    const userId = req.session.user._id; // Assuming the user ID is stored in the session
    const userData = await Admin1.findById(userId); // Fetch user data based on ID

    // Ensure userData is defined before rendering the view
    if (userData) {
      res.render("charts", { user: userData });
    } else {
      // Handle the case where user data is not found
      res.status(404).send("User data not found");
    }
  } catch (error) {
    console.error('Error fetching user data:', error);
    res.status(500).send('Error fetching user data: ' + error.message);
  }
});


app.post('/associateFDAS', async (req, res) => {
  try {
    const { userId, fdasId } = req.body;

    console.log('Received request to associate FDAS. User ID:', userId, 'FDAS ID:', fdasId);

    // Check if fdasId is not empty before attempting to cast to ObjectId
    if (!fdasId) {
      console.log('FDAS ID is empty. Aborting association.');
      return res.status(400).json({ success: false, message: 'FDAS ID cannot be empty' });
    }

    const user = await User.findByIdAndUpdate(userId, { FDASID: fdasId }, { new: true });

    if (!user) {
      console.log('User not found for userId:', userId);
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    console.log('FDAS associated successfully for userId:', userId, 'with FDAS ID:', fdasId);
    // Additional log to show the updated user details
    console.log('Updated user details:', user);

    res.json({ success: true, message: 'FDAS associated successfully', user });
  } catch (error) {
    console.error('Error associating FDAS:', error);
    res.status(500).json({ success: false, message: 'Internal server error', error: error.stack });
  }
});


app.get("/adminHome", authMiddleware.requireLogin, async (req, res) => {
  try {
    // Connect to the 'accounts' database
    const client = await connectToDatabase();
    const db = client.db('accounts');

    // Fetch users data from the 'users' collection
    const usersCollection = db.collection('users');
    const users = await usersCollection.find().toArray();

    // Fetch FDAS data from the 'fdas' collection
    const fdasCollection = db.collection('fdas');
    const fdasData = await fdasCollection.find({}, { projection: { title: 1, _id: 1 } }).toArray();

    console.log('fdasData:', JSON.stringify(fdasData, null, 2));


    // Check if there's a confirmation message
    const confirmationMessage = req.query.confirmationMessage;

    // Ensure both users and fdasData are defined before rendering the view
    if (users.length > 0 && fdasData.length > 0) {
      res.render("adminHome", { user: req.session.user, users, fdasData, confirmationMessage });
    } else if (users.length === 0) {
      res.status(404).send("Users not found");
    } else {
      res.status(404).send("FDAS data not found");
    }
  } catch (error) {
    console.error('Error fetching data:', error);
    res.status(500).send('Internal Server Error');
  }
});


app.get('/userHome', async (req, res) => {
  try {
    // Get the currently logged-in user from the session
    const loggedUser = req.session.user;

    // Check if a user is logged in
    if (loggedUser) {
      // Fetch the user from the database to get updated data (you might have additional fields)
      const user = await User.findById(loggedUser._id);

      // Check if the user and associated FDAS ID exist
      if (user && user.FDASID) {
        // Fetch the associated FDAS using the FDAS ID
        const associatedFDAS = await FDAS.findById(user.FDASID);

        // Render your page with the associated FDAS data
        res.render('userHome', { user, fdasData: [associatedFDAS] });
      } else {
        // Handle the case where user or associated FDAS ID is not found
        res.render('userHome', { user, fdasData: [] }); // You can customize this as needed
      }
    } else {
      // User is not logged in, redirect to the login page or handle it accordingly
      res.redirect('/login');
    }
  } catch (error) {
    console.error('Error fetching user or associated FDAS:', error);
    // Handle the error and render an appropriate response
    res.status(500).send('Internal Server Error');
  }
});




app.get("/logout", (req, res) => {
  // Perform logout actions here, such as clearing session data
  // For example, if using sessions:
  req.session.destroy(err => {
      if (err) {
          console.error("Error destroying session:", err);
          res.redirect("/"); // Redirect to home or login page
      } else {
          res.redirect("/"); // Redirect to home or login page after successful logout
      }
  });
});

app.get('/api/humidityData', async (req, res) => {
  const client = await connectToDatabase();
  const db = client.db('accounts');
  const humidityCollection = db.collection('humidity');

  const humidityData = await humidityCollection.find({}).toArray();

  client.close();
  res.json(humidityData);
});

app.get('/api/temperatureData', async (req, res) => {
  const client = await connectToDatabase();
  const db = client.db('accounts');
  const temperatureCollection = db.collection('temperature');

  const temperatureData = await temperatureCollection.find({}).toArray();

  client.close();
  res.json(temperatureData);
});


app.get('/time', async (req, res) => {
  // Fetch and send the data from the 'time' collection
  const client = await connectToDatabase();
  const db = client.db('accounts');
  const timeCollection = db.collection('time');
  
  const result = await timeCollection.find({}).toArray();
  
  client.close();
  
  res.json(result);
});

app.get("/sensor", (req, res) => {
  res.render("sensor"); // Renders the sensor.ejs file
});

app.get('/login', (req, res) => {
  res.render('login'); // Render the login page (assuming you have a login.ejs or similar file)
});


app.get('/profile', authMiddleware.requireLogin, async (req, res) => {
  try {
    const userId = req.session.user._id; // Assuming the user ID is stored in the session
    const userData = await collection.findById(userId); // Fetch user data based on ID

    res.render('profile', { user: userData });
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).send('Error fetching profile: ' + error.message);
  }
});

app.get('/profile/change-password', authMiddleware.requireLogin, (req, res) => {
  res.render('change-password'); // Render a form to change password
});









// Add a new route in your express app
app.get("/userList", authMiddleware.requireLogin, async (req, res) => {
  try {
    const usersData = await User.find({}, { _id: 1, email: 1, username: 1, role: 1, FDASID: 1 });

    res.render("userList", { usersData });
  } catch (error) {
    handleServerError(res, error, "Failed to retrieve user list");
  }
});

// Edit user route
// Express route for rendering the editUser form
app.get("/editUser/:id", async (req, res) => {
  try {
    const userId = req.params.id;

    // Find the user by ID
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).send("User not found");
    }

    // Fetch the FDAS document based on the user's FDASID
    const fdasDocument = await FDAS.findOne({ FDASID: user.FDASID });

    if (!fdasDocument) {
      return res.status(404).send("FDAS document not found");
    }

    // Extract the title from the FDAS document
    const fdasTitle = fdasDocument.title;

    // Render the editUser form with user and FDAS information
    res.render("editUser", { user, fdasTitle });
  } catch (error) {
    console.error("Error during editUser:", error);
    res.status(500).send("Error during editUser: " + error.message);
  }
});


// Handle user edit form submission
app.post("/editUser/:id", authMiddleware.requireLogin, async (req, res) => {
  const userId = req.params.id;
  const { username, email, role } = req.body;

  try {
    await User.findByIdAndUpdate(userId, { $set: { username, email, role,FDASID } });
    res.redirect("userList");
  } catch (error) {
    handleServerError(res, error, "Error updating user data");
  }
});

// Delete user route

app.get("/deleteUser/:id", authMiddleware.requireLogin, async (req, res) => {
  const userId = req.params.id;

  try {
    // Check if the user exists before attempting to delete
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // User exists, proceed with deletion
    await User.findByIdAndDelete(userId);
    res.redirect("userList");
  } catch (error) {
    handleServerError(res, error, "Error deleting user");
  }
});



app.post('/updateUser/:id', async (req, res) => {
  try {
    // Fetch user data by ID
    const user = await User.findById(req.params.id);
  
    // Check if the user exists
    if (!user) {
      return res.status(404).send('User not found');
    }
  
    // Update user data based on the form submission
    user.email = req.body.email;
    user.username = req.body.username;
    user.role = req.body.role;
    user.FDASID = req.body.FDASID;
  
    // Save the updated user data
    await user.save();
  
    // Redirect to the user list or any other appropriate page
    res.redirect('/userList');
  } catch (error) {
    // Handle any errors that occur during data updating
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
  
});



// Assume you have a route to display all FDAS titles and coordinates

app.get("/connectFDAS/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;

    // Fetch user by ID
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).send("User not found");
    }

    // Fetch all FDAS documents
    const fdasList = await FDAS.find({}, { title: 1 }).lean();

    // Render a form to connect FDAS to the user
    res.render("connectFDAS", { user, fdasList });
  } catch (error) {
    console.error("Error fetching user for connection:", error);
    res.status(500).send("Error fetching user for connection: " + error.message);
  }
});

// Add this route after the existing "connectFDAS" route

app.post("/connectFDASPost", async (req, res) => {
  try {
    const userId = req.body.userID; // Get user ID from form submission
    const selectedFDASID = req.body.selectedFDASID; // Get selected FDAS ID from form submission

    // Find the user by ID
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).send("User not found");
    }

    // Update the user with the selected FDAS ID
    await User.findByIdAndUpdate(userId, { connectedFDASID: selectedFDASID });

    res.redirect("/test"); // Redirect to the dashboard or another appropriate page
  } catch (error) {
    console.error("Error connecting FDAS to user:", error);
    res.status(500).send("Error connecting FDAS to user: " + error.message);
  }
});




app.post('/profile/change-password', authMiddleware.requireLogin, async (req, res) => {
  try {
    const userId = req.session.user._id; // Assuming the user ID is stored in the session
    const { currentPassword, newPassword, confirmNewPassword } = req.body;

    // Fetch the user from the database
    const user = await collection.findById(userId);

    // ... (password change logic similar to the previous example)

    // Update the user's password in the database
    await collection.findByIdAndUpdate(userId, { password: hashedPassword });

    res.redirect('/profile'); // Redirect back to the profile page after updating password
  } catch (error) {
    console.error('Error updating password:', error);
    res.status(500).send('Error updating password: ' + error.message);
  }
});
app.post('/profile/save', authMiddleware.requireLogin, upload.single('profilePicture'), async (req, res) => {
  try {
    const userId = req.session.user._id; // Assuming the user ID is stored in the session
    const { username, email, phone } = req.body;

    let profilePicturePath = req.file ? req.file.path : ''; // Get the uploaded file path if it exists

    // Update the user's profile in the database, including the profile picture path if it exists
    const updateData = { username, email, phone };
    if (profilePicturePath) {
      updateData.profilePicture = profilePicturePath;
    }

    await collection.findByIdAndUpdate(userId, updateData);

    // Update the user's session with the new username
    req.session.user.username = username;

    res.redirect('/user'); // Redirect back to the profile page after saving changes
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).send('Error updating profile: ' + error.message);
  }
});








app.post("/login", async (req, res) => {
  try {
    const { userOrEmail, password } = req.body;

    // Find admin with matching email or username
    const admin = await Admin1.findOne({
      $or: [
        { email: { $regex: new RegExp(userOrEmail, "i") } },
        { username: { $regex: new RegExp(userOrEmail, "i") } },
      ],
    });

    // Find user with matching email or username
    const user = await User.findOne({
      $or: [
        { email: { $regex: new RegExp(userOrEmail, "i") } },
        { username: { $regex: new RegExp(userOrEmail, "i") } },
      ],
    });

    if (admin || user) {
      const foundUser = admin || user;

      // Check if the provided password matches the user's hashed password
      const isPasswordMatch = await bcrypt.compare(password, foundUser.password);

      if (isPasswordMatch) {
        req.session.user = foundUser; // Save user data in session if needed

        if (foundUser.role === 'admin') {
          // Redirect to admin dashboard or perform admin-specific actions
          res.redirect('/adminHome');
        } else {
          // Redirect to regular user dashboard or perform user-specific actions
          res.redirect('/userHome');
        }
      } else {
        // Password doesn't match
        res.render("login", { errorMessage: "Wrong password" });
      }
    } else {
      // No admin or user found with the provided email or username
      res.render("login", { errorMessage: "User not found" });
    }
  } catch (error) {
    console.error(error);
    res.send("Error during login");
  }
});




app.post('/profile/change-password', authMiddleware.requireLogin, async (req, res) => {
  try {
    const userId = req.session.user._id; // Assuming the user ID is stored in the session
    const { currentPassword, newPassword, confirmNewPassword } = req.body;

    const user = await User.findById(userId);

    // Check if the provided current password matches the stored password
    const isPasswordMatch = await bcrypt.compare(currentPassword, user.password);

    if (!isPasswordMatch) {
      return res.render('change-password', { errorMessage: 'Current password is incorrect' });
    }

    // Check if the new password and confirm new password match
    if (newPassword !== confirmNewPassword) {
      return res.render('change-password', { errorMessage: 'New password and confirm password do not match' });
    }

    // Hash the new password before updating in the database
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update the user's password in the database
    await User.findByIdAndUpdate(userId, { password: hashedPassword });

    res.redirect('/profile'); // Redirect back to the profile page after updating password
  } catch (error) {
    console.error('Error updating password:', error);
    res.status(500).send('Error updating password: ' + error.message);
  }
});


app.post('/profile/save', authMiddleware.requireLogin, upload.single('profilePicture'), async (req, res) => {
  try {
    const userId = req.session.user._id; // Assuming the user ID is stored in the session
    const { username, email } = req.body;

    let profilePicturePath = ''; // Initialize an empty path

    // Check if a file was uploaded
    if (req.file) {
      profilePicturePath = req.file.path; // Get the uploaded file path
    } else {
      throw new Error('No file uploaded'); // Throw an error if no file is uploaded
    }

    // Update the user's profile in the database, including the profile picture path
    await collection.findByIdAndUpdate(userId, { username, email, profilePicture: profilePicturePath });

    res.redirect('/profile'); // Redirect back to the profile page after saving changes
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).send('Error updating profile: ' + error.message);
  }
});


app.post('/update-fdas/:id', async (req, res) => {
  try {
      const fdasId = req.params.id;
      const { title, latitude, longitude } = req.body;

      const client = await connectToDatabase();
      const fdasCollection = client.db('accounts').collection('fdas');

      // Update the FDAS entry with the provided data
      await fdasCollection.updateOne({ _id: new ObjectId(fdasId) }, { $set: { title, latitude, longitude } });

      client.close();

      // Redirect back to the dashboard after the update
      res.redirect('/test');
  } catch (error) {
      // Handle the error (e.g., display an error message)
      console.error('Error updating FDAS entry:', error);
      res.status(500).send('Error updating FDAS entry: ' + error.message);
  }
});

// Handle SIGINT to disconnect from MongoDB before app termination
process.on('SIGINT', () => {
  mongoose.connection.close(() => {
    console.log('MongoDB disconnected through app termination');
    process.exit(0);
  });
});

// Connect to MongoDB before setting up express app
/*(async () => {
  try {
    await mongoose.connect("mongodb+srv://systembfp8:iwantaccess@bfp.ezea3nm.mongodb.net/accounts", { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('Connected to MongoDB');

    // Set up express app and routes here
  

    // Function to generate FDASID and update records
    const connectAndFetchData = async () => {
      try {
        // Fetch records from users collection in accounts database
        const usersRecords = await FDAS.find({}, { FDASID: 1 }).lean();

        // Generate and update FDASID for each record in users collection
        const year = 2024;
        let count = 1;

        for (const record of usersRecords) {
          const fdasid = generateFDASID(year, count++);
          await FDAS.updateOne({ _id: record._id }, { $set: { FDASID: fdasid } });
        }

        console.log('FDASID generation and update successful.');
      } catch (error) {
        console.error('Error during FDASID generation and update:', error);
      }
    };*/

    app.post("/register", [
      // Validation using express-validator (example validation rules)
      body("email").isEmail().normalizeEmail(),
      body("username").notEmpty().trim(),
      body("password").isLength({ min: 8 }).withMessage("Password must be at least 8 characters long").trim(),
    ], async (req, res) => {
      try {
        const errors = validationResult(req).array();
    
        if (errors.length > 0) {
          // If there are validation errors, render signup form with errors
          return res.render("register", { errors });
        }
    
        const { email, username, password } = req.body;
    
        // Check for existing user by email or username before creating a new user
        const existingUserByEmail = await User.findOne({ email });
        const existingUserByUsername = await User.findOne({ username });
    
        if (existingUserByEmail || existingUserByUsername) {
          const existingErrors = [];
    
          if (existingUserByEmail) {
            existingErrors.push({ param: "email", msg: "Email already exists. Please choose a different one." });
          }
          if (existingUserByUsername) {
            existingErrors.push({ param: "username", msg: "Username already exists. Please choose a different one." });
          }
    
          // Render signup form with existing user errors
          return res.render("register", { errors: existingErrors });
        }
    
        // Use a MongoDB sequence to generate the next FDASID
      /*  const result = await FDAS.collection.findOneAndUpdate(
          { _id: "FDASID" },
          { $inc: { sequence_value: 1 } },
          { returnDocument: "after" }
        );
    
        const nextFDASID = (result && result.value && result.value.sequence_value) || 1;*/
    
        // Hash the password before saving to the database
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
    
        // Save user data to the database with the generated FDASID
        /*const newUser = */await User.create({ email, username, password: hashedPassword/*, FDASID: nextFDASID */});
    
        // Redirect to login or another appropriate page after successful signup
        return res.redirect("/login");
      } catch (error) {
        console.error("Error during register:", error);
    
        // Handle the error
        res.status(500).send("Error during register: " + error.message);
      }
    });
    
    
    // Start the express app
    app.listen(5000, () => {
      console.log("Server listening on port 5000");
    });
  /*} catch (error) {
    console.error('Error connecting to MongoDB:', error);
  }
})();*/