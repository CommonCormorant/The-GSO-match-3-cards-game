
document.body.addEventListener('dblclick', function(event) {
    event.preventDefault();
});

const APP_STORAGE_KEY = 'SUIT_SCRAMBLE_GAME_1997';
const COLS = 6;
const ROWS = 9;

// DOM Elements
const gameBoard = document.getElementById('game-board');
const scoreValueEl = document.getElementById('score-value');
const grantValueEl = document.getElementById('grant-value');
const deckCountEl = document.getElementById('deck-count');

// Game State
let board = [];
let deck = [];
let deckIndex = 0;
let score = 0;
let grant = 0;
let gameMode = 'easy';
let highScores = { easy: [], poverty: [], entrepreneur: [] };
let selectedCard = null;
let isProcessing = false;

// --- Card & Deck Logic ---

function getCardInfo(id) {
    const cardValue = id % 54;
    const deckId = Math.floor(id / 54);
    if (cardValue === 0) return { id, deckId, suit: 'joker', color: 'red', emoji: '🃏', isJoker: true };
    if (cardValue === 53) return { id, deckId, suit: 'joker', color: 'black', emoji: '🃏', isJoker: true };

    const suitIndex = Math.floor((cardValue - 1) / 13);
    const suits = [{s:'clubs',c:'black',e:'♣️'}, {s:'diamonds',c:'red',e:'♦️'}, {s:'hearts',c:'red',e:'♥️'}, {s:'spades',c:'black',e:'♠️'}];
    const suitInfo = suits[suitIndex];
    return { id, deckId, suit: suitInfo.s, color: suitInfo.c, emoji: suitInfo.e, isJoker: false };
}

function createDecks() {
    const shuffle = (deck) => {
        for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [deck[i], deck[j]] = [deck[j], deck[i]];
        }
        return deck;
    };
    const createSingleDeck = (idx) => Array.from({ length: 54 }, (_, i) => i + idx * 54);

    const d1 = shuffle(createSingleDeck(0));
    const d2 = shuffle(createSingleDeck(1));
    const d3 = shuffle(createSingleDeck(2));

    return [...d1, ...d2, ...d3].map(id => getCardInfo(id));
}

// --- Game Flow & Initialization ---

function switchScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
}

function startGame(mode) {
    gameMode = mode;
    grant = { easy: 120, poverty: 20, entrepreneur: 7 }[mode];
    score = 0;
    selectedCard = null;
    isProcessing = true;
    deckIndex = 0;

    deck = createDecks();
    board = Array.from({ length: ROWS }, () => Array(COLS).fill(null));

    let cardIdx = 0;
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            if (cardIdx < deck.length) {
                board[r][c] = deck[cardIdx++];
            }
        }
    }
    deckIndex = cardIdx;

    renderInitialBoard();
    updateUI();
    switchScreen('game-screen');

    setTimeout(() => resolveInitialMatches(), 500);
}

// --- Rendering & DOM Manipulation ---

function renderInitialBoard() {
    gameBoard.innerHTML = '';
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            if (board[r][c]) {
                createCardElement(board[r][c], r, c);
            }
        }
    }
}

function createCardElement(cardData, r, c, isNew = false) {
    const cardEl = document.createElement('div');
    cardEl.classList.add('card');
    if (cardData.suit === 'empty') {
        cardEl.classList.add('empty');
    }
    cardEl.dataset.id = cardData.id;
    cardEl.dataset.r = r;
    cardEl.dataset.c = c;
    cardEl.dataset.suit = cardData.suit;
    cardEl.dataset.color = cardData.color;
    cardEl.innerHTML = cardData.emoji;

    const top = (r / ROWS) * 100;
    const left = (c / COLS) * 100;
    cardEl.style.width = `${100 / COLS}%`;
    cardEl.style.height = `${100 / ROWS}%`;
    cardEl.style.left = `${left}%`;

    if (isNew) {
        cardEl.style.top = `-100%`;
        requestAnimationFrame(() => {
            cardEl.style.transition = 'top 0.4s ease-in';
            cardEl.style.top = `${top}%`;
        });
    } else {
        cardEl.style.top = `${top}%`;
        cardEl.style.animation = 'popIn 0.5s ease-out forwards';
    }

    cardEl.addEventListener('click', handleCardClick);
    gameBoard.appendChild(cardEl);
    return cardEl;
}

