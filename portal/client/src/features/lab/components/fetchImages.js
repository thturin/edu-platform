
const LAB_HOST = process.env.REACT_APP_API_LAB_HOST?.replace('/api', '') ?? '';

const resolveImageSrc = (src, labHost = LAB_HOST) => {
    //"data:image/png;base64,iVBO
    if (!src || src.startsWith('data:')) return null; // already embedded data URI

   //image from the internet
    if (/^https?:\/\//i.test(src)) return src; // already absolute

    //"/images/bae25eb7e1121019b44210660f5a831c.png"
    if (src.startsWith('/')) return `${labHost}${src}`; // server-hosted upload
    return src;
};


// -/images/bae25eb7e1121019b44210660f5a831c.png" --> localhost:14000/images/bae...png
export const getImageUrlsFromHtml = (htmlString = '') => {
    if (!htmlString) return '';
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, 'text/html');
    doc.querySelectorAll('img').forEach((img) => {
        const resolvedSrc = resolveImageSrc(img.getAttribute('src'));
        if (resolvedSrc) {
            img.setAttribute('src', resolvedSrc);
        }
    });
    return doc.body.innerHTML;
};

//
const blobToDataUrl = (blob) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
});


//for exporting json in lab builder .. the image urls must be 
export const inlineImagesAsDataUrls = async (htmlString = '') => {
    if (!htmlString) return '';
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, 'text/html');
    const images = Array.from(doc.querySelectorAll('img')); //find all <img>

    //<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAHMAAABMCAYAAABeb4ieAAAABHNCSVQICAgIfAhkiAAAABl0RVh0U29mdHdhcmU…
    //	'<p><img src="/images/bae25eb7e1121019b44210660f5a831c.png"></p>'
    
    //each image make an asyn request
    await Promise.all(images.map(async (img) => {
        const resolvedSrc = resolveImageSrc(img.getAttribute('src'));
        if (!resolvedSrc) return;
        try {
            const response = await fetch(resolvedSrc);
            if (!response.ok) throw new Error(`Failed to fetch ${resolvedSrc}`);
            const blob = await response.blob();
            const dataUrl = await blobToDataUrl(blob);
            img.setAttribute('src', dataUrl);
        } catch (error) {
            console.error('Unable to inline image for export', error);
        }
    }));

    return doc.body.innerHTML;
};