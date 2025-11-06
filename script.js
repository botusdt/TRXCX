// Navigation Control
const tabs = document.querySelectorAll('.tab');
const navBtns = document.querySelectorAll('.nav-btn');

navBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    navBtns.forEach(b => b.classList.remove('active'));
    tabs.forEach(tab => tab.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(btn.dataset.target).classList.add('active');
  });
});

// Mining Function
const startMining = document.getElementById('startMining');
const status = document.getElementById('mine-status');
const timerDisplay = document.getElementById('timer');
let mining = false;
let timeLeft = 7200;

startMining.addEventListener('click', () => {
  if (mining) return;
  mining = true;
  status.textContent = "Mining started...";
  const interval = setInterval(() => {
    if (timeLeft <= 0) {
      clearInterval(interval);
      status.textContent = "✅ Mining Complete! You earned 5 TRX";
      mining = false;
    } else {
      timeLeft--;
      const h = String(Math.floor(timeLeft / 3600)).padStart(2, "0");
      const m = String(Math.floor((timeLeft % 3600) / 60)).padStart(2, "0");
      const s = String(timeLeft % 60).padStart(2, "0");
      timerDisplay.textContent = `Time left: ${h}:${m}:${s}`;
    }
  }, 1000);
});

// Copy Invite
document.getElementById('copyLink').addEventListener('click', () => {
  const link = document.getElementById('inviteLink');
  navigator.clipboard.writeText(link.value);
  alert('✅ Invite link copied successfully!');
});

// Convert TRX
document.getElementById('convertBtn').addEventListener('click', () => {
  alert('🔄 Conversion complete: TRX → USDT');
});

// Withdraw
document.getElementById('withdrawBtn').addEventListener('click', () => {
  alert('💸 Withdrawal request submitted successfully!');
});

// VIP
document.getElementById('submitVip').addEventListener('click', () => {
  alert('⭐ VIP activation request sent for review!');
});
