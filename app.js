// ==========================================================================
// 🎨 إدارة البيانات والحالة الافتراضية (Data & State Management)
// ==========================================================================

// مصفوفة الألوان الافتراضية لعجلة الحظ: لوحة ألوان باستيل ناعمة وفاخرة تتناسق مع خلفية الموقع
const defaultPalette = [
  '#FFB5B5', // الوردي الفاخر (Rose Gold)
  '#DBC4FF', // الخزامى الأرجواني (Lavender-Indigo)
  '#BCEEDB', // النعناع الهادئ (Soft Mint Sage)
  '#FFEAA7', // الذهبي الدافئ (Warm Amber Gold)
  '#BCE3FF', // السماوي اللؤلؤي (Sky Blue Pearl)
  '#FFC5A3', // الخوخي الناعم (Peach Nectar)
  '#F3C6F1', // الليلك الجذاب (Soft Blossom Lilac)
  '#CDE8E5'  // المائي الشاحب (Pale Aqua Marine)
];

// استرجاع أقسام العجلة المخزنة محلياً في المتصفح، أو وضع قيم افتراضية تمثل هدايا متجر الإكسسوارات اليدوية
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

// استرجاع سجل الجوائز التي فاز بها المستخدم وتم حفظها محلياً
let inventory = JSON.parse(localStorage.getItem('wheelInventory')) || [];

// تفضيلات العجلة والتحكم بالدوران ومكان الشعار والمؤثرات الصوتية
let config = JSON.parse(localStorage.getItem('wheelConfig')) || {
  spinDuration: 5,   // مدة الدوران الافتراضية بالثواني (خمس ثوانٍ لبناء الحماس والتشويق)
  logoInCenter: true, // تفعيل وضع الشعار في المنتصف ليعمل كزر للدوران
  enableSound: false  // التحكم في تفعيل الصوت (معطل افتراضياً لتجنب إزعاج الزوار حتى يفعلونه)
};

// متغيرات تتبع زاوية العجلة الحالية وحالة الدوران والقطاع الفائز
let currentAngle = 0;       // الزاوية الحالية للعجلة بالراديان
let isSpinning = false;     // مؤشر لمعرفة ما إذا كانت العجلة تدور حالياً لمنع النقرات المتكررة
let winningSegment = null;  // لتخزين بيانات القطاع الذي وقفت عنده العجلة لعرضه في النافذة

// ==========================================================================
// 🔌 ربط عناصر واجهة المستخدم بالـ DOM (DOM Elements)
// ==========================================================================
const canvas = document.getElementById('wheelCanvas');
const ctx = canvas.getContext('2d');
const btnSpinCenter = document.getElementById('btnSpinCenter');
const centerSpinText = document.getElementById('centerSpinText');
const centerLogoImg = document.getElementById('centerLogoImg');
const logoTopRight = document.getElementById('logoTopRight');

// عناصر لوحة الإعدادات والتحكم
const settingsOverlay = document.getElementById('settingsOverlay');
const btnSettings = document.getElementById('btnSettings');
const btnFullscreen = document.getElementById('btnFullscreen'); // زر وضع الشاشة الكاملة الجديد
const btnCloseSettings = document.getElementById('btnCloseSettings');
const segmentEditor = document.getElementById('segmentEditor');
const btnAddSegment = document.getElementById('btnAddSegment');
const inputDuration = document.getElementById('inputDuration');
const toggleLogoPosition = document.getElementById('toggleLogoPosition');
const toggleSound = document.getElementById('toggleSound');

// عناصر لوحة أرشيف الجوائز المحفوظة
const inventorySidebar = document.getElementById('inventorySidebar');
const btnInventory = document.getElementById('btnInventory');
const btnCloseInventory = document.getElementById('btnCloseInventory');
const inventoryList = document.getElementById('inventoryList');
const btnClearInventory = document.getElementById('btnClearInventory');

// عناصر نافذة الفوز وإعلان النتائج
const winModal = document.getElementById('winModal');
const winResultText = document.getElementById('winResultText');
const btnSaveResult = document.getElementById('btnSaveResult');
const btnSpinAgain = document.getElementById('btnSpinAgain');

