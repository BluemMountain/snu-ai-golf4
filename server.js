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

const supabase = require('./supabaseClient');

// API: Get all RSVPs (for Admin)
app.get('/api/rsvps', async (req, res) => {
    const { data, error } = await supabase.from('rsvps').select('*');
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// API: Submit RSVP
app.post('/api/rsvp', async (req, res) => {
    const { name, phone, month, status, date, iswaiting } = req.body;

    if (!name || !month || !status) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const { data, error } = await supabase.from('rsvps').insert([{
        name,
        phone,
        month,
        date,
        status,
        iswaiting: iswaiting || false
    }]);

    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true, message: 'RSVP saved to Supabase' });
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log(`Admin Page: http://localhost:${PORT}/admin.html`);
});
