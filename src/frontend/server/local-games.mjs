import { randomBytes, randomInt, createHash } from 'node:crypto';
import { readFileSync, writeFileSync, renameSync, existsSync } from 'node:fs';
import wordListPath from 'word-list';

const pool = {
  5: ['crane','brave','plant','flame','trust','smart','quiet','grace','light','world','fresh','dream','pride','prune','chair','apple','bread','clean','heart','sound','earth','faith','brain','court'],
  6: ['planet','garden','bridge','silver','castle','stream','forest','bright','puzzle','orange','travel','friend','bottle','winter','summer','branch','school','flower','gentle','wonder','little','cheese','rabbit','smooth'],
  7: ['journey','picture','blanket','thunder','library','morning','balance','freedom','curious','whisper','village','orchard','rainbow','teacher','kitchen','weather','bicycle','dolphin','feather','lantern','pumpkin','stretch','collect','reflect'],
};
const dictionary = new Set(readFileSync(wordListPath, 'utf8').split(/\r?\n/).filter(word => /^[a-z]{5,7}$/.test(word)));
for (const word of Object.values(pool).flat()) dictionary.add(word);
export const ANSWER_POOLS = pool;
export const acceptedWord = word => typeof word === 'string' && dictionary.has(word);
const ok = value => ({ __kind__: 'ok', ok: value });
const err = message => ({ __kind__: 'err', err: message });
const status = kind => ({ __kind__: kind, [kind]: null });
const hash = token => createHash('sha256').update(token).digest('hex');
const nano = milliseconds => BigInt(milliseconds) * 1000000n;

// Same two-pass scoring used by solo practice: reserve greens before yellows.
export function evaluateGuess(word, answer) {
  const states = Array(answer.length).fill('absent');
  const used = Array(answer.length).fill(false);
  for (let i = 0; i < answer.length; i++) if (word[i] === answer[i]) { states[i] = 'correct'; used[i] = true; }
  for (let i = 0; i < answer.length; i++) {
    if (states[i] === 'correct') continue;
    const found = [...answer].findIndex((letter, j) => !used[j] && letter === word[i]);
    if (found >= 0) { states[i] = 'present'; used[found] = true; }
  }
  return states;
}