// ==========================================================================
// 🎵 محرك تركيب الصوت تفاعلياً (Web Audio API Click Engine)
// ==========================================================================
let audioCtx = null; // سيتم تهيئته عند أول نقرة حقيقية للمستخدم لضمان تجاوز حظر المتصفحات للمحتوى التلقائي

/**
 * دالة لتوليد صوت تكتكة خشبية حقيقية وناعمة برمجياً
 * نستخدم موجة جيبية (Sine Wave) سريعة الزوال لإنتاج صوت تكتكة مثالي يحاكي احتكاك مؤشر العجلة بالدبابيس
 */
function playTickSound() {
  if (!config.enableSound) return; // الخروج فوراً إذا كان المستخدم قد عطل الصوت من الإعدادات
  
  try {
    // تهيئة سياق الصوت إذا لم يكن مهيئاً من قبل
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    // تأكيد تفعيل سياق الصوت إذا كان المتصفح قد علقه مؤقتاً
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    
    // إنشاء مذبذب وعقدة للتحكم في مستوى الصوت (Gain Node)
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    osc.type = 'sine'; // موجة ناعمة
    // تردد التكتكة الافتراضي: تردد مرتفع قليلاً ليكون حاداً وواضحاً (650 هرتز) ثم يهبط بسرعة فائقة إلى 150 هرتز لمحاكاة النقرة الخشبية
    osc.frequency.setValueAtTime(650, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(150, audioCtx.currentTime + 0.04);
    
    // ضبط مستوى الصوت ليكون منخفضاً ومريحاً للأذن (0.06) ثم يهبط تدريجياً إلى الصفر لمنع حدوث فرقعة صوتية مفاجئة
    gainNode.gain.setValueAtTime(0.06, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.04);
    
    // توصيل المذبذب بالتحكم في الصوت ثم بالمخارج الرئيسية للجهاز
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    // بدء وإنهاء الصوت خلال نافذة زمنية ضيقة جداً (40 جزء من الثانية)
    osc.start();
    osc.stop(audioCtx.currentTime + 0.04);
  } catch (e) {
    console.error("فشل محرك الصوت البرمجي Web Audio API:", e);
  }
}

// ==========================================================================
// 🎉 نظام إمطار القصاصات الاحتفالية (Confetti Celebration System)
// ==========================================================================
class ConfettiSystem {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.particles = [];       // مصفوفة لتخزين جزيئات القصاصات الورقية النشطة
    this.isActive = false;      // تتبع حالة الرسوم المتحركة لمنع تكرار الحلقات اللانهائية
    this.colors = ['#FF7676', '#FFD276', '#76FFB8', '#76CFFF', '#C276FF', '#FF76D4']; // ألوان القصاصات المبهجة
    
    // تحديث أبعاد لوحة الرسم ديناميكياً لتناسب الشاشة عند تغيير حجم المتصفح
    window.addEventListener('resize', () => this.resizeCanvas());
    this.resizeCanvas();
  }
  
  // مطابقة مقاس كانفاس الاحتفال مع أبعاد نافذة العرض بالكامل
  resizeCanvas() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }
  
  // تشغيل الاحتفال وبدء حركة القصاصات
  start() {
    if (this.isActive) return; // حماية برمجية هامة: تمنع تشغيل حلقة رسوم متحركة مضاعفة عند نقرات الفوز المتكررة
    this.isActive = true;
    this.particles = [];
    
    // توليد 120 جزيء قصاصات ورقية بأماكن وأحجام عشوائية في الجزء العلوي خارج الشاشة
    for (let i = 0; i < 120; i++) {
      this.particles.push(this.createParticle());
    }
    this.animate(); // تشغيل حلقة الأنيميشن
  }
  
  // إيقاف الاحتفال وتصفيف شاشة الرسم
  stop() {
    this.isActive = false;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
  
  // دالة مساعدة لإنشاء جزيء قصاصة بخصائص حركية عشوائية وجميلة
  createParticle() {
    return {
      x: Math.random() * this.canvas.width,
      y: Math.random() * this.canvas.height - this.canvas.height, // تبدأ من الأعلى خارج نطاق الرؤية
      r: Math.random() * 6 + 4, // نصف القطر العشوائي للجزيء
      d: Math.random() * this.canvas.height, // عمق عشوائي للتحكم بالسرعة
      color: this.colors[Math.floor(Math.random() * this.colors.length)], // اختيار لون عشوائي
      tilt: Math.random() * 10 - 5, // درجة الميلان لتعطي انطباعاً ثلاثي الأبعاد أثناء الدوران
      tiltAngleIncremental: Math.random() * 0.07 + 0.03, // سرعة التأرجح
      tiltAngle: 0 // زاوية الميلان الحالية
    };
  }
  
  // حلقة الرسوم المتحركة المسؤولة عن تحديث ورسم جزيئات القصاصات الورقية
  animate() {
    if (!this.isActive) return; // التوقف الفوري إذا تم استدعاء دالة الإيقاف لمنع استهلاك المعالج
    
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height); // مسح الإطار السابق
    
    this.particles.forEach(p => {
      // تحديث الخصائص الفيزيائية وحركة الجزيء
      p.tiltAngle += p.tiltAngleIncremental;
      p.y += (Math.cos(p.d) + 3 + p.r / 2) / 2; // سرعة الهبوط للأسفل
      p.x += Math.sin(p.tiltAngle);            // الحركة الجانبية المتأرجحة
      p.tilt = Math.sin(p.tiltAngle - p.r / 2) * 15; // تدوير وميلان الجزيء بصرياً
      
      // إعادة تدوير الجزيء وإرجاعه للأعلى فور خروجه من الجزء السفلي للشاشة
      if (p.y > this.canvas.height) {
        p.y = -20;
        p.x = Math.random() * this.canvas.width;
      }
      
      // رسم جزيء القصاصة الورقية على الكانفاس بأسلوب مائل وجميل
      this.ctx.beginPath();
      this.ctx.lineWidth = p.r;
      this.ctx.strokeStyle = p.color;
      this.ctx.moveTo(p.x + p.tilt + p.r / 2, p.y);
      this.ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r / 2);
      this.ctx.stroke();
    });
    
    // استدعاء الإطار التالي بنعومة وسرعة 60 إطاراً في الثانية
    if (this.isActive) {
      requestAnimationFrame(() => this.animate());
    }
  }
}

