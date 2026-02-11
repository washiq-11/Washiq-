const { createCanvas, loadImage, registerFont } = require('canvas');
const fs = require('fs-extra');
const path = require('path');

const fontDir = process.cwd() + "/scripts/cmds/assets/font";
const canvasFontDir = process.cwd() + "/scripts/cmds/canvas/fonts";

// ---- Font registration (keep original + add safe optional fallbacks) ----
function safeRegisterFont(filePath, options) {
  try {
    if (fs.existsSync(filePath)) registerFont(filePath, options);
  } catch (e) {
    // don't crash if font missing or invalid
  }
}

safeRegisterFont(path.join(fontDir, "NotoSans-Bold.ttf"), { family: 'NotoSans', weight: 'bold' });
safeRegisterFont(path.join(fontDir, "NotoSans-SemiBold.ttf"), { family: 'NotoSans', weight: '600' });
safeRegisterFont(path.join(fontDir, "NotoSans-Regular.ttf"), { family: 'NotoSans', weight: 'normal' });

safeRegisterFont(path.join(fontDir, "BeVietnamPro-Bold.ttf"), { family: 'BeVietnamPro', weight: 'bold' });
safeRegisterFont(path.join(fontDir, "BeVietnamPro-SemiBold.ttf"), { family: 'BeVietnamPro', weight: '600' });
safeRegisterFont(path.join(fontDir, "BeVietnamPro-Regular.ttf"), { family: 'BeVietnamPro', weight: 'normal' });

safeRegisterFont(path.join(fontDir, "Kanit-SemiBoldItalic.ttf"), { family: 'Kanit', weight: '600', style: 'italic' });
safeRegisterFont(path.join(canvasFontDir, "Rounded.otf"), { family: 'Rounded' });

// Optional: add these files to /scripts/cmds/assets/font for better unicode coverage
safeRegisterFont(path.join(fontDir, "NotoSansSymbols2-Regular.ttf"), { family: 'NotoSymbols', weight: 'normal' });
safeRegisterFont(path.join(fontDir, "NotoSansMath-Regular.ttf"), { family: 'NotoMath', weight: 'normal' });
// Optional emoji font (many Linux builds still won't render color emoji in node-canvas)
safeRegisterFont(path.join(fontDir, "NotoColorEmoji.ttf"), { family: 'Emoji', weight: 'normal' });

// ---- Twemoji drawing (most reliable emoji support) ----
// Node-canvas often can't render emoji glyphs. This draws emoji as images from Twemoji CDN.
const TWEMOJI_BASE = "https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72";
const emojiCache = new Map();

function toCodePoint(unicodeSurrogates, sep) {
  const r = [];
  let c = 0;
  let p = 0;
  let i = 0;
  while (i < unicodeSurrogates.length) {
    c = unicodeSurrogates.charCodeAt(i++);
    if (p) {
      r.push((0x10000 + ((p - 0xD800) << 10) + (c - 0xDC00)).toString(16));
      p = 0;
    } else if (c >= 0xD800 && c <= 0xDBFF) {
      p = c;
    } else {
      r.push(c.toString(16));
    }
  }
  return r.join(sep || '-');
}

// Emoji detection (good enough for messenger names). If a rare emoji doesn't match,
// it will fall back to normal text.
const emojiRegex = /\p{Extended_Pictographic}(?:\uFE0F|\uFE0E)?(?:\u200D\p{Extended_Pictographic}(?:\uFE0F|\uFE0E)?)*?/gu;

async function loadTwemojiImage(emoji) {
  const clean = emoji.replace(/\uFE0F|\uFE0E/g, '');
  const code = toCodePoint(clean, '-');
  const url = `${TWEMOJI_BASE}/${code}.png`;
  if (emojiCache.has(url)) return emojiCache.get(url);
  try {
    const img = await loadImage(url);
    emojiCache.set(url, img);
    return img;
  } catch {
    emojiCache.set(url, null);
    return null;
  }
}

