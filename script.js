/* =========================================
   HPCore Aero8/D Logic Controller
   ========================================= */

// ★ BossのGASデプロイURL (設定済み)
const API_URL = "https://script.google.com/macros/s/AKfycbxTIgk19tSVGB7FozxO16O7WSenlbSmwVb9I_Ydeo8Aoy5twOn0XL6afkDZybwPypM7oA/exec"; 

// State Management
const STATE = {
  user: null, // {id, name, role, token}
  device: 'mobile', // 'mobile' | 'desktop'
  mode: 'partner', // 'partner' | 'librarian'
  liveSession: false,
  voiceGender: 'male',
  pcVoiceEnabled: false
};

// Initialization
window.addEventListener('DOMContentLoaded', () => {
  checkDevice();
  checkAuth();
  
  // Viewport setup for mobile keyboard
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', () => {
      document.body.style.height = window.visualViewport.height + 'px';
    });
  }
});

function checkDevice() {
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  STATE.device = isMobile ? 'mobile' : 'desktop';
  console.log("Device detected:", STATE.device);
}

function checkAuth() {
  const savedUser = localStorage.getItem('hpcore_user');
  if (savedUser) {
    STATE.user = JSON.parse(savedUser);
    initApp();
  } else {
    document.getElementById('auth-modal').style.display = 'flex';
  }
}

function initApp() {
  document.getElementById('auth-modal').style.display = 'none';
  
  if (STATE.device === 'mobile') {
    document.getElementById('mobile-view').style.display = 'flex';
    document.getElementById('greeting-name').innerText = STATE.user.name;
    document.getElementById('mobile-username').innerText = STATE.user.name;
  } else {
    document.getElementById('pc-view').style.display = 'block';
    document.getElementById('pc-user-info').innerText = `${STATE.user.name} (${STATE.user.role})`;
  }
  
  // Load History (Mock)
  loadHistory();
}

function loadHistory() {
    // 初回モック: サーバー連携時はここをfetchに置き換える
    // 今回は空でOK
}


/* =========================================
   Auth Logic
   ========================================= */
function switchAuthTab(tab) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
  
  if (tab === 'login') {
    document.querySelector('.tab:nth-child(1)').classList.add('active');
    document.getElementById('login-form').classList.add('active');
  } else {
    document.querySelector('.tab:nth-child(2)').classList.add('active');
    document.getElementById('register-form').classList.add('active');
  }
}

function handleLogin(e) {
  e.preventDefault();
  const id = document.getElementById('login-id').value;
  // Mock Login Success
  const user = { id: id, name: "Boss", role: "Master", token: "mock_token" };
  
  if (document.getElementById('remember-me').checked) {
    localStorage.setItem('hpcore_user', JSON.stringify(user));
  }
  STATE.user = user;
  initApp();
}

function handleRegister(e) {
    e.preventDefault();
    alert("登録機能はGAS側で実装されます。現在はログインのみ可能です。");
}


/* =========================================
   Communication (Headless API)
   ========================================= */
async function talkToCore(text, audioBlob = null) {
  // Construct Payload
  const payload = {
    userId: STATE.user.id,
    text: text,
    mode: STATE.mode,
    voiceGender: STATE.voiceGender,
    audioInput: audioBlob ? await blobToBase64(audioBlob) : null
  };
  
  // Show Loading (Simple)
  if(STATE.device === 'mobile'){
      // モバイル用の簡易ローディング表示など
  }

  try {
    // ★ ここでGASへPOST送信
    const res = await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    
    // Handle Response
    appendMessage('core', data.text);
    
    // Play Audio if present (Mobile)
    if (data.audioContent && STATE.device === 'mobile') {
      playAudioBase64(data.audioContent);
    }
    
    // Play TTS if enabled (PC)
    if (STATE.pcVoiceEnabled && STATE.device === 'desktop') {
      speakNative(data.text);
    }
    
  } catch (err) {
    console.error("Core Link Error:", err);
    // エラー時はフォールバックメッセージ
    appendMessage('core', "通信エラー: Coreに接続できませんでした。");
  }
}

/* =========================================
   UI Helpers
   ========================================= */
function handleMobileInput(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  
  const hasText = el.value.trim().length > 0;
  document.getElementById('voice-group').classList.toggle('hidden', hasText);
  document.getElementById('send-group').classList.toggle('hidden', !hasText);
}

function appendMessage(role, text) {
  const container = STATE.device === 'mobile' 
    ? document.getElementById('mobile-history-container')
    : document.getElementById('pc-chat-stream');
    
  const div = document.createElement('div');
  div.className = `msg-bubble ${role}`;
  div.innerHTML = text; // Should sanitize in production
  
  // Syntax Highlight if code block exists
  if (text.includes('```') && typeof Prism !== 'undefined') {
    Prism.highlightAllUnder(div);
  }
  
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

function sendMobileMessage() {
  const input = document.getElementById('mobile-input');
  const text = input.value.trim();
  if(!text) return;
  
  appendMessage('user', text);
  input.value = '';
  handleMobileInput(input);
  talkToCore(text); // 送信実行
}

function sendPcMessage() {
    const input = document.getElementById('pc-input');
    const text = input.value.trim();
    if(!text) return;

    appendMessage('user', text);
    input.value = '';
    talkToCore(text);
}

function handlePcKeydown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendPcMessage();
    }
}


/* =========================================
   Live Mode (Deep Abyss)
   ========================================= */
function startLiveMode() {
  STATE.liveSession = true;
  document.getElementById('live-overlay').classList.add('active');
  // Initialize Mic logic here
}

function stopLiveSession() {
  STATE.liveSession = false;
  document.getElementById('live-overlay').classList.remove('active');
}

/* =========================================
   PC Specifics
   ========================================= */
function switchPcMode(mode) {
  STATE.mode = mode;
  document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(`mode-${mode}`).classList.add('active');
  
  const header = document.querySelector('.pc-header');
  if (mode === 'librarian') {
    header.classList.add('librarian-active'); 
  } else {
    header.classList.remove('librarian-active');
  }
  document.getElementById('pc-mode-label').innerText = mode.charAt(0).toUpperCase() + mode.slice(1) + " Mode";
}

function togglePcVoiceRead() {
  STATE.pcVoiceEnabled = !STATE.pcVoiceEnabled;
  document.getElementById('pc-speaker-btn').style.color = STATE.pcVoiceEnabled ? '#A8C7FA' : '#C4C7C5';
}

function speakNative(text) {
  const uttr = new SpeechSynthesisUtterance(text);
  uttr.lang = 'ja-JP';
  window.speechSynthesis.speak(uttr);
}

function togglePcMic() {
    alert("PCマイク機能は、Chrome Native APIを使用します（実装準備中）");
}

/* Utils */
function blobToBase64(blob) {
  return new Promise((resolve, _) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result.split(',')[1]);
    reader.readAsDataURL(blob);
  });
}

function playAudioBase64(base64String) {
    const audio = new Audio("data:audio/mp3;base64," + base64String);
    audio.play();
}

// Sidebar toggle
function toggleSidebar(show) {
    const panel = document.getElementById('sidebar-panel');
    const overlay = document.getElementById('sidebar-overlay');
    if (show) {
        panel.classList.add('open');
        overlay.classList.add('active');
    } else {
        panel.classList.remove('open');
        overlay.classList.remove('active');
    }
}

function openSettingsModal() {
    document.getElementById('settings-modal').style.display = 'flex';
}

function closeSettingsModal(e) {
    if (e.target.id === 'settings-modal') {
        document.getElementById('settings-modal').style.display = 'none';
    }
}
