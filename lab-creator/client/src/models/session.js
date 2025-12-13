export const createSession = ()=> (
    {
        labInfo: {
            title: "",
            username:"thturin",
            studentId: "1234",
            lastModified: new Date().toISOString(),
            status: "in-progress"
        },
        responses:{},
        gradedResults:{},
        finalScore:{
            totalScore:0,
            maxScore:0,
            percent:0
        }
    }
);


export const updateSession = (currentSession, updates)=>({
    ...currentSession, //copy everything from current session
    ...updates, //overwrite any key:value pair that is updated
    labInfo: { 
        ...currentSession.labInfo, //keep existing lab info
        ...updates.labInfo, // apply lab info updates
        lastModified: new Date().toISOString()
    } 
});