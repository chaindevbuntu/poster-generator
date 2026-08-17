const canvas = document.querySelector("#posterCanvas");
const ctx = canvas.getContext("2d");

const controls = {
  background: document.querySelector("#backgroundInput"),
  backgroundUrl: document.querySelector("#backgroundUrlInput"),
  loadBackgroundUrl: document.querySelector("#loadBackgroundUrl"),
  backgroundUrlStatus: document.querySelector("#backgroundUrlStatus"),
  uploadZone: document.querySelector(".upload-zone"),
  uploadLabel: document.querySelector("#uploadLabel"),
  canvasEditor: document.querySelector("#canvasEditor"),
  backgroundTransformOverlay: document.querySelector("#backgroundTransformOverlay"),
  resetBackgroundTransform: document.querySelector("#resetBackgroundTransform"),
  producer: document.querySelector("#producerInput"),
  producerFont: document.querySelector("#producerFontInput"),
  producerLogo: document.querySelector("#producerLogoInput"),
  producerLogoLabel: document.querySelector("#producerLogoLabel"),
  overlayProducer: document.querySelector("#overlayProducerInput"),
  game: document.querySelector("#gameInput"),
  titleStyle: document.querySelector("#titleStyleInput"),
  gameFont: document.querySelector("#gameFontInput"),
  theme: document.querySelector("#themeInput"),
  themeCode: document.querySelector("#themeCodeInput"),
  gradientHeight: document.querySelector("#gradientHeightInput"),
  gradientOpacity: document.querySelector("#gradientOpacityInput"),
  glow: document.querySelector("#glowInput"),
  globalContrast: document.querySelector("#globalContrastInput"),
  globalSaturation: document.querySelector("#globalSaturationInput"),
  globalBrightness: document.querySelector("#globalBrightnessInput"),
  titleOutline: document.querySelector("#titleOutlineInput"),
  titlePosition: document.querySelector("#titlePositionInput"),
  titleHorizontal: document.querySelector("#titleHorizontalInput"),
  titleSize: document.querySelector("#titleSizeInput"),
  titleSpacing: document.querySelector("#titleSpacingInput"),
  titleLineOneSize: document.querySelector("#titleLineOneSizeInput"),
  titleLineTwoSize: document.querySelector("#titleLineTwoSizeInput"),
  titleLineThreeSize: document.querySelector("#titleLineThreeSizeInput"),
  titleLineFourSize: document.querySelector("#titleLineFourSizeInput"),
  titleRowSpacing: document.querySelector("#titleRowSpacingInput"),
  titleCurve: document.querySelector("#titleCurveInput"),
  producerPosition: document.querySelector("#producerPositionInput"),
  producerHorizontal: document.querySelector("#producerHorizontalInput"),
  producerNameVertical: document.querySelector("#producerNameVerticalInput"),
  producerLogoHorizontal: document.querySelector("#producerLogoHorizontalInput"),
  producerSize: document.querySelector("#producerSizeInput"),
  producerLogoSize: document.querySelector("#producerLogoSizeInput"),
  showProducer: document.querySelector("#showProducerInput"),
  showBottomGradient: document.querySelector("#showBottomGradientInput"),
  showGameTitle: document.querySelector("#showGameTitleInput"),
  exportFilename: document.querySelector("#exportFilenameInput"),
  producerPresetName: document.querySelector("#producerPresetNameInput"),
  saveProducerPreset: document.querySelector("#saveProducerPreset"),
  producerPresetStatus: document.querySelector("#producerPresetStatus"),
  producerPresetCount: document.querySelector("#producerPresetCount"),
  producerPresetSelect: document.querySelector("#producerPresetSelect"),
  applyProducerPreset: document.querySelector("#applyProducerPreset"),
  deleteProducerPreset: document.querySelector("#deleteProducerPreset"),
  png: document.querySelector("#downloadPng"),
  webp: document.querySelector("#downloadWebp"),
};

const poster = {
  image: null,
  imageTransform: null,
  producerLogo: null,
  producerLogoDataUrl: null,
  producerLogoFileName: null,
  width: canvas.width,
  height: canvas.height,
};

const settingsCache = {
  key: "gamePosterGeneratorSettings",
  ttl: 7 * 24 * 60 * 60 * 1000,
  fields: [
    "producer",
    "producerFont",
    "overlayProducer",
    "game",
    "titleStyle",
    "gameFont",
    "theme",
    "gradientHeight",
    "gradientOpacity",
    "glow",
    "globalContrast",
    "globalSaturation",
    "globalBrightness",
    "titleOutline",
    "titlePosition",
    "titleHorizontal",
    "titleSize",
    "titleSpacing",
    "titleLineOneSize",
    "titleLineTwoSize",
    "titleLineThreeSize",
    "titleLineFourSize",
    "titleRowSpacing",
    "titleCurve",
    "producerPosition",
    "producerHorizontal",
    "producerNameVertical",
    "producerLogoHorizontal",
    "producerSize",
    "producerLogoSize",
    "showProducer",
    "showBottomGradient",
    "showGameTitle",
    "exportFilename",
  ],
};

const controlLockCache = {
  key: "gamePosterGeneratorControlLocks",
};

const producerLogoCache = {
  key: "gamePosterGeneratorProducerLogo",
  ttl: settingsCache.ttl,
};

const tuningTabCache = {
  key: "gamePosterGeneratorActiveTuningTab",
};

const producerPresetConfig = {
  fields: [
    "producer",
    "producerFont",
    "overlayProducer",
    "theme",
    "producerPosition",
    "producerHorizontal",
    "producerNameVertical",
    "producerLogoHorizontal",
    "producerSize",
    "producerLogoSize",
    "showProducer",
  ],
};

const exportLocationCache = {
  key: "gamePosterGeneratorLastExport",
  dbName: "gamePosterGeneratorExportHandles",
  storeName: "handles",
  fileHandleKey: "lastFileHandle",
};

const autoLockGroups = [
  {
    toggle: "showProducer",
    controls: [
      "producerPosition",
      "producerHorizontal",
      "producerNameVertical",
      "producerLogoHorizontal",
      "producerSize",
      "producerLogoSize",
    ],
  },
  {
    toggle: "showBottomGradient",
    controls: ["gradientHeight", "gradientOpacity", "glow"],
  },
  {
    toggle: "showGameTitle",
    controls: [
      "titleOutline",
      "titlePosition",
      "titleHorizontal",
      "titleSize",
      "titleSpacing",
      "titleLineOneSize",
      "titleLineTwoSize",
      "titleLineThreeSize",
      "titleLineFourSize",
      "titleRowSpacing",
      "titleCurve",
    ],
  },
];