function updateUI() {
    scoreValueEl.textContent = score;
    grantValueEl.textContent = grant;
    deckCountEl.textContent = Math.max(0, deck.length - deckIndex);
}

// --- Player Interaction ---

function handleCardClick(event) {
    if (isProcessing) return;
    const cardEl = event.currentTarget;
    const r = parseInt(cardEl.dataset.r);
    const c = parseInt(cardEl.dataset.c);
    const card = board[r][c];

    if (!card) return;

    if (selectedCard) {
        const { r: prevR, c: prevC } = selectedCard;
        document.querySelector(`.card[data-r='${prevR}'][data-c='${prevC}']`)?.classList.remove('selected');

        if (Math.abs(r - prevR) + Math.abs(c - prevC) === 1) {
            attemptSwap(r, c, prevR, prevC);
        }
        selectedCard = null;
    } else {
        selectedCard = { r, c };
        cardEl.classList.add('selected');
    }
}

async function attemptSwap(r1, c1, r2, c2) {
    const card1 = board[r1][c1];
    const card2 = board[r2][c2];
    const isJokerMove = card1.isJoker || card2.isJoker;

    if (!isJokerMove && grant <= 0) {
        return;
    }

    isProcessing = true;

    if (!isJokerMove) {
        grant--;
        updateUI();
    }

    await swapCardsUI(r1, c1, r2, c2);

    const matches = findMatches(board);
    if (matches.length > 0) {
        await resolveMatches(matches, true);
    } else {
        isProcessing = false;
        if(checkGameOver()) endGame();
    }
}

async function swapCardsUI(r1, c1, r2, c2) {
    [board[r1][c1], board[r2][c2]] = [board[r2][c2], board[r1][c1]];

    const el1 = Array.from(gameBoard.children).find(el => el.dataset.r == r1 && el.dataset.c == c1);
    const el2 = Array.from(gameBoard.children).find(el => el.dataset.r == r2 && el.dataset.c == c2);

    if (el1 && el2) {
        el1.style.transition = 'top 0.2s, left 0.2s';
        el2.style.transition = 'top 0.2s, left 0.2s';

        [el1.style.top, el2.style.top] = [el2.style.top, el1.style.top];
        [el1.style.left, el2.style.left] = [el2.style.left, el1.style.left];

        await new Promise(resolve => setTimeout(resolve, 200));
        [el1.dataset.r, el2.dataset.r] = [el2.dataset.r, el1.dataset.r];
        [el1.dataset.c, el2.dataset.c] = [el2.dataset.c, el1.dataset.c];
        el1.style.transition = '';
        el2.style.transition = '';
    }
}

// --- Match Resolution & Board Update ---

function findMatches(board) {
    const matches = new Set();
    const rows = board.length;
    const cols = board[0].length;

    const checkMatch = (firstCard, otherCard) => {
        if (!firstCard || !otherCard || firstCard.suit === 'empty' || otherCard.suit === 'empty') {
            return false;
        }
        if (otherCard.isJoker) { // If the card being checked is a joker, it's a match if colors align
            return firstCard.color === otherCard.color;
        }
        if (firstCard.isJoker) { // If the first card is a joker, the other (non-joker) card matches if colors align
            return firstCard.color === otherCard.color;
        }
        // Otherwise, for two non-jokers, suits must be the same
        return firstCard.suit === otherCard.suit;
    };

    // Check horizontal matches
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (!board[r][c] || board[r][c].suit === 'empty') continue;

            const firstCard = board[r][c];
            const horizontalMatch = [board[r][c]];
            for (let i = c + 1; i < cols; i++) {
                if (checkMatch(firstCard, board[r][i])) {
                    horizontalMatch.push(board[r][i]);
                } else {
                    break;
                }
            }
            if (horizontalMatch.length >= 3) {
                for(let i = 0; i < horizontalMatch.length; i++) {
                    matches.add(`${r},${c + i}`);
                }
            }
        }
    }

    // Check vertical matches
    for (let c = 0; c < cols; c++) {
        for (let r = 0; r < rows; r++) {
            if (!board[r][c] || board[r][c].suit === 'empty') continue;

            const firstCard = board[r][c];
            const verticalMatch = [board[r][c]];
            for (let i = r + 1; i < rows; i++) {
                 if (checkMatch(firstCard, board[i][c])) {
                    verticalMatch.push(board[i][c]);
                } else {
                    break;
                }
            }
            if (verticalMatch.length >= 3) {
                for(let i = 0; i < verticalMatch.length; i++) {
                    matches.add(`${r + i},${c}`);
                }
            }
        }
    }

    return Array.from(matches).map(pos => pos.split(',').map(Number));
}