// تهيئة النظام الخاص بالاحتفالات وربطه بالكانفاس المخصص
const confetti = new ConfettiSystem(document.getElementById('confettiCanvas'));

// ==========================================================================
// 🚀 إعداد التشغيل الأولي وتخزين البيانات (Initialization & Storage)
// ==========================================================================

// دالة البدء الرئيسي التي تعمل فور تحميل عناصر الصفحة بالكامل
function init() {
  updateSettingsUI();         // تحديث قيم مدخلات الإعدادات لتطابق التهيئة المحفوظة
  applyConfig();              // تطبيق خيارات التموضع للصوت والشعار في الواجهة
  renderSettingsSegments();   // بناء أسطر التعديل التفاعلية للأقسام والألوان في الإعدادات
  renderInventory();          // بناء وعرض سجل الأرباح المحفوظة في القائمة الجانبية
  drawWheel();                // رسم عجلة الحظ للمرة الأولى على لوحة الرسم الكانفاس
  setupEventListeners();      // تفعيل وربط جميع الأحداث ونقرات الأزرار
}

// حفظ الحالة الحالية للأقسام والجوائز وتفضيلات اللعبة في الـ LocalStorage لتجنب فقدانها عند التحديث
function saveState() {
  localStorage.setItem('wheelSegments', JSON.stringify(segments));
  localStorage.setItem('wheelInventory', JSON.stringify(inventory));
  localStorage.setItem('wheelConfig', JSON.stringify(config));
}