const titleStyles = {
  custom: {
    fontFamily: null,
    fontStyle: "normal",
    fontWeight: 900,
    fill: "rgba(255, 252, 237, 0.98)",
    stroke: "theme",
    strokeAlpha: 0.3,
    strokeScale: 0.07,
    shadow: "rgba(87, 48, 0, 0.3)",
    shadowBlurScale: 0.18,
    shadowOffsetScale: 0.06,
    skew: 0,
    baseSize: 0.12,
    maxWidth: 0.82,
    maxLines: 3,
    lineHeight: 0.86,
    y: 0.845,
    stackShortTitles: false,
  },
  candy: {
    fontFamily: '"Luckiest Guy", "Arial Black", Arial, sans-serif',
    fontStyle: "normal",
    fill: "#fff9ef",
    stroke: "theme",
    strokeAlpha: 0.82,
    strokeScale: 0.095,
    shadow: "rgba(111, 28, 110, 0.5)",
    shadowBlurScale: 0.12,
    shadowOffsetScale: 0.055,
    skew: -0.035,
    baseSize: 0.145,
    maxWidth: 0.86,
    maxLines: 3,
    lineHeight: 0.8,
    y: 0.82,
    stackShortTitles: true,
  },
  retro: {
    fontFamily: '"Alfa Slab One", Georgia, serif',
    fontStyle: "normal",
    fontWeight: 800,
    fill: "#fff2d8",
    stroke: "rgba(104, 29, 64, 0.72)",
    strokeScale: 0.085,
    shadow: "rgba(33, 12, 28, 0.52)",
    shadowBlurScale: 0.1,
    shadowOffsetScale: 0.06,
    skew: -0.025,
    baseSize: 0.126,
    maxWidth: 0.86,
    maxLines: 3,
    lineHeight: 0.84,
    y: 0.825,
    stackShortTitles: true,
  },
  comic: {
    fontFamily: 'Bangers, "Arial Black", Arial, sans-serif',
    fontStyle: "normal",
    fill: "#fff6dc",
    stroke: "rgba(18, 88, 65, 0.78)",
    strokeScale: 0.09,
    shadow: "rgba(6, 47, 36, 0.48)",
    shadowBlurScale: 0.11,
    shadowOffsetScale: 0.06,
    skew: -0.06,
    baseSize: 0.145,
    maxWidth: 0.86,
    maxLines: 3,
    lineHeight: 0.78,
    y: 0.824,
    stackShortTitles: true,
  },
  grobold: {
    fontFamily: 'Grobold, "Luckiest Guy", "Arial Black", Arial, sans-serif',
    fontStyle: "normal",
    fontWeight: 900,
    fill: "#fff8e8",
    stroke: "theme",
    strokeAlpha: 0.88,
    strokeScale: 0.105,
    shadow: "rgba(77, 31, 79, 0.5)",
    shadowBlurScale: 0.12,
    shadowOffsetScale: 0.06,
    skew: -0.035,
    baseSize: 0.14,
    maxWidth: 0.88,
    maxLines: 3,
    lineHeight: 0.82,
    y: 0.82,
    stackShortTitles: true,
  },
  olympus: {
    fontFamily: 'Cinzel, Georgia, "Times New Roman", serif',
    fontStyle: "normal",
    fontWeight: 900,
    fill: "#fff9eb",
    stroke: "rgba(89, 52, 150, 0.78)",
    strokeScale: 0.075,
    shadow: "rgba(38, 20, 90, 0.5)",
    shadowBlurScale: 0.16,
    shadowOffsetScale: 0.055,
    skew: 0,
    baseSize: 0.118,
    maxWidth: 0.86,
    maxLines: 3,
    lineHeight: 0.9,
    y: 0.825,
    stackShortTitles: true,
  },
  western: {
    fontFamily: 'Rye, "Alfa Slab One", Georgia, serif',
    fontStyle: "normal",
    fontWeight: 900,
    fill: "#fff5dc",
    stroke: "rgba(122, 30, 18, 0.82)",
    strokeScale: 0.082,
    shadow: "rgba(49, 15, 9, 0.56)",
    shadowBlurScale: 0.08,
    shadowOffsetScale: 0.07,
    skew: -0.02,
    baseSize: 0.12,
    maxWidth: 0.88,
    maxLines: 3,
    lineHeight: 0.86,
    y: 0.825,
    stackShortTitles: true,
  },
  neon: {
    fontFamily: 'Monoton, "Arial Black", Arial, sans-serif',
    fontStyle: "normal",
    fontWeight: 900,
    fill: "#fffaff",
    stroke: "rgba(202, 38, 255, 0.82)",
    strokeScale: 0.07,
    shadow: "rgba(42, 204, 255, 0.72)",
    shadowBlurScale: 0.22,
    shadowOffsetScale: 0.03,
    skew: -0.035,
    baseSize: 0.105,
    maxWidth: 0.9,
    maxLines: 3,
    lineHeight: 0.92,
    y: 0.825,
    stackShortTitles: true,
  },
  pixel: {
    fontFamily: '"Press Start 2P", "Courier New", monospace',
    fontStyle: "normal",
    fontWeight: 900,
    fill: "#fff8d6",
    stroke: "rgba(39, 32, 101, 0.84)",
    strokeScale: 0.06,
    shadow: "rgba(0, 0, 0, 0.58)",
    shadowBlurScale: 0.04,
    shadowOffsetScale: 0.08,
    skew: 0,
    baseSize: 0.068,
    maxWidth: 0.9,
    maxLines: 3,
    lineHeight: 1.26,
    y: 0.83,
    stackShortTitles: true,
  },
  pirate: {
    fontFamily: '"Pirata One", Georgia, serif',
    fontStyle: "normal",
    fontWeight: 900,
    fill: "#fff0c8",
    stroke: "rgba(99, 38, 12, 0.84)",
    strokeScale: 0.095,
    shadow: "rgba(44, 16, 5, 0.62)",
    shadowBlurScale: 0.1,
    shadowOffsetScale: 0.07,
    skew: -0.025,
    baseSize: 0.155,
    maxWidth: 0.88,
    maxLines: 3,
    lineHeight: 0.82,
    y: 0.82,
    stackShortTitles: true,
  },
  horror: {
    fontFamily: 'Creepster, "Arial Black", Arial, sans-serif',
    fontStyle: "normal",
    fontWeight: 900,
    fill: "#fff2de",
    stroke: "rgba(109, 5, 18, 0.88)",
    strokeScale: 0.085,
    shadow: "rgba(10, 0, 0, 0.7)",
    shadowBlurScale: 0.13,
    shadowOffsetScale: 0.07,
    skew: -0.02,
    baseSize: 0.15,
    maxWidth: 0.88,
    maxLines: 3,
    lineHeight: 0.82,
    y: 0.822,
    stackShortTitles: true,
  },
  bubble: {
    fontFamily: '"Fredoka", "Trebuchet MS", Verdana, sans-serif',
    fontStyle: "normal",
    fontWeight: 900,
    fill: "#fff8f0",
    stroke: "theme",
    strokeAlpha: 0.9,
    strokeScale: 0.11,
    shadow: "rgba(120, 38, 135, 0.46)",
    shadowBlurScale: 0.12,
    shadowOffsetScale: 0.055,
    skew: -0.025,
    baseSize: 0.14,
    maxWidth: 0.88,
    maxLines: 3,
    lineHeight: 0.86,
    y: 0.82,
    stackShortTitles: true,
  },
  scifi: {
    fontFamily: 'Orbitron, "Arial Black", Arial, sans-serif',
    fontStyle: "normal",
    fontWeight: 900,
    fill: "#f7fbff",
    stroke: "rgba(31, 105, 159, 0.82)",
    strokeScale: 0.065,
    shadow: "rgba(0, 23, 51, 0.6)",
    shadowBlurScale: 0.14,
    shadowOffsetScale: 0.055,
    skew: -0.015,
    baseSize: 0.096,
    maxWidth: 0.9,
    maxLines: 3,
    lineHeight: 1.02,
    y: 0.83,
    stackShortTitles: true,
  },
};

