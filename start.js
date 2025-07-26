#!/usr/bin/env node

// ملف بدء تشغيل البوت
console.log('🚀 بدء تشغيل MDT Discord Bot...');

// التحقق من وجود الملفات المطلوبة
const fs = require('fs');
const path = require('path');

const requiredFiles = [
  'index.js',
  'config.js',
  'package.json'
];

console.log('📁 التحقق من الملفات المطلوبة...');
requiredFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file} موجود`);
  } else {
    console.error(`❌ ${file} غير موجود`);
    process.exit(1);
  }
});

// التحقق من المتغيرات البيئية
console.log('🔧 التحقق من المتغيرات البيئية...');
if (!process.env.DISCORD_TOKEN) {
  console.warn('⚠️ DISCORD_TOKEN غير محدد في متغيرات البيئة');
}

if (!process.env.BOT_ID) {
  console.warn('⚠️ BOT_ID غير محدد في متغيرات البيئة');
}

// تشغيل البوت
console.log('🎯 تشغيل البوت...');
try {
  require('./index.js');
} catch (error) {
  console.error('❌ خطأ في تشغيل البوت:', error);
  process.exit(1);
} 