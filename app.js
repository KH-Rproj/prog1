// --- Data & State Management ---
const defaultPalette = [
  '#FFB5B5', // Delicate Rose Gold
  '#DBC4FF', // Lavender-Indigo
  '#BCEEDB', // Soft Mint Sage
  '#FFEAA7', // Warm Amber Gold
  '#BCE3FF', // Sky Blue Pearl
  '#FFC5A3', // Peach Nectar
  '#F3C6F1', // Soft Blossom Lilac
  '#CDE8E5'  // Pale Aqua Marine
];

let segments = JSON.parse(localStorage.getItem('wheelSegments')) || [
  { label: 'سلسلة فضية فريدة', color: defaultPalette[0] },
  { label: 'خصم ٢٥٪ على الأساور', color: defaultPalette[1] },
  { label: 'خاتم مطلي بالذهب هدية', color: defaultPalette[2] },
  { label: 'حظ أوفر المرة القادمة', color: defaultPalette[3] },
  { label: 'أقراط لؤلؤ أنيقة', color: defaultPalette[4] },
  { label: 'كوبون خصم ٥٠ ريال', color: defaultPalette[5] },
  { label: 'طقم إكسسوار متكامل', color: defaultPalette[6] },
  { label: 'شحن مجاني لطلبك', color: defaultPalette[7] }
];

let inventory = JSON.parse(localStorage.getItem('wheelInventory')) || [];

let config = JSON.parse(localStorage.getItem('wheelConfig')) || {
  spinDuration: 5, // seconds
  logoInCenter: true,
  enableSound: false
};

let currentAngle = 0;
let isSpinning = false;
let winningSegment = null;

// --- DOM Elements ---
const canvas = document.getElementById('wheelCanvas');
const ctx = canvas.getContext('2d');
const btnSpinCenter = document.getElementById('btnSpinCenter');
const centerSpinText = document.getElementById('centerSpinText');
const centerLogoImg = document.getElementById('centerLogoImg');
const logoTopRight = document.getElementById('logoTopRight');

// Settings Elements
const settingsOverlay = document.getElementById('settingsOverlay');
const btnSettings = document.getElementById('btnSettings');
const btnCloseSettings = document.getElementById('btnCloseSettings');
const segmentEditor = document.getElementById('segmentEditor');
const btnAddSegment = document.getElementById('btnAddSegment');
const inputDuration = document.getElementById('inputDuration');
const toggleLogoPosition = document.getElementById('toggleLogoPosition');
const toggleSound = document.getElementById('toggleSound');

// Inventory Elements
const inventorySidebar = document.getElementById('inventorySidebar');
const btnInventory = document.getElementById('btnInventory');
const btnCloseInventory = document.getElementById('btnCloseInventory');
const inventoryList = document.getElementById('inventoryList');
const btnClearInventory = document.getElementById('btnClearInventory');

// Modal Elements
const winModal = document.getElementById('winModal');
const winResultText = document.getElementById('winResultText');
const btnSaveResult = document.getElementById('btnSaveResult');
const btnSpinAgain = document.getElementById('btnSpinAgain');

// --- Audio Context Ticking Synthesis ---
let audioCtx = null;
function playTickSound() {
  if (!config.enableSound) return;
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(650, audioCtx.currentTime); // Crisper, elegant ticking frequency
    osc.frequency.exponentialRampToValueAtTime(150, audioCtx.currentTime + 0.04);
    
    gainNode.gain.setValueAtTime(0.06, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.04);
    
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    osc.start();
    osc.stop(audioCtx.currentTime + 0.04);
  } catch (e) {
    console.error("Audio Synthesis error", e);
  }
}

// --- Confetti celebration system ---
class ConfettiSystem {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.particles = [];
    this.isActive = false;
    this.colors = ['#FF7676', '#FFD276', '#76FFB8', '#76CFFF', '#C276FF', '#FF76D4'];
    
