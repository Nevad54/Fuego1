const mongoose = require('mongoose');

mongoose.connect("mongodb+srv://systembfp8:iwantaccess@bfp.ezea3nm.mongodb.net/accounts", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log("Database Connected Successfully");
})
.catch((error) => {
  console.error("Database connection error:", error);
});

// adminSchema
const adminSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
  },
  username: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  profilePicture: {
    type: String,
    default: 'D:\\Downloads\\Fuego1\\public\\images\\profile-icon.jpg',
  },
  phone: {
    type: String,
    required: false,
  },
  role: {
    type: String,
    default: 'admin',
  },
});

// userSchema
const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
  },
  username: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  profilePicture: {
    type: String,
    default: 'D:\\Downloads\\Fuego1\\public\\images\\profile-icon.jpg',
  },
  phone: {
    type: String,
    required: false,
  },
  role: {
    type: String,
    default: 'user',
  },
/* FDASID: {
    type: String,
    unique: true,
    required: false,
  },
*/

FDASID: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'FDAS',
  unique: true, // Ensure uniqueness
},
  
});


const fdasSchema = new mongoose.Schema({

  title: {
    type: String,
    required: true,
  },
  latitude: {
    type: Number,
    required: true,
  },
  longitude: {
    type: Number,
    required: true,
  },
});











const FDAS = mongoose.model('FDAS', fdasSchema);
const Admin1 = mongoose.model("Admin", adminSchema);
const User = mongoose.model("User", userSchema);

module.exports = { User, Admin1, FDAS };