const express = require('express');//load express
const router = express.Router(); //create a new router object  (mini express app -> for handling routes)
const {getAssignment,createAssignment, deleteAssignment,getAllAssignments, updateAssignment} = require('../controllers/assignmentController');

//root localhost:5000/api/assignments
router.post('/',createAssignment);
router.get('/',getAllAssignments);
router.put('/:id',updateAssignment);
router.get('/:id', getAssignment);
router.delete('/delete-assignment/:assignmentId',deleteAssignment);

module.exports = router;

