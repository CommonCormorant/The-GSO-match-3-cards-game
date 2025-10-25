
document.body.addEventListener('dblclick', function(event) {
    event.preventDefault();
});

const APP_STORAGE_KEY = 'SUIT_SCRAMBLE_GAME_1997';
const COLS = 6;
const ROWS = 9;

const gameBoard = document.getElementById('game-board');
const scoreValueEl = document.getElementById('score-value');
const grantValueEl = document.getElementById('grant-value');
const deckCountEl = document.getElementById('deck-count');

let board = [];
let deck = [];
let deckIndex = 0;
let score = 0;
let grant = 0;
let gameMode = 'easy';
let highScores = {
    easy: [],
    poverty: [],
    entrepreneur: []
};

let selectedCard = null;
let isProcessing = false;

function getCardInfo(id) {
    const cardValue = id % 54;
    const deckId = Math.floor(id / 54);
    if (cardValue === 0) return { id, deckId, suit: 'joker', color: 'red', emoji: '🃏', isJoker: true };
    if (cardValue === 53) return { id, deckId, suit: 'joker', color: 'black', emoji: '🃏', isJoker: true };

    let suit, color, emoji;
    const suitIndex = Math.floor((cardValue - 1) / 13);
    switch(suitIndex) {
        case 0: suit = 'clubs'; color = 'black'; emoji = '♣️'; break;
        case 1: suit = 'diamonds'; color = 'red'; emoji = '♦️'; break;
        case 2: suit = 'hearts'; color = 'red'; emoji = '♥️'; break;
        case 3: suit = 'spades'; color = 'black'; emoji = '♠️'; break;
    }
    return { id, deckId, suit, color, emoji, isJoker: false };
}

function createDecks() {
    const shuffleDeck = (deck) => {
        for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [deck[i], deck[j]] = [deck[j], deck[i]];
        }
        return deck;
    };

    const createSingleDeck = (deckIndex) => Array.from({ length: 54 }, (_, i) => i + deckIndex * 54);

    const deck1 = shuffleDeck(createSingleDeck(0));
    const deck2 = shuffleDeck(createSingleDeck(1));
    const deck3 = shuffleDeck(createSingleDeck(2));

    const combinedDeck = [...deck1, ...deck2, ...deck3];
    return combinedDeck.map(id => getCardInfo(id));
}


function switchScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
}

function startGame(mode) {
    gameMode = mode;
    switch (mode) {
        case 'easy': grant = 120; break;
        case 'poverty': grant = 20; break;
        case 'entrepreneur': grant = 7; break;
    }
    score = 0;
    selectedCard = null;
    isProcessing = true;
    deckIndex = 0;

    deck = createDecks();
    board = Array.from({ length: ROWS }, () => Array(COLS).fill(null));

    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            if (deckIndex < deck.length) {
                board[r][c] = deck[deckIndex++];
            }
        }
    }

    renderBoard();
    updateUI();
    switchScreen('game-screen');

    setTimeout(() => {
        resolveInitialMatches();
    }, 500);
}

function renderBoard() {
    gameBoard.innerHTML = '';
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            if (board[r][c]) {
                createCardElement(board[r][c], r, c);
            }
        }
    }
}

