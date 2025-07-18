const express = require('express');
const { makeWASocket, useSingleFileAuthState } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// صفحة البداية
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API لطلب رمز الاقتران
app.get('/code', async (req, res) => {
  const number = req.query.number;
  if (!number || !/^\d+$/.test(number)) {
    return res.status(400).json({ error: 'رقم غير صالح' });
  }

  try {
    const { state, saveState } = useSingleFileAuthState(`./session-${number}.json`);

    const sock = makeWASocket({
      auth: state,
      printQRInTerminal: false,
    });

    // ربط حدث حفظ الجلسة
    sock.ev.on('creds.update', saveState);

    // جلب رمز الاقتران (pairing code)
    const code = await sock.requestPairingCode(number + '@s.whatsapp.net');

    // إغلاق الاتصال بعد جلب الرمز لتوفير الموارد
    await sock.logout();

    console.log(`🔑 رمز الاقتران للرقم ${number}: ${code}`);
    res.json({ code });
  } catch (err) {
    console.error('❌ خطأ أثناء توليد رمز الاقتران:', err);
    res.status(500).json({ error: 'فشل في توليد رمز الاقتران' });
  }
});

// تشغيل السيرفر
app.listen(PORT, () => {
  console.log(`🚀 السيرفر يعمل على http://localhost:${PORT}`);
});
