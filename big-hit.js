const CONFETTI_AMOUNT = 110;

const confettiColours = [
  '#ffe600',
  '#ff00dc',
  '#8d00ff',
  '#ffffff',
  '#00ddff',
  '#ff5b00'
];

function createConfetti() {
  const container =
    document.getElementById('confetti-container');

  if (!container) {
    return;
  }

  for (let i = 0; i < CONFETTI_AMOUNT; i += 1) {
    const piece = document.createElement('div');

    piece.className = 'confetti-piece';

    piece.style.left =
      Math.random() * 100 + '%';

    piece.style.background =
      confettiColours[
        Math.floor(
          Math.random() * confettiColours.length
        )
      ];

    piece.style.animationDuration =
      2.8 + Math.random() * 3.2 + 's';

    piece.style.animationDelay =
      Math.random() * 1.4 + 's';

    piece.style.transform =
      'rotate(' + Math.random() * 360 + 'deg)';

    container.appendChild(piece);
  }
}

createConfetti();
