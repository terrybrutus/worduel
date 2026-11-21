import { randomBytes, randomInt, createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync, renameSync } from 'node:fs';
import { ANSWER_POOLS, acceptedWord, evaluateGuess } from './local-games.mjs';

export function createLocalChallenges(file, now = Date.now) {
  let data = { version: 1, challenges: {} };
  if (file && existsSync(file)) {
    data = JSON.parse(readFileSync(file, 'utf8'));
    if (data.version !== 1 || !data.challenges) throw new Error('Invalid challenge state; preserve the existing file.');
  }
  const save = () => { if (file) { writeFileSync(file + '.tmp', JSON.stringify(data), { mode: 0o600 }); renameSync(file + '.tmp', file); } };
  const hash = value => createHash('sha256').update(value).digest('hex');
  const lengthCheck = length => { if (![5,6,7].includes(length)) throw new Error('Choose 5, 6, or 7 letters.'); };
  const view = (challenge, person) => {
    const run = challenge.runs[person];
    const finished = run.solved || run.guesses.length === 6;
    let streak = 0;
    if (challenge.kind === 'daily') {
      const day = new Date(now());
      const today = data.challenges[`daily-${day.toISOString().slice(0,10)}-${challenge.length}`]?.runs[person];
      if (!today?.solved && !today?.completed) day.setUTCDate(day.getUTCDate()-1);
      while (streak < 365) {
        const previous = data.challenges[`daily-${day.toISOString().slice(0,10)}-${challenge.length}`]?.runs[person];
        if (!previous?.solved || new Date(previous.completed).toISOString().slice(0,10) !== day.toISOString().slice(0,10)) break;
        streak++; day.setUTCDate(day.getUTCDate()-1);
      }
    }
    return { id: challenge.id, kind: challenge.kind, day: challenge.day ?? '', wordLength: challenge.length,
      guesses: run.guesses.map(guess => ({ word: guess.word, states: guess.states, playerNum: 1n, timestamp: BigInt(guess.time) * 1000000n })),
      finished, solved: run.solved, streak, ...(finished ? { answer: challenge.answer } : {}),
      scores: finished ? Object.entries(challenge.runs).filter(([,r]) => r.completed).map(([id,r]) => ({ username: r.username, isYou: id === person, solved: r.solved, guesses: r.guesses.length }))
        .sort((a,b) => Number(b.solved)-Number(a.solved) || a.guesses-b.guesses).slice(0,20) : [] };
  };
  const open = (id, person, username) => {
    const challenge = typeof id === 'string' && Object.hasOwn(data.challenges,id) ? data.challenges[id] : null;
    if (!challenge || now() - challenge.created > 30*86400000) throw new Error('Challenge not found or expired.');
    if (!challenge.runs[person]) {
      if (Object.keys(challenge.runs).length >= 100) throw new Error('This challenge is full.');
      challenge.runs[person] = { username, guesses: [], solved: false, completed: 0 };
      save();
    }
    return challenge;
  };
  return { call(method, args, token, username) {
    const person = hash(token);
    if (method === 'listChallenges') return Object.values(data.challenges).filter(challenge => challenge.runs[person] && now()-challenge.created <= 30*86400000)
      .sort((a,b) => b.created-a.created).slice(0,10).map(challenge => view(challenge,person));
    if (method === 'dailyChallenge' || method === 'createReplay') {
      const length = args[0] ?? 5; lengthCheck(length);
      const day = new Date(now()).toISOString().slice(0,10);
      const daily = method === 'dailyChallenge';
      const id = daily ? `daily-${day}-${length}` : randomBytes(24).toString('hex');
      if (!data.challenges[id]) {
        if (Object.keys(data.challenges).length >= 5000) throw new Error('Local challenge storage is full.');
        const answers = ANSWER_POOLS[length];
        const index = daily ? parseInt(hash(`worduel-daily-v1:${day}:${length}`).slice(0,8),16) % answers.length : randomInt(answers.length);
        data.challenges[id] = { id, kind: daily ? 'daily' : 'replay', day, length, answer: answers[index], runs: {}, created: now() };
      }
      return view(open(id, person, username), person);
    }
    if (!['challengeState','submitChallengeGuess'].includes(method)) throw new Error('Unknown challenge operation.');
    const challenge = open(args[0], person, username), run = challenge.runs[person];
    if (method === 'submitChallengeGuess') {
      if (run.solved || run.guesses.length >= 6) throw new Error('This round is finished.');
      const word = typeof args[1] === 'string' ? args[1].trim().toLowerCase() : '';
      if (word.length !== challenge.length || !acceptedWord(word)) throw new Error('Not in the word list.');
      run.guesses.push({ word, states: evaluateGuess(word, challenge.answer), time: now() });
      run.solved = word === challenge.answer;
      if (run.solved || run.guesses.length === 6) run.completed = now();
      save();
    }
    return view(challenge, person);
  } };
}
