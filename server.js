require('dotenv').config(); // .env file එකේ තියෙන variables load කරන්න

const express = require('express');
const multer = require('multer');
const axios = require('axios');
const cors = require('cors'); // CORS middleware එක import කරන්න
const path = require('path'); // 'path' module එක import කරන්න

const app = express();
const port = process.env.PORT || 5000; // Port එක 5000 විදියට සකසන්න

// CORS සක්‍රීය කරන්න (Frontend එකට backend එකට request කරන්න පුළුවන් වෙන්න)
// ඔබගේ 'FANTACY X' වෙබ් අඩවිය Vercel හි හෝස්ට් වූ පසු ලැබෙන URL එක මෙහි 'origin' ලෙස දෙන්න.
// දැනට 'http://localhost:3000' (හෝ ඔබේ Frontend Localhost Port) හෝ '*' (සියලුම origins වලට ඉඩ දීමට) ලෙස තබන්න.
app.use(cors({
    origin: process.env.FRONTEND_URL || '*' // ඔබේ ප්‍රධාන වෙබ් අඩවියේ URL එක environment variable එකක් ලෙස දෙන්න, නැත්නම් සියල්ලට ඉඩ දෙන්න
}));

// Multer setup for handling file uploads
const storage = multer.memoryStorage(); // File එක memory එකේ තාවකාලිකව save කරගන්න
const upload = multer({ storage: storage });

// remove.bg API Key එක .env එකෙන් ගන්න
const REMOVEBG_API_KEY = process.env.REMOVEBG_API_KEY;

// API endpoint එක
app.post('/remove-background', upload.single('image'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No image file provided.' });
    }

    if (!REMOVEBG_API_KEY) {
        console.error("REMOVEBG_API_KEY is not set in .env file.");
        return res.status(500).json({ error: 'Server configuration error: API Key missing.' });
    }

    try {
        const response = await axios({
            method: 'post',
            url: 'https://api.remove.bg/v1.0/removebg',
            headers: {
                'X-Api-Key': REMOVEBG_API_KEY,
                'accept': 'application/json', // response type එක JSON කියලා දෙන්න
            },
            data: {
                image_file: req.file.buffer, // Buffer එක විදියට image data එක යවන්න
                size: 'auto',
                output_type: 'base64' // Image එක base64 encoded string එකක් විදියට ගන්න
            },
            responseType: 'json' // Response එක JSON විදියට ගන්න
        });

        // Status code එක 200 (OK) නම්
        if (response.status === 200 && response.data && response.data.data && response.data.data.result_b64) {
            res.json({ image_base64: response.data.data.result_b64 });
        } else {
            console.error(`Error from remove.bg API: ${response.status} -`, response.data);
            res.status(response.status).json({ error: response.data.errors && response.data.errors[0].title || 'Failed to remove background.' });
        }

    } catch (error) {
        console.error('Server error during background removal:', error);
        if (error.response) {
            const errorData = error.response.data;
            res.status(error.response.status).json({ error: errorData.errors && errorData.errors[0].title || 'Error processing image.' });
        } else {
            res.status(500).json({ error: 'Internal server error or network issue.' });
        }
    }
});

// BG Remover යෙදුමේ frontend ගොනු (index.html, CSS, JS) serve කිරීමට
// 'index.html' ගොනුව 'bg-remover-app' ෆෝල්ඩරයේ තිබෙන නිසා, අපි එය root path එකෙන් serve කරමු.
app.use(express.static(path.join(__dirname, ''))); // 'bg-remover-app' ෆෝල්ඩරය තුළ ඇති සියලුම ගොනු serve කරයි

// BG Remover යෙදුමේ ප්‍රධාන පිටුව (index.html) serve කිරීමට
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(port, () => {
    console.log(`BG Remover Server is running on port ${port}`);
});