function hexToRgb(hex) {
  const normalized = hex.replace("#", "");
  const value = parseInt(normalized, 16);

  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

function rgba(hex, alpha) {
  const color = hexToRgb(hex);
  return `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`;
}

function getCoverTransform(image) {
  const scale = Math.max(poster.width / image.width, poster.height / image.height);
  const width = image.width * scale;
  const height = image.height * scale;

  return {
    x: (poster.width - width) / 2,
    y: (poster.height - height) / 2,
    width,
    height,
  };
}

function resetBackgroundTransform() {
  if (!poster.image) return;

  poster.imageTransform = getCoverTransform(poster.image);
  drawPoster();
}

function drawBackgroundImage(image) {
  if (!poster.imageTransform) {
    poster.imageTransform = getCoverTransform(image);
  }

  const { x, y, width, height } = poster.imageTransform;
  const contrast = clampRangeValue(controls.globalContrast.value, controls.globalContrast);
  const saturation = clampRangeValue(controls.globalSaturation.value, controls.globalSaturation);
  const brightness = clampRangeValue(controls.globalBrightness.value, controls.globalBrightness);
  ctx.save();
  ctx.filter = `contrast(${contrast}%) saturate(${saturation}%) brightness(${brightness}%)`;
  ctx.drawImage(image, x, y, width, height);
  ctx.restore();
}

function drawPlaceholderBackground() {
  const bg = ctx.createLinearGradient(0, 0, poster.width, poster.height);
  bg.addColorStop(0, "#6f4c12");
  bg.addColorStop(0.42, "#dba72e");
  bg.addColorStop(1, "#261709");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, poster.width, poster.height);

  ctx.fillStyle = "rgba(255, 235, 160, 0.22)";
  for (let i = 0; i < 16; i += 1) {
    ctx.beginPath();
    ctx.arc(70 + i * 52, 110 + (i % 3) * 88, 88, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = "rgba(18, 10, 3, 0.42)";
  ctx.fillRect(0, poster.height * 0.12, poster.width, poster.height * 0.88);
}

function drawProducerBadge(themeColor) {
  const badgeWidth = poster.width * 0.67;
  const badgeHeight = poster.height * 0.074;
  const nameHorizontalOffset = parseControlNumber(controls.producerHorizontal);
  const nameVerticalOffset = parseControlNumber(controls.producerNameVertical);
  const logoHorizontalOffset = parseControlNumber(controls.producerLogoHorizontal);
  const x = (poster.width - badgeWidth) / 2;
  const nameCenterX = poster.width / 2 + nameHorizontalOffset;
  const logoCenterX = poster.width / 2 + logoHorizontalOffset;
  const y = parseControlNumber(controls.producerPosition);
  const fontSize = Math.round(
    badgeHeight * 0.34 * (clampRangeValue(controls.producerSize.value, controls.producerSize) / 100),
  );

  const badgeGradient = ctx.createLinearGradient(x, y, x + badgeWidth, y);
  badgeGradient.addColorStop(0, rgba(themeColor, 0.92));
  badgeGradient.addColorStop(0.5, rgba(themeColor, 1));
  badgeGradient.addColorStop(1, rgba(themeColor, 0.88));

  ctx.save();
  ctx.shadowColor = "rgba(0, 0, 0, 0.18)";
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 10;
  ctx.fillStyle = badgeGradient;
  ctx.fillRect(x, y, badgeWidth, badgeHeight);

  if (poster.producerLogo) {
    const logoScale = clampRangeValue(controls.producerLogoSize.value, controls.producerLogoSize) / 100;
    const maxLogoWidth = badgeWidth * 0.82 * logoScale;
    const maxLogoHeight = badgeHeight * 0.62 * logoScale;
    const logoRatio = poster.producerLogo.width / poster.producerLogo.height;
    let logoWidth = maxLogoWidth;
    let logoHeight = logoWidth / logoRatio;

    if (logoHeight > maxLogoHeight) {
      logoHeight = maxLogoHeight;
      logoWidth = logoHeight * logoRatio;
    }

    ctx.drawImage(
      poster.producerLogo,
      logoCenterX - logoWidth / 2,
      y + badgeHeight / 2 - logoHeight / 2,
      logoWidth,
      logoHeight,
    );

    if (!controls.overlayProducer.checked) {
      ctx.restore();
      return;
    }
  }

  ctx.fillStyle = "rgba(255, 255, 255, 0.94)";
  ctx.font = `800 ${fontSize}px ${controls.producerFont.value}`;
  ctx.letterSpacing = `${Math.round(poster.width * 0.012)}px`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(
    controls.producer.value.trim().toUpperCase() || "PRODUCER",
    nameCenterX,
    y + badgeHeight / 2 + 1 + nameVerticalOffset,
    badgeWidth * 0.86,
  );
  ctx.restore();
}

function drawBottomMask(themeColor) {
  const gradientHeight = poster.height * (clampRangeValue(controls.gradientHeight.value, controls.gradientHeight) / 100);
  const opacity = clampRangeValue(controls.gradientOpacity.value, controls.gradientOpacity) / 100;
  const startY = poster.height - gradientHeight;

  const main = ctx.createLinearGradient(0, startY, 0, poster.height);
  main.addColorStop(0, rgba(themeColor, 0));
  main.addColorStop(0.3, rgba(themeColor, opacity * 0.3));
  main.addColorStop(0.62, rgba(themeColor, opacity * 0.72));
  main.addColorStop(1, rgba(themeColor, opacity));
  ctx.fillStyle = main;
  ctx.fillRect(0, startY, poster.width, gradientHeight);

  const base = ctx.createLinearGradient(0, poster.height * 0.75, 0, poster.height);
  base.addColorStop(0, rgba(themeColor, 0));
  base.addColorStop(1, rgba(themeColor, Math.min(1, opacity + 0.04)));
  ctx.fillStyle = base;
  ctx.fillRect(0, poster.height * 0.75, poster.width, poster.height * 0.25);

  const glowStrength = clampRangeValue(controls.glow.value, controls.glow) / 100;
  const glow = ctx.createRadialGradient(
    poster.width / 2,
    poster.height * 0.83,
    poster.width * 0.08,
    poster.width / 2,
    poster.height * 0.83,
    poster.width * 0.72,
  );
  glow.addColorStop(0, rgba(themeColor, glowStrength * 0.58));
  glow.addColorStop(0.52, rgba(themeColor, glowStrength * 0.22));
  glow.addColorStop(1, rgba(themeColor, 0));
  ctx.fillStyle = glow;
  ctx.fillRect(0, poster.height * 0.45, poster.width, poster.height * 0.55);
}

function getTitleStyle() {
  const preset = titleStyles[controls.titleStyle.value] || titleStyles.custom;
  const style = {
    ...titleStyles.custom,
    ...preset,
    fontFamily: preset.fontFamily || controls.gameFont.value,
  };

  return {
    ...style,
    maxLines: Math.max(4, style.maxLines),
  };
}

function titleFont(size, style) {
  return `${style.fontStyle} ${style.fontWeight} ${size}px ${style.fontFamily}`;
}

function titlePaint(value, alpha) {
  if (value === "theme") {
    return rgba(controls.theme.value, alpha);
  }

  return value;
}

function getTitleSpacing() {
  return clampRangeValue(controls.titleSpacing.value, controls.titleSpacing);
}

function getTitleLineScale(index) {
  const lineControls = [
    controls.titleLineOneSize,
    controls.titleLineTwoSize,
    controls.titleLineThreeSize,
    controls.titleLineFourSize,
  ];
  const control = lineControls[index];

  return control ? clampRangeValue(control.value, control) / 100 : 1;
}

function measureTitleLine(line, letterSpacing = getTitleSpacing()) {
  const characters = Array.from(line);
  if (characters.length <= 1) return ctx.measureText(line).width;

  return characters.reduce((width, character) => width + ctx.measureText(character).width, 0) +
    letterSpacing * (characters.length - 1);
}

function splitLongWord(word, maxWidth, maxLines) {
  const chunks = [];
  let current = "";

  Array.from(word).forEach((character) => {
    const next = `${current}${character}`;

    if (measureTitleLine(next) > maxWidth && current && chunks.length < maxLines - 1) {
      chunks.push(current);
      current = character;
    } else {
      current = next;
    }
  });

  if (current) chunks.push(current);
  return chunks;
}

function getLineCandidates(words, maxLines) {
  const candidates = [];
  const lineLimit = Math.min(maxLines, words.length);

  function buildLines(startIndex, remainingLines, currentLines) {
    if (remainingLines === 1) {
      candidates.push([...currentLines, words.slice(startIndex).join(" ")]);
      return;
    }

    const lastStart = words.length - remainingLines + 1;
    for (let endIndex = startIndex + 1; endIndex <= lastStart; endIndex += 1) {
      buildLines(endIndex, remainingLines - 1, [
        ...currentLines,
        words.slice(startIndex, endIndex).join(" "),
      ]);
    }
  }

  for (let lineCount = 1; lineCount <= lineLimit; lineCount += 1) {
    buildLines(0, lineCount, []);
  }

  return candidates;
}

function scoreTitleLines(lines, maxWidth) {
  const widths = lines.map((line) => measureTitleLine(line));
  const widestLine = Math.max(...widths);
  const overflow = Math.max(0, widestLine - maxWidth);
  const averageWidth = widths.reduce((sum, width) => sum + width, 0) / widths.length;
  const imbalance = widths.reduce((sum, width) => sum + Math.abs(width - averageWidth), 0) / widths.length;
  const linePenalty = lines.length * maxWidth * 0.04;

  return overflow * 1000 + widestLine + imbalance * 0.35 + linePenalty;
}

function splitTitleLines(text, style, maxWidth, startingSize) {
  if (text.includes("/")) {
    return text
      .split("/")
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, style.maxLines);
  }

  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [text];

  ctx.font = titleFont(startingSize, style);

  if (measureTitleLine(text) <= maxWidth && !style.stackShortTitles) {
    return [text];
  }

  if (words.length === 1) {
    return splitLongWord(words[0], maxWidth, style.maxLines);
  }

  return getLineCandidates(words, style.maxLines).sort(
    (a, b) => scoreTitleLines(a, maxWidth) - scoreTitleLines(b, maxWidth),
  )[0];
}

function fitTitleLines(lines, maxWidth, startingSize, style) {
  return startingSize;
}

function getCurveOffset(x, halfWidth, curveHeight) {
  if (halfWidth <= 0) return 0;

  const normalized = x / halfWidth;
  return curveHeight * (1 - normalized * normalized);
}

function drawCurvedLine(line, y, maxWidth, fontSize, curveAmount, letterSpacing, drawText) {
  const characters = Array.from(line);
  const totalWidth = measureTitleLine(line, letterSpacing);
  const halfWidth = totalWidth / 2;
  const curveHeight = curveAmount * fontSize * 1.05;
  let cursor = -halfWidth;

  characters.forEach((character) => {
    const characterWidth = ctx.measureText(character).width;
    const centerX = cursor + characterWidth / 2;
    const centerY = y - getCurveOffset(centerX, halfWidth, curveHeight);

    ctx.save();
    ctx.translate(centerX, centerY);
    drawText(character, 0, 0);
    ctx.restore();

    cursor += characterWidth + letterSpacing;
  });
}

function drawTitleLine(line, y, maxWidth, fontSize, curveAmount, letterSpacing) {
  if (Math.abs(curveAmount) < 0.01 && Math.abs(letterSpacing) < 0.01) {
    ctx.strokeText(line, 0, y);
    return;
  }

  drawCurvedLine(line, y, maxWidth, fontSize, curveAmount, letterSpacing, (character, x, characterY) => {
    ctx.strokeText(character, x, characterY);
  });
}

function fillTitleLine(line, y, maxWidth, fontSize, curveAmount, letterSpacing) {
  if (Math.abs(curveAmount) < 0.01 && Math.abs(letterSpacing) < 0.01) {
    ctx.fillText(line, 0, y);
    return;
  }

  drawCurvedLine(line, y, maxWidth, fontSize, curveAmount, letterSpacing, (character, x, characterY) => {
    ctx.fillText(character, x, characterY);
  });
}

function drawGameTitle() {
  const title = controls.game.value.trim().toUpperCase() || "GAME NAME";
  const style = getTitleStyle();
  const maxWidth = poster.width * style.maxWidth;
  const titleScale = clampRangeValue(controls.titleSize.value, controls.titleSize) / 100;
  const startingSize = poster.width * style.baseSize * titleScale;
  const lines = splitTitleLines(title, style, maxWidth, startingSize);
  const fontSize = fitTitleLines(lines, maxWidth, startingSize, style);
  const x = poster.width / 2 + parseControlNumber(controls.titleHorizontal);
  const y = poster.height * style.y + parseControlNumber(controls.titlePosition);
  const lineSizes = lines.map((_, index) => fontSize * getTitleLineScale(index));
  const lineHeights = lineSizes.map((lineSize) => lineSize * style.lineHeight);
  const rowSpacing = clampRangeValue(controls.titleRowSpacing.value, controls.titleRowSpacing);
  const totalLineHeight =
    lineHeights.reduce((sum, lineHeight) => sum + lineHeight, 0) + rowSpacing * Math.max(0, lines.length - 1);
  const curveAmount = clampRangeValue(controls.titleCurve.value, controls.titleCurve) / 100;
  const outlineAmount = clampRangeValue(controls.titleOutline.value, controls.titleOutline) / 100;
  const letterSpacing = getTitleSpacing();

  ctx.save();
  ctx.translate(x, y);
  ctx.transform(1, 0, style.skew, 1, 0, 0);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineJoin = "round";
  ctx.miterLimit = 2;
  ctx.strokeStyle = titlePaint(style.stroke, style.strokeAlpha);
  ctx.shadowColor = style.shadow;
  ctx.shadowBlur = fontSize * style.shadowBlurScale;
  ctx.shadowOffsetY = fontSize * style.shadowOffsetScale;

  if (outlineAmount > 0) {
    ctx.lineWidth = Math.max(1, fontSize * style.strokeScale * outlineAmount);
    let lineTop = -totalLineHeight / 2;
    lines.forEach((line, index) => {
      const lineSize = lineSizes[index];
      const lineY = lineTop + lineHeights[index] / 2;
      ctx.font = titleFont(lineSize, style);
      drawTitleLine(line, lineY, maxWidth, lineSize, curveAmount, letterSpacing);
      lineTop += lineHeights[index] + rowSpacing;
    });
  }

  ctx.fillStyle = style.fill;

  let lineTop = -totalLineHeight / 2;
  lines.forEach((line, index) => {
    const lineSize = lineSizes[index];
    const lineY = lineTop + lineHeights[index] / 2;
    ctx.font = titleFont(lineSize, style);
    ctx.shadowBlur = Math.max(4, lineSize * 0.04);
    ctx.shadowOffsetY = Math.max(2, lineSize * 0.02);
    fillTitleLine(line, lineY, maxWidth, lineSize, curveAmount, letterSpacing);
    lineTop += lineHeights[index] + rowSpacing;
  });
  ctx.restore();
}

function drawPoster() {
  ctx.clearRect(0, 0, poster.width, poster.height);

  if (poster.image) {
    drawBackgroundImage(poster.image);
  } else {
    drawPlaceholderBackground();
  }

  const themeColor = controls.theme.value;
  if (controls.showBottomGradient.checked) {
    drawBottomMask(themeColor);
  }

  if (controls.showProducer.checked) {
    drawProducerBadge(themeColor);
  }

  if (controls.showGameTitle.checked) {
    drawGameTitle();
  }

  updateBackgroundTransformOverlay();
}

function updateBackgroundTransformOverlay() {
  const overlay = controls.backgroundTransformOverlay;
  const transform = poster.imageTransform;

  if (!poster.image || !transform || !controls.canvasEditor.clientWidth) {
    overlay.hidden = true;
    return;
  }

  const scaleX = controls.canvasEditor.clientWidth / poster.width;
  const scaleY = controls.canvasEditor.clientHeight / poster.height;
  overlay.hidden = false;
  overlay.style.left = `${transform.x * scaleX}px`;
  overlay.style.top = `${transform.y * scaleY}px`;
  overlay.style.width = `${transform.width * scaleX}px`;
  overlay.style.height = `${transform.height * scaleY}px`;
}

function getEditorPoint(event) {
  const rect = controls.canvasEditor.getBoundingClientRect();

  return {
    x: ((event.clientX - rect.left) / rect.width) * poster.width,
    y: ((event.clientY - rect.top) / rect.height) * poster.height,
  };
}

let backgroundTransformDrag = null;

controls.backgroundTransformOverlay.addEventListener("pointerdown", (event) => {
  if (!poster.imageTransform || event.button !== 0) return;

  event.preventDefault();
  const point = getEditorPoint(event);
  const handle = event.target.closest("[data-handle]")?.dataset.handle || null;
  const start = { ...poster.imageTransform };

  backgroundTransformDrag = {
    pointerId: event.pointerId,
    action: handle ? "resize" : "move",
    handle,
    point,
    start,
  };

  controls.backgroundTransformOverlay.setPointerCapture(event.pointerId);
});

controls.backgroundTransformOverlay.addEventListener("pointermove", (event) => {
  if (!backgroundTransformDrag || backgroundTransformDrag.pointerId !== event.pointerId) return;

  event.preventDefault();
  const point = getEditorPoint(event);
  const { action, handle, start } = backgroundTransformDrag;

  if (action === "move") {
    poster.imageTransform = {
      ...start,
      x: start.x + point.x - backgroundTransformDrag.point.x,
      y: start.y + point.y - backgroundTransformDrag.point.y,
    };
  } else {
    const corners = {
      nw: { anchorX: start.x + start.width, anchorY: start.y + start.height, signX: -1, signY: -1 },
      ne: { anchorX: start.x, anchorY: start.y + start.height, signX: 1, signY: -1 },
      se: { anchorX: start.x, anchorY: start.y, signX: 1, signY: 1 },
      sw: { anchorX: start.x + start.width, anchorY: start.y, signX: -1, signY: 1 },
    };
    const corner = corners[handle];
    const startVectorX = corner.signX * start.width;
    const startVectorY = corner.signY * start.height;
    const currentVectorX = point.x - corner.anchorX;
    const currentVectorY = point.y - corner.anchorY;
    const projectedScale =
      (currentVectorX * startVectorX + currentVectorY * startVectorY) /
      (start.width ** 2 + start.height ** 2);
    const scale = Math.max(0.08, Math.min(20, projectedScale));
    const width = start.width * scale;
    const height = start.height * scale;

    poster.imageTransform = {
      x: corner.signX > 0 ? corner.anchorX : corner.anchorX - width,
      y: corner.signY > 0 ? corner.anchorY : corner.anchorY - height,
      width,
      height,
    };
  }

  drawPoster();
});

function finishBackgroundTransform(event) {
  if (!backgroundTransformDrag || backgroundTransformDrag.pointerId !== event.pointerId) return;

  backgroundTransformDrag = null;
  if (controls.backgroundTransformOverlay.hasPointerCapture(event.pointerId)) {
    controls.backgroundTransformOverlay.releasePointerCapture(event.pointerId);
  }
}

controls.backgroundTransformOverlay.addEventListener("pointerup", finishBackgroundTransform);
controls.backgroundTransformOverlay.addEventListener("pointercancel", finishBackgroundTransform);
controls.resetBackgroundTransform.addEventListener("click", resetBackgroundTransform);
window.addEventListener("resize", updateBackgroundTransformOverlay);

function sanitizeExportFileName(value) {
  return value
    .trim()
    .replace(/\.(png|webp)$/i, "")
    .replace(/[<>:"/\\|?*\x00-\x1f]+/g, "-")
    .replace(/\s+/g, " ")
    .replace(/^[\s.-]+|[\s.-]+$/g, "");
}

function getExportFileName(extension) {
  const requestedName = controls.exportFilename.value || controls.game.value || "poster";
  const safeName = sanitizeExportFileName(requestedName);

  return `${safeName || "poster"}.${extension}`;
}

function canvasToBlob(type) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Could not export poster image."));
        }
      },
      type,
      0.94,
    );
  });
}

