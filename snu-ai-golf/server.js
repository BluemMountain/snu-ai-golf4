require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;
const DATA_FILE = path.join(__dirname, 'rsvps.json');

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(__dirname));

// Auth API: Member Login
app.post('/api/login', (req, res) => {
    const { password } = req.body;
    const memberPassword = process.env.MEMBER_PASSWORD || 'aiceo4thgolf';

    if (password === memberPassword) {
        res.json({ success: true });
    } else {
        res.status(401).json({ success: false, message: 'Invalid password' });
    }
});

// Auth API: Admin Login
app.post('/api/admin-login', (req, res) => {
    const { password } = req.body;
    const adminPassword = process.env.ADMIN_PASSWORD || 'aiceo4thgolf-admin';

    if (password === adminPassword) {
        res.json({ success: true });
    } else {
        res.status(401).json({ success: false, message: 'Invalid admin password' });
    }
});

// Load RSVPs
function loadRSVPs() {
    if (!fs.existsSync(DATA_FILE)) {
        return [];
    }
    const data = fs.readFileSync(DATA_FILE);
    return JSON.parse(data);
}

// Save RSVPs
function saveRSVPs(data) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// API: Get all RSVPs (for Admin)
app.get('/api/rsvps', (req, res) => {
    const rsvps = loadRSVPs();
    res.json(rsvps);
});

// API: Submit RSVP
app.post('/api/rsvp', (req, res) => {
    const { name, phone, month, status, date } = req.body;

    if (!name || !month || !status) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const rsvps = loadRSVPs();
    const newRSVP = {
        id: Date.now(),
        submittedAt: new Date().toISOString(),
        name,
        phone,
        month,
        date, // Event date e.g. "3.25"
        status // 'attend' or 'absent'
    };

    rsvps.push(newRSVP);
    saveRSVPs(rsvps);

    res.json({ success: true, message: 'RSVP saved successfully' });
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log(`Admin Page: http://localhost:${PORT}/admin.html`);
});