// ==========================================================================
// 🎡 رسم وتوليد عجلة الحظ برمجياً (Canvas Wheel Rendering)
// ==========================================================================
function drawWheel() {
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const radius = Math.min(centerX, centerY); // حساب نصف القطر الأقصى للعجلة
  const numSegments = segments.length;
  const arcSize = (2 * Math.PI) / numSegments; // زاوية كل قطاع بناءً على عدد الأقسام الإجمالي

  ctx.clearRect(0, 0, canvas.width, canvas.height); // مسح الكانفاس للرسم من جديد دون تداخلات

  for (let i = 0; i < numSegments; i++) {
    // حساب زاوية البداية والنهاية لكل قطاع بناء على زاوية العجلة الكلية الحالية
    const angle = currentAngle + i * arcSize;
    
    // 1. رسم القطاع الدائري وتلوينه
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, angle, angle + arcSize, false);
    ctx.lineTo(centerX, centerY);
    ctx.fillStyle = segments[i].color;
    ctx.fill();
    ctx.strokeStyle = '#FFF4FD'; // حدود ناعمة ومطابقة لخلفية المتجر الوردية الهادئة
    ctx.lineWidth = 4;
    ctx.stroke();
    
    // 2. رسم الدبابيس الفاخرة (Pins) عند حواف قطاعات العجلة لتعطي عمقاً ومظهراً احترافياً
    ctx.beginPath();
    const pinX = centerX + (radius - 12) * Math.cos(angle);
    const pinY = centerY + (radius - 12) * Math.sin(angle);
    ctx.arc(pinX, pinY, 5, 0, 2 * Math.PI);
    ctx.fillStyle = '#E5E7EB'; // لون فضي ناعم للدبابيس
    ctx.fill();
    
    // 3. كتابة النص والهدية داخل القطاع مع حمايته من الخروج والتمدد التلقائي
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(angle + arcSize / 2); // توجيه محور الرسم في منتصف القطاع تماماً
    ctx.direction = 'rtl';           // دعم الكتابة باللغة العربية من اليمين إلى اليسار
    ctx.textAlign = 'right';         // محاذاة النص نحو الحافة الخارجية لتسهيل القراءة
    ctx.fillStyle = '#1F2937';       // لون رمادي داكن فخم جداً ذو تباين عالٍ ومقاوم للتشتت البصري
    
    // الحساب الديناميكي لمقاس الخط لمنع خروج نصوص الهدايا الطويلة عن حدود قطاع العجلة
    let fontSize = 24;
    const maxTextWidth = radius * 0.62; // المدى الأقصى المسموح للنص لشغل مساحة العجلة بأمان
    ctx.font = `800 ${fontSize}px "Almarai", sans-serif`;
    let textWidth = ctx.measureText(segments[i].label).width;
    
    // إذا كان النص أطول من المساحة المحددة، نقوم بتقليص مقاس الخط تدريجياً حتى يتناسب تماماً
    if (textWidth > maxTextWidth) {
      fontSize = Math.max(12, Math.floor(fontSize * (maxTextWidth / textWidth)));
      ctx.font = `800 ${fontSize}px "Almarai", sans-serif`;
    }
    
    // رسم نص الهدية متبوعاً بإزاحة أفقية وعمودية مدروسة بعناية ليكون متوسطاً بصرياً
    ctx.fillText(segments[i].label, radius - 44, fontSize / 3.5);
    ctx.restore();
  }
}

// ==========================================================================
// 💫 فيزياء وحركة دوران العجلة (Wheel Physics & Spin Engine)
// ==========================================================================

// دالة إطلاق حركة المؤشر (Wiggle Animation) وتشغيل صوت التكتكة عند المرور بالدبابيس
function triggerPointerTick() {
  const pointerEl = document.querySelector('.pointer');
  if (pointerEl) {
    // إزالة كلاس الاهتزاز وإعادة تشغيله بسرعة لتنشيط الأنيميشن التفاعلي
    pointerEl.classList.remove('tick');
    void pointerEl.offsetWidth; // حيلة تفاعلية ممتازة لإرغام المتصفح على إعادة رسم العنصر (Reflow) فوراً
    pointerEl.classList.add('tick');
    
    // تنظيف كلاس الاهتزاز بعد اكتمال الحركة بنعومة
    setTimeout(() => pointerEl.classList.remove('tick'), 60);
  }
  playTickSound(); // إطلاق صوت التكتكة عبر محرك الصوت البرمجي
}