async function resolveInitialMatches() {
    let matches;
    while ((matches = findMatches(board)).length > 0) {
        await resolveMatches(matches, false, true); // Pass true for isInitialCascade
    }
    isProcessing = false;
    if (checkGameOver()) endGame();
}

async function resolveMatches(matches, isPlayerMove, isInitialCascade = false) {
    let currentMatches = matches;
    let cascadeScore = 0;

    while (currentMatches.length > 0) {
        const scoreMap = { 3: 1, 4: 4 };
        const matchScore = scoreMap[currentMatches.length] || 20;
        score += matchScore;

        if (gameMode === 'entrepreneur' && (isInitialCascade || isPlayerMove)) {
            cascadeScore += matchScore;
        }

        currentMatches.forEach(([r, c]) => {
            const cardEl = Array.from(gameBoard.children).find(el => el.dataset.r == r && el.dataset.c == c);
            if (cardEl) cardEl.classList.add('removing');
            board[r][c] = null;
        });

        updateUI();
        await new Promise(r => setTimeout(r, 300));

        gameBoard.querySelectorAll('.removing').forEach(el => el.remove());
        await applyGravityAndRefill();

        currentMatches = findMatches(board);
    }

    if (cascadeScore > 0) {
        grant += Math.floor(cascadeScore / 2);
    }

    updateUI();

    if (board.flat().every(c => !c || c.suit === 'empty')) {
        score += 100;
        updateUI();
        endGame();
        return;
    }

    isProcessing = false;
    if (checkGameOver()) endGame();
}

async function applyGravityAndRefill() {
    const animationPromises = [];

    for (let c = 0; c < COLS; c++) {
        const column = [];
        for (let r = 0; r < ROWS; r++) {
            if (board[r][c]) {
                column.push(board[r][c]);
            }
        }

        const realCards = column.filter(card => card.suit !== 'empty');
        const emptyCards = column.filter(card => card.suit === 'empty');

        const newColumn = [
            ...emptyCards,
            ...Array(ROWS - realCards.length - emptyCards.length).fill(null),
            ...realCards
        ];

        for (let r = 0; r < ROWS; r++) {
            board[r][c] = newColumn[r];
        }
    }

    const allCardElements = Array.from(gameBoard.children);
    allCardElements.forEach(cardEl => {
        const id = cardEl.dataset.id.startsWith('empty') ? cardEl.dataset.id : parseInt(cardEl.dataset.id);
        let found = false;
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                if (board[r][c] && board[r][c].id === id) {
                    if (parseInt(cardEl.dataset.r) !== r || parseInt(cardEl.dataset.c) !== c) {
                        cardEl.dataset.r = r;
                        cardEl.dataset.c = c;
                        cardEl.style.transition = 'top 0.4s ease-in, left 0.4s ease-in';
                        cardEl.style.top = `${(r / ROWS) * 100}%`;
                        cardEl.style.left = `${(c / COLS) * 100}%`;
                        animationPromises.push(new Promise(res => {
                            const onEnd = () => { cardEl.removeEventListener('transitionend', onEnd); res(); };
                            cardEl.addEventListener('transitionend', onEnd);
                        }));
                    }
                    found = true;
                    break;
                }
            }
            if(found) break;
        }
    });

    await Promise.all(animationPromises);

    for (let c = 0; c < COLS; c++) {
        for (let r = 0; r < ROWS; r++) {
            if (board[r][c] === null) {
                const newCard = (deckIndex < deck.length)
                    ? deck[deckIndex++]
                    : { suit: 'empty', color: 'gray', emoji: '∅', id: `empty-${Date.now()}-${Math.random()}` };
                board[r][c] = newCard;
                createCardElement(newCard, r, c, true);
                await new Promise(res => setTimeout(res, 30));
            }
        }
    }

    setTimeout(() => {
        gameBoard.querySelectorAll('.card').forEach(el => el.style.transition = '');
    }, 500);

    updateUI();
}

