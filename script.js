const APPS_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbx48HlsMtnLRuJTLSp4irZUKKiMAb9FDKakSp_azx1zBj8-t_V_dufL8TQH74Ch40R8fw/exec';

const IMAGE_BASE_URL =
  'https://plantchecksheet.github.io/WhatnotBreakOverlay/images/pokemon/';

const DATA_REFRESH_INTERVAL = 2000;
const SLIDE_DURATION = 20000;
const SPOTS_PER_SLIDE = 6;

let availableSpots = [];
let currentPage = 0;
let slideTimer = null;
let requestNumber = 0;
let lastDataSignature = '';

function requestBreakData() {
  requestNumber += 1;

  const oldScript = document.getElementById('break-data-request');

  if (oldScript) {
    oldScript.remove();
  }

  const script = document.createElement('script');
  script.id = 'break-data-request';

  const separator = APPS_SCRIPT_URL.includes('?') ? '&' : '?';

  script.src =
    APPS_SCRIPT_URL +
    separator +
    'callback=receiveBreakData' +
    '&request=' +
    requestNumber +
    '&timestamp=' +
    Date.now();

  script.onerror = function () {
    showError(
      'Could not connect to Google Sheets. Check the Apps Script URL and deployment permissions.'
    );
  };

  document.body.appendChild(script);
}

function receiveBreakData(response) {
  if (!response || response.success !== true) {
    showError(
      response?.error || 'Google Sheets returned an unknown error.'
    );
    return;
  }

  hideError();

  const newAvailableSpots = (response.spots || []).filter(function (spot) {
    const status = String(spot.status || '')
      .trim()
      .toLowerCase();

    return status === 'available';
  });

  const newSignature = JSON.stringify(
    newAvailableSpots.map(function (spot) {
      return [
        spot.pokemon,
        spot.status,
        spot.imageName
      ];
    })
  );

  if (newSignature !== lastDataSignature) {
    availableSpots = newAvailableSpots;
    lastDataSignature = newSignature;

    const pageCount = getPageCount();

    if (currentPage >= pageCount) {
      currentPage = 0;
    }

    showCurrentPage(false);
  }
}

function getPageCount() {
  return Math.max(
    1,
    Math.ceil(availableSpots.length / SPOTS_PER_SLIDE)
  );
}

function showCurrentPage(animate) {
  const overlay = document.getElementById('break-overlay');

  if (animate) {
    overlay.classList.add('fade-out');

    setTimeout(function () {
      renderCurrentPage();
      overlay.classList.remove('fade-out');
      overlay.classList.add('fade-in');

      setTimeout(function () {
        overlay.classList.remove('fade-in');
      }, 700);
    }, 700);
  } else {
    renderCurrentPage();
  }
}

function renderCurrentPage() {
  const overlay = document.getElementById('break-overlay');
  overlay.innerHTML = '';

  if (availableSpots.length === 0) {
    overlay.innerHTML = `
      <div class="all-spots-taken">
        ALL SPOTS TAKEN
      </div>
    `;
    return;
  }

  const startIndex = currentPage * SPOTS_PER_SLIDE;
  const endIndex = startIndex + SPOTS_PER_SLIDE;

  const pageSpots = availableSpots.slice(
    startIndex,
    endIndex
  );

  pageSpots.forEach(function (spot) {
    overlay.appendChild(createSpotElement(spot));
  });
}

function createSpotElement(spot) {
  const element = document.createElement('div');
  element.className = 'pokemon-spot';

  const image = document.createElement('img');
  image.className = 'pokemon-image';
  image.alt = spot.pokemon;

  const imageUrl =
    IMAGE_BASE_URL + encodeURIComponent(spot.imageName);

  image.src = imageUrl;

  image.onerror = function () {
    image.style.display = 'none';

    const missing = document.createElement('div');
    missing.className = 'missing-image';
    missing.textContent =
      spot.pokemon + ': image not found';

    element.prepend(missing);
  };

  const name = document.createElement('div');
  name.className = 'pokemon-name';
  name.textContent = spot.pokemon;

  element.appendChild(image);
  element.appendChild(name);

  return element;
}

function advanceSlide() {
  const pageCount = getPageCount();

  if (pageCount <= 1) {
    currentPage = 0;
    return;
  }

  currentPage = (currentPage + 1) % pageCount;
  showCurrentPage(true);
}

function showError(message) {
  const errorBox = document.getElementById('error-message');
  errorBox.textContent = message;
  errorBox.style.display = 'block';
}

function hideError() {
  document.getElementById(
    'error-message'
  ).style.display = 'none';
}

requestBreakData();

setInterval(
  requestBreakData,
  DATA_REFRESH_INTERVAL
);

slideTimer = setInterval(
  advanceSlide,
  SLIDE_DURATION
);
