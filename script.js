const APPS_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbx48HlsMtnLRuJTLSp4irZUKKiMAb9FDKakSp_azx1zBj8-t_V_dufL8TQH74Ch40R8fw/exec';

const IMAGE_BASE_URL =
  'https://plantchecksheet.github.io/WhatnotBreakOverlay/images/pokemon/';

const DATA_REFRESH_INTERVAL = 5000;
const SLIDE_DURATION = 20000;
const SPOTS_PER_SLIDE = 6;
const REQUEST_TIMEOUT = 12000;
const FAILURES_BEFORE_ERROR = 3;

let availableSpots = [];
let currentPage = 0;
let slideTimer = null;
let requestNumber = 0;
let lastDataSignature = '';

let requestInProgress = false;
let failedRequests = 0;
let activeRequestId = null;
let activeRequestTimeout = null;

function requestBreakData() {
  if (requestInProgress) {
    return;
  }

  requestInProgress = true;
  requestNumber += 1;

  const script = document.createElement('script');
  const scriptId = 'break-data-request-' + requestNumber;

  activeRequestId = scriptId;
  script.id = scriptId;

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
    finishCurrentRequest();

    failedRequests += 1;

    if (failedRequests >= FAILURES_BEFORE_ERROR) {
      showError(
        'Google Sheets connection temporarily unavailable. Retrying automatically…'
      );
    }
  };

  document.body.appendChild(script);

  activeRequestTimeout = setTimeout(function () {
    const activeScript = document.getElementById(scriptId);

    if (activeScript) {
      activeScript.remove();
    }

    if (activeRequestId === scriptId) {
      requestInProgress = false;
      activeRequestId = null;
      activeRequestTimeout = null;

      failedRequests += 1;

      if (failedRequests >= FAILURES_BEFORE_ERROR) {
        showError(
          'Google Sheets connection temporarily unavailable. Retrying automatically…'
        );
      }
    }
  }, REQUEST_TIMEOUT);
}

function receiveBreakData(response) {
  finishCurrentRequest();

  if (!response || response.success !== true) {
    failedRequests += 1;

    if (failedRequests >= FAILURES_BEFORE_ERROR) {
      showError(
        response?.error ||
          'Google Sheets connection temporarily unavailable. Retrying automatically…'
      );
    }

    return;
  }

  failedRequests = 0;
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

    updateSpotsRemaining();

    const pageCount = getPageCount();

    if (currentPage >= pageCount) {
      currentPage = 0;
    }

    showCurrentPage(false);
  }
}

function finishCurrentRequest() {
  if (activeRequestTimeout) {
    clearTimeout(activeRequestTimeout);
    activeRequestTimeout = null;
  }

  if (activeRequestId) {
    const script = document.getElementById(activeRequestId);

    if (script) {
      script.remove();
    }

    activeRequestId = null;
  }

  requestInProgress = false;
}



function getPageCount() {
  return Math.max(
    1,
    Math.ceil(availableSpots.length / SPOTS_PER_SLIDE)
  );
}

function showCurrentPage(animate) {
  const overlay = document.getElementById('break-overlay');

  if (!overlay) {
    return;
  }

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

  if (!overlay) {
    return;
  }

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

  const pokemonName = String(
    spot.pokemon || ''
  ).trim();

  const normalisedName = pokemonName.toLowerCase();

  const isMegaGengar =
    normalisedName.includes('mega gengar');

  if (isMegaGengar) {
    element.classList.add('chase-card');

    const badge = document.createElement('div');
    badge.className = 'chase-badge';
    badge.textContent = 'CHASE CARD';

    element.appendChild(badge);
  }

  const image = document.createElement('img');
  image.className = 'pokemon-image';
  image.alt = pokemonName;

  const imageName = String(
    spot.imageName || ''
  ).trim();

  const imageUrl =
    IMAGE_BASE_URL + encodeURIComponent(imageName);

  image.src = imageUrl;

  image.onerror = function () {
    image.style.display = 'none';

    const existingMissing =
      element.querySelector('.missing-image');

    if (!existingMissing) {
      const missing = document.createElement('div');
      missing.className = 'missing-image';
      missing.textContent =
        pokemonName + ': image not found';

      element.prepend(missing);
    }
  };

  const name = document.createElement('div');
  name.className = 'pokemon-name';
  name.textContent = pokemonName;

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

  if (!errorBox) {
    return;
  }

  errorBox.textContent = message;
  errorBox.style.display = 'block';
}

function hideError() {
  const errorBox = document.getElementById('error-message');

  if (!errorBox) {
    return;
  }

  errorBox.style.display = 'none';
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