    window.addEventListener('resize', () => this.resizeCanvas());
    this.resizeCanvas();
  }
  
  resizeCanvas() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }
  
  start() {
    this.isActive = true;
    this.particles = [];
    for (let i = 0; i < 120; i++) {
      this.particles.push(this.createParticle());
    }
    this.animate();
  }
  
  stop() {
    this.isActive = false;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
  
  createParticle() {
    return {
      x: Math.random() * this.canvas.width,
      y: Math.random() * this.canvas.height - this.canvas.height,
      r: Math.random() * 6 + 4,
      d: Math.random() * this.canvas.height,
      color: this.colors[Math.floor(Math.random() * this.colors.length)],
      tilt: Math.random() * 10 - 5,
      tiltAngleIncremental: Math.random() * 0.07 + 0.03,
      tiltAngle: 0
    };
  }
  
  animate() {
    if (!this.isActive) return;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    this.particles.forEach(p => {
      p.tiltAngle += p.tiltAngleIncremental;
      p.y += (Math.cos(p.d) + 3 + p.r / 2) / 2;
      p.x += Math.sin(p.tiltAngle);
      p.tilt = Math.sin(p.tiltAngle - p.r / 2) * 15;
      
      if (p.y > this.canvas.height) {
        // Recycle to the top
        p.y = -20;
        p.x = Math.random() * this.canvas.width;
      }
      
      this.ctx.beginPath();
      this.ctx.lineWidth = p.r;
      this.ctx.strokeStyle = p.color;
      this.ctx.moveTo(p.x + p.tilt + p.r / 2, p.y);
      this.ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r / 2);
      this.ctx.stroke();
    });
    
    if (this.isActive) {
      requestAnimationFrame(() => this.animate());
    }
  }
}

const confetti = new ConfettiSystem(document.getElementById('confettiCanvas'));

// --- Initialization ---
function init() {
  updateSettingsUI();
  applyConfig();
  renderSettingsSegments();
  renderInventory();
  drawWheel();
  setupEventListeners();
}

function saveState() {
  localStorage.setItem('wheelSegments', JSON.stringify(segments));
  localStorage.setItem('wheelInventory', JSON.stringify(inventory));
  localStorage.setItem('wheelConfig', JSON.stringify(config));
}

// --- Wheel Drawing ---
function drawWheel() {
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const radius = Math.min(centerX, centerY);
  const numSegments = segments.length;
  const arcSize = (2 * Math.PI) / numSegments;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < numSegments; i++) {
    const angle = currentAngle + i * arcSize;
    
    // Draw segment
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, angle, angle + arcSize, false);
    ctx.lineTo(centerX, centerY);
    ctx.fillStyle = segments[i].color;
    ctx.fill();
    ctx.strokeStyle = '#FFF4FD'; // Soft pink border matching background
    ctx.lineWidth = 4;
    ctx.stroke();
    
    // Draw premium boundary pins at the segment edges
    ctx.beginPath();
    const pinX = centerX + (radius - 12) * Math.cos(angle);
    const pinY = centerY + (radius - 12) * Math.sin(angle);
    ctx.arc(pinX, pinY, 5, 0, 2 * Math.PI);
    ctx.fillStyle = '#E5E7EB';
    ctx.fill();
    
    // Draw text with dynamic scaling to prevent overflow
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(angle + arcSize / 2);
    ctx.direction = 'rtl';
    ctx.textAlign = 'right';
    ctx.fillStyle = '#1F2937'; // High-contrast elegant grey-black
    
    // Auto-calculate font size to fit character width
    let fontSize = 24;
    const maxTextWidth = radius * 0.62; // keep text in outer bounds safely
    ctx.font = `800 ${fontSize}px "Almarai", sans-serif`;
    let textWidth = ctx.measureText(segments[i].label).width;
    
    if (textWidth > maxTextWidth) {
      fontSize = Math.max(12, Math.floor(fontSize * (maxTextWidth / textWidth)));
      ctx.font = `800 ${fontSize}px "Almarai", sans-serif`;
    }
    
    // Position text towards the edge
    ctx.fillText(segments[i].label, radius - 44, fontSize / 3.5);
    ctx.restore();
  }
}