function openExportHandleDb() {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      resolve(null);
      return;
    }

    const request = indexedDB.open(exportLocationCache.dbName, 1);

    request.addEventListener("upgradeneeded", () => {
      request.result.createObjectStore(exportLocationCache.storeName);
    });
    request.addEventListener("success", () => resolve(request.result));
    request.addEventListener("error", () => reject(request.error));
  });
}

async function getStoredExportFileHandle() {
  const db = await openExportHandleDb();
  if (!db) return null;

  return new Promise((resolve) => {
    const transaction = db.transaction(exportLocationCache.storeName, "readonly");
    const request = transaction.objectStore(exportLocationCache.storeName).get(exportLocationCache.fileHandleKey);

    request.addEventListener("success", () => resolve(request.result || null));
    request.addEventListener("error", () => resolve(null));
    transaction.addEventListener("complete", () => db.close());
    transaction.addEventListener("abort", () => {
      db.close();
      resolve(null);
    });
  });
}

async function storeExportFileHandle(handle, fileName) {
  try {
    const db = await openExportHandleDb();
    if (!db) return;

    await new Promise((resolve, reject) => {
      const transaction = db.transaction(exportLocationCache.storeName, "readwrite");
      transaction.objectStore(exportLocationCache.storeName).put(handle, exportLocationCache.fileHandleKey);
      transaction.addEventListener("complete", resolve);
      transaction.addEventListener("error", () => reject(transaction.error));
      transaction.addEventListener("abort", () => reject(transaction.error));
    });
    db.close();

    localStorage.setItem(
      exportLocationCache.key,
      JSON.stringify({
        savedAt: Date.now(),
        fileName,
      }),
    );
  } catch (error) {
    // Native file handles cannot be stored in localStorage; IndexedDB is the browser-supported store.
  }
}