// دالة تدوير العجلة الأساسية مع إدخال فيزياء التباطؤ التدريجي لبناء الحماس
function spinWheel() {
  // الخروج فوراً إذا كانت العجلة تدور بالفعل أو لا تحتوي على أقسام
  if (isSpinning || segments.length === 0) return;
  
  isSpinning = true;
  confetti.stop(); // إيقاف أي احتفالات بالقصاصات جارية من دورات سابقة
  
  // تفعيل حماية وتجميد واجهة التفاعل كلياً أثناء دوران العجلة لمنع التعديل أو العبث الرسومي
  document.body.classList.add('spinning-active');
  
  // تفعيل وتشغيل سياق الصوت فوراً داخل حدث النقر الحقيقي لتجاوز قيود أمان الأجهزة الذكية
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  
  // حساب عدد دورات دوران العجلة (بين 5 و 10 دورات كاملة عشوائياً لبناء الإثارة)
  const spinRotations = 5 + Math.random() * 5;
  const totalAngle = spinRotations * 2 * Math.PI; // تحويل عدد الدورات لزاوية بالراديان
  
  const duration = config.spinDuration * 1000; // تحويل مدة الدوران لملي ثانية
  const startTime = performance.now();
  
  const initialAngle = currentAngle; // حفظ زاوية الانطلاق الحالية للعجلة
  let lastTickIndex = -1;

  // حلقة التحديث الرسومي لحركة الدوران بنعومة فائقة
  function animate(time) {
    const elapsed = time - startTime;
    const progress = Math.min(elapsed / duration, 1); // حساب النسبة المئوية للوقت المنقضي
    
    // تطبيق معادلة التباطؤ التكعيبية الأنيقة (Easing Out Cubic)
    // تجعل العجلة تنطلق بسرعة فائقة ثم تتباطأ بنعومة وتدريجية رائعة حتى تقف تماماً في الوقت المحدد
    const easing = 1 - Math.pow(1 - progress, 3);
    
    currentAngle = initialAngle + totalAngle * easing;
    
    // الحساب الدقيق للمرور بالدبابيس لإطلاق صوت التكتكة وحركة المؤشر التفاعلية
    const arcSize = (2 * Math.PI) / segments.length;
    // المؤشر يقف في الجزء العلوي تماماً (الزاوية 270 درجة أو 1.5 * PI بصيغة الراديان للكانفاس)
    const relativeAngle = ((1.5 * Math.PI) - currentAngle) % (2 * Math.PI);
    const positiveRelativeAngle = (relativeAngle + 2 * Math.PI) % (2 * Math.PI);
    const currentTickIndex = Math.floor(positiveRelativeAngle / arcSize);
    
    // عند الانتقال من قطاع لقطاع آخر، يتم إطلاق حركة وصوت التكتكة
    if (currentTickIndex !== lastTickIndex) {
      lastTickIndex = currentTickIndex;
      triggerPointerTick();
    }
    
    drawWheel(); // إعادة رسم العجلة بالزاوية الجديدة
    
    // الاستمرار في تحديث الإطارات حتى انتهاء المدة المحددة بالكامل
    if (progress < 1) {
      requestAnimationFrame(animate);
    } else {
      isSpinning = false;
      document.body.classList.remove('spinning-active'); // إزالة تجميد وحماية الواجهة وتنشيط الأزرار مجدداً
      determineWinner(); // تحديد الفائز وإعلان النتيجة فور التوقف المثالي للعجلة
    }
  }
  
  requestAnimationFrame(animate); // بدء تشغيل الإطار الحركي الأول
}

// دالة تحديد القطاع الفائز بدقة رياضية بالاعتماد على الزاوية النهائية للعجلة
function determineWinner() {
  const normalizedAngle = currentAngle % (2 * Math.PI); // توحيد الزاوية بين 0 و 2PI
  const arcSize = (2 * Math.PI) / segments.length;
  
  // حساب موقع التوقف بالنسبة لمؤشر العجلة العلوي (1.5 PI)
  const offset = (1.5 * Math.PI) - normalizedAngle;
  const positiveOffset = (offset + 10 * Math.PI) % (2 * Math.PI); // تحويل القيم السالبة لقيم موجبة مكافئة
  
  const winningIndex = Math.floor(positiveOffset / arcSize);
  winningSegment = segments[winningIndex]; // تحديد القطاع الفائز وحفظ بياناته
  
  showWinModal(); // إظهار نافذة إعلان النتيجة التفاعلية الفخمة
}