// --- Spin Logic ---
function triggerPointerTick() {
  const pointerEl = document.querySelector('.pointer');
  if (pointerEl) {
    pointerEl.classList.add('tick');
    setTimeout(() => pointerEl.classList.remove('tick'), 60);
  }
  playTickSound(); // Play synthetic ticking sound context
}

function spinWheel() {
  if (isSpinning || segments.length === 0) return;
  
  isSpinning = true;
  confetti.stop(); // Stop any previous confetti celebrations
  
  // Calculate a random number of rotations (at least 3) + random extra angle
  const spinRotations = 5 + Math.random() * 5;
  const totalAngle = spinRotations * 2 * Math.PI;
  
  const duration = config.spinDuration * 1000;
  const startTime = performance.now();
  
  const initialAngle = currentAngle;
  let lastTickIndex = -1;

  function animate(time) {
    const elapsed = time - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    // Easing out cubic: 1 - Math.pow(1 - progress, 3)
    const easing = 1 - Math.pow(1 - progress, 3);
    
    currentAngle = initialAngle + totalAngle * easing;
    
    // Compute pointer ticks exactly when peg thresholds cross the top index (1.5 PI)
    const arcSize = (2 * Math.PI) / segments.length;
    const relativeAngle = ((1.5 * Math.PI) - currentAngle) % (2 * Math.PI);
    const positiveRelativeAngle = (relativeAngle + 2 * Math.PI) % (2 * Math.PI);
    const currentTickIndex = Math.floor(positiveRelativeAngle / arcSize);
    
    if (currentTickIndex !== lastTickIndex) {
      lastTickIndex = currentTickIndex;
      triggerPointerTick();
    }
    
    drawWheel();
    
    if (progress < 1) {
      requestAnimationFrame(animate);
    } else {
      isSpinning = false;
      determineWinner();
    }
  }
  
  requestAnimationFrame(animate);
}

function determineWinner() {
  // Normalize angle between 0 and 2PI
  const normalizedAngle = currentAngle % (2 * Math.PI);
  
  // The pointer is at the top (270 degrees or 1.5 PI in standard canvas coordinates)
  // Wait, canvas draws 0 at right (3 o'clock). Top is 1.5 * PI.
  // When rotated, we need to calculate which segment falls under 1.5 PI.
  const arcSize = (2 * Math.PI) / segments.length;
  
  // Angle relative to the wheel starting position (0 at 3 o'clock)
  const offset = (1.5 * Math.PI) - normalizedAngle;
  // Normalize positive
  const positiveOffset = (offset + 10 * Math.PI) % (2 * Math.PI);
  
  const winningIndex = Math.floor(positiveOffset / arcSize);
  winningSegment = segments[winningIndex];
  
  showWinModal();
}

// --- Modals & UI State ---
function showWinModal() {
  const isLoss = winningSegment.label.includes('حظ') || winningSegment.label.includes('مرة') || winningSegment.label.includes('أخرى') || winningSegment.label.includes('حاول');
  
  const modalTitle = document.querySelector('.modal-title');
  if (isLoss) {
    modalTitle.textContent = 'حظ أوفر المرة القادمة!';
    winResultText.textContent = winningSegment.label;
    winResultText.style.color = '#ef4444'; // Reddish color for loss
  } else {
    modalTitle.textContent = 'مبروك! فزت بـ:';
    winResultText.textContent = winningSegment.label;
    winResultText.style.color = 'var(--accent-color)'; // Premium gold/rose-gold color
  }
  
  winModal.classList.remove('hidden');
  confetti.start(); // Trigger confetti cascade on winning modal show
}

function hideWinModal() {
  winModal.classList.add('hidden');
  confetti.stop(); // Stop cascade when modal is dismissed
}

function renderInventory() {
  inventoryList.innerHTML = '';
  inventory.forEach(item => {
    const li = document.createElement('li');
    li.className = 'inventory-item';
    li.innerHTML = `
      <div class="color-dot" style="background-color: ${item.color};"></div>
      <span class="item-text">${item.label}</span>
    `;
    inventoryList.appendChild(li);
  });
}

