import React, { useState, useEffect } from 'react';
import { Shuffle } from 'lucide-react';

const CardMatch3Game = () => {
  const [gameState, setGameState] = useState('menu'); // menu, playing, finished, gameOver
  const [mode, setMode] = useState(null);
  const [deck, setDeck] = useState([]);
  const [board, setBoard] = useState([]);
  const [score, setScore] = useState(0);
  const [finalScore, setFinalScore] = useState(0);
  const [grant, setGrant] = useState(0);
  const [selectedCard, setSelectedCard] = useState(null);
  const [deckIndex, setDeckIndex] = useState(0);
  const [highScores, setHighScores] = useState(() => {
    const savedHighScores = localStorage.getItem('highScores');
    return savedHighScores ? JSON.parse(savedHighScores) : {
      easy: [],
      poverty: [],
      entrepreneur: []
    };
  });

  useEffect(() => {
    localStorage.setItem('highScores', JSON.stringify(highScores));
  }, [highScores]);
  const [isProcessing, setIsProcessing] = useState(false);

  const SUITS = ['♣', '♦', '♥', '♠'];
  const SUIT_COLORS = { '♣': 'black', '♦': 'red', '♥': 'red', '♠': 'black' };

  const createDeck = () => {
    const createSingleDeck = (deckIndex) => {
      const cards = [];
      cards.push({ id: 0 + deckIndex * 54, suit: 'JOKER', color: 'red', rank: 0 });
      for (let s = 0; s < 4; s++) {
        for (let r = 1; r <= 13; r++) {
          cards.push({
            id: s * 13 + r + deckIndex * 54,
            suit: SUITS[s],
            color: SUIT_COLORS[SUITS[s]],
            rank: r
          });
        }
      }
      cards.push({ id: 53 + deckIndex * 54, suit: 'JOKER', color: 'black', rank: 0 });
      return cards;
    };

    const shuffleDeck = (deck) => {
      for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
      }
      return deck;
    };

    const deck1 = shuffleDeck(createSingleDeck(0));
    const deck2 = shuffleDeck(createSingleDeck(1));
    const deck3 = shuffleDeck(createSingleDeck(2));

    return [...deck1, ...deck2, ...deck3];
  };

  const startGame = (selectedMode) => {
    const newDeck = createDeck();
    const initialBoard = Array(9).fill(null).map(() => Array(6).fill(null));
    
    // Fill initial board
    let idx = 0;
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 6; c++) {
        if (idx < newDeck.length) {
          initialBoard[r][c] = newDeck[idx];
          idx++;
        }
      }
    }
    
    setMode(selectedMode);
    setDeck(newDeck);
    setBoard(initialBoard);
    setDeckIndex(idx);
    setScore(0);
    setGrant(selectedMode === 'easy' ? 120 : selectedMode === 'poverty' ? 20 : 7);
    setSelectedCard(null);
    setGameState('playing');
    
    // Check for initial matches after a brief delay
    setTimeout(() => checkAndRemoveMatches(initialBoard, newDeck, idx, 0, selectedMode === 'easy' ? 120 : selectedMode === 'poverty' ? 20 : 7, true), 300);
  };

  const findMatches = (board) => {
    const matches = new Set();
    const rows = board.length;
    const cols = board[0].length;

    // Check horizontal matches
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols - 2; c++) {
        if (!board[r][c] || board[r][c].suit === 'EMPTY') continue;
        
        const suit = board[r][c].suit;
        const color = board[r][c].color;
        let matchCount = 1;
        let matchCells = [[r, c]];
        
        for (let i = c + 1; i < cols; i++) {
          if (!board[r][i] || board[r][i].suit === 'EMPTY') break;
          const currentSuit = board[r][i].suit;
          const currentColor = board[r][i].color;
          
          // Jokers only match their own color
          if (currentSuit === suit) {
            matchCount++;
            matchCells.push([r, i]);
          } else if (currentSuit === 'JOKER' && suit !== 'JOKER' && currentColor === color) {
            matchCount++;
            matchCells.push([r, i]);
          } else if (suit === 'JOKER' && currentSuit !== 'JOKER' && color === currentColor) {
            matchCount++;
            matchCells.push([r, i]);
          } else {
            break;
          }
        }
        
        if (matchCount >= 3) {
          matchCells.forEach(([row, col]) => matches.add(`${row},${col}`));
        }
      }
    }

    // Check vertical matches
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows - 2; r++) {
        if (!board[r][c] || board[r][c].suit === 'EMPTY') continue;
        
        const suit = board[r][c].suit;
        const color = board[r][c].color;
        let matchCount = 1;
        let matchCells = [[r, c]];
        
        for (let i = r + 1; i < rows; i++) {
          if (!board[i][c] || board[i][c].suit === 'EMPTY') break;
          const currentSuit = board[i][c].suit;
          const currentColor = board[i][c].color;
          
          // Jokers only match their own color
          if (currentSuit === suit) {
            matchCount++;
            matchCells.push([i, c]);
          } else if (currentSuit === 'JOKER' && suit !== 'JOKER' && currentColor === color) {
            matchCount++;
            matchCells.push([i, c]);
          } else if (suit === 'JOKER' && currentSuit !== 'JOKER' && color === currentColor) {
            matchCount++;
            matchCells.push([i, c]);
          } else {
            break;
          }
        }
        
        if (matchCount >= 3) {
          matchCells.forEach(([row, col]) => matches.add(`${row},${col}`));
        }
      }
    }

    return Array.from(matches).map(pos => pos.split(',').map(Number));
  };

  const countSuitCards = (board) => {
    const suitCounts = { '♣': 0, '♦': 0, '♥': 0, '♠': 0 };
    board.forEach(row => {
      row.forEach(card => {
        if (card && card.suit !== 'EMPTY' && card.suit !== 'JOKER') {
          suitCounts[card.suit]++;
        }
      });
    });
    return suitCounts;
  };

  const hasThreeOrMoreOfAnySuit = (board) => {
    const suitCounts = countSuitCards(board);
    
    // Count jokers by color
    const redJokers = board.flat().filter(c => c && c.suit === 'JOKER' && c.color === 'red').length;
    const blackJokers = board.flat().filter(c => c && c.suit === 'JOKER' && c.color === 'black').length;
    
    // Check each red suit with red jokers
    if (suitCounts['♦'] + redJokers >= 3) return true;
    if (suitCounts['♥'] + redJokers >= 3) return true;
    
    // Check each black suit with black jokers
    if (suitCounts['♣'] + blackJokers >= 3) return true;
    if (suitCounts['♠'] + blackJokers >= 3) return true;
    
    return false;
  };

  const canAffordMove = (currentGrant, board) => {
    // Check if there are any jokers (wild cards) on the board
    for (let r = 0; r < board.length; r++) {
      for (let c = 0; c < board[0].length; c++) {
        if (board[r][c] && board[r][c].suit === 'JOKER') {
          return true; // Can always move with jokers
        }
      }
    }
    return currentGrant > 0; // Otherwise need grant
  };

  const checkAndRemoveMatches = async (currentBoard, currentDeck, currentDeckIdx, currentScore, currentGrant, isCascade = false) => {
    let board = currentBoard.map(row => [...row]);
    let newScore = currentScore;
    let newGrant = currentGrant;
    let deckIdx = currentDeckIdx;
    
    let foundMatches = true;
    
    while (foundMatches) {
      const matches = findMatches(board);
      
      if (matches.length === 0) {
        foundMatches = false;
        break;
      }

      const matchScore = matches.length === 3 ? 1 : matches.length === 4 ? 4 : matches.length >= 5 ? 20 : matches.length;
      newScore += matchScore;
      
      // Entrepreneur mode: give back half the cascade score as grant
      if (mode === 'entrepreneur' && isCascade) {
        newGrant += Math.floor(matchScore / 2);
      }

      // Remove matched cards
      matches.forEach(([r, c]) => {
        board[r][c] = null;
      });

      // Apply gravity - cards fall down, fill from top
      for (let c = 0; c < 6; c++) {
        let writePos = 8;
        for (let r = 8; r >= 0; r--) {
          if (board[r][c] !== null && board[r][c].suit !== 'EMPTY') {
            if (r !== writePos) {
              board[writePos][c] = board[r][c];
              board[r][c] = null;
            }
            writePos--;
          }
        }
        
        // Fill from deck - add EMPTY cards when running low
        while (writePos >= 0) {
          if (deckIdx < currentDeck.length) {
            board[writePos][c] = currentDeck[deckIdx];
            deckIdx++;
          } else {
            // Add empty cards that don't match anything
            board[writePos][c] = { 
              id: -1, 
              suit: 'EMPTY', 
              color: 'gray', 
              rank: 0 
            };
          }
          writePos--;
        }
      }

      await new Promise(resolve => setTimeout(resolve, 300));
      setBoard([...board]);
      setScore(newScore);
      setGrant(newGrant);
      setDeckIndex(deckIdx);
      
      isCascade = true;
    }

    setIsProcessing(false);
    
    // Check if all real cards are cleared (perfect game!)
    const hasAnyRealCards = board.some(row => row.some(card => card && card.suit !== 'EMPTY'));
    
    if (!hasAnyRealCards) {
      // Perfect clear bonus!
      newScore += 100;
      setScore(newScore);
      await new Promise(resolve => setTimeout(resolve, 500));
      setGameState('finished');
      return;
    }
    
    // Check if game is over
    const allDecksEmpty = deckIdx >= currentDeck.length;
    const hasMatches = findMatches(board).length > 0;
    const canMakeMatch = hasThreeOrMoreOfAnySuit(board);
    const canAfford = canAffordMove(newGrant, board);
    
    // Game ends when: deck empty AND no matches AND (can't make matches OR can't afford moves)
    if (allDecksEmpty && !hasMatches && (!canMakeMatch || !canAfford)) {
      setGameState('finished');
    }
  };

  const swapCards = async (r1, c1, r2, c2) => {
    if (isProcessing) return;
    
    const card1 = board[r1][c1];
    const card2 = board[r2][c2];
    
    if (!card1 || !card2) return;

    // Check if swap costs grant
    const isWild1 = card1.suit === 'JOKER';
    const isWild2 = card2.suit === 'JOKER';
    
    if (!isWild1 && !isWild2) {
      if (grant <= 0) {
        alert('Not enough GRANT! Game Over.');
        setGameState('finished');
        return;
      }
      setGrant(grant - 1);
    }

    const newBoard = board.map(row => [...row]);
    newBoard[r1][c1] = card2;
    newBoard[r2][c2] = card1;
    
    setBoard(newBoard);
    setSelectedCard(null);
    setIsProcessing(true);

    setTimeout(() => {
      checkAndRemoveMatches(newBoard, deck, deckIndex, score, isWild1 || isWild2 ? grant : grant - 1, true);
    }, 200);
  };

  const handleCardClick = (r, c) => {
    if (isProcessing || !board[r][c]) return;

    if (selectedCard === null) {
      setSelectedCard({ r, c });
    } else {
      const { r: r1, c: c1 } = selectedCard;
      
      // Check if adjacent
      const isAdjacent = 
        (Math.abs(r - r1) === 1 && c === c1) ||
        (Math.abs(c - c1) === 1 && r === r1);
      
      if (isAdjacent) {
        swapCards(r1, c1, r, c);
      } else {
        setSelectedCard({ r, c });
      }
    }
  };

  const endGame = (finalScoreValue) => {
    setFinalScore(finalScoreValue);
    const newHighScores = { ...highScores };
    const modeScores = [...(newHighScores[mode] || [])];
    modeScores.push({
      date: new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }),
      score: finalScoreValue
    });
    modeScores.sort((a, b) => b.score - a.score);
    newHighScores[mode] = modeScores.slice(0, 3);
    setHighScores(newHighScores);
    setGameState('gameOver');
  };

  const handleContinue = () => {
    endGame(score + grant);
  };

  const getRankDisplay = (rank) => {
    if (rank === 1) return 'A';
    if (rank === 11) return 'J';
    if (rank === 12) return 'Q';
    if (rank === 13) return 'K';
    return rank;
  };

  if (gameState === 'menu') {
    return (
      <div className="w-full h-screen bg-gradient-to-br from-green-800 to-green-950 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md w-full">
          <h1 className="text-4xl font-bold text-center mb-2 text-green-800">Card Match-3</h1>
          <p className="text-center text-gray-600 mb-6">Match 3+ cards to score points!</p>
          
          <div className="space-y-4 mb-6">
            <button
              onClick={() => startGame('easy')}
              className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-4 px-6 rounded-lg transition"
            >
              Easy Mode
              <div className="text-sm mt-1">Start with 1️⃣2️⃣0️⃣🆓</div>
            </button>
            
            <button
              onClick={() => startGame('poverty')}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 px-6 rounded-lg transition"
            >
              Poverty Mode
              <div className="text-sm mt-1">Start with 2️⃣0️⃣🆓</div>
            </button>
            
            <button
              onClick={() => startGame('entrepreneur')}
              className="w-full bg-purple-500 hover:bg-purple-600 text-white font-bold py-4 px-6 rounded-lg transition"
            >
              Entrepreneur Mode
              <div className="text-sm mt-1">Start with 7️⃣🆓 (earn back half cascade score)</div>
            </button>
          </div>

          <div className="border-t pt-4">
            <h3 className="font-bold text-center mb-2">Top 3 High Scores</h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <h4 className="font-bold">Easy</h4>
                {highScores.easy.map((hs, idx) => (
                  <div key={idx} className="text-sm text-gray-700">
                    {hs.date}: {hs.score}
                  </div>
                ))}
              </div>
              <div>
                <h4 className="font-bold text-green-700">Poverty</h4>
                {highScores.poverty.map((hs, idx) => (
                  <div key={idx} className="text-sm text-green-700">
                    {hs.date}: {hs.score}
                  </div>
                ))}
              </div>
              <div>
                <h4 className="font-black">Entrepreneur</h4>
                {highScores.entrepreneur.map((hs, idx) => (
                  <div key={idx} className="text-sm font-black">
                    {hs.date}: {hs.score}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (gameState === 'gameOver') {
    return (
      <div className="w-full h-screen bg-gradient-to-br from-green-800 to-green-950 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md w-full text-center">
          <h1 className="text-4xl font-bold mb-4 text-green-800">Game Over!</h1>
          <p className="text-6xl font-bold text-green-600 mb-6">{finalScore}</p>
          
          <div className="border-t border-b py-4 mb-6">
            <h3 className="font-bold mb-2">Top 3 High Scores ({mode})</h3>
            {(highScores[mode] || []).map((hs, idx) => (
              <div key={idx} className="text-sm text-gray-700">
                {hs.date}: {hs.score}
              </div>
            ))}
          </div>

          <button
            onClick={() => setGameState('menu')}
            className="bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-8 rounded-lg transition"
          >
            Play Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-green-800 to-green-950 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-xl p-4 mb-4">
          <div className="flex justify-between items-center">
            <div className="text-xl font-bold">
              Score: <span className="text-purple-600">{score}</span>
            </div>
            <div className="text-xl font-bold">
              🆓 {grant}
            </div>
            <div className="text-sm text-gray-600">
              Cards Left: {Math.max(0, deck.length - deckIndex)}
            </div>
          </div>
          <div className="text-xs text-center mt-2 text-gray-500 capitalize">
            {mode} Mode
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-700 to-green-900 rounded-lg p-4 shadow-xl">
          <div className="grid grid-cols-6 gap-2">
            {board.map((row, r) => 
              row.map((card, c) => (
                <div
                  key={`${r}-${c}`}
                  onClick={() => handleCardClick(r, c)}
                  className={`
                    aspect-[2/3] rounded-lg flex items-center justify-center cursor-pointer
                    transition-all duration-200 text-2xl font-bold
                    ${card ? 'bg-white hover:scale-105 shadow-md' : 'bg-green-800 bg-opacity-30'}
                    ${selectedCard?.r === r && selectedCard?.c === c ? 'ring-4 ring-yellow-400 scale-105' : ''}
                    ${card?.suit === 'JOKER' ? 'bg-gradient-to-br from-yellow-200 to-yellow-400' : ''}
                    ${card?.suit === 'EMPTY' ? 'bg-gray-300' : ''}
                  `}
                >
                  {card && (
                    <div className={`${card.color === 'red' ? 'text-red-600' : card.color === 'gray' ? 'text-gray-400' : 'text-black'}`}>
                      {card.suit === 'JOKER' ? '🃏' : card.suit === 'EMPTY' ? '∅' : (
                        <div className="flex flex-col items-center">
                          <div className="text-xs">{getRankDisplay(card.rank)}</div>
                          <div>{card.suit}</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="text-center mt-4 text-white text-sm">
          Tap a card, then tap an adjacent card to swap • Jokers match their own color
        </div>

        {gameState === 'finished' && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md w-full text-center">
              <h2 className="text-3xl font-bold mb-4 text-green-800">Game Finished!</h2>
              {score >= 100 && !board.some(row => row.some(card => card && card.suit !== 'EMPTY')) && (
                <div className="text-2xl font-bold text-yellow-500 mb-4">🎉 PERFECT CLEAR! +100 BONUS 🎉</div>
              )}
              <p className="text-xl mb-2">Final Score: <span className="text-purple-600 font-bold">{score}</span></p>
              <p className="text-lg mb-6">Remaining GRANT: <span className="font-bold">{grant}</span></p>
              <p className="text-2xl font-bold text-green-600 mb-6">Total: {score + grant}</p>
              <button
                onClick={handleContinue}
                className="bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-8 rounded-lg transition"
              >
                Continue →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CardMatch3Game;