function downloadPosterBlob(blob, fileName) {
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.download = fileName;
  link.href = url;
  link.click();
  URL.revokeObjectURL(url);
}

async function chooseSaveFile(options) {
  try {
    return await window.showSaveFilePicker(options);
  } catch (error) {
    if (options.startIn && (error.name === "TypeError" || error.name === "NotAllowedError")) {
      const { startIn, ...fallbackOptions } = options;
      return window.showSaveFilePicker(fallbackOptions);
    }

    throw error;
  }
}

async function exportPoster(type) {
  drawPoster();
  const extension = type === "image/webp" ? "webp" : "png";
  const fileName = getExportFileName(extension);
  const blob = await canvasToBlob(type);

  if (!window.showSaveFilePicker) {
    downloadPosterBlob(blob, fileName);
    return;
  }

  try {
    const lastFileHandle = await getStoredExportFileHandle();
    const pickerOptions = {
      id: "game-poster-generator-export",
      suggestedName: fileName,
      types: [
        {
          description: `${extension.toUpperCase()} image`,
          accept: {
            [type]: [`.${extension}`],
          },
        },
      ],
    };

    if (lastFileHandle) {
      pickerOptions.startIn = lastFileHandle;
    }

    const fileHandle = await chooseSaveFile(pickerOptions);
    const writable = await fileHandle.createWritable();

    await writable.write(blob);
    await writable.close();
    await storeExportFileHandle(fileHandle, fileName);
  } catch (error) {
    if (error.name === "AbortError") return;

    window.alert("Could not save the poster. Please try another folder or browser.");
  }
}