// ==========================================================================
// 🏆 النوافذ المنبثقة وحالة واجهة المستخدم التفاعلية (Modals & UI State)
// ==========================================================================

// دالة إظهار نافذة إعلان النتائج وتطبيق قواعد الألوان والتخصيص لتباين مذهل
function showWinModal() {
  // فحص الكلمات لمعرفة ما إذا كانت النتيجة سلبية أو محاولة أخرى
  const isLoss = winningSegment.label.includes('حظ') || 
                 winningSegment.label.includes('مرة') || 
                 winningSegment.label.includes('أخرى') || 
                 winningSegment.label.includes('حاول');
  
  const modalTitle = document.querySelector('.modal-title');
  
  if (isLoss) {
    // 1. حالة المحاولة الأخرى/الخسارة: إخفاء كلمة "مبروك" وجعل العنوان يواسي المستخدم
    modalTitle.textContent = 'حظ أوفر المرة القادمة!';
    winResultText.textContent = winningSegment.label;
    winResultText.style.color = '#ef4444'; // لون أحمر تحذيري مميز جداً يعطي تبايناً ثنائياً مع العنوان الرمادي
  } else {
    // 2. حالة الفوز بجائزة: إظهار تهنئة الفوز ونص الجائزة بحجم كبير ولون ذهبي رائع
    modalTitle.textContent = 'مبروك! فزت بـ:';
    winResultText.textContent = winningSegment.label;
    winResultText.style.color = 'var(--accent-color)'; // اللون الذهبي البراق المعتمد للجوائز والهوية البصرية للمتجر
  }
  
  winModal.classList.remove('hidden'); // إظهار النافذة المنبثقة
  confetti.start(); // إطلاق أمطار القصاصات الملونة فوراً لمضاعفة الحماس والبهجة
}

// دالة إخلاق نافذة إعلان النتيجة وتصفيف الاحتفالات
function hideWinModal() {
  winModal.classList.add('hidden');
  confetti.stop(); // إيقاف القصاصات الاحتفالية لتخفيف استهلاك الجهاز
}

// دالة عرض وتوليد عناصر قائمة الجوائز المحفوظة في القائمة الجانبية
function renderInventory() {
  inventoryList.innerHTML = ''; // تفريغ العناصر القديمة
  inventory.forEach(item => {
    const li = document.createElement('li');
    li.className = 'inventory-item';
    li.innerHTML = `
      <div class="color-dot" style="background-color: ${item.color};"></div>
      <span class="item-text">${item.label}</span>
    `;
    inventoryList.appendChild(li); // إضافة الجائزة المحفوظة للقائمة
  });
}

// تطبيق التكوينات والخيارات العامة وحالة تموضع الشعار في الموقع
function applyConfig() {
  inputDuration.value = config.spinDuration;
  toggleLogoPosition.checked = config.logoInCenter;
  toggleSound.checked = config.enableSound;
  
  if (config.logoInCenter) {
    // الوضع المركزي: إظهار شعار المتجر في المنتصف وإخفاء شعار الزاوية العلوية
    logoTopRight.classList.add('hidden');
    centerLogoImg.classList.remove('hidden');
    centerSpinText.classList.add('hidden');
  } else {
    // وضع الترويسة: نقل الشعار للزاوية العلوية اليمنى، وإظهار كلمة "العب" في مركز العجلة
    logoTopRight.classList.remove('hidden');
    centerLogoImg.classList.add('hidden');
    centerSpinText.classList.remove('hidden');
  }
}

// مزامنة عناصر لوحة الإعدادات لتطابق قيم ملف التهيئة الحالي
function updateSettingsUI() {
  inputDuration.value = config.spinDuration;
  toggleLogoPosition.checked = config.logoInCenter;
  toggleSound.checked = config.enableSound;
}

