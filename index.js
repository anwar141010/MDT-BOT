const { Client, GatewayIntentBits, Collection, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('./config');
const { generateMilitaryPageImage } = require('./militaryImage');

// التحقق من التوكن
if (!config.DISCORD_TOKEN) {
  console.error('❌ خطأ: DISCORD_TOKEN غير موجود في متغيرات البيئة');
  console.error('🔍 تأكد من إضافة DISCORD_TOKEN في إعدادات Render');
  process.exit(1);
}

// فحص إضافي للتوكن
if (config.DISCORD_TOKEN && config.DISCORD_TOKEN.length < 50) {
  console.error('❌ خطأ: DISCORD_TOKEN قصير جداً، قد يكون غير صحيح');
  console.error('🔍 تأكد من نسخ التوكن كاملاً من Discord Developer Portal');
  process.exit(1);
}

console.log('🚀 بدء تشغيل MDT Discord Bot...');
console.log('📋 معلومات النظام:');
console.log(`  - Node.js: ${process.version}`);
console.log(`  - Platform: ${process.platform}`);
console.log(`  - Architecture: ${process.arch}`);

// إنشاء عميل Discord
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

// متغيرات عامة
let botStatus = {}; // حالة البوت لكل سيرفر
let originalBotNames = {}; // الأسماء الأصلية للبوت
const dataPath = './data.json';

// تحميل البيانات
function loadData() {
  try {
    if (fs.existsSync(dataPath)) {
      const fileData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
      botStatus = fileData.botStatus || {};
      originalBotNames = fileData.originalBotNames || {};
      return fileData;
    }
  } catch (error) {
    console.error('خطأ في تحميل البيانات:', error);
  }
  return { identities: [], botStatus: {}, originalBotNames: {} };
}

// حفظ البيانات
function saveData(data) {
  try {
    data.botStatus = botStatus;
    data.originalBotNames = originalBotNames;
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('خطأ في حفظ البيانات:', error);
  }
}

// تحميل البيانات عند بدء التشغيل
let data = loadData();

// التحقق من حالة البوت
function isBotStopped(guildId) {
  return botStatus[guildId] === 'stopped';
}

// تغيير اسم البوت
async function changeBotName(guildId, stopped) {
  try {
    const guild = client.guilds.cache.get(guildId);
    if (!guild) return;

    const botMember = guild.members.cache.get(client.user.id);
    if (!botMember) return;

    if (stopped) {
      // حفظ الاسم الأصلي إذا لم يكن محفوظاً
      if (!originalBotNames[guildId]) {
        originalBotNames[guildId] = botMember.displayName;
      }
      // تغيير الاسم إلى "متوقف"
      await botMember.setNickname(`${originalBotNames[guildId]} متوقف`);
    } else {
      // إرجاع الاسم الأصلي
      const originalName = originalBotNames[guildId] || 'MDT Bot';
      await botMember.setNickname(originalName);
    }
  } catch (error) {
    console.error('خطأ في تغيير اسم البوت:', error);
  }
}

// إرسال إشعار إلى روم اللوق
async function sendLogNotification(guildId, developerName, action) {
  try {
    const guild = client.guilds.cache.get(guildId);
    if (!guild) return;

    // البحث عن روم اللوق (يمكن تعديل الاسم حسب الحاجة)
    const logChannel = guild.channels.cache.find(channel => 
      channel.name.includes('log') || 
      channel.name.includes('لوق') || 
      channel.name.includes('logs')
    );

    if (logChannel) {
      const embed = new EmbedBuilder()
        .setColor(action === 'stopped' ? '#ef4444' : '#22c55e')
        .setTitle('🔄 تغيير حالة البوت')
        .setDescription(`**المطور:** ${developerName}\n**الحالة:** ${action === 'stopped' ? 'إيقاف' : 'تشغيل'}\n**السيرفر:** ${guild.name}`)
        .setTimestamp();

      await logChannel.send({ embeds: [embed] });
    }
  } catch (error) {
    console.error('خطأ في إرسال إشعار اللوق:', error);
  }
}

// أمر المطور
async function handleDeveloperCommand(interaction) {
  const embed = new EmbedBuilder()
    .setColor('#3b82f6')
    .setTitle('🔧 لوحة تحكم المطور')
    .setDescription('اختر الإجراء المطلوب:')
    .setTimestamp();

  const row = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('bot_control')
        .setLabel('إيقاف | تشغيل البوت')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('🔄'),
      new ButtonBuilder()
        .setCustomId('server_stats')
        .setLabel('إحصائيات السيرفر')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('📊')
    );

  await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
}

