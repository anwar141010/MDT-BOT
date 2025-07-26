# MDT Discord Bot

بوت ديسكورد لإدارة القوائم العسكرية مع إمكانية إنشاء الصور.

## المتطلبات

- Node.js 18 أو أحدث
- حساب Discord Developer
- حساب Render (مجاني)

## التثبيت والتشغيل

### 1. إعداد Discord Bot

1. اذهب إلى [Discord Developer Portal](https://discord.com/developers/applications)
2. أنشئ تطبيق جديد
3. اذهب إلى قسم "Bot" وأنشئ بوت
4. انسخ التوكن (Token)
5. فعّل Gateway Intents التالية:
   - MESSAGE CONTENT INTENT
   - SERVER MEMBERS INTENT
   - PRESENCE INTENT

### 2. إعداد المتغيرات البيئية

أنشئ ملف `config.js` في المجلد الرئيسي:

```javascript
module.exports = {
    DISCORD_TOKEN: process.env.DISCORD_TOKEN || 'your_token_here',
    BOT_ID: process.env.BOT_ID || 'your_bot_id_here'
};
```

### 3. تثبيت التبعيات

```bash
npm install
```

### 4. تشغيل البوت محلياً

```bash
npm start
```

### 5. نشر البوت على Render (Web Service)

1. ارفع الكود إلى GitHub
2. اذهب إلى [Render Dashboard](https://dashboard.render.com/)
3. اختر "New Web Service"
4. اربط مستودع GitHub
5. أدخل المتغيرات البيئية:
   - `DISCORD_TOKEN`: توكن البوت
   - `BOT_ID`: معرف البوت
6. اضغط "Create Web Service"

#### ملاحظات مهمة:
- تأكد من أن نوع الخدمة هو "Web Service" (وليس Background Worker)
- البوت سيعمل على منفذ 3000 تلقائياً
- يمكنك الوصول لصفحة البوت عبر الرابط المقدم من Render
- رابط فحص الصحة: `https://your-app-name.onrender.com/health`

## استكشاف الأخطاء

### البوت لا يظهر في Discord

1. **تحقق من التوكن:**
   - تأكد من أن التوكن صحيح وغير منتهي الصلاحية
   - أعد إنشاء التوكن من Discord Developer Portal

2. **تحقق من الصلاحيات:**
   - تأكد من تفعيل جميع Gateway Intents
   - تأكد من أن البوت موجود في سيرفر

3. **تحقق من Render:**
   - تأكد من أن الخدمة تعمل (Web Service)
   - تحقق من السجلات (Logs) في Render Dashboard
   - تأكد من أن المتغيرات البيئية صحيحة

4. **مشاكل الاتصال:**
   - قد تكون هناك مشكلة في الاتصال بين Render و Discord
   - جرب إعادة تشغيل الخدمة
   - تحقق من إعدادات Firewall

### رسائل الخطأ الشائعة

- `An invalid token was provided`: التوكن غير صحيح
- `Missing Permissions`: البوت لا يملك الصلاحيات المطلوبة
- `Cannot send messages to this user`: البوت غير موجود في سيرفر

## الميزات

- إدارة القوائم العسكرية
- إنشاء صور للقوائم
- أوامر تفاعلية
- واجهة مستخدم جميلة

## الدعم

إذا واجهت أي مشاكل، تحقق من:
1. سجلات Render Dashboard
2. سجلات Discord Developer Portal
3. إعدادات البوت والصلاحيات 
