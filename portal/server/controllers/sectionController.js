const {PrismaClient} = require('@prisma/client');
const prisma = new PrismaClient();



const getAllSections = async(req,res)=>{
    try{
        const sections = await prisma.section.findMany(
            {include: {students:true}}
        );
        res.json(sections);
    }catch(err){
        console.error('Cannot fetch sections',err);
        res.status(500).json({error: 'Failed to fetch'})
    }
}


module.exports  = {
    getAllSections
};