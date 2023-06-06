let title = '';
let videoID = '';
let color = '';

function valueToHex(c) {
    var hex = c.toString(16);
    return hex 
}

function rgbToHex(r, g, b) {
    return('#' + valueToHex(r) + valueToHex(g) + valueToHex(b));
}

function getAverageRGB(imgEl) {
    
    var blockSize = 5, // only visit every 5 pixels
        defaultRGB = {r:0,g:0,b:0}, // for non-supporting envs
        canvas = document.createElement('canvas'),
        context = canvas.getContext && canvas.getContext('2d'),
        data, width, height,
        i = -4,
        length,
        rgb = {r:0,g:0,b:0},
        count = 0;
        
    if (!context) {
        return defaultRGB;
    }
    
    height = canvas.height = imgEl.naturalHeight || imgEl.offsetHeight || imgEl.height;
    width = canvas.width = imgEl.naturalWidth || imgEl.offsetWidth || imgEl.width;
    
    context.drawImage(imgEl, 0, 0);
    
    try {
        data = context.getImageData(0, 0, width, height);
    } catch(e) {
        Swal.fire(
            'Ouch!',
            'Something wrong happened! Make sure the link you entered is valid, or try again later.\nSorry for the inconvenience.',
            'error'
        )
        return "error";
    }
    
    length = data.data.length;
    
    while ( (i += blockSize * 4) < length ) {
        ++count;
        rgb.r += data.data[i];
        rgb.g += data.data[i+1];
        rgb.b += data.data[i+2];
    }
    
    // ~~ used to floor values
    rgb.r = ~~((rgb.r/count) - 16);
    rgb.g = ~~((rgb.g/count) - 16);
    rgb.b = ~~((rgb.b/count) - 16);
    
    color = rgbToHex(rgb.r, rgb.g, rgb.b);
    return 'rgb(' + rgb.r + ', ' + rgb.g + ', ' + rgb.b + ')';
    
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    // First, start by splitting all of our text into words, but splitting it into an array split by spaces
    let words = text.split(' ');
    let line = ''; // This will store the text of the current line
    let testLine = ''; // This will store the text when we add a word, to test if it's too long
    let lineArray = []; // This is an array of lines, which the function will return

    // Lets iterate over each word
    for(let n = 0; n < words.length; n++) {
        // Create a test line, and measure it..
        testLine += `${words[n]} `;
        let metrics = ctx.measureText(testLine);
        let testWidth = metrics.width;
        // If the width of this test line is more than the max width
        if (testWidth > maxWidth && n > 0) {
            // Then the line is finished, push the current line into "lineArray"
            lineArray.push([line, x, y]);
            // Increase the line height, so a new line is started
            y += lineHeight;
            // Update line and test line to use this word as the first word on the next line
            line = `${words[n]} `;
            testLine = `${words[n]} `;
        }
        else {
            // If the test line is still less than the max width, then add the word to the current line
            line += `${words[n]} `;
        }
        // If we never reach the full max width, then there is only one line.. so push it into the lineArray so we return something
        if(n === words.length - 1) {
            lineArray.push([line, x, y]);
        }
    }
    // Return the line array
    return lineArray;
}

function getImageFromYT() {
    const link = document.getElementById('yt-link').value;

    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/(watch\?v=|embed\/|v\/|shorts\/|live\/)?([\w-]{11})(\S+)?$/;
    const videoId = link.match(youtubeRegex)[5];

    if (videoId) {
        //console.log(videoId)
        const imageUrl = `/img.php?v=${videoId}`;
        videoID = videoId;
        const image = document.getElementById('yt-img');
        image.src = imageUrl;
    }
    
    getTitleFromYT();
}

function getTitleFromYT() {
    const userLink = document.getElementById('yt-link').value;

    const link = `https://www.youtube.com/oembed?url=${userLink}&format=json`

    let xmlHttp = new XMLHttpRequest();
    xmlHttp.open("GET", link, false);
    xmlHttp.send(null);

    let response = JSON.parse(xmlHttp.responseText);
    title = response.title
    if (title.length > 70) {
        title = response.title.substring(0, 70);
        title = title + '...'
    } else {
        title = response.title;
    }
}

function fill_canvas(img, title) {

    //console.log(img)
    //console.log(title)

    const play = document.getElementById('playlogo');
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    const isDarkMode = document.getElementById('dark-switch').checked;

    img.width = 960;
    img.height = 540;

    const thumbLeft = canvas.width / 2 - img.width / 2;
    const thumbTop = canvas.height / 2 - img.height * 0.75;

    let canvasTitle = wrapText(ctx, title, thumbLeft + 12, (thumbTop + img.height) + 48, img.width - 12, 70);

    //console.log(canvasTitle['length']) 

    ctx.font = "60px YouTube Sans";

    if ((ctx.fillStyle = getAverageRGB(img)) === "error")
        return "error";
    ctx.filter = "blur(16px)";
    ctx.drawImage(img, -((3413/2)-540), 0, 3413, 1920);
    ctx.filter = "blur(0px)";
    ctx.globalAlpha = 0.6;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = 1;

    //ctx.fillStyle = getAverageRGB(img);  
    //ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (isDarkMode)
        ctx.fillStyle = '#242424';
    else 
        ctx.fillStyle = '#FFFFFF';
    ctx.roundRect(thumbLeft-12, thumbTop-12, img.width+24, img.height+246, 24)
    ctx.fill();

    const playDim = 0.08;
    ctx.drawImage(img, thumbLeft, thumbTop, img.width, img.height); // Draw image to the canvas.

    ctx.drawImage(
        play,
        thumbLeft + (img.width / 2) - ((play.width*playDim) / 2),
        thumbTop + (img.height / 2) - ((play.height*playDim) / 2),
        (play.width*playDim),
        (play.height*playDim)
    );

    if (isDarkMode)
        ctx.fillStyle = "#FFFFFF"
    else
        ctx.fillStyle = "#242424"
    canvasTitle = wrapText(ctx, title, thumbLeft + 12, (thumbTop + img.height) + 68, img.width - 12, 70);
    canvasTitle.forEach(function(item) {
        ctx.fillText(item[0], item[1], item[2]); 
    });

    const dataUrl = canvas.toDataURL('image/jpeg', 1.0);
    const imgPreview = document.getElementById('image-preview');
    document.getElementById('download-button').href = dataUrl;
    imgPreview.src = dataUrl;   
}

