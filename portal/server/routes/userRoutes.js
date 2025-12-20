const express = require('express');
const router = express.Router();
const {getAllUsers,loginUser, getUsersBySection} = require('../controllers/userController');

//ROOT LOCALHOST:5000/api/


///api/users/section?sectionId=18
router.get('/users/section',getUsersBySection);
router.get('/users', getAllUsers);
router.post('/login',loginUser);

module.exports = router;