// --- Game Over & High Score Logic ---

function checkGameOver() {
    if (deckIndex < deck.length) return false;
    if (findMatches(board).length > 0) return false;

    const hasJoker = board.flat().some(c => c && c.isJoker);
    const canAffordMove = grant > 0 || hasJoker;

    if (canAffordMove) {
        const suitCounts = { clubs:0, diamonds:0, hearts:0, spades:0 };
        let redJokers = 0, blackJokers = 0;
        board.flat().forEach(c => {
            if (!c || c.suit === 'empty') return;
            if (c.isJoker) {
                if (c.color === 'red') redJokers++;
                else blackJokers++;
            } else {
                suitCounts[c.suit]++;
            }
        });

        if (suitCounts.diamonds + redJokers >= 3) return false;
        if (suitCounts.hearts + redJokers >= 3) return false;
        if (suitCounts.clubs + blackJokers >= 3) return false;
        if (suitCounts.spades + blackJokers >= 3) return false;
    }

    return true;
}

function endGame() {
    isProcessing = true;
    const finalScore = score + grant;
    document.getElementById('final-score-value').textContent = finalScore;
    document.getElementById('game-mode-display').textContent = gameMode.charAt(0).toUpperCase() + gameMode.slice(1);

    updateHighScores(finalScore);
    displayHighScores(gameMode, document.getElementById('high-scores-list'));

    switchScreen('game-over-screen');
}

function updateHighScores(currentScore) {
    const date = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
    const modeScores = highScores[gameMode];
    modeScores.push({ score: currentScore, date });
    modeScores.sort((a, b) => b.score - a.score);
    highScores[gameMode] = modeScores.slice(0, 3);
    saveHighScores();
}

function displayHighScores(mode, listEl) {
    listEl.innerHTML = '';
    const scores = highScores[mode] || [];
    if (scores.length === 0) {
        listEl.innerHTML = '<li>No scores yet!</li>';
        return;
    }
    scores.forEach(entry => {
        const li = document.createElement('li');
        li.innerHTML = `<span>${entry.date}</span><span class="score-value">${entry.score}</span>`;
        if (mode === 'poverty') li.style.color = '#7CFC00';
        if (mode === 'entrepreneur') li.style.fontWeight = 'bold';
        listEl.appendChild(li);
    });
}

function displayAllHighScores() {
    displayHighScores('easy', document.getElementById('high-scores-list-easy'));
    displayHighScores('poverty', document.getElementById('high-scores-list-poverty'));
    displayHighScores('entrepreneur', document.getElementById('high-scores-list-entrepreneur'));
}

function saveHighScores() {
    localStorage.setItem(APP_STORAGE_KEY + '_highscores', JSON.stringify(highScores));
}

function loadHighScores() {
    const saved = localStorage.getItem(APP_STORAGE_KEY + '_highscores');
    if (saved) {
        const loaded = JSON.parse(saved);
        if (loaded.easy && loaded.poverty && loaded.entrepreneur) {
            highScores = loaded;
        }
    }
    displayAllHighScores();
}

// --- Event Listeners ---

document.querySelectorAll('.mode-selection .btn').forEach(button => {
    button.addEventListener('click', () => startGame(button.dataset.mode));
});

document.getElementById('play-again-btn').addEventListener('click', () => {
    switchScreen('start-screen');
    displayAllHighScores();
});

window.addEventListener('load', loadHighScores);