function generateImage() {    
    const image = document.getElementById('yt-img');
    const inputSect = document.getElementById('user-input');
    const outputSect = document.getElementById('image-result');

    inputSect.classList.toggle('hide');
    if (fill_canvas(image, title) !== "error") {
        outputSect.classList.toggle('hide');
        $.post(
            "/considera_analytics/save_request.php",
            {
                videoID: videoID,
                bg_color: color,
            }
        )
    } else {
        inputSect.classList.toggle('hide');
    }
}

const linkInput = document.getElementById('yt-link');
linkInput.addEventListener('change', () => {
    if (linkInput.value.trim() !== '') {
        getImageFromYT();
    }
});

const generateBtn = document.getElementById('generate-btn');
generateBtn.addEventListener('click', () => {
    if (linkInput.value.trim() !== '') {
        setTimeout(generateImage, 1200);
    } else {
        Swal.fire(
            'Uh-oh!',
            'Before generating an image, you should enter a YouTube video link first.',
            'warning'
        )
    }
});

const infoBtn = document.getElementById('info-button');
infoBtn.addEventListener('click', () => {
    Swal.fire({
        title: 'How to use',
        icon: 'info',
        html:
          'Using our image generating tool is <b>very simple</b>.<br><br>' +
          'All you need to do, is paste the link of the YouTube video that you want to share on Instagram.<br><br>' +
          'Example of valid URLs:<br><br><pre>https://www.youtube.com/watch?v=dQw4w9WgXcQ<br>https://youtu.be/dQw4w9WgXcQ</pre>',
        showCloseButton: true,
        showCancelButton: false,
        focusConfirm: false,
        confirmButtonText: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" class="bi bi-hand-thumbs-up-fill" viewBox="0 0 16 16"> <path d="M6.956 1.745C7.021.81 7.908.087 8.864.325l.261.066c.463.116.874.456 1.012.965.22.816.533 2.511.062 4.51a9.84 9.84 0 0 1 .443-.051c.713-.065 1.669-.072 2.516.21.518.173.994.681 1.2 1.273.184.532.16 1.162-.234 1.733.058.119.103.242.138.363.077.27.113.567.113.856 0 .289-.036.586-.113.856-.039.135-.09.273-.16.404.169.387.107.819-.003 1.148a3.163 3.163 0 0 1-.488.901c.054.152.076.312.076.465 0 .305-.089.625-.253.912C13.1 15.522 12.437 16 11.5 16H8c-.605 0-1.07-.081-1.466-.218a4.82 4.82 0 0 1-.97-.484l-.048-.03c-.504-.307-.999-.609-2.068-.722C2.682 14.464 2 13.846 2 13V9c0-.85.685-1.432 1.357-1.615.849-.232 1.574-.787 2.132-1.41.56-.627.914-1.28 1.039-1.639.199-.575.356-1.539.428-2.59z"/> </svg> Great, thanks!',
        cancelButtonText: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" class="bi bi-hand-thumbs-down-fill" viewBox="0 0 16 16"> <path d="M6.956 14.534c.065.936.952 1.659 1.908 1.42l.261-.065a1.378 1.378 0 0 0 1.012-.965c.22-.816.533-2.512.062-4.51.136.02.285.037.443.051.713.065 1.669.071 2.516-.211.518-.173.994-.68 1.2-1.272a1.896 1.896 0 0 0-.234-1.734c.058-.118.103-.242.138-.362.077-.27.113-.568.113-.856 0-.29-.036-.586-.113-.857a2.094 2.094 0 0 0-.16-.403c.169-.387.107-.82-.003-1.149a3.162 3.162 0 0 0-.488-.9c.054-.153.076-.313.076-.465a1.86 1.86 0 0 0-.253-.912C13.1.757 12.437.28 11.5.28H8c-.605 0-1.07.08-1.466.217a4.823 4.823 0 0 0-.97.485l-.048.029c-.504.308-.999.61-2.068.723C2.682 1.815 2 2.434 2 3.279v4c0 .851.685 1.433 1.357 1.616.849.232 1.574.787 2.132 1.41.56.626.914 1.28 1.039 1.638.199.575.356 1.54.428 2.591z"/> </svg>',
      })
});