function applyConfig() {
  inputDuration.value = config.spinDuration;
  toggleLogoPosition.checked = config.logoInCenter;
  toggleSound.checked = config.enableSound;
  
  if (config.logoInCenter) {
    logoTopRight.classList.add('hidden');
    centerLogoImg.classList.remove('hidden');
    centerSpinText.classList.add('hidden');
  } else {
    logoTopRight.classList.remove('hidden');
    centerLogoImg.classList.add('hidden');
    centerSpinText.classList.remove('hidden');
  }
}

function updateSettingsUI() {
  inputDuration.value = config.spinDuration;
  toggleLogoPosition.checked = config.logoInCenter;
  toggleSound.checked = config.enableSound;
}

function renderSettingsSegments() {
  segmentEditor.innerHTML = '';
  segments.forEach((seg, index) => {
    const row = document.createElement('div');
    row.className = 'segment-row';
    row.innerHTML = `
      <input type="text" value="${seg.label}" data-index="${index}" class="seg-label" placeholder="اسم القسم">
      <input type="color" value="${seg.color}" data-index="${index}" class="seg-color">
      <button class="btn-remove" data-index="${index}"><i class="fas fa-trash"></i></button>
    `;
    segmentEditor.appendChild(row);
  });
  
  // Re-attach listeners
  document.querySelectorAll('.seg-label').forEach(el => {
    el.addEventListener('input', (e) => {
      segments[e.target.dataset.index].label = e.target.value;
      saveState();
      drawWheel();
    });
  });
  
  document.querySelectorAll('.seg-color').forEach(el => {
    el.addEventListener('input', (e) => {
      segments[e.target.dataset.index].color = e.target.value;
      saveState();
      drawWheel();
    });
  });
  
  document.querySelectorAll('.btn-remove').forEach(el => {
    el.addEventListener('click', (e) => {
      const idx = e.currentTarget.dataset.index;
      segments.splice(idx, 1);
      saveState();
      renderSettingsSegments();
      drawWheel();
    });
  });
}

// --- Event Listeners ---
function setupEventListeners() {
  // Spin
  btnSpinCenter.addEventListener('click', spinWheel);
  
  // Settings Overlay
  btnSettings.addEventListener('click', () => settingsOverlay.classList.remove('hidden'));
  btnCloseSettings.addEventListener('click', () => settingsOverlay.classList.add('hidden'));
  
  // Mobile Inventory
  btnInventory.addEventListener('click', () => inventorySidebar.classList.add('open'));
  btnCloseInventory.addEventListener('click', () => inventorySidebar.classList.remove('open'));
  
  // Add Segment
  btnAddSegment.addEventListener('click', () => {
    const newColor = defaultPalette[segments.length % defaultPalette.length];
    segments.push({ label: 'قسم جديد', color: newColor });
    saveState();
    renderSettingsSegments();
    drawWheel();
  });
  
  // Settings Form Inputs
  inputDuration.addEventListener('change', (e) => {
    config.spinDuration = parseInt(e.target.value) || 5;
    saveState();
  });
  
  toggleLogoPosition.addEventListener('change', (e) => {
    config.logoInCenter = e.target.checked;
    saveState();
    applyConfig();
  });
  
  toggleSound.addEventListener('change', (e) => {
    config.enableSound = e.target.checked;
    saveState();
  });
  
  // Modal Actions
  btnSpinAgain.addEventListener('click', () => {
    hideWinModal();
    // Optional: reset angle or just spin again from current angle
  });
  
  btnSaveResult.addEventListener('click', () => {
    if (winningSegment) {
      inventory.push({ label: winningSegment.label, color: winningSegment.color });
      saveState();
      renderInventory();
    }
    hideWinModal();
  });
  
  // Inventory Actions
  btnClearInventory.addEventListener('click', () => {
    if(confirm('هل أنت متأكد أنك تريد مسح السجل؟')) {
      inventory = [];
      saveState();
      renderInventory();
    }
  });

  // Close overlays when clicking outside
  settingsOverlay.addEventListener('click', (e) => {
    if (e.target === settingsOverlay) {
      settingsOverlay.classList.add('hidden');
    }
  });
}

// Boot up
window.addEventListener('DOMContentLoaded', init);