// بناء وتوليد قائمة محرر الأقسام التفاعلي في لوحة الإعدادات الجانبية
function renderSettingsSegments() {
  segmentEditor.innerHTML = ''; // مسح العناصر القديمة
  segments.forEach((seg, index) => {
    const row = document.createElement('div');
    row.className = 'segment-row';
    row.innerHTML = `
      <input type="text" value="${seg.label}" data-index="${index}" class="seg-label" placeholder="اسم الهدية/القسم">
      <input type="color" value="${seg.color}" data-index="${index}" class="seg-color" title="اختر اللون">
      <button class="btn-remove" data-index="${index}" title="حذف القسم"><i class="fas fa-trash"></i></button>
    `;
    segmentEditor.appendChild(row);
  });
  
  // ربط أحداث تغيير نصوص الجوائز
  document.querySelectorAll('.seg-label').forEach(el => {
    el.addEventListener('input', (e) => {
      segments[e.target.dataset.index].label = e.target.value;
      saveState();
      drawWheel(); // إعادة رسم العجلة فورياً لمشاهدة التعديلات
    });
  });
  
  // ربط أحداث تغيير ألوان القطاعات
  document.querySelectorAll('.seg-color').forEach(el => {
    el.addEventListener('input', (e) => {
      segments[e.target.dataset.index].color = e.target.value;
      saveState();
      drawWheel(); // تحديث ألوان العجلة فورياً
    });
  });
  
  // ربط أحداث حذف القطاعات
  document.querySelectorAll('.btn-remove').forEach(el => {
    el.addEventListener('click', (e) => {
      const idx = e.currentTarget.dataset.index;
      segments.splice(idx, 1); // حذف القسم المختار من المصفوفة
      saveState();
      renderSettingsSegments(); // إعادة بناء المحرر
      drawWheel();             // إعادة رسم العجلة بالعدد الجديد للقطاعات
    });
  });
}

// ==========================================================================
// 📺 نظام ملء الشاشة الفعال والتفاعل الغامر (Browser Fullscreen Manager)
// ==========================================================================

// دالة التبديل الذكية لوضع ملء الشاشة (Fullscreen API) بالتزامن مع كلاس التجميل للتصميم
function toggleFullscreen() {
  // فحص ما إذا كان المتصفح يعرض شاشة كاملة حالياً بأي من الصيغ المدعومة
  if (!document.fullscreenElement && 
      !document.webkitFullscreenElement && 
      !document.mozFullScreenElement && 
      !document.msFullscreenElement) {
    
    // الدخول في وضع الشاشة الكاملة
    const docEl = document.documentElement;
    if (docEl.requestFullscreen) {
      docEl.requestFullscreen();
    } else if (docEl.webkitRequestFullscreen) { /* متصفحات Safari و iOS */
      docEl.webkitRequestFullscreen();
    } else if (docEl.mozRequestFullScreen) {    /* متصفح Firefox القديم */
      docEl.mozRequestFullScreen();
    } else if (docEl.msRequestFullscreen) {     /* متصفح Internet Explorer / Edge */
      docEl.msRequestFullscreen();
    }
    
    document.body.classList.add('fullscreen-active'); // إضافة الكلاس لتفعيل التصميم الغامر وتكبير العجلة
    updateFullscreenIcon(true);
  } else {
    // الخروج من وضع الشاشة الكاملة
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen();
    } else if (document.mozCancelFullScreen) {
      document.mozCancelFullScreen();
    } else if (document.msExitFullscreen) {
      document.msExitFullscreen();
    }
    
    document.body.classList.remove('fullscreen-active'); // إزالة الكلاس للعودة للتصميم الطبيعي والقوائم الجانبية
    updateFullscreenIcon(false);
  }
}

// تحديث الأيقونات تفاعلياً لزر الشاشة الكاملة
function updateFullscreenIcon(isFullscreen) {
  const icon = btnFullscreen.querySelector('i');
  if (icon) {
    if (isFullscreen) {
      icon.className = 'fas fa-compress'; // تغيير الأيقونة للضغط عند تفعيل الشاشة الكاملة
    } else {
      icon.className = 'fas fa-expand';   // تغيير الأيقونة للتوسيع عند العودة للوضع الطبيعي
    }
  }
}

// مراقبة حدث التغيير التلقائي للشاشة الكاملة لضمان مزامنة التصميم إذا خرج المستخدم عبر مفتاح ESC
function handleFullscreenChange() {
  const isFS = !!(document.fullscreenElement || 
                 document.webkitFullscreenElement || 
                 document.mozFullScreenElement || 
                 document.msFullscreenElement);
  
  if (isFS) {
    document.body.classList.add('fullscreen-active');
    updateFullscreenIcon(true);
  } else {
    document.body.classList.remove('fullscreen-active');
    updateFullscreenIcon(false);
  }
}

