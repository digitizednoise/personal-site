const DOWNLOAD_BORDER_BEATS = [
  'downloadBorderBeatOne',
  'downloadBorderBeatTwo',
  'downloadBorderBeatThree',
];

function shuffle(items) {
  const shuffledItems = [...items];
  for (let index = shuffledItems.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffledItems[index], shuffledItems[randomIndex]] = [
      shuffledItems[randomIndex],
      shuffledItems[index],
    ];
  }
  return shuffledItems;
}

function createNextSequence(previousSequence) {
  let nextSequence = shuffle(DOWNLOAD_BORDER_BEATS).join(',');
  for (let attempt = 0; attempt < 7 && nextSequence === previousSequence; attempt += 1) {
    nextSequence = shuffle(DOWNLOAD_BORDER_BEATS).join(',');
  }
  return nextSequence;
}

export function initDownloadAnimations(root = document) {
  const downloads = root.querySelector('.downloads');
  const links = [...(downloads?.querySelectorAll('.downloadLink') ?? [])];
  if (!downloads || links.length !== DOWNLOAD_BORDER_BEATS.length) return null;

  let currentSequence = '';
  let sequenceIsChanging = false;

  function applyNextSequence() {
    currentSequence = createNextSequence(currentSequence);
    currentSequence.split(',').forEach((animationName, index) => {
      links[index].style.setProperty('--download-border-sequence', animationName);
    });
  }

  downloads.addEventListener('animationiteration', (event) => {
    const isBorderBeat = DOWNLOAD_BORDER_BEATS.includes(event.animationName);
    if (!isBorderBeat || event.pseudoElement !== '::before' || sequenceIsChanging) return;

    sequenceIsChanging = true;
    applyNextSequence();
    requestAnimationFrame(() => {
      sequenceIsChanging = false;
    });
  });

  applyNextSequence();
  return { refresh: applyNextSequence };
}

initDownloadAnimations();