function setBackgroundSourceStatus(message = "", isError = false) {
  controls.backgroundUrlStatus.textContent = message;
  controls.backgroundUrlStatus.classList.toggle("is-error", isError);
}

function useBackgroundImage(image, label) {
  poster.image = image;
  poster.imageTransform = getCoverTransform(image);
  controls.uploadLabel.textContent = label;
  drawPoster();
  openControlSection("producer");
}

function loadBackgroundFile(file) {
  if (!file) return;

  if (!file.type.startsWith("image/")) {
    controls.uploadLabel.textContent = "Please choose an image file";
    setBackgroundSourceStatus("The selected file is not an image.", true);
    return;
  }

  setBackgroundSourceStatus("Loading image…");
  const image = new Image();
  const url = URL.createObjectURL(file);

  image.onload = () => {
    URL.revokeObjectURL(url);
    useBackgroundImage(image, file.name);
    setBackgroundSourceStatus("Image ready. Use the handles in the preview to resize it.");
  };
  image.onerror = () => {
    URL.revokeObjectURL(url);
    controls.uploadLabel.textContent = "Could not load image";
    setBackgroundSourceStatus("Could not read that image file.", true);
  };
  image.src = url;
}

function loadBackgroundFromUrl() {
  const rawUrl = controls.backgroundUrl.value.trim();

  if (!rawUrl) {
    setBackgroundSourceStatus("Paste an image URL first.", true);
    controls.backgroundUrl.focus();
    return;
  }

  let imageUrl;
  try {
    imageUrl = new URL(rawUrl, window.location.href);
    if (!["http:", "https:"].includes(imageUrl.protocol)) throw new Error("Unsupported URL");
  } catch (error) {
    setBackgroundSourceStatus("Enter a valid HTTP or HTTPS image URL.", true);
    return;
  }

  setBackgroundSourceStatus("Loading URL…");
  controls.loadBackgroundUrl.disabled = true;
  const image = new Image();
  image.crossOrigin = "anonymous";
  image.referrerPolicy = "no-referrer";

  image.onload = () => {
    useBackgroundImage(image, imageUrl.hostname || "URL image");
    setBackgroundSourceStatus("URL image ready. Drag it in the preview to position it.");
    controls.loadBackgroundUrl.disabled = false;
  };
  image.onerror = () => {
    setBackgroundSourceStatus(
      "Could not load this URL. The host may block cross-origin image access.",
      true,
    );
    controls.loadBackgroundUrl.disabled = false;
  };
  image.src = imageUrl.href;
}

controls.background.addEventListener("change", (event) => {
  const [file] = event.target.files;
  loadBackgroundFile(file);
});

controls.loadBackgroundUrl.addEventListener("click", loadBackgroundFromUrl);
controls.backgroundUrl.addEventListener("keydown", (event) => {
  if (event.key !== "Enter") return;

  event.preventDefault();
  loadBackgroundFromUrl();
});

["dragenter", "dragover"].forEach((eventName) => {
  controls.uploadZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    controls.uploadZone.classList.add("is-dragging");
  });
});

["dragleave", "drop"].forEach((eventName) => {
  controls.uploadZone.addEventListener(eventName, () => {
    controls.uploadZone.classList.remove("is-dragging");
  });
});

controls.uploadZone.addEventListener("drop", (event) => {
  event.preventDefault();
  const [file] = event.dataTransfer.files;

  loadBackgroundFile(file);
});

controls.producerLogo.addEventListener("change", (event) => {
  const [file] = event.target.files;

  if (!file) {
    clearProducerLogo();
    return;
  }

  saveProducerLogoFile(file);
});

function saveProducerLogoFile(file) {
  const reader = new FileReader();

  reader.addEventListener("load", () => {
    setProducerLogo(reader.result, file.name);
  });

  reader.readAsDataURL(file);
}

function setProducerLogo(dataUrl, fileName, persist = true) {
  const image = new Image();
  image.onload = () => {
    poster.producerLogo = image;
    poster.producerLogoDataUrl = dataUrl;
    poster.producerLogoFileName = fileName;
    controls.producerLogoLabel.textContent = fileName || "Saved SVG logo";
    drawPoster();
  };
  image.onerror = () => {
    setProducerPresetStatus("The saved producer logo could not be loaded.", true);
  };
  image.src = dataUrl;

  if (!persist) return;

  try {
    localStorage.setItem(
      producerLogoCache.key,
      JSON.stringify({
        savedAt: Date.now(),
        name: fileName,
        dataUrl,
      }),
    );
  } catch (error) {
    // Large SVGs may exceed localStorage limits, so the app keeps working without persistence.
  }
}

function clearProducerLogo() {
  poster.producerLogo = null;
  poster.producerLogoDataUrl = null;
  poster.producerLogoFileName = null;
  controls.producerLogo.value = "";
  controls.producerLogoLabel.textContent = "Optional: replaces producer text";
  try {
    localStorage.removeItem(producerLogoCache.key);
  } catch (error) {
    // Browsers can block localStorage in private or restricted modes.
  }
  drawPoster();
}

function loadSavedProducerLogo() {
  try {
    const cachedLogo = JSON.parse(localStorage.getItem(producerLogoCache.key));

    if (!cachedLogo?.savedAt || !cachedLogo?.dataUrl) return;

    if (Date.now() - cachedLogo.savedAt > producerLogoCache.ttl) {
      clearProducerLogo();
      return;
    }

    setProducerLogo(cachedLogo.dataUrl, cachedLogo.name || "Saved SVG logo", false);
  } catch (error) {
    clearProducerLogo();
  }
}

function getRangeValueBox(control) {
  return document.querySelector(`.range-value[data-range-for="${control.id}"]`);
}

function formatRangeValue(control) {
  const value = Number(control.value);
  const valueBox = getRangeValueBox(control);
  const suffix = valueBox?.dataset.suffix || "%";
  return `${Number.isInteger(value) ? value : value.toFixed(1)}${suffix}`;
}

function updateRangeValue(control) {
  if (control.type !== "range") return;

  const valueBox = getRangeValueBox(control);
  if (valueBox) {
    valueBox.value = formatRangeValue(control);
  }
}