async function drawTextWithEmoji(ctx, text, x, y, opts = {}) {
  const {
    font,
    fillStyle = '#ffffff',
    align = 'left',
    baseline = 'alphabetic',
    emojiSize = 28,
    emojiGap = 6,
    shadow = null
  } = opts;

  if (font) ctx.font = font;
  ctx.fillStyle = fillStyle;
  ctx.textAlign = 'left';
  ctx.textBaseline = baseline;

  if (shadow) {
    ctx.save();
    ctx.shadowColor = shadow.color || 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = shadow.blur ?? 4;
    ctx.shadowOffsetX = shadow.x ?? 2;
    ctx.shadowOffsetY = shadow.y ?? 2;
  }

  // Split into text and emoji tokens
  const tokens = [];
  let lastIndex = 0;
  for (const m of text.matchAll(emojiRegex)) {
    const start = m.index ?? 0;
    const end = start + m[0].length;
    if (start > lastIndex) tokens.push({ type: 'text', value: text.slice(lastIndex, start) });
    tokens.push({ type: 'emoji', value: m[0] });
    lastIndex = end;
  }
  if (lastIndex < text.length) tokens.push({ type: 'text', value: text.slice(lastIndex) });
  if (tokens.length === 0) tokens.push({ type: 'text', value: text });

  // Measure total width
  let totalW = 0;
  for (const t of tokens) {
    if (t.type === 'text') totalW += ctx.measureText(t.value).width;
    else totalW += emojiSize + emojiGap;
  }
  if (tokens.length && tokens[tokens.length - 1].type === 'emoji') totalW -= emojiGap;

  let startX = x;
  if (align === 'center') startX = x - totalW / 2;
  else if (align === 'right') startX = x - totalW;

  // Draw
  let cursorX = startX;
  for (const t of tokens) {
    if (t.type === 'text') {
      ctx.fillText(t.value, cursorX, y);
      cursorX += ctx.measureText(t.value).width;
    } else {
      const img = await loadTwemojiImage(t.value);
      if (img) {
        const dy = baseline === 'middle' ? y - emojiSize / 2 : y - emojiSize * 0.78;
        ctx.drawImage(img, cursorX, dy, emojiSize, emojiSize);
        cursorX += emojiSize + emojiGap;
      } else {
        // fallback: try draw the emoji as text
        ctx.fillText(t.value, cursorX, y);
        cursorX += ctx.measureText(t.value).width;
      }
    }
  }

  if (shadow) ctx.restore();
}