export function createLocalGames(file) {
  let data = { version: 1, guests: {}, games: {}, offers: {} };
  if (file && existsSync(file)) {
    data = JSON.parse(readFileSync(file, 'utf8'));
    if (data.version !== 1 || !data.games || !data.guests || !data.offers) throw new Error('Unsupported local game data; preserve it before starting.');
  }
  const save = () => { if (file) { writeFileSync(file + '.tmp', JSON.stringify(data), { mode: 0o600 }); renameSync(file + '.tmp', file); } };
  const active = game => game.status === 'waiting' || game.status === 'playing';
  const sweep = () => {
    let changed = false;
    for (const game of Object.values(data.games)) if (active(game) && Date.now() - game.updated > 2 * 60 * 60 * 1000) { game.status = 'expired'; game.reason = 'timeout'; game.ended = Date.now(); changed = true; }
    if (changed) save();
  };
  const participant = (id, guest) => {
    const game = data.games[id];
    if (!game || !game.players.includes(guest)) throw new Error('Game not found or you are not a player.');
    return game;
  };
  const name = guest => data.guests[guest]?.username ?? 'Guest';
  const guessView = guess => ({ word: guess.word, states: guess.states, playerNum: BigInt(guess.player), timestamp: nano(guess.time) });
  const view = (game, guest) => {
    const index = game.players.indexOf(guest), other = 1 - index;
    const mine = game.guesses[index] ?? [], theirs = game.guesses[other] ?? [];
    let outcome = 'playing';
    if (game.status === 'won') outcome = game.mode === 'coop' || game.winner === index ? 'won' : 'opponentWon';
    else if (!active(game) || mine.length >= 6) outcome = 'lost';
    const reveal = !active(game) || (game.mode === 'versus' && mine.length >= 6);
    return { id: game.id, roomCode: game.code, wordLength: game.length, isPublic: game.public,
      playerNum: BigInt(index + 1), players: game.players.map(name), mode: game.mode, isHost: index === 0,
      status: game.status === 'won' ? { __kind__: 'won', won: BigInt(game.mode === 'coop' ? 0 : game.winner + 1) } : status(game.status),
      currentTurn: BigInt(game.turn + 1), currentTurnPlayer: name(game.players[game.turn]),
      myGuesses: mine.map(guessView), coopGuesses: game.coop.map(guessView), myOutcome: outcome,
      opponentGuessCount: BigInt(theirs.length), opponentGuessTileStates: theirs.map(guess => guess.states),
      exitReason: game.reason ?? '', ...(reveal ? { answer: game.answer } : {}),
    };
  };
  const summary = (game, guest) => {
    const full = view(game, guest);
    return { id: game.id, roomCode: game.code, mode: game.mode, players: game.players.map(name), status: full.status,
      wordLength: game.length, isPublic: game.public, createdAt: nano(game.created), waitingForMove: game.status === 'playing' && (game.mode === 'versus' || game.players[game.turn] === guest) };
  };
  const create = (guest, mode, length, publicGame, previous) => {
    if (!['versus','coop'].includes(mode) || ![5,6,7].includes(length)) throw new Error('Choose versus or co-op and 5, 6, or 7 letters.');
    let code;
    do { code = 'WORD-' + randomBytes(2).toString('hex').toUpperCase(); } while (Object.values(data.games).some(game => game.code === code));
    const answers = pool[length].filter(word => word !== previous);
    const game = { id: randomBytes(12).toString('hex'), code, invite: randomBytes(24).toString('hex'), mode, length,
      public: publicGame, players: [guest], guesses: [[],[]], coop: [], turn: 0, status: 'waiting',
      answer: answers[randomInt(answers.length)], winner: null, created: Date.now(), updated: Date.now() };
    data.games[game.id] = game; save(); return game;
  };
  const join = (guest, game) => {
    if (!game) return err('Invite not found or expired.');
    if (game.players.includes(guest)) return ok(view(game, guest));
    if (game.status !== 'waiting' || game.players.length >= 2) return err('This game has already started or is full.');
    game.players.push(guest); game.status = 'playing'; game.updated = Date.now(); save(); return ok(view(game, guest));
  };
  const details = game => ({ gameId: game.id, roomCode: game.code, joinToken: game.public ? '' : game.invite, wordLength: game.length });
  const history = guest => Object.values(data.games).filter(game => game.players.includes(guest) && game.players.length === 2 && !active(game)).sort((a,b) => b.ended - a.ended).map(game => {
    const index = game.players.indexOf(guest);
    return { gameId: game.id, roomCode: game.code, mode: game.mode, endedAt: nano(game.ended ?? game.updated),
      won: game.status === 'won' && (game.mode === 'coop' || game.winner === index), opponent: name(game.players[1-index]),
      myGuessCount: BigInt(game.mode === 'coop' ? game.coop.length : game.guesses[index].length), exitReason: game.reason ?? '' };
  });
  return {
    call(method, args, token) {
      sweep();
      const guest = token && data.guests[hash(token)] ? hash(token) : null;
      if (method === 'guest') {
        if (guest) return { token, username: name(guest) };
        const next = randomBytes(32).toString('hex'), id = hash(next);
        data.guests[id] = { username: 'Player-' + randomBytes(4).toString('hex'), created: Date.now() }; save();
        return { token: next, username: name(id) };
      }
      if (!guest) throw new Error('Guest session unavailable. Refresh to reconnect.');
      switch (method) {
        case 'createPrivateGame': case 'createPublicGame': return ok(details(create(guest, args[1], args[2] ?? 5, method === 'createPublicGame')));
        case 'getMyActiveGames': return Object.values(data.games).filter(game => active(game) && game.players.includes(guest)).map(game => summary(game, guest));
        case 'listPublicGames': return Object.values(data.games).filter(game => game.public && game.status === 'waiting').map(game => summary(game, guest));
        case 'getGameState': return ok(view(participant(args[1], guest), guest));
        case 'getGameStateWithRole': { const game = participant(args[0], guest); return { isHost: game.players[0] === guest, gameState: view(game, guest) }; }
        case 'getGameByJoinToken': return Object.values(data.games).find(game => game.invite === args[0])?.id ?? null;
        case 'joinByToken': { const game = Object.values(data.games).find(game => game.invite === args[1]); if (args[2] && args[2] !== game?.id) return err('Invite does not match game.'); return join(guest, game); }
        case 'joinGame': { const game = Object.values(data.games).find(game => game.code === String(args[1]).toUpperCase()); if (game && !game.public && args[2] && args[2] !== game.invite) return err('Invalid invite.'); return join(guest, game); }
        case 'submitGuess': {
          let game;
          try { game = participant(args[1], guest); } catch { return { __kind__: 'err', err: { __kind__: 'gameError', gameError: 'Game not found.' } }; }
          const fail = message => ({ __kind__: 'err', err: { __kind__: 'gameError', gameError: message } });
          const index = game.players.indexOf(guest), word = String(args[2]).toLowerCase();
          if (game.status !== 'playing') return fail('This round is not accepting guesses.');
          if (game.mode === 'coop' && game.turn !== index) return { __kind__: 'err', err: { __kind__: 'notYourTurn', notYourTurn: null } };
          const guesses = game.mode === 'coop' ? game.coop : game.guesses[index];
          if (guesses.length >= 6) return fail('All six guesses have been used.');
          if (word.length !== game.length || !dictionary.has(word)) return { __kind__: 'err', err: { __kind__: 'notAWord', notAWord: null } };
          if (guesses.some(guess => guess.word === word)) return fail('Already guessed');
          guesses.push({ word, states: evaluateGuess(word, game.answer), player: index+1, time: Date.now() });
          if (word === game.answer) { game.status = 'won'; game.winner = index; }
          else if (game.mode === 'coop') { if (game.coop.length >= 6) game.status = 'lost'; else game.turn = 1-index; }
          else if (game.guesses.every(list => list.length >= 6)) game.status = 'lost';
          game.updated = Date.now(); if (!active(game)) game.ended = game.updated;
          save(); return ok(view(game, guest));
        }
        case 'leaveGame': {
          const game = participant(args[1], guest);
          if (active(game)) { game.status = game.players.length === 2 && game.mode === 'versus' ? 'won' : 'expired'; game.winner = 1-game.players.indexOf(guest); game.reason = 'opponent_left'; game.ended = game.updated = Date.now(); save(); }
          return ok(null);
        }
        case 'requestRematch': {
          const game = participant(args[1], guest);
          if (active(game) || game.players.length !== 2) return err('Finish this round before a rematch.');
          const existing = data.offers[game.id];
          if (existing && active(data.games[existing.newGameId])) {
            if (existing.offeredBy !== name(guest)) { const result = join(guest, data.games[existing.newGameId]); if (result.__kind__ === 'err') return result; }
            return ok(existing);
          }
          const next = create(guest, game.mode, game.length, false, game.answer);
          data.offers[game.id] = { newGameId: next.id, roomCode: next.code, joinToken: next.invite, offeredBy: name(guest) }; save(); return ok(data.offers[game.id]);
        }
        case 'getRematchOffer': { participant(args[0], guest); const offer = data.offers[args[0]]; return offer && offer.offeredBy !== name(guest) && active(data.games[offer.newGameId]) ? offer : null; }
        case 'acceptRematch': {
          participant(args[1], guest); const offer = data.offers[args[1]];
          if (!offer) return err('No rematch available.');
          const result = join(guest, data.games[offer.newGameId]); return result.__kind__ === 'err' ? result : ok({ newGameId: offer.newGameId });
        }
        case 'getMyGameHistory': return history(guest);
        case 'getMyStats': {
          const records = history(guest); let current = 0, best = 0, run = 0;
          for (const record of records) { if (!record.won) break; current++; }
          for (const record of [...records].reverse()) { run = record.won ? run+1 : 0; best = Math.max(best,run); }
          return { totalWins: BigInt(records.filter(record => record.won).length), totalLosses: BigInt(records.filter(record => !record.won).length), currentStreak: BigInt(current), bestStreak: BigInt(best) };
        }
        case 'getMyOpponentStats': { const result = new Map(); for (const record of history(guest)) { const row = result.get(record.opponent) ?? { wins: 0n, losses: 0n }; row[record.won ? 'wins' : 'losses']++; result.set(record.opponent, row); } return [...result]; }
        case 'validateGuessWord': return dictionary.has(String(args[0]).toLowerCase());
        case 'getWordCount': return BigInt(dictionary.size);
        case 'getUsernameForSession': return name(guest);
        case 'getAdminSetupInfo': return null;
        case 'logout': return null;
        default: throw new Error('This operation is not available in the local guest game service.');
      }
    },
  };
}
