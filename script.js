const proposalStage = document.getElementById('proposalStage');
const hurrayStage   = document.getElementById('hurrayStage');
const errorStage    = document.getElementById('errorStage');
const yesBtn        = document.getElementById('yesBtn');
const noBtn         = document.getElementById('noBtn');
const continueBtn   = document.getElementById('continueBtn');

// Yes button → show Hurray stage
yesBtn.addEventListener('click', () => {
  proposalStage.classList.add('hidden');
  hurrayStage.classList.remove('hidden');
});

// No button → smoothly move to random spot
noBtn.addEventListener('click', () => {
  const maxX = window.innerWidth - noBtn.offsetWidth;
  const maxY = window.innerHeight - noBtn.offsetHeight;
  const newX = Math.random() * maxX;
  const newY = Math.random() * maxY;

  noBtn.style.position = 'fixed';
  noBtn.style.transition = 'left 0.6s ease, top 0.6s ease';
  noBtn.style.left = `${newX}px`;
  noBtn.style.top  = `${newY}px`;
});

// Continue button → silly error stage
continueBtn.addEventListener('click', () => {
  hurrayStage.classList.add('hidden');
  errorStage.classList.remove('hidden');
});