async function createWelcomeCanvas(gcImg, img1, img2, userName, userNumber, threadName, potato) {
  const width = 1200;
  const height = 600;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
  ctx.lineWidth = 2;
  for (let i = -height; i < width; i += 60) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + height, height);
    ctx.stroke();
  }
  const lightGradient = ctx.createLinearGradient(0, 0, width, height);
  lightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.02)');
  lightGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.05)');
  lightGradient.addColorStop(1, 'rgba(255, 255, 255, 0.02)');
  ctx.fillStyle = lightGradient;
  ctx.fillRect(0, 0, width, height);

  const squares = [
    { x: 50, y: 50, size: 80, rotation: 15 },
    { x: 1100, y: 80, size: 60, rotation: -20 },
    { x: 150, y: 500, size: 50, rotation: 30 },
    { x: 1050, y: 480, size: 70, rotation: -15 },
    { x: 900, y: 30, size: 40, rotation: 45 },
    { x: 200, y: 150, size: 35, rotation: -30 },
    { x: 400, y: 80, size: 45, rotation: 60 },
    { x: 700, y: 520, size: 55, rotation: -40 },
    { x: 950, y: 250, size: 38, rotation: 25 },
    { x: 300, y: 350, size: 42, rotation: -50 }
  ];

  squares.forEach(sq => {
    ctx.save();
    ctx.translate(sq.x + sq.size / 2, sq.y + sq.size / 2);
    ctx.rotate((sq.rotation * Math.PI) / 180);

    const sqGradient = ctx.createLinearGradient(-sq.size / 2, -sq.size / 2, sq.size / 2, sq.size / 2);
    sqGradient.addColorStop(0, 'rgba(34, 197, 94, 0.3)');
    sqGradient.addColorStop(1, 'rgba(22, 163, 74, 0.1)');

    ctx.fillStyle = sqGradient;
    ctx.fillRect(-sq.size / 2, -sq.size / 2, sq.size, sq.size);

    ctx.strokeStyle = 'rgba(34, 197, 94, 0.5)';
    ctx.lineWidth = 2;
    ctx.strokeRect(-sq.size / 2, -sq.size / 2, sq.size, sq.size);

    ctx.restore();
  });

  const circles = [
    { x: 250, y: 250, radius: 30, alpha: 0.15 },
    { x: 850, y: 150, radius: 25, alpha: 0.12 },
    { x: 600, y: 50, radius: 20, alpha: 0.1 },
    { x: 100, y: 350, radius: 35, alpha: 0.18 },
    { x: 1000, y: 380, radius: 28, alpha: 0.14 },
    { x: 450, y: 480, radius: 22, alpha: 0.11 }
  ];

  circles.forEach(circ => {
    ctx.beginPath();
    ctx.arc(circ.x, circ.y, circ.radius, 0, Math.PI * 2);
    const circGradient = ctx.createRadialGradient(circ.x, circ.y, 0, circ.x, circ.y, circ.radius);
    circGradient.addColorStop(0, `rgba(34, 197, 94, ${circ.alpha})`);
    circGradient.addColorStop(1, 'rgba(22, 163, 74, 0)');
    ctx.fillStyle = circGradient;
    ctx.fill();

    ctx.strokeStyle = `rgba(34, 197, 94, ${circ.alpha * 2})`;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  });

  const triangles = [
    { x: 550, y: 150, size: 40, rotation: 0 },
    { x: 180, y: 420, size: 35, rotation: 180 },
    { x: 1080, y: 320, size: 38, rotation: 90 },
    { x: 380, y: 200, size: 32, rotation: -45 }
  ];

  triangles.forEach(tri => {
    ctx.save();
    ctx.translate(tri.x, tri.y);
    ctx.rotate((tri.rotation * Math.PI) / 180);

    ctx.beginPath();
    ctx.moveTo(0, -tri.size / 2);
    ctx.lineTo(-tri.size / 2, tri.size / 2);
    ctx.lineTo(tri.size / 2, tri.size / 2);
    ctx.closePath();

    const triGradient = ctx.createLinearGradient(-tri.size / 2, 0, tri.size / 2, 0);
    triGradient.addColorStop(0, 'rgba(34, 197, 94, 0.2)');
    triGradient.addColorStop(1, 'rgba(22, 163, 74, 0.1)');
    ctx.fillStyle = triGradient;
    ctx.fill();

    ctx.strokeStyle = 'rgba(34, 197, 94, 0.4)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();
  });

  async function drawCircularImage(imageSrc, x, y, radius, borderColor, borderWidth = 5) {
    try {
      const image = await loadImage(imageSrc);
      ctx.shadowColor = borderColor;
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.arc(x, y, radius + borderWidth, 0, Math.PI * 2);
      ctx.fillStyle = borderColor;
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.arc(x, y, radius + borderWidth, 0, Math.PI * 2);
      ctx.fillStyle = borderColor;
      ctx.fill();
      ctx.save();
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(image, x - radius, y - radius, radius * 2, radius * 2);
      ctx.restore();
    } catch {
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fillStyle = '#1f1f1f';
      ctx.fill();
    }
  }

  await drawCircularImage(img2, width - 120, 100, 55, '#22c55e');
  await drawTextWithEmoji(ctx, 'Added by ' + potato, width - 190, 105, {
    font: 'bold 20px "NotoSans","BeVietnamPro","NotoSymbols","NotoMath",sans-serif',
    fillStyle: '#22c55e',
    align: 'right',
    baseline: 'middle',
    emojiSize: 22,
    shadow: { color: 'rgba(0,0,0,0.35)', blur: 3, x: 1, y: 1 }
  });

  await drawCircularImage(img1, 120, height - 100, 55, '#16a34a');
  await drawTextWithEmoji(ctx, userName, 190, height - 95, {
    font: 'bold 24px "NotoSans","BeVietnamPro","NotoSymbols","NotoMath",sans-serif',
    fillStyle: '#ffffff',
    align: 'left',
    baseline: 'middle',
    emojiSize: 26,
    shadow: { color: 'rgba(0,0,0,0.45)', blur: 4, x: 2, y: 2 }
  });

  await drawCircularImage(gcImg, width / 2, 200, 90, '#22c55e', 6);
  await drawTextWithEmoji(ctx, threadName, width / 2, 335, {
    font: '600 42px "NotoSans","BeVietnamPro","NotoSymbols","NotoMath",sans-serif',
    fillStyle: '#ffffff',
    align: 'center',
    baseline: 'middle',
    emojiSize: 36,
    shadow: { color: 'rgba(0,0,0,0.50)', blur: 5, x: 2, y: 2 }
  });

  // WELCOME title (kept as original style)
  ctx.font = 'italic 600 56px "Kanit","NotoSans",sans-serif';
  const nameGradient = ctx.createLinearGradient(width / 2 - 200, 0, width / 2 + 200, 0);
  nameGradient.addColorStop(0, '#4ade80');
  nameGradient.addColorStop(1, '#22c55e');
  ctx.fillStyle = nameGradient;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('WELCOME', width / 2, 410);

  ctx.strokeStyle = 'rgba(34, 197, 94, 0.4)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(width / 2 - 180, 430);
  ctx.lineTo(width / 2 + 180, 430);
  ctx.stroke();

  await drawTextWithEmoji(ctx, `You are the ${userNumber}th member`, width / 2, 480, {
    font: '600 26px "NotoSans","BeVietnamPro","NotoSymbols","NotoMath",sans-serif',
    fillStyle: '#a0a0a0',
    align: 'center',
    baseline: 'middle',
    emojiSize: 24,
    shadow: { color: 'rgba(0,0,0,0.35)', blur: 3, x: 1, y: 1 }
  });

  return canvas.createPNGStream();
}

