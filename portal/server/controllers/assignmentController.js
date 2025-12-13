const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { assignmentDeletionQueue } = require('../queues/assignmentDeletionQueue');
require('dotenv').config();  // Add this to load .env variables


const createAssignment = async (req, res) => {
    try {
        //WHWEN ASSIGNMENT IS CREATED CRREATE A LAB TOO IF IT IS A LAB
        const { title, dueDate,  type, sectionIds = [] } = req.body;

        if (!title) return res.status(400).json({ error: 'Missing title field' });

        const assignment = await prisma.assignment.create({
            data: {
                title,
                dueDate: dueDate ? new Date(dueDate) : null,
                type: type || null,
                sections: {
                    create: sectionIds.map((sectionId) => ({
                        section: { connect: { id: Number(sectionId) } }
                    }))
                }
            },
            include: {
                sections: { select: { sectionId: true } },//only need section id
                submissions: { select: { id: true } } //only need the submission id
            }
        });
        return res.json(assignment);
    } catch (err) {
        console.error('Error creating assignment: ', err.message);
        return res.status(500).json({ error: 'Failed to create assignment.' });

    }
};

const getAllAssignments = async (req, res) => {
    const includeDrafts = req.session.user?.role === 'admin';
    try {
        const assignments = await prisma.assignment.findMany({
            where: includeDrafts ? {} : { isDraft: false },
            include: {
                sections: { select: { sectionId: true } },
                submissions: { select: { id: true } }
            }
        });
        return res.json(assignments);
    } catch (err) {
        console.log(err);
        return res.status(500).json({ error: 'Failed to fetch' });
    }
};

const getAssignment = async (req, res) => {
    const { id } = req.params;
    try {
        const assignment = await prisma.assignment.findUnique({
            where: { id: Number(id) },
            include: {
                sections: { select: { sectionId: true } },
                submissions: { select: { id: true } }
            }
        });
        return res.json(assignment);

    } catch (err) {
        console.log('Cannot /get assignment ', err);
        return res.status(400).json({ error: 'Failed to get assignment' });
    }
}

const updateAssignment = async (req, res) => {
    const { id } = req.params;
    const { title, dueDate, showExplanations, labId, isDraft, sectionIds } = req.body;
    const data = {};
    try {
        if (title !== undefined) data.title = title;
        if (dueDate !== undefined) data.dueDate = dueDate ? new Date(dueDate) : null;
        if (showExplanations !== undefined) data.showExplanations = showExplanations;
        if (labId !== undefined) data.labId = labId;
        if (isDraft !== undefined) data.isDraft = isDraft;

        //if you update the secions, if a person subvmits an assignment but is no longer assigned 
        //due to this section change, you should delete their submission! 
        //NOT DONE YET
        const sectionWrites = Array.isArray(sectionIds) //check is sectionId is not null or not an array
            ? {
                sections: {
                    deleteMany: {}, //clear every existing row in the 
                    // //assignment section join table for thisassignment
                    create: sectionIds.map((sectionId) => ({ //create new connections 
                        section: { connect: { id: Number(sectionId) } }
                    }))
                }
            }
            : {};

        const updatedAssignment = await prisma.assignment.update({
            where: { id: Number(id) },
            data: {
                ...data,
                ...sectionWrites
            },
            include: {
                sections: { select: { sectionId: true } },
                submissions: { select: { id: true } }
            }
        });
        return res.json(updatedAssignment);
    } catch (err) {
        console.error('Update Assignment Error', err);
        return res.status(400).json({ error: 'Failed to update assignment' });
    }
};

const deleteAssignment = async (req, res) => {
    const { assignmentId } = req.params;
    console.log(assignmentId);
    if (!assignmentId) return res.status(400).json({ error: 'missing assignment Id' });
    try {
        //execute multiple prisma requests sequentially
        const assignment = await prisma.assignment.findUnique({
            where: { id: Number(assignmentId) }
        });
        if (!assignment) return res.status(404).json({ error: 'assignment not found' });

        //CALL THE QUEUE FOR DELETING ASSIGNMENTS ASYNCHRONOUSLY
        await assignmentDeletionQueue.add('delete-assignment', {
            assignmentId: assignment.id,
            labId: assignment.labId
        });

        return res.json({ assignmentId: assignment.id });
    } catch (err) {
        console.console.error('deleteAssignment enqueue Error', err);
        return res.status(500).json({ error: 'Failed to update assignment' });
    }
}


module.exports = { deleteAssignment, createAssignment, getAllAssignments, updateAssignment, getAssignment };