# دليل النشر على Render - Web Service

## الخطوات المفصلة

### 1. إعداد GitHub Repository

```bash
# تهيئة Git
git init
git add .
git commit -m "Initial commit - MDT Discord Bot"

# رفع إلى GitHub
git remote add origin https://github.com/username/mdt-discord-bot.git
git branch -M main
git push -u origin main
```

### 2. إعداد Render Dashboard

1. **إنشاء حساب Render:**
   - اذهب إلى [render.com](https://render.com)
   - سجل حساب جديد أو سجل دخول

2. **إنشاء Web Service:**
   - اضغط على "New +"
   - اختر "Web Service"
   - اربط حساب GitHub
   - اختر المستودع `mdt-discord-bot`

3. **إعداد الخدمة:**
   - **Name:** `mdt-discord-bot`
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `node start.js`
   - **Plan:** `Free`

### 3. إعداد المتغيرات البيئية

في Render Dashboard، أضف المتغيرات التالية:

| Key | Value |
|-----|-------|
| `DISCORD_TOKEN` | `your_discord_bot_token_here` |
| `BOT_ID` | `your_bot_id_here` |

### 4. تشغيل الخدمة

1. اضغط على "Create Web Service"
2. انتظر حتى يكتمل البناء (Build)
3. تحقق من السجلات (Logs)

### 5. التحقق من العمل

1. **فحص السجلات:**
   - اذهب إلى "Logs" في Render Dashboard
   - تأكد من عدم وجود أخطاء

2. **فحص الصحة:**
   - اذهب إلى الرابط: `https://your-app-name.onrender.com/health`
   - يجب أن ترى JSON response مع معلومات البوت

3. **فحص الصفحة الرئيسية:**
   - اذهب إلى الرابط: `https://your-app-name.onrender.com/`
   - يجب أن ترى صفحة HTML جميلة

### 6. إضافة البوت إلى Discord

1. اذهب إلى [Discord Developer Portal](https://discord.com/developers/applications)
2. اختر تطبيقك
3. اذهب إلى "OAuth2" > "URL Generator"
4. اختر الصلاحيات:
   - `bot`
   - `applications.commands`
5. انسخ الرابط وأضف البوت إلى سيرفرك

## استكشاف الأخطاء

### البوت لا يظهر في Discord

1. **تحقق من السجلات:**
   ```bash
   # في Render Dashboard > Logs
   # ابحث عن:
   - "✅ تم تسجيل الدخول بنجاح!"
   - "🌐 خادم الويب يعمل على المنفذ"
   ```

2. **تحقق من التوكن:**
   - تأكد من أن `DISCORD_TOKEN` صحيح
   - أعد إنشاء التوكن من Discord Developer Portal

3. **تحقق من الصلاحيات:**
   - تأكد من تفعيل Gateway Intents
   - تأكد من أن البوت موجود في سيرفر

### الخدمة لا تعمل

1. **تحقق من Build Logs:**
   - ابحث عن أخطاء في `npm install`
   - تأكد من أن جميع الملفات موجودة

2. **تحقق من Start Command:**
   - تأكد من أن `node start.js` صحيح
   - تأكد من وجود ملف `start.js`

### مشاكل الاتصال

1. **فحص Health Check:**
   - اذهب إلى `/health` endpoint
   - تأكد من أن الخدمة تستجيب بشكل صحيح

2. **إعادة تشغيل الخدمة:**
   - في Render Dashboard، اضغط "Manual Deploy"
   - انتظر حتى يكتمل البناء

## الملفات المطلوبة

تأكد من وجود جميع هذه الملفات:

```
mdt-discord-bot/
├── index.js              # الملف الرئيسي للبوت
├── start.js              # ملف بدء التشغيل
├── config.js             # ملف التكوين
├── package.json          # تبعيات المشروع
├── render.yaml           # إعدادات Render
├── Procfile              # ملف Procfile
├── ecosystem.config.js   # إعدادات PM2
├── militaryImage.js      # معالجة الصور
├── data.json             # بيانات البوت
├── .gitignore           # ملف تجاهل Git
├── README.md            # دليل الاستخدام
└── deploy.md            # هذا الملف
```

## روابط مفيدة

- [Render Dashboard](https://dashboard.render.com/)
- [Discord Developer Portal](https://discord.com/developers/applications)
- [Discord.js Documentation](https://discord.js.org/)
- [Node.js Documentation](https://nodejs.org/)

## الدعم

إذا واجهت أي مشاكل:

1. تحقق من سجلات Render
2. تحقق من إعدادات Discord Bot
3. تأكد من صحة المتغيرات البيئية
4. جرب إعادة تشغيل الخدمة 