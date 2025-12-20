const {PrismaClient} = require('@prisma/client');
const prisma = new PrismaClient();

const getUsersBySection = async(req,res) => {
    try {
        const { sectionId } = req.query;
        console.log('hello world');
        if(!sectionId){
            return res.status(400).json({ error: 'sectionId query parameter is required' });
        }
        
        const users = await prisma.user.findMany({
            where: { sectionId: parseInt(sectionId) },
            select: { id: true, username: true }
        });
        
        res.json(users);
    } catch (err) {
        console.error('Error fetching users by section:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};
const getAllUsers = async(req,res) =>{
    try{
        const users = await prisma.user.findMany({
            //only id, name, and email will be included
            select:{
                id:true,
                schoolId:true,
                name:true,
                email: true,
                username: true,
                role: true,
                githubUsername: true,
                githubId: true,
                section:{
                    select:{
                        name:true
                    }
                }
            },
        });
        res.json(users);//sends users array as json response to whoever made http request
    }catch(err){
        console.error('Error fetching users',err);
        res.status(500).json({ error: 'Internal server error' });
    }

}

const loginUser = async (req, res)=>{
    const {userName, password} = req.body;

    const user = await prisma.user.findUnique({where: {username:userName}});
    if(user && user.password === password){
        req.session.user = {id:user.id, role:user.role};
        return res.json({user}); //send the user back to api 
    }else{
        res.status(404).json({error: 'User not found'});
    }
};

module.exports = {getAllUsers,loginUser, getUsersBySection};