const express = require('express');
const router = express.Router();
const {getAllUsers,loginUser} = require('../controllers/userController');

//ROOT LOCALHOST:5000/api/

router.get('/users', getAllUsers);
router.post('/login',loginUser);

module.exports = router;