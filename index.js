const { Client, GatewayIntentBits, Collection, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('./config');
const { generateMilitaryPageImage } = require('./militaryImage');

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
      const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
      botStatus = data.botStatus || {};
      originalBotNames = data.originalBotNames || {};
      return data;
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

  // إرسال رسالة تأكيد
  const embed = new EmbedBuilder()
    .setColor(isStopped ? '#22c55e' : '#ef4444')
    .setTitle('✅ تم تغيير حالة البوت')
    .setDescription(`**السيرفر:** ${guild.name}\n**الحالة الجديدة:** ${isStopped ? '🟢 يعمل' : '🔴 متوقف'}\n**بواسطة:** ${developerName}`)
    .setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: true });

  // تحديث الواجهة
  await handleGuildSelection(interaction);
}

// معالجة إحصائيات السيرفر
async function handleServerStats(interaction) {
  const guilds = client.guilds.cache;
  let totalMembers = 0;
  let stoppedBots = 0;

  guilds.forEach(guild => {
    totalMembers += guild.memberCount;
    if (isBotStopped(guild.id)) stoppedBots++;
  });

  const embed = new EmbedBuilder()
    .setColor('#3b82f6')
    .setTitle('📊 إحصائيات عامة')
    .addFields(
      { name: '🏢 عدد السيرفرات', value: guilds.size.toString(), inline: true },
      { name: '👥 إجمالي الأعضاء', value: totalMembers.toString(), inline: true },
      { name: '🔴 البوتات المتوقفة', value: stoppedBots.toString(), inline: true },
      { name: '🟢 البوتات العاملة', value: (guilds.size - stoppedBots).toString(), inline: true }
    )
    .setTimestamp();

  const row = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('back_to_main')
        .setLabel('العودة للقائمة الرئيسية')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('⬅️')
    );

  await interaction.update({
    content: '',
    embeds: [embed],
    components: [row]
  });
}

// الأوامر العسكرية
async function handleMilitaryCommands(interaction) {
  const command = interaction.commandName;

  switch (command) {
    case 'identity':
      await handleIdentityCommand(interaction);
      break;
    case 'military':
      await handleMilitaryCommand(interaction);
      break;
    case 'violation':
      await handleViolationCommand(interaction);
      break;
    case 'crime':
      await handleCrimeCommand(interaction);
      break;
    default:
      await interaction.reply({ content: '❌ أمر غير معروف', ephemeral: true });
  }
}

