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



module.exports = { extractAndSaveImages, processBlockImages};