// معالجة أزرار المطور
async function handleDeveloperButtons(interaction) {
  if (interaction.customId === 'bot_control') {
    await handleBotControl(interaction);
  } else if (interaction.customId === 'server_stats') {
    await handleServerStats(interaction);
  }
}

// معالجة التحكم بالبوت
async function handleBotControl(interaction) {
  const guilds = client.guilds.cache;
  const options = [];

  guilds.forEach(guild => {
    const isStopped = isBotStopped(guild.id);
    const status = isStopped ? '🔴 متوقف' : '🟢 يعمل';
    
    options.push(
      new StringSelectMenuOptionBuilder()
        .setLabel(`${guild.name} - ${status}`)
        .setValue(guild.id)
        .setDescription(`عدد الأعضاء: ${guild.memberCount}`)
    );
  });

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId('select_guild')
    .setPlaceholder('اختر السيرفر')
    .addOptions(options);

  const row = new ActionRowBuilder().addComponents(selectMenu);

  await interaction.update({
    content: 'اختر السيرفر للتحكم في حالة البوت:',
    components: [row]
  });
}

// معالجة اختيار السيرفر
async function handleGuildSelection(interaction) {
  const guildId = interaction.values[0];
  const guild = client.guilds.cache.get(guildId);
  const isStopped = isBotStopped(guildId);

  const embed = new EmbedBuilder()
    .setColor(isStopped ? '#ef4444' : '#22c55e')
    .setTitle(`معلومات السيرفر: ${guild.name}`)
    .addFields(
      { name: '🆔 معرف السيرفر', value: guild.id, inline: true },
      { name: '👥 عدد الأعضاء', value: guild.memberCount.toString(), inline: true },
      { name: '📅 تاريخ الإنشاء', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:F>`, inline: true },
      { name: '🔧 حالة البوت', value: isStopped ? '🔴 متوقف' : '🟢 يعمل', inline: true },
      { name: '👑 المالك', value: `<@${guild.ownerId}>`, inline: true }
    )
    .setThumbnail(guild.iconURL())
    .setTimestamp();

  const row = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(`toggle_bot_${guildId}`)
        .setLabel(isStopped ? 'تشغيل البوت' : 'إيقاف البوت')
        .setStyle(isStopped ? ButtonStyle.Success : ButtonStyle.Danger)
        .setEmoji(isStopped ? '🟢' : '🔴'),
      new ButtonBuilder()
        .setCustomId('back_to_guilds')
        .setLabel('العودة للقائمة')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('⬅️')
    );

  await interaction.update({
    content: '',
    embeds: [embed],
    components: [row]
  });
}

// معالجة تبديل حالة البوت
async function handleBotToggle(interaction) {
  const guildId = interaction.customId.replace('toggle_bot_', '');
  const guild = client.guilds.cache.get(guildId);
  const isStopped = isBotStopped(guildId);
  const developerName = interaction.user.username;

  // تغيير الحالة
  if (isStopped) {
    botStatus[guildId] = 'running';
    await changeBotName(guildId, false);
    await sendLogNotification(guildId, developerName, 'started');
  } else {
    botStatus[guildId] = 'stopped';
    await changeBotName(guildId, true);
    await sendLogNotification(guildId, developerName, 'stopped');
  }

  // حفظ البيانات
  saveData(data);

  const embed = new EmbedBuilder()
    .setColor(isStopped ? '#22c55e' : '#ef4444')
    .setTitle(isStopped ? '🟢 تم تشغيل البوت' : '🔴 تم إيقاف البوت')
    .setDescription(`**السيرفر:** ${guild.name}\n**المطور:** ${developerName}`)
    .setTimestamp();

  await interaction.update({
    content: '',
    embeds: [embed],
    components: []
  });
}

// معالجة إحصائيات السيرفر
async function handleServerStats(interaction) {
  const guilds = client.guilds.cache;
  let totalMembers = 0;
  let totalChannels = 0;

  guilds.forEach(guild => {
    totalMembers += guild.memberCount;
    totalChannels += guild.channels.cache.size;
  });

  const embed = new EmbedBuilder()
    .setColor('#3b82f6')
    .setTitle('📊 إحصائيات البوت')
    .addFields(
      { name: '🏢 عدد السيرفرات', value: guilds.size.toString(), inline: true },
      { name: '👥 إجمالي الأعضاء', value: totalMembers.toString(), inline: true },
      { name: '📺 إجمالي القنوات', value: totalChannels.toString(), inline: true },
      { name: '🟢 السيرفرات النشطة', value: guilds.filter(g => !isBotStopped(g.id)).size.toString(), inline: true },
      { name: '🔴 السيرفرات المتوقفة', value: guilds.filter(g => isBotStopped(g.id)).size.toString(), inline: true }
    )
    .setTimestamp();

  await interaction.update({
    content: '',
    embeds: [embed],
    components: []
  });
}

// معالجة الأوامر العسكرية
async function handleMilitaryCommands(interaction) {
  if (interaction.commandName === 'identity') {
    await handleIdentityCommand(interaction);
  } else if (interaction.commandName === 'military') {
    await handleMilitaryCommand(interaction);
  } else if (interaction.commandName === 'violation') {
    await handleViolationCommand(interaction);
  } else if (interaction.commandName === 'crime') {
    await handleCrimeCommand(interaction);
  }
}

// معالجة أمر الهوية
async function handleIdentityCommand(interaction) {
  const subcommand = interaction.options.getSubcommand();
  
  if (subcommand === 'add') {
    await handleIdentityAdd(interaction);
  } else if (subcommand === 'view') {
    await handleIdentityView(interaction);
  } else if (subcommand === 'list') {
    await handleIdentityList(interaction);
  }
}

// إضافة هوية جديدة
async function handleIdentityAdd(interaction) {
  const fullName = interaction.options.getString('name');
  const gender = interaction.options.getString('gender');
  const city = interaction.options.getString('city');
  const year = interaction.options.getString('year');
  const month = interaction.options.getString('month');
  const day = interaction.options.getString('day');
  const nationalId = interaction.options.getString('national_id');

  const newIdentity = {
    id: Date.now().toString(),
    guildId: interaction.guildId,
    userId: interaction.user.id,
    fullName,
    gender,
    city,
    year,
    month,
    day,
    nationalId,
    approvedBy: interaction.user.id,
    approvedAt: new Date().toISOString(),
    approvalReason: 'تم التسجيل تلقائياً',
    violations: [],
    crimes: []
  };

  data.identities.push(newIdentity);
  saveData(data);

  const embed = new EmbedBuilder()
    .setColor('#22c55e')
    .setTitle('✅ تم إضافة الهوية بنجاح')
    .addFields(
      { name: 'الاسم الكامل', value: fullName, inline: true },
      { name: 'الجنس', value: gender === 'male' ? 'ذكر' : 'أنثى', inline: true },
      { name: 'المدينة', value: city, inline: true },
      { name: 'تاريخ الميلاد', value: `${year}/${month}/${day}`, inline: true },
      { name: 'الرقم الوطني', value: nationalId, inline: true }
    )
    .setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

// عرض الهوية
async function handleIdentityView(interaction) {
  const targetUser = interaction.options.getUser('user') || interaction.user;
  const identity = data.identities.find(id => 
    id.guildId === interaction.guildId && id.userId === targetUser.id
  );

  if (!identity) {
    await interaction.reply({ 
      content: '❌ لم يتم العثور على هوية لهذا المستخدم', 
      ephemeral: true 
    });
    return;
  }

  const embed = new EmbedBuilder()
    .setColor('#3b82f6')
    .setTitle('🆔 معلومات الهوية')
    .addFields(
      { name: 'الاسم الكامل', value: identity.fullName, inline: true },
      { name: 'الجنس', value: identity.gender === 'male' ? 'ذكر' : 'أنثى', inline: true },
      { name: 'المدينة', value: identity.city, inline: true },
      { name: 'تاريخ الميلاد', value: `${identity.year}/${identity.month}/${identity.day}`, inline: true },
      { name: 'الرقم الوطني', value: identity.nationalId, inline: true },
      { name: 'تاريخ التسجيل', value: `<t:${Math.floor(new Date(identity.approvedAt).getTime() / 1000)}:F>`, inline: true }
    )
    .setTimestamp();

  if (identity.violations && identity.violations.length > 0) {
    const violationsText = identity.violations.map(v => 
      `• ${v.name}: ${v.status}`
    ).join('\n');
    embed.addFields({ name: '🚨 المخالفات', value: violationsText });
  }

  if (identity.crimes && identity.crimes.length > 0) {
    const crimesText = identity.crimes.map(c => 
      `• ${c.title}: ${c.done ? 'تم التنفيذ' : 'قيد الانتظار'}`
    ).join('\n');
    embed.addFields({ name: '⚖️ الجرائم', value: crimesText });
  }

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

// قائمة الهويات
async function handleIdentityList(interaction) {
  const guildIdentities = data.identities.filter(id => id.guildId === interaction.guildId);
  
  if (guildIdentities.length === 0) {
    await interaction.reply({ 
      content: '❌ لا توجد هويات مسجلة في هذا السيرفر', 
      ephemeral: true 
    });
    return;
  }

  const embed = new EmbedBuilder()
    .setColor('#3b82f6')
    .setTitle('📋 قائمة الهويات المسجلة')
    .setDescription(`إجمالي الهويات: ${guildIdentities.length}`)
    .setTimestamp();

  // عرض أول 10 هويات
  const identitiesToShow = guildIdentities.slice(0, 10);
  const identitiesText = identitiesToShow.map((id, index) => 
    `${index + 1}. **${id.fullName}** - ${id.city}`
  ).join('\n');

  embed.addFields({ name: 'الهويات', value: identitiesText });

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

// معالجة الأمر العسكري
async function handleMilitaryCommand(interaction) {
  const subcommand = interaction.options.getSubcommand();
  
  if (subcommand === 'add') {
    await handleMilitaryAdd(interaction);
  } else if (subcommand === 'status') {
    await handleMilitaryStatus(interaction);
  } else if (subcommand === 'list') {
    await handleMilitaryList(interaction);
  }
}

// إضافة عسكري جديد
async function handleMilitaryAdd(interaction) {
  const fullName = interaction.options.getString('name');
  const code = interaction.options.getString('code');
  const rank = interaction.options.getString('rank');
  const status = interaction.options.getString('status');

  const newMilitary = {
    id: Date.now().toString(),
    guildId: interaction.guildId,
    fullName,
    code,
    rank,
    status,
    addedBy: interaction.user.id,
    addedAt: new Date().toISOString()
  };

  if (!data.military) data.military = [];
  data.military.push(newMilitary);
  saveData(data);

  const embed = new EmbedBuilder()
    .setColor('#22c55e')
    .setTitle('✅ تم إضافة العسكري بنجاح')
    .addFields(
      { name: 'الاسم', value: fullName, inline: true },
      { name: 'الكود', value: code, inline: true },
      { name: 'الرتبة', value: rank, inline: true },
      { name: 'الحالة', value: status, inline: true }
    )
    .setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

// عرض حالة العسكري
async function handleMilitaryStatus(interaction) {
  const code = interaction.options.getString('code');
  const military = data.military?.find(m => 
    m.guildId === interaction.guildId && m.code === code
  );

  if (!military) {
    await interaction.reply({ 
      content: '❌ لم يتم العثور على عسكري بهذا الكود', 
      ephemeral: true 
    });
    return;
  }

  const embed = new EmbedBuilder()
    .setColor('#3b82f6')
    .setTitle('🎖️ حالة العسكري')
    .addFields(
      { name: 'الاسم', value: military.fullName, inline: true },
      { name: 'الكود', value: military.code, inline: true },
      { name: 'الرتبة', value: military.rank, inline: true },
      { name: 'الحالة', value: military.status, inline: true }
    )
    .setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

// قائمة العسكريين
async function handleMilitaryList(interaction) {
  const guildMilitary = data.military?.filter(m => m.guildId === interaction.guildId) || [];
  
  if (guildMilitary.length === 0) {
    await interaction.reply({ 
      content: '❌ لا يوجد عسكريين مسجلين في هذا السيرفر', 
      ephemeral: true 
    });
    return;
  }

  // تجميع الإحصائيات
  const counters = {
    in: guildMilitary.filter(m => m.status === 'in').length,
    out: guildMilitary.filter(m => m.status === 'out').length,
    ended: guildMilitary.filter(m => m.status === 'ended').length
  };

  // إنشاء صورة
  try {
    const imageBuffer = await generateMilitaryPageImage(guildMilitary.slice(0, 10), counters);
    
    const embed = new EmbedBuilder()
      .setColor('#3b82f6')
      .setTitle('🎖️ قائمة العسكريين')
      .setDescription(`إجمالي العسكريين: ${guildMilitary.length}`)
      .addFields(
        { name: '🟢 في الخدمة', value: counters.in.toString(), inline: true },
        { name: '🔴 خارج الخدمة', value: counters.out.toString(), inline: true },
        { name: '⚫ منتهي الخدمة', value: counters.ended.toString(), inline: true }
      )
      .setImage('attachment://military.png')
      .setTimestamp();

    await interaction.reply({ 
      embeds: [embed], 
      files: [{ attachment: imageBuffer, name: 'military.png' }],
      ephemeral: true 
    });
  } catch (error) {
    console.error('خطأ في إنشاء الصورة:', error);
    await interaction.reply({ 
      content: '❌ حدث خطأ في إنشاء الصورة', 
      ephemeral: true 
    });
  }
}

// معالجة أمر المخالفات
async function handleViolationCommand(interaction) {
  const subcommand = interaction.options.getSubcommand();
  
  if (subcommand === 'add') {
    await handleViolationAdd(interaction);
  } else if (subcommand === 'list') {
    await handleViolationList(interaction);
  }
}

// إضافة مخالفة
async function handleViolationAdd(interaction) {
  const userId = interaction.options.getUser('user').id;
  const name = interaction.options.getString('name');
  const status = interaction.options.getString('status');

  const identity = data.identities.find(id => 
    id.guildId === interaction.guildId && id.userId === userId
  );

  if (!identity) {
    await interaction.reply({ 
      content: '❌ يجب تسجيل هوية للمستخدم أولاً', 
      ephemeral: true 
    });
    return;
  }

  if (!identity.violations) identity.violations = [];
  
  identity.violations.push({
    id: Date.now().toString(),
    name,
    status,
    addedBy: interaction.user.id,
    addedAt: new Date().toISOString()
  });

  saveData(data);

  const embed = new EmbedBuilder()
    .setColor('#ef4444')
    .setTitle('🚨 تم إضافة مخالفة')
    .addFields(
      { name: 'المستخدم', value: `<@${userId}>`, inline: true },
      { name: 'المخالفة', value: name, inline: true },
      { name: 'الحالة', value: status, inline: true }
    )
    .setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

// قائمة المخالفات
async function handleViolationList(interaction) {
  const userId = interaction.options.getUser('user').id;
  const identity = data.identities.find(id => 
    id.guildId === interaction.guildId && id.userId === userId
  );

  if (!identity || !identity.violations || identity.violations.length === 0) {
    await interaction.reply({ 
      content: '❌ لا توجد مخالفات لهذا المستخدم', 
      ephemeral: true 
    });
    return;
  }

  const violationsText = identity.violations.map(v => 
    `• ${v.name}: ${v.status}`
  ).join('\n');

  const embed = new EmbedBuilder()
    .setColor('#ef4444')
    .setTitle('🚨 مخالفات المستخدم')
    .setDescription(`المستخدم: <@${userId}>\n\n${violationsText}`)
    .setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

// معالجة أمر الجرائم
async function handleCrimeCommand(interaction) {
  const subcommand = interaction.options.getSubcommand();
  
  if (subcommand === 'add') {
    await handleCrimeAdd(interaction);
  } else if (subcommand === 'list') {
    await handleCrimeList(interaction);
  }
}

// إضافة جريمة
async function handleCrimeAdd(interaction) {
  const userId = interaction.options.getUser('user').id;
  const title = interaction.options.getString('title');
  const description = interaction.options.getString('description');

  const identity = data.identities.find(id => 
    id.guildId === interaction.guildId && id.userId === userId
  );

  if (!identity) {
    await interaction.reply({ 
      content: '❌ يجب تسجيل هوية للمستخدم أولاً', 
      ephemeral: true 
    });
    return;
  }

  if (!identity.crimes) identity.crimes = [];
  
  identity.crimes.push({
    id: Date.now().toString(),
    title,
    description,
    done: false,
    addedBy: interaction.user.id,
    addedAt: new Date().toISOString()
  });

  saveData(data);

  const embed = new EmbedBuilder()
    .setColor('#dc2626')
    .setTitle('⚖️ تم إضافة جريمة')
    .addFields(
      { name: 'المستخدم', value: `<@${userId}>`, inline: true },
      { name: 'العنوان', value: title, inline: true },
      { name: 'الوصف', value: description }
    )
    .setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

// قائمة الجرائم
async function handleCrimeList(interaction) {
  const userId = interaction.options.getUser('user').id;
  const identity = data.identities.find(id => 
    id.guildId === interaction.guildId && id.userId === userId
  );

  if (!identity || !identity.crimes || identity.crimes.length === 0) {
    await interaction.reply({ 
      content: '❌ لا توجد جرائم لهذا المستخدم', 
      ephemeral: true 
    });
    return;
  }

  const crimesText = identity.crimes.map(c => 
    `• ${c.title}: ${c.done ? 'تم التنفيذ' : 'قيد الانتظار'}`
  ).join('\n');

  const embed = new EmbedBuilder()
    .setColor('#dc2626')
    .setTitle('⚖️ جرائم المستخدم')
    .setDescription(`المستخدم: <@${userId}>\n\n${crimesText}`)
    .setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

// تسجيل الأوامر
async function registerCommands() {
  const commands = [
    {
      name: 'المطور',
      description: 'أوامر المطور للتحكم في البوت',
      type: 1
    },
    {
      name: 'identity',
      description: 'إدارة الهويات',
      options: [
        {
          name: 'add',
          description: 'إضافة هوية جديدة',
          type: 1,
          options: [
            { name: 'name', description: 'الاسم الكامل', type: 3, required: true },
            { name: 'gender', description: 'الجنس', type: 3, required: true, choices: [
              { name: 'ذكر', value: 'male' },
              { name: 'أنثى', value: 'female' }
            ]},
            { name: 'city', description: 'المدينة', type: 3, required: true },
            { name: 'year', description: 'سنة الميلاد', type: 3, required: true },
            { name: 'month', description: 'شهر الميلاد', type: 3, required: true },
            { name: 'day', description: 'يوم الميلاد', type: 3, required: true },
            { name: 'national_id', description: 'الرقم الوطني', type: 3, required: true }
          ]
        },
        {
          name: 'view',
          description: 'عرض هوية',
          type: 1,
          options: [
            { name: 'user', description: 'المستخدم', type: 6, required: false }
          ]
        },
        {
          name: 'list',
          description: 'قائمة الهويات',
          type: 1
        }
      ]
    },
    {
      name: 'military',
      description: 'إدارة العسكريين',
      options: [
        {
          name: 'add',
          description: 'إضافة عسكري جديد',
          type: 1,
          options: [
            { name: 'name', description: 'الاسم الكامل', type: 3, required: true },
            { name: 'code', description: 'الكود العسكري', type: 3, required: true },
            { name: 'rank', description: 'الرتبة العسكرية', type: 3, required: true },
            { name: 'status', description: 'الحالة', type: 3, required: true, choices: [
              { name: 'في الخدمة', value: 'in' },
              { name: 'خارج الخدمة', value: 'out' },
              { name: 'منتهي الخدمة', value: 'ended' }
            ]}
          ]
        },
        {
          name: 'status',
          description: 'عرض حالة عسكري',
          type: 1,
          options: [
            { name: 'code', description: 'الكود العسكري', type: 3, required: true }
          ]
        },
        {
          name: 'list',
          description: 'قائمة العسكريين',
          type: 1
        }
      ]
    },
    {
      name: 'violation',
      description: 'إدارة المخالفات',
      options: [
        {
          name: 'add',
          description: 'إضافة مخالفة',
          type: 1,
          options: [
            { name: 'user', description: 'المستخدم', type: 6, required: true },
            { name: 'name', description: 'اسم المخالفة', type: 3, required: true },
            { name: 'status', description: 'حالة المخالفة', type: 3, required: true, choices: [
              { name: 'قيد المعالجة', value: 'pending' },
              { name: 'تم الحل', value: 'resolved' },
              { name: 'مرفوضة', value: 'rejected' }
            ]}
          ]
        },
        {
          name: 'list',
          description: 'قائمة مخالفات المستخدم',
          type: 1,
          options: [
            { name: 'user', description: 'المستخدم', type: 6, required: true }
          ]
        }
      ]
    },
    {
      name: 'crime',
      description: 'إدارة الجرائم',
      options: [
        {
          name: 'add',
          description: 'إضافة جريمة',
          type: 1,
          options: [
            { name: 'user', description: 'المستخدم', type: 6, required: true },
            { name: 'title', description: 'عنوان الجريمة', type: 3, required: true },
            { name: 'description', description: 'وصف الجريمة', type: 3, required: true }
          ]
        },
        {
          name: 'list',
          description: 'قائمة جرائم المستخدم',
          type: 1,
          options: [
            { name: 'user', description: 'المستخدم', type: 6, required: true }
          ]
        }
      ]
    }
  ];

  try {
    await client.application.commands.set(commands);
    console.log('✅ تم تسجيل الأوامر بنجاح');
  } catch (error) {
    console.error('❌ خطأ في تسجيل الأوامر:', error);
  }
}

// معالجة الأحداث
client.on('ready', async () => {
  console.log('🎉 البوت جاهز للعمل!');
  console.log(`✅ تم تسجيل الدخول باسم: ${client.user.tag}`);
  console.log(`🆔 معرف البوت: ${client.user.id}`);
  console.log(`🏢 عدد السيرفرات: ${client.guilds.cache.size}`);
  
  // عرض حالة البوت لكل سيرفر
  if (client.guilds.cache.size > 0) {
    console.log('📋 قائمة السيرفرات:');
    client.guilds.cache.forEach(guild => {
      const isStopped = isBotStopped(guild.id);
      console.log(`  📊 ${guild.name} (${guild.id}): ${isStopped ? '🔴 متوقف' : '🟢 يعمل'}`);
    });
  } else {
    console.log('⚠️ البوت غير موجود في أي سيرفر');
  }
  
  // تسجيل الأوامر
  console.log('📝 تسجيل الأوامر...');
  try {
    await registerCommands();
    console.log('✅ تم تسجيل الأوامر بنجاح');
  } catch (error) {
    console.error('❌ خطأ في تسجيل الأوامر:', error);
  }
});

// معالجة التفاعلات
client.on('interactionCreate', async (interaction) => {
  try {
    // التحقق من حالة البوت
    if (isBotStopped(interaction.guildId)) {
      const embed = new EmbedBuilder()
        .setColor('#ef4444')
        .setTitle('🔴 البوت متوقف')
        .setDescription('البوت حالياً متوقف من أحد المطورين يرجى التواصل مع المطور @المطور')
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    if (interaction.isCommand()) {
      if (interaction.commandName === 'المطور') {
        await handleDeveloperCommand(interaction);
      } else {
        await handleMilitaryCommands(interaction);
      }
    } else if (interaction.isButton()) {
      await handleDeveloperButtons(interaction);
    } else if (interaction.isStringSelectMenu()) {
      if (interaction.customId === 'select_guild') {
        await handleGuildSelection(interaction);
      }
    }
  } catch (error) {
    console.error('خطأ في معالجة التفاعل:', error);
    await interaction.reply({ 
      content: '❌ حدث خطأ أثناء تنفيذ الأمر', 
      ephemeral: true 
    }).catch(() => {});
  }
});

// معالجة أزرار إضافية
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isButton()) return;

  try {
    if (interaction.customId.startsWith('toggle_bot_')) {
      await handleBotToggle(interaction);
    } else if (interaction.customId === 'back_to_guilds') {
      await handleBotControl(interaction);
    } else if (interaction.customId === 'back_to_main') {
      await handleDeveloperCommand(interaction);
    }
  } catch (error) {
    console.error('خطأ في معالجة الأزرار:', error);
  }
});

// تسجيل الدخول
console.log('🔄 محاولة تسجيل الدخول إلى Discord...');
console.log('🔑 Token موجود:', !!config.DISCORD_TOKEN);
console.log('🔑 Token length:', config.DISCORD_TOKEN ? config.DISCORD_TOKEN.length : 0);

client.login(config.DISCORD_TOKEN).then(() => {
  console.log('✅ تم تسجيل الدخول بنجاح!');
}).catch(error => {
  console.error('❌ خطأ في تسجيل الدخول:', error);
  console.error('🔍 تأكد من أن DISCORD_TOKEN صحيح في متغيرات البيئة');
  console.error('🔍 تأكد من أن التوكن محدث في Discord Developer Portal');
  console.error('🔍 تأكد من أن البوت لديه الصلاحيات المطلوبة');
  process.exit(1);
});

// إضافة منفذ للويب (مطلوب لـ Render Web Service)
const port = process.env.PORT || 3000;
const http = require('http');

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('MDT Discord Bot is running!');
});

server.listen(port, () => {
  console.log(`🌐 Server listening on port ${port}`);
  console.log(`🔗 يمكن الوصول للبوت على: http://localhost:${port}`);
});

// معالجة الأخطاء غير المتوقعة
process.on('unhandledRejection', (error) => {
  console.error('❌ خطأ غير معالج (Promise):', error);
});

process.on('uncaughtException', (error) => {
  console.error('❌ استثناء غير معالج:', error);
  process.exit(1);
});

// معالجة انقطاع الاتصال
client.on('disconnect', () => {
  console.log('🔌 تم قطع الاتصال من Discord');
});

client.on('reconnecting', () => {
  console.log('🔄 إعادة الاتصال بـ Discord...');
});

client.on('error', (error) => {
  console.error('❌ خطأ في اتصال Discord:', error);
}); 
