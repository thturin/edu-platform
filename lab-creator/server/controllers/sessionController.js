const axios = require('axios');
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();


const deleteSession = async (req,res) =>{
    const {labId} = req.params;
    if (!labId) return res.status(400).json({ error: 'missing assignment Id' });

    try {
        await prisma.session.deleteMany({
            where: { labId: Number(labId) }
        });
        return res.json({ message: 'Session deleted successfully' });
    } catch (err) {
        console.error('Error deleting session:', err);
        res.status(500).json({ error: 'Failed to delete session' });
    }
    return res.json({ message: 'Assignment and associated data deleted successfully' });}


const saveSession = async (req, res) => {
    const { session } = req.body;
    const { responses, gradedResults, finalScore, userId, labId, labTitle, username } = session;

    if (!labId || !userId) {
        return res.status(400).json({ error: 'Missing labId or userId' });
    }

    try {
        //upsert updates if session exists, or create if it does not
        const newSession = await prisma.session.upsert({
            where: { labId_userId: { labId, userId } },
            update: { 
                labTitle,
                username,
                responses,
                gradedResults,
                finalScore
             },
            create: {
                labId, 
                labTitle,
                username,
                userId,
                responses,
                gradedResults,
                finalScore 
            }
        });
        return res.json({ message: 'Session Saved', newSession });
    } catch (err) {
        console.error('Error in saveSession()->', err);
        return res.json({ error: 'Could not save session' });
    }
};

const getSessions = async (req, res) => {
    try {
        const sessions = await prisma.session.findMany();
        return res.json(sessions);
    } catch (err) {
        console.error('Error in getSessions()->', err);
        return res.status(500).json({ error: 'Could not get sessions' });
    }
}

const getSessionsByLabId = async (req,res)=>{
    const {labId} = req.query;
    if(!labId) return res.status(400).json({error:'missing labId`   '});
    try{
        const sessions = await prisma.session.findMany({
            where:{labId: Number(labId)}
        });
        return res.json(sessions);
    }catch(err){
        console.error('Error in getSessionsByAssignmentId()->', err);
        return res.status(500).json({ error: 'Could not get sessions by assignmentId' });
    }

}

const loadSession = async (req, res) => {
    const { labId } = req.params;
    const { userId, username, title } = req.query;

    try {
        let session = await prisma.session.findUnique({
            where: { labId_userId: { labId: Number(labId), userId: Number(userId) } }
        });
    
        if (!session) {
            console.log('No session found, creating new one');
            session = await prisma.session.create({
                data: {
                    labTitle: title,
                    labId: Number(labId),
                    userId: Number(userId),
                    username,
                    responses: {},
                    gradedResults: {},
                    gradedResults: {},
                    finalScore: {},
                }
            });

        }else{
           // console.log('session already exists->',JSON.stringify(session));
        }
        //console.log(JSON.stringify(session));
        return res.json({ session });
    } catch (err) {
        console.error('Error in getSession()->', err);
        return res.json(500).json({ error: 'Count not get session' });
    }
}

module.exports = { saveSession, loadSession, getSessions, deleteSession ,getSessionsByLabId};