function createCardElement(cardData, r, c) {
    const cardEl = document.createElement('div');
    cardEl.classList.add('card');
    cardEl.dataset.r = r;
    cardEl.dataset.c = c;
    cardEl.dataset.suit = cardData.suit;
    cardEl.dataset.color = cardData.color;
    cardEl.innerHTML = cardData.emoji;
    cardEl.style.top = `${(r / ROWS) * 100}%`;
    cardEl.style.left = `${(c / COLS) * 100}%`;
    cardEl.style.width = `${100 / COLS}%`;
    cardEl.style.height = `${100 / ROWS}%`;

    if (r < 0) { // Animate new cards falling in
        cardEl.style.top = `-100%`;
        requestAnimationFrame(() => {
            cardEl.style.transition = 'top 0.3s ease-in';
            cardEl.style.top = `${(r / ROWS) * 100}%`;
        });
    } else {
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

function handleCardClick(event) {
    if (isProcessing) return;
    const cardEl = event.currentTarget;
    const r = parseInt(cardEl.dataset.r);
    const c = parseInt(cardEl.dataset.c);

    if (!board[r][c]) return; // Clicked on an empty space

    if (selectedCard) {
        const { r: prevR, c: prevC } = selectedCard;
        const isAdjacent = Math.abs(r - prevR) + Math.abs(c - prevC) === 1;

        document.querySelector(`.card[data-r='${prevR}'][data-c='${prevC}']`)?.classList.remove('selected');

        if (isAdjacent) {
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

    let grantCost = 0;
    if (!card1.isJoker && !card2.isJoker) {
        if (grant <= 0) {
            // No grant, but still allow the swap if it creates a match. The match logic will handle it.
        } else {
            grantCost = 1;
        }
    }

    isProcessing = true;
    await swapCards(r1, c1, r2, c2);

    const matches = findMatches();
    if (matches.size > 0) {
        grant -= grantCost;
        updateUI();
        await resolveMatches(matches, true);
    } else {
        // Invalid swap, swap back
        await new Promise(resolve => setTimeout(resolve, 200));
        await swapCards(r1, c1, r2, c2);
        isProcessing = false;
    }
}


async function swapCards(r1, c1, r2, c2) {
    [board[r1][c1], board[r2][c2]] = [board[r2][c2], board[r1][c1]];

    const el1 = document.querySelector(`.card[data-r='${r1}'][data-c='${c1}']`);
    const el2 = document.querySelector(`.card[data-r='${r2}'][data-c='${c2}']`);

    if (el1 && el2) {
        el1.style.transition = 'top 0.2s, left 0.2s';
        el2.style.transition = 'top 0.2s, left 0.2s';

        const el1Top = el1.style.top;
        const el1Left = el1.style.left;
        el1.style.top = el2.style.top;
        el1.style.left = el2.style.left;
        el2.style.top = el1Top;
        el2.style.left = el1Left;

        // Swap data attributes after animation
        await new Promise(resolve => setTimeout(resolve, 200));
        const tempR = el1.dataset.r;
        const tempC = el1.dataset.c;
        el1.dataset.r = el2.dataset.r;
        el1.dataset.c = el2.dataset.c;
        el2.dataset.r = tempR;
        el2.dataset.c = tempC;
        el1.style.transition = '';
        el2.style.transition = '';
    }
}

function findMatches() {
    const matches = new Set();

    // Horizontal check
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS - 2; c++) {
            const card1 = board[r][c];
            if (!card1) continue;
            const group = [card1];
            let k = c + 1;
            while(k < COLS && isMatch(card1, board[r][k])) {
                group.push(board[r][k]);
                k++;
            }
            if(group.length >= 3) {
                for(let i=0; i<group.length; i++) matches.add(`${r},${c+i}`);
            }
        }
    }
    // Vertical check
    for (let c = 0; c < COLS; c++) {
        for (let r = 0; r < ROWS - 2; r++) {
            const card1 = board[r][c];
            if (!card1) continue;
            const group = [card1];
            let k = r + 1;
            while(k < ROWS && isMatch(card1, board[k][c])) {
                group.push(board[k][c]);
                k++;
            }
            if(group.length >= 3) {
                for(let i=0; i<group.length; i++) matches.add(`${r+i},${c}`);
            }
        }
    }
    return matches;
}

function isMatch(card1, card2) {
    if (!card1 || !card2) return false;
    if (card1.isJoker && card2.isJoker) return card1.color === card2.color;
    if (card1.isJoker) return card1.color === card2.color;
    if (card2.isJoker) return card2.color === card1.color;
    return card1.suit === card2.suit;
}


async function resolveInitialMatches() {
    let matches = findMatches();
    while (matches.size > 0) {
        await resolveMatches(matches, false); // Not a player move, no cascade bonus
        matches = findMatches();
    }
    isProcessing = false;
    if (checkGameOver()) {
        endGame();
    }
}

async function resolveMatches(matches, isPlayerMove) {
    let cascadeScore = 0;
    let isFirstMatch = true;

    while (matches.size > 0) {
        let currentMatchScore = 0;
        if (matches.size === 3) currentMatchScore = 1;
        else if (matches.size === 4) currentMatchScore = 4;
        else if (matches.size >= 5) currentMatchScore = 20;

        score += currentMatchScore;

        if (gameMode === 'entrepreneur' && isPlayerMove) {
             if (isFirstMatch) {
                 // The direct swap match gives points but not grant
             } else {
                 cascadeScore += currentMatchScore;
             }
        }

        matches.forEach(key => {
            const [r, c] = key.split(',').map(Number);
            const cardEl = document.querySelector(`.card[data-r='${r}'][data-c='${c}']`);
            if (cardEl) cardEl.classList.add('removing');
            board[r][c] = null;
        });

        updateUI();
        await new Promise(resolve => setTimeout(resolve, 300));

        gameBoard.querySelectorAll('.removing').forEach(el => el.remove());

        await applyGravityAndRefill();

        matches = findMatches();
        isFirstMatch = false;
    }

    if (gameMode === 'entrepreneur' && cascadeScore > 0) {
        grant += Math.floor(cascadeScore / 2);
    }

    updateUI();

    if (board.every(row => row.every(card => card === null))) {
        score += 100; // Perfect clear bonus
        updateUI();
        endGame();
        return;
    }

    isProcessing = false;
    if (checkGameOver()) {
        endGame();
    }
}


async function applyGravityAndRefill() {
    // Gravity
    for (let c = 0; c < COLS; c++) {
        let emptyRow = ROWS - 1;
        for (let r = ROWS - 1; r >= 0; r--) {
            if (board[r][c]) {
                if (r !== emptyRow) {
                    board[emptyRow][c] = board[r][c];
                    board[r][c] = null;
                    const cardEl = document.querySelector(`.card[data-suit='${board[emptyRow][c].suit}'][data-color='${board[emptyRow][c].color}']`);
                     if (cardEl) {
                         const cardToMove = Array.from(gameBoard.children).find(el => el.dataset.r == r && el.dataset.c == c);
                         if(cardToMove) {
                            cardToMove.dataset.r = emptyRow;
                            cardToMove.style.transition = 'top 0.3s ease-in';
                            cardToMove.style.top = `${(emptyRow / ROWS) * 100}%`;
                         }
                    }
                }
                emptyRow--;
            }
        }
    }
    await new Promise(resolve => setTimeout(resolve, 300));

    // Refill
    for (let c = 0; c < COLS; c++) {
        for (let r = ROWS - 1; r >= 0; r--) {
            if (!board[r][c]) {
                if (deckIndex < deck.length) {
                    const newCardData = deck[deckIndex++];
                    board[r][c] = newCardData;
                    createCardElement(newCardData, r, c);
                }
            }
        }
    }
    renderBoard();
}

function hasThreeOrMoreOfAnySuit(board) {
    const suitCounts = { 'clubs': 0, 'diamonds': 0, 'hearts': 0, 'spades': 0 };
    let redJokers = 0;
    let blackJokers = 0;

    board.flat().forEach(card => {
        if (!card) return;
        if (card.isJoker) {
            if (card.color === 'red') redJokers++;
            else blackJokers++;
        } else {
            suitCounts[card.suit]++;
        }
    });

    if (suitCounts['diamonds'] + redJokers >= 3) return true;
    if (suitCounts['hearts'] + redJokers >= 3) return true;
    if (suitCounts['clubs'] + blackJokers >= 3) return true;
    if (suitCounts['spades'] + blackJokers >= 3) return true;

    return false;
}

function canAffordMove(currentGrant, board) {
    if (board.flat().some(c => c && c.isJoker)) return true;
    return currentGrant > 0;
}


function checkGameOver() {
    if (deckIndex < deck.length) return false; // Deck has cards
    if (findMatches().size > 0) return false; // Board has matches

    const canMakeMatch = hasThreeOrMoreOfAnySuit(board);
    const canAfford = canAffordMove(grant, board);

    return !canMakeMatch || !canAfford;
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
        if (gameMode === 'poverty') li.style.color = '#7CFC00';
        if (gameMode === 'entrepreneur') li.style.fontWeight = 'bold';
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
        const loadedScores = JSON.parse(saved);
        // Ensure the structure is correct
        if (loadedScores.easy && loadedScores.poverty && loadedScores.entrepreneur) {
            highScores = loadedScores;
        }
    }
    displayAllHighScores();
}

document.querySelectorAll('.mode-selection .btn').forEach(button => {
    button.addEventListener('click', () => startGame(button.dataset.mode));
});

document.getElementById('play-again-btn').addEventListener('click', () => {
    switchScreen('start-screen');
    displayAllHighScores();
});

window.addEventListener('load', loadHighScores);