// ==========================================================================
// 🎧 تفعيل وربط أحداث النقرات والتفاعل (Event Listeners Setup)
// ==========================================================================
function setupEventListeners() {
  // زر دوران العجلة الرئيسي في المنتصف
  btnSpinCenter.addEventListener('click', spinWheel);
  
  // زر فتح وإغلاق لوحة الإعدادات الجانبية
  btnSettings.addEventListener('click', () => settingsOverlay.classList.remove('hidden'));
  btnCloseSettings.addEventListener('click', () => settingsOverlay.classList.add('hidden'));
  
  // زر تفعيل الشاشة الكاملة الجديد
  btnFullscreen.addEventListener('click', toggleFullscreen);
  
  // الاستماع لتغييرات وضع الشاشة الكاملة لمزامنة الحالات والأيقونات
  document.addEventListener('fullscreenchange', handleFullscreenChange);
  document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
  document.addEventListener('mozfullscreenchange', handleFullscreenChange);
  document.addEventListener('MSFullscreenChange', handleFullscreenChange);
  
  // فتح وإغلاق قائمة أرشيف الجوائز للأجهزة الذكية واللوحية
  btnInventory.addEventListener('click', () => inventorySidebar.classList.add('open'));
  btnCloseInventory.addEventListener('click', () => inventorySidebar.classList.remove('open'));
  
  // زر إضافة قسم جديد للعجلة
  btnAddSegment.addEventListener('click', () => {
    // اختيار لون متناسق وبديل تلقائياً من لوحة الباستيل لضمان المظهر المتناغم للعجلة
    const newColor = defaultPalette[segments.length % defaultPalette.length];
    segments.push({ label: 'قسم جديد', color: newColor });
    saveState();
    renderSettingsSegments(); // إعادة بناء قائمة التعديل
    drawWheel();             // رسم العجلة بالقسم الجديد
  });
  
  // زر تعديل مدة دوران العجلة وتحديث تفضيلاتها
  inputDuration.addEventListener('change', (e) => {
    config.spinDuration = parseInt(e.target.value) || 5;
    saveState();
  });
  
  // مفتاح التبديل لنقل الشعار بين المنتصف والزاوية العلوية اليمنى
  toggleLogoPosition.addEventListener('change', (e) => {
    config.logoInCenter = e.target.checked;
    saveState();
    applyConfig(); // تطبيق خيار التموضع فورياً في الواجهة
  });
  
  // مفتاح تفعيل وتعطيل الأصوات والتكتكات
  toggleSound.addEventListener('change', (e) => {
    config.enableSound = e.target.checked;
    saveState();
  });
  
  // زر إغلاق نافذة النتيجة دون حفظ لإعادة اللعب مجدداً
  btnSpinAgain.addEventListener('click', () => {
    hideWinModal();
  });
  
  // زر حفظ النتيجة الحالية في سجل الأرباح المحفوظة محلياً وإظهارها بالجانب
  btnSaveResult.addEventListener('click', () => {
    if (winningSegment) {
      inventory.push({ label: winningSegment.label, color: winningSegment.color });
      saveState();
      renderInventory(); // تحديث القائمة بصرياً بالهدية الجديدة المحفوظة
    }
    hideWinModal();
  });
  
  // زر مسح سجل الأرباح والجوائز بالكامل والبدء من جديد
  btnClearInventory.addEventListener('click', () => {
    if (confirm('هل أنت متأكد أنك تريد مسح السجل بالكامل؟')) {
      inventory = [];
      saveState();
      renderInventory(); // تحديث وتفريغ القائمة الجانبية بصرياً
    }
  });
  
  // إغلاق لوحة الإعدادات الجانبية فوراً عند نقر المستخدم في أي مساحة فارغة بالخارج
  settingsOverlay.addEventListener('click', (e) => {
    if (e.target === settingsOverlay) {
      settingsOverlay.classList.add('hidden');
    }
  });
}

// تشغيل وتهيئة اللعبة بالكامل بمجرد اكتمال تحميل عناصر الصفحة بنجاح
window.addEventListener('DOMContentLoaded', init);
