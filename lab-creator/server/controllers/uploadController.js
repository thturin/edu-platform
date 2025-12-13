const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');


//ensure the folder exists
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
};

const extractAndSaveImages = (str) => {
    // Find base64 image patterns in HTML
    const base64Pattern = /src="(data:image\/[^;]+;base64,[^"]+)"/g;
    let match;
    let processedStr = str;
    while((match=base64Pattern.exec(str)) !== null){
        const base64Data = match[1];// "data:image/png;base64,iVBORw0KGgoAAAA..."
        const [header,base64] = base64Data.split(','); 
        const fileType = header.match(/data:image\/([^;]+)/)[1]; //png or jpeg
        //generate filename and save
        const filename = crypto.randomBytes(16).toString('hex') + '.' + fileType;
        const filepath = path.join(uploadsDir,filename);

        //convert base64 to file
        const buffer = Buffer.from(base64, 'base64');
        fs.writeFileSync(filepath, buffer);

        //replace base64 with file url 
        const imageUrl = `/images/${filename}`;
        processedStr = processedStr.replace(base64Data, imageUrl);
        console.log(`Extracted and saved: ${imageUrl}`);
    }
    return processedStr;
};

const processBlockImages = (blocks) => {
    for (let i = 0; i < blocks.length; i++) {
        const block = blocks[i];
        if (block.blockType === 'material') {
            block['content'] = extractAndSaveImages(block['content']);
           // console.log(block['content']);
        } else if (block.blockType === 'question') {
            block['prompt'] = extractAndSaveImages(block['prompt']);
            block['explanation'] = extractAndSaveImages(block['explanation']);
            if (block.subQuestions && block.subQuestions.length > 0) {
                for (let j = 0; j < block.subQuestions.length; j++) {
                    const sq = block.subQuestions[j];
                    sq['prompt'] = extractAndSaveImages(sq['prompt']);
                    sq['explanation'] = extractAndSaveImages(sq['explanation']);
                }
            }
        }
    }
    return blocks;
};





// const storage = multer.diskStorage({
//     destination: uploadsDir,
//     filename: (req, file, cb) => {
//         const ext = path.extname(file.originalname);
//         const name = crypto.randomBytes(16).toString('hex') + ext;
//         cb(null, name);
//         //cb tells multer what to do next 
//         //null = no error, name = use this file name
//     }
// });

// const upload = multer({
//     storage,
//     limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
//     //fileFilter->function to control which files get accepted
//     fileFilter: (req, file, cb) => {
//         if (/^image\/(png|jpe?g|gif|webp)$/i.test(file.mimetype)) {
//             cb(null, true); //pass the file
//         } else {
//             cb(new Error('Only image files are allowed')); //dont pass the file
//         }
//     }
// });

// //uploads image from the uploads folder to the /images endpoint (url)
// const handleImageUpload = async (req, res) => {
//     try {
//         if (!req.file) { //no file return 400 error
//             return res.status(400).json({ error: 'No file uploaded' });
//         };
//         const url = `/images/${req.file.filename}`;
//         return res.json({ url }); //add this to the json
//     } catch (err) {
//         console.error('error in handleImageUpload in uploadController', err.message);
//         return res.status(500).json({ error: 'Upload failed' });
//     }
// }


module.exports = { extractAndSaveImages, processBlockImages};