function normalizeHexColor(value) {
  const normalized = value.trim().replace(/^#/, "");

  if (/^[0-9a-fA-F]{3}$/.test(normalized)) {
    return `#${normalized
      .split("")
      .map((character) => `${character}${character}`)
      .join("")}`.toLowerCase();
  }

  if (/^[0-9a-fA-F]{6}$/.test(normalized)) {
    return `#${normalized}`.toLowerCase();
  }

  return null;
}

function syncThemeCode() {
  controls.themeCode.value = controls.theme.value;
}

function parseControlNumber(control, fallback = 0) {
  const parsedValue = Number.parseFloat(control.value);
  return Number.isNaN(parsedValue) ? fallback : parsedValue;
}

function getSettingsSnapshot() {
  return settingsCache.fields.reduce((settings, field) => {
    const control = controls[field];
    settings[field] = control.type === "checkbox" ? control.checked : control.value;
    return settings;
  }, {});
}

function saveSettings() {
  try {
    localStorage.setItem(
      settingsCache.key,
      JSON.stringify({
        savedAt: Date.now(),
        values: getSettingsSnapshot(),
      }),
    );
  } catch (error) {
    // Browsers can block localStorage in private or restricted modes.
  }
}

function loadSavedSettings() {
  try {
    const cachedSettings = JSON.parse(localStorage.getItem(settingsCache.key));

    if (!cachedSettings?.savedAt || !cachedSettings?.values) return;

    if (Date.now() - cachedSettings.savedAt > settingsCache.ttl) {
      localStorage.removeItem(settingsCache.key);
      return;
    }

    settingsCache.fields.forEach((field) => {
      const control = controls[field];
      const savedValue = cachedSettings.values[field];

      if (!control || savedValue === undefined) return;

      if (control.type === "checkbox") {
        control.checked = Boolean(savedValue);
      } else {
        control.value = savedValue;
      }
    });
  } catch (error) {
    localStorage.removeItem(settingsCache.key);
  }
}

let producerPresets = [];

function setProducerPresetStatus(message = "", isError = false) {
  controls.producerPresetStatus.textContent = message;
  controls.producerPresetStatus.classList.toggle("is-error", isError);
}

function getProducerSettingsSnapshot() {
  return producerPresetConfig.fields.reduce((snapshot, field) => {
    const control = controls[field];
    snapshot[field] = control.type === "checkbox" ? control.checked : control.value;
    return snapshot;
  }, {});
}

// Resolved against the page URL so the app also works when served from a sub-path such as /poster/.
const producerPresetsEndpoint = new URL("api/producer-presets", document.baseURI).toString();

async function requestProducerPresets(url = producerPresetsEndpoint, options = {}) {
  const response = await fetch(url, options);
  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(result.error || "Producer preset request failed.");
  }

  return result;
}

function applyProducerPreset(preset) {
  producerPresetConfig.fields.forEach((field) => {
    const control = controls[field];
    const value = preset.settings?.[field];
    if (!control || value === undefined) return;

    if (control.type === "checkbox") {
      control.checked = Boolean(value);
    } else {
      control.value = value;
      updateRangeValue(control);
    }
  });

  if (preset.logo?.dataUrl) {
    setProducerLogo(preset.logo.dataUrl, preset.logo.fileName || "Saved SVG logo");
  } else {
    clearProducerLogo();
  }

  syncThemeCode();
  saveSettings();
  updateAutoControlLocks();
  drawPoster();
  openControlSection("producer");
  setProducerPresetStatus(`Applied “${preset.name}”.`);
}

async function deleteProducerPreset(preset) {
  setProducerPresetStatus(`Deleting “${preset.name}”…`);

  try {
    await requestProducerPresets(`${producerPresetsEndpoint}/${encodeURIComponent(preset.id)}`, {
      method: "DELETE",
    });
    producerPresets = producerPresets.filter((savedPreset) => savedPreset.id !== preset.id);
    renderProducerPresets();
    setProducerPresetStatus(`Deleted “${preset.name}”.`);
  } catch (error) {
    setProducerPresetStatus(error.message, true);
  }
}

function renderProducerPresets() {
  const selectedId = controls.producerPresetSelect.value;
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = producerPresets.length
    ? "Choose a saved producer"
    : "No saved producers yet";
  controls.producerPresetSelect.replaceChildren(placeholder);

  producerPresets.forEach((preset) => {
    const option = document.createElement("option");
    const producerName = preset.settings?.producer || "Logo only";
    option.value = preset.id;
    option.textContent = `${preset.name} — ${producerName}${preset.logo ? " · SVG" : ""}`;
    controls.producerPresetSelect.append(option);
  });

  controls.producerPresetCount.textContent = `${producerPresets.length} saved`;
  controls.producerPresetSelect.value = producerPresets.some((preset) => preset.id === selectedId)
    ? selectedId
    : "";
  updateProducerPresetActions();
}

function getSelectedProducerPreset() {
  return producerPresets.find((preset) => preset.id === controls.producerPresetSelect.value);
}

function updateProducerPresetActions() {
  const hasSelection = Boolean(getSelectedProducerPreset());
  controls.applyProducerPreset.disabled = !hasSelection;
  controls.deleteProducerPreset.disabled = !hasSelection;
}

async function loadProducerPresets() {
  setProducerPresetStatus("Loading saved producers…");

  try {
    const result = await requestProducerPresets();
    producerPresets = result.presets || [];
    renderProducerPresets();
    setProducerPresetStatus("");
  } catch (error) {
    renderProducerPresets();
    setProducerPresetStatus(error.message, true);
  }
}