module.exports = {
  config: {
    name: "welcome",
    version: "1.4",
    author: "Neoaz ゐ", // Adapted from @procoder Allou Mohammed
    category: "events"
  },

  onStart: async ({ threadsData, event, message, usersData }) => {
    const type = "log:subscribe";
    if (event.logMessageType != type) return;

    try {
      await threadsData.refreshInfo(event.threadID);
      const threadsInfo = await threadsData.get(event.threadID);
      const gcImg = threadsInfo.imageSrc;
      const threadName = threadsInfo.threadName;
      const joined = event.logMessageData.addedParticipants[0].userFbId;
      const by = event.author;
      const img1 = await usersData.getAvatarUrl(joined);
      const img2 = await usersData.getAvatarUrl(by);
      const usernumber = threadsInfo.members?.length || 1;
      const userName = event.logMessageData.addedParticipants[0].fullName;
      const authorN = await usersData.getName(by);

      const welcomeImage = await createWelcomeCanvas(gcImg, img1, img2, userName, usernumber, threadName, authorN);

      const imagePath = path.join(__dirname, '../cmds/', global.utils.randomString(4) + ".png");
      const writeStream = fs.createWriteStream(imagePath);
      welcomeImage.pipe(writeStream);

      await new Promise((resolve) => {
        writeStream.on('finish', resolve);
      });

      await message.send({
        attachment: fs.createReadStream(imagePath)
      });

      fs.unlinkSync(imagePath);
    } catch (error) {
      console.error("[WELCOME] Error:", error.message);
      console.error(error.stack);
    }
  }
};
