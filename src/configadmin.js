// configadmin.js

const mongoose = require('mongoose');

mongoose.connect("mongodb://127.0.0.1:27017/admin", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log("Database Connected Successfully");
})
  .catch((error) => {
  console.error("Database connection error:", error);
});

const Loginschema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true
  },
  username: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  profilePicture: {
    type: String,
    dafault: 'D:\Downloads\Fuego1\public\images\profile-icon.jpg' // This field holds the path to the uploaded image
  },
  phone: {
    type: String,
    required: false
  },
});

const collection = mongoose.model("admin", Loginschema);

module.exports = collection; // Correct way to export the 'collection'