async function saveCurrentProducerPreset() {
  const name = controls.producerPresetName.value.trim();

  if (!name) {
    setProducerPresetStatus("Enter a producer preset name first.", true);
    controls.producerPresetName.focus();
    return;
  }

  const existingPreset = producerPresets.find(
    (preset) => preset.name.toLocaleLowerCase() === name.toLocaleLowerCase(),
  );
  const payload = {
    id: existingPreset?.id,
    name,
    settings: getProducerSettingsSnapshot(),
    logo: poster.producerLogoDataUrl
      ? {
          fileName: poster.producerLogoFileName || "producer.svg",
          dataUrl: poster.producerLogoDataUrl,
        }
      : null,
  };

  controls.saveProducerPreset.disabled = true;
  setProducerPresetStatus(existingPreset ? `Updating “${name}”…` : `Saving “${name}”…`);

  try {
    const result = await requestProducerPresets(producerPresetsEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    producerPresets = [
      result.preset,
      ...producerPresets.filter((preset) => preset.id !== result.preset.id),
    ];
    controls.producerPresetName.value = "";
    renderProducerPresets();
    controls.producerPresetSelect.value = result.preset.id;
    updateProducerPresetActions();
    setProducerPresetStatus(existingPreset ? `Updated “${name}”.` : `Saved “${name}”.`);
  } catch (error) {
    setProducerPresetStatus(error.message, true);
  } finally {
    controls.saveProducerPreset.disabled = false;
  }
}

function clampRangeValue(value, control) {
  const min = Number(control.min);
  const max = Number(control.max);
  const parsedValue = Number.parseFloat(value);

  if (Number.isNaN(parsedValue)) {
    return parseControlNumber(control, min);
  }

  return Math.min(max, Math.max(min, parsedValue));
}

function setupRangeValueInput(control) {
  if (control.type !== "range") return;

  const valueBox = getRangeValueBox(control);
  if (!valueBox) return;

  valueBox.addEventListener("input", () => {
    const parsedValue = Number.parseFloat(valueBox.value.replace("%", ""));
    if (Number.isNaN(parsedValue)) return;

    control.value = clampRangeValue(parsedValue, control);
    saveSettings();
    drawPoster();
  });

  valueBox.addEventListener("blur", () => updateRangeValue(control));
}

function getSavedControlLocks() {
  try {
    return JSON.parse(localStorage.getItem(controlLockCache.key)) || {};
  } catch (error) {
    localStorage.removeItem(controlLockCache.key);
    return {};
  }
}

function saveControlLocks(locks) {
  try {
    localStorage.setItem(controlLockCache.key, JSON.stringify(locks));
  } catch (error) {
    // Lock state is optional; ignore restricted storage modes.
  }
}

function getLockableControl(row) {
  return row.querySelector('input[type="range"], input[type="checkbox"]');
}

function setControlLocked(row, isLocked, isAutoLocked = false) {
  const lockButton = row.querySelector(".lock-button");
  const inputs = row.querySelectorAll("input");

  row.classList.toggle("is-locked", isLocked);
  row.classList.toggle("is-auto-locked", isAutoLocked);
  inputs.forEach((input) => {
    input.disabled = isLocked;
  });

  if (lockButton) {
    lockButton.textContent = isLocked ? "🔒" : "🔓";
    lockButton.disabled = isAutoLocked;
    lockButton.setAttribute("aria-pressed", String(isLocked));
    lockButton.setAttribute(
      "aria-label",
      isAutoLocked ? "Automatically locked" : isLocked ? "Unlock control" : "Lock control",
    );
  }
}

function getAutoLockedControlIds() {
  return autoLockGroups.reduce((lockedIds, group) => {
    const toggle = controls[group.toggle];
    if (toggle?.checked) return lockedIds;

    group.controls.forEach((controlName) => {
      const control = controls[controlName];
      if (control?.id) lockedIds.add(control.id);
    });

    return lockedIds;
  }, new Set());
}

function updateAutoControlLocks() {
  const savedLocks = getSavedControlLocks();
  const autoLockedIds = getAutoLockedControlIds();
  const lockableRows = document.querySelectorAll(".advanced .range-field, .advanced .toggle-field");

  lockableRows.forEach((row) => {
    const control = getLockableControl(row);
    if (!control?.id) return;

    const isAutoLocked = autoLockedIds.has(control.id);
    const isManuallyLocked = Boolean(savedLocks[control.id]);
    setControlLocked(row, isAutoLocked || isManuallyLocked, isAutoLocked);
  });
}

function setupControlLocks() {
  const savedLocks = getSavedControlLocks();
  const lockableRows = document.querySelectorAll(".advanced .range-field, .advanced .toggle-field");

  lockableRows.forEach((row) => {
    const control = getLockableControl(row);
    if (!control?.id || row.querySelector(".lock-button")) return;

    const lockButton = document.createElement("button");
    lockButton.type = "button";
    lockButton.className = "lock-button";
    row.append(lockButton);

    setControlLocked(row, Boolean(savedLocks[control.id]));

    lockButton.addEventListener("click", () => {
      if (row.classList.contains("is-auto-locked")) return;

      const locks = getSavedControlLocks();
      const shouldLock = !row.classList.contains("is-locked");

      locks[control.id] = shouldLock;
      setControlLocked(row, shouldLock);
      saveControlLocks(locks);
    });
  });

  updateAutoControlLocks();
}

function openControlSection(sectionName) {
  const section = document.querySelector(
    `.control-section[data-control-section="${sectionName}"]`,
  );
  if (section) section.open = true;
}

function setupTuningTabs() {
  const tabs = Array.from(document.querySelectorAll(".tuning-tab"));
  const panels = Array.from(document.querySelectorAll(".tuning-panel"));

  if (!tabs.length || !panels.length) return;

  const activateTab = (requestedPanelId) => {
    const activePanel = panels.find((panel) => panel.id === requestedPanelId) || panels[0];
    const activePanelId = activePanel.id;

    tabs.forEach((tab) => {
      const isActive = tab.dataset.tabTarget === activePanelId;
      tab.classList.toggle("is-active", isActive);
      tab.setAttribute("aria-selected", String(isActive));
    });

    panels.forEach((panel) => {
      const isActive = panel.id === activePanelId;
      panel.classList.toggle("is-active", isActive);
      panel.hidden = !isActive;
    });

    localStorage.setItem(tuningTabCache.key, activePanelId);
  };

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => activateTab(tab.dataset.tabTarget));
  });

  activateTab(localStorage.getItem(tuningTabCache.key));
}

loadSavedSettings();
syncThemeCode();

controls.themeCode.addEventListener("input", () => {
  const color = normalizeHexColor(controls.themeCode.value);
  if (!color) return;

  controls.theme.value = color;
  saveSettings();
  drawPoster();
});

controls.themeCode.addEventListener("blur", () => {
  const color = normalizeHexColor(controls.themeCode.value);

  controls.themeCode.value = color || controls.theme.value;
});

controls.saveProducerPreset.addEventListener("click", saveCurrentProducerPreset);
controls.producerPresetName.addEventListener("keydown", (event) => {
  if (event.key !== "Enter") return;

  event.preventDefault();
  saveCurrentProducerPreset();
});
controls.producerPresetSelect.addEventListener("change", updateProducerPresetActions);
controls.applyProducerPreset.addEventListener("click", () => {
  const preset = getSelectedProducerPreset();
  if (preset) applyProducerPreset(preset);
});
controls.deleteProducerPreset.addEventListener("click", () => {
  const preset = getSelectedProducerPreset();
  if (preset) deleteProducerPreset(preset);
});

[
  controls.producer,
  controls.producerFont,
  controls.overlayProducer,
  controls.game,
  controls.titleStyle,
  controls.gameFont,
  controls.theme,
  controls.gradientHeight,
  controls.gradientOpacity,
  controls.glow,
  controls.globalContrast,
  controls.globalSaturation,
  controls.globalBrightness,
  controls.titleOutline,
  controls.titlePosition,
  controls.titleHorizontal,
  controls.titleSize,
  controls.titleSpacing,
  controls.titleLineOneSize,
  controls.titleLineTwoSize,
  controls.titleLineThreeSize,
  controls.titleLineFourSize,
  controls.titleRowSpacing,
  controls.titleCurve,
  controls.producerPosition,
  controls.producerHorizontal,
  controls.producerNameVertical,
  controls.producerLogoHorizontal,
  controls.producerSize,
  controls.producerLogoSize,
  controls.showProducer,
  controls.showBottomGradient,
  controls.showGameTitle,
  controls.exportFilename,
].forEach((control) => {
  control.addEventListener("input", () => {
    updateRangeValue(control);
    if (control === controls.theme) {
      syncThemeCode();
    }
    saveSettings();
    updateAutoControlLocks();
    drawPoster();
  });
  setupRangeValueInput(control);
  updateRangeValue(control);
});

setupControlLocks();
setupTuningTabs();
renderProducerPresets();
loadProducerPresets();
loadSavedProducerLogo();

controls.png.addEventListener("click", () => exportPoster("image/png"));
controls.webp.addEventListener("click", () => exportPoster("image/webp"));

drawPoster();

if (document.fonts) {
  document.fonts.ready.then(drawPoster);
}
