const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const {exportAssignmentsCsv,exportAssignmentsCsvByName} = require('../controllers/adminController');

//ROOT LOCALHOST:5000/api/admin

router.get('/exportAssignment',exportAssignmentsCsvByName);


module.exports = router;