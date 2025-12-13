const express = require('express');
const router = express.Router();
const {getAllSections} = require('../controllers/sectionController');

//ROOT LOCALHOST:5000/api/sections

router.get('/',getAllSections);


module.exports = router;