const APPS_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbx48HlsMtnLRuJTLSp4irZUKKiMAb9FDKakSp_azx1zBj8-t_V_dufL8TQH74Ch40R8fw/exec';

const IMAGE_BASE_URL =
  'https://plantchecksheet.github.io/WhatnotBreakOverlay/images/pokemon/';

const REFRESH_INTERVAL = 2000;

let previousStatuses = {};
let requestNumber = 0;

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
  renderBreakSpots(response.spots || []);
}

function renderBreakSpots(spots) {
  const overlay = document.getElementById('break-overlay');

  const activePokemon = spots.map(spot => spot.pokemon);

  Array.from(overlay.children).forEach(element => {
    if (!activePokemon.includes(element.dataset.pokemon)) {
      element.remove();
    }
  });

  spots.forEach(spot => {
    let element = Array.from(overlay.children).find(
      item => item.dataset.pokemon === spot.pokemon
    );

    if (!element) {
      element = createSpotElement(spot);
      overlay.appendChild(element);
    }

    updateSpotElement(element, spot);
  });
}

function createSpotElement(spot) {
  const element = document.createElement('div');
  element.className = 'pokemon-spot';
  element.dataset.pokemon = spot.pokemon;

  const image = document.createElement('img');
  image.className = 'pokemon-image';
  image.alt = spot.pokemon;

  image.onerror = function () {
    image.style.display = 'none';

    if (!element.querySelector('.missing-image')) {
      const message = document.createElement('div');
      message.className = 'missing-image';
      message.textContent =
        `${spot.pokemon}: image not found`;

      element.prepend(message);
    }
  };

  const name = document.createElement('div');
  name.className = 'pokemon-name';
  name.textContent = spot.pokemon;

  const banner = document.createElement('div');
  banner.className = 'spot-taken-banner';
  banner.textContent = 'SPOT TAKEN';

  element.appendChild(image);
  element.appendChild(name);
  element.appendChild(banner);

  return element;
}

function updateSpotElement(element, spot) {
  const image = element.querySelector('.pokemon-image');
  const name = element.querySelector('.pokemon-name');

  const imageUrl =
    IMAGE_BASE_URL + encodeURIComponent(spot.imageName);

  const currentImageUrl =
    image.getAttribute('data-image-url');

  if (currentImageUrl !== imageUrl) {
    image.setAttribute('data-image-url', imageUrl);
    image.src = imageUrl;
    image.style.display = 'block';

    const missingImage =
      element.querySelector('.missing-image');

    if (missingImage) {
      missingImage.remove();
    }
  }

  name.textContent = spot.pokemon;

  const normalisedStatus =
    String(spot.status || '').trim().toLowerCase();

  const isTaken =
    normalisedStatus === 'spot taken' ||
    normalisedStatus === 'sold' ||
    normalisedStatus === 'taken';

  const previousStatus =
    previousStatuses[spot.pokemon];

  element.classList.toggle('spot-taken', isTaken);

  if (
    previousStatus !== undefined &&
    previousStatus !== normalisedStatus &&
    isTaken
  ) {
    restartBannerAnimation(element);
  }

  previousStatuses[spot.pokemon] = normalisedStatus;
}

function restartBannerAnimation(element) {
  const banner =
    element.querySelector('.spot-taken-banner');

  banner.style.animation = 'none';
  void banner.offsetWidth;
  banner.style.animation = '';
}

function showError(message) {
  const errorBox =
    document.getElementById('error-message');

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
  REFRESH_INTERVAL
);