// أمر الهوية
async function handleIdentityCommand(interaction) {
  const subcommand = interaction.options.getSubcommand();
  
  switch (subcommand) {
    case 'add':
      await handleIdentityAdd(interaction);
      break;
    case 'view':
      await handleIdentityView(interaction);
      break;
    case 'list':
      await handleIdentityList(interaction);
      break;
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

  // التحقق من عدم وجود هوية مسبقاً
  const existingIdentity = data.identities.find(id => 
    id.guildId === interaction.guildId && 
    id.userId === interaction.user.id
  );

  if (existingIdentity) {
    await interaction.reply({ 
      content: '❌ لديك هوية مسجلة مسبقاً', 
      ephemeral: true 
    });
    return;
  }

  // إنشاء هوية جديدة
  const newIdentity = {
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
    id.guildId === interaction.guildId && 
    id.userId === targetUser.id
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
    .setTitle(`🆔 هوية ${identity.fullName}`)
    .addFields(
      { name: 'الاسم الكامل', value: identity.fullName, inline: true },
      { name: 'الجنس', value: identity.gender === 'male' ? 'ذكر' : 'أنثى', inline: true },
      { name: 'المدينة', value: identity.city, inline: true },
      { name: 'تاريخ الميلاد', value: `${identity.year}/${identity.month}/${identity.day}`, inline: true },
      { name: 'الرقم الوطني', value: identity.nationalId, inline: true },
      { name: 'تاريخ الموافقة', value: `<t:${Math.floor(new Date(identity.approvedAt).getTime() / 1000)}:F>`, inline: true }
    )
    .setThumbnail(targetUser.displayAvatarURL())
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
    `${index + 1}. **${id.fullName}** - ${id.nationalId}`
  ).join('\n');

  embed.addFields({ name: 'الهويات', value: identitiesText });

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

// أمر العسكري
async function handleMilitaryCommand(interaction) {
  const subcommand = interaction.options.getSubcommand();
  
  switch (subcommand) {
    case 'add':
      await handleMilitaryAdd(interaction);
      break;
    case 'status':
      await handleMilitaryStatus(interaction);
      break;
    case 'list':
      await handleMilitaryList(interaction);
      break;
  }
}

// إضافة عسكري
async function handleMilitaryAdd(interaction) {
  const user = interaction.options.getUser('user');
  const code = interaction.options.getString('code');
  const rank = interaction.options.getString('rank');

  // التحقق من وجود هوية
  const identity = data.identities.find(id => 
    id.guildId === interaction.guildId && 
    id.userId === user.id
  );

  if (!identity) {
    await interaction.reply({ 
      content: '❌ يجب أن يكون لدى المستخدم هوية مسجلة أولاً', 
      ephemeral: true 
    });
    return;
  }

  // إضافة العسكري (يمكن توسيع هذا حسب الحاجة)
  const embed = new EmbedBuilder()
    .setColor('#22c55e')
    .setTitle('✅ تم إضافة العسكري بنجاح')
    .addFields(
      { name: 'الاسم', value: identity.fullName, inline: true },
      { name: 'الكود العسكري', value: code, inline: true },
      { name: 'الرتبة', value: rank, inline: true }
    )
    .setThumbnail(user.displayAvatarURL())
    .setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

// حالة العسكري
async function handleMilitaryStatus(interaction) {
  const user = interaction.options.getUser('user');
  const status = interaction.options.getString('status');

  const embed = new EmbedBuilder()
    .setColor('#3b82f6')
    .setTitle('🔄 تم تحديث حالة العسكري')
    .addFields(
      { name: 'العسكري', value: user.toString(), inline: true },
      { name: 'الحالة الجديدة', value: status, inline: true }
    )
    .setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

// قائمة العسكريين
async function handleMilitaryList(interaction) {
  // إنشاء صورة العسكريين
  const users = [
    { fullName: 'عسكري 1', code: '001', rank: 'جندي', status: 'in' },
    { fullName: 'عسكري 2', code: '002', rank: 'عريف', status: 'out' },
    { fullName: 'عسكري 3', code: '003', rank: 'رقيب', status: 'ended' }
  ];

  const counters = { in: 1, out: 1, ended: 1 };

  try {
    const imageBuffer = await generateMilitaryPageImage(users, counters);
    
    const embed = new EmbedBuilder()
      .setColor('#3b82f6')
      .setTitle('📋 قائمة العسكريين')
      .setDescription('جدول مباشرة العسكر')
      .setTimestamp();

    await interaction.reply({ 
      embeds: [embed], 
      files: [{ 
        attachment: imageBuffer, 
        name: 'military_list.png' 
      }],
      ephemeral: true 
    });
  } catch (error) {
    console.error('خطأ في إنشاء صورة العسكريين:', error);
    await interaction.reply({ 
      content: '❌ حدث خطأ في إنشاء الصورة', 
      ephemeral: true 
    });
  }
}

// أمر المخالفات
async function handleViolationCommand(interaction) {
  const subcommand = interaction.options.getSubcommand();
  
  switch (subcommand) {
    case 'add':
      await handleViolationAdd(interaction);
      break;
    case 'list':
      await handleViolationList(interaction);
      break;
  }
}

// إضافة مخالفة
async function handleViolationAdd(interaction) {
  const user = interaction.options.getUser('user');
  const name = interaction.options.getString('name');
  const desc = interaction.options.getString('description');

  const embed = new EmbedBuilder()
    .setColor('#ef4444')
    .setTitle('🚨 تم إضافة مخالفة جديدة')
    .addFields(
      { name: 'المخالف', value: user.toString(), inline: true },
      { name: 'نوع المخالفة', value: name, inline: true },
      { name: 'الوصف', value: desc, inline: false }
    )
    .setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

// قائمة المخالفات
async function handleViolationList(interaction) {
  const user = interaction.options.getUser('user');
  
  const identity = data.identities.find(id => 
    id.guildId === interaction.guildId && 
    id.userId === user.id
  );

  if (!identity || !identity.violations || identity.violations.length === 0) {
    await interaction.reply({ 
      content: '❌ لا توجد مخالفات مسجلة لهذا المستخدم', 
      ephemeral: true 
    });
    return;
  }

  const embed = new EmbedBuilder()
    .setColor('#ef4444')
    .setTitle(`🚨 مخالفات ${identity.fullName}`)
    .setTimestamp();

  const violationsText = identity.violations.map(v => 
    `• **${v.name}**: ${v.desc}\n  الحالة: ${v.status}`
  ).join('\n\n');

  embed.setDescription(violationsText);

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

// أمر الجرائم
async function handleCrimeCommand(interaction) {
  const subcommand = interaction.options.getSubcommand();
  
  switch (subcommand) {
    case 'add':
      await handleCrimeAdd(interaction);
      break;
    case 'list':
      await handleCrimeList(interaction);
      break;
  }
}

// إضافة جريمة
async function handleCrimeAdd(interaction) {
  const user = interaction.options.getUser('user');
  const title = interaction.options.getString('title');
  const desc = interaction.options.getString('description');

  const embed = new EmbedBuilder()
    .setColor('#dc2626')
    .setTitle('⚖️ تم إضافة جريمة جديدة')
    .addFields(
      { name: 'المتهم', value: user.toString(), inline: true },
      { name: 'نوع الجريمة', value: title, inline: true },
      { name: 'الوصف', value: desc, inline: false }
    )
    .setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

// قائمة الجرائم
async function handleCrimeList(interaction) {
  const user = interaction.options.getUser('user');
  
  const identity = data.identities.find(id => 
    id.guildId === interaction.guildId && 
    id.userId === user.id
  );

  if (!identity || !identity.crimes || identity.crimes.length === 0) {
    await interaction.reply({ 
      content: '❌ لا توجد جرائم مسجلة لهذا المستخدم', 
      ephemeral: true 
    });
    return;
  }

  const embed = new EmbedBuilder()
    .setColor('#dc2626')
    .setTitle(`⚖️ جرائم ${identity.fullName}`)
    .setTimestamp();

  const crimesText = identity.crimes.map(c => 
    `• **${c.title}**: ${c.desc}\n  الحالة: ${c.done ? 'تم التنفيذ' : 'قيد الانتظار'}`
  ).join('\n\n');

  embed.setDescription(crimesText);

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
          description: 'إضافة عسكري',
          type: 1,
          options: [
            { name: 'user', description: 'المستخدم', type: 6, required: true },
            { name: 'code', description: 'الكود العسكري', type: 3, required: true },
            { name: 'rank', description: 'الرتبة', type: 3, required: true }
          ]
        },
        {
          name: 'status',
          description: 'تغيير حالة العسكري',
          type: 1,
          options: [
            { name: 'user', description: 'المستخدم', type: 6, required: true },
            { name: 'status', description: 'الحالة', type: 3, required: true, choices: [
              { name: 'متواجد', value: 'in' },
              { name: 'غير متواجد', value: 'out' },
              { name: 'منتهي الخدمة', value: 'ended' }
            ]}
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
            { name: 'name', description: 'نوع المخالفة', type: 3, required: true },
            { name: 'description', description: 'وصف المخالفة', type: 3, required: true }
          ]
        },
        {
          name: 'list',
          description: 'قائمة المخالفات',
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
            { name: 'title', description: 'نوع الجريمة', type: 3, required: true },
            { name: 'description', description: 'وصف الجريمة', type: 3, required: true }
          ]
        },
        {
          name: 'list',
          description: 'قائمة الجرائم',
          type: 1,
          options: [
            { name: 'user', description: 'المستخدم', type: 6, required: true }
          ]
        }
      ]
    }
  ];

  try {
    console.log('بدء تسجيل الأوامر...');
    
    // تسجيل الأوامر عالمياً
    await client.application.commands.set(commands);
    
    console.log('تم تسجيل الأوامر بنجاح!');
  } catch (error) {
    console.error('خطأ في تسجيل الأوامر:', error);
  }
}

// معالجة الأحداث
client.on('ready', async () => {
  console.log(`✅ تم تسجيل الدخول باسم: ${client.user.tag}`);
  console.log(`🏢 عدد السيرفرات: ${client.guilds.cache.size}`);
  
  // عرض حالة البوت لكل سيرفر
  client.guilds.cache.forEach(guild => {
    const isStopped = isBotStopped(guild.id);
    console.log(`📊 ${guild.name}: ${isStopped ? '🔴 متوقف' : '🟢 يعمل'}`);
  });
  
  // تسجيل الأوامر
  await registerCommands();
});

client.on('interactionCreate', async (interaction) => {
  try {
    // التحقق من حالة البوت (ما عدا أمر المطور)
    if (interaction.commandName !== 'المطور' && isBotStopped(interaction.guildId)) {
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
client.login(config.DISCORD_TOKEN).catch(error => {
  console.error('خطأ في تسجيل الدخول:', error);
  process.exit(1);
});

// معالجة الأخطاء غير المتوقعة
process.on('unhandledRejection', (error) => {
  console.error('خطأ غير معالج:', error);
});

process.on('uncaughtException', (error) => {
  console.error('استثناء غير معالج:', error);
  process.exit(1);
}); 
