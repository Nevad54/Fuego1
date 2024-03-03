// authMiddleware.js

const requireLogin = (req, res, next) => {
    if (req.session && req.session.user) {
      // User is logged in
      next(); // Continue to the next middleware or route handler
    } else {
      // User is not logged in, redirect to login page
      res.redirect('/'); // Redirect to the login page or any other appropriate page
    }
  };
  
  module.exports = { requireLogin };
  