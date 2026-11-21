import { networkInterfaces } from 'node:os';
import { resolve } from 'node:path';
import { existsSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { createLocalGames } from './local-games.mjs';
import { createWordMeanings } from './word-meanings.mjs';
import { createLocalChallenges } from './local-challenges.mjs';
import { parse } from 'dotenv';

export function localMultiplayer() {
  return {
    name: 'worduel-local-multiplayer', apply: 'serve',
    configureServer(server) {
      const stateFile = resolve(server.config.root, '.worduel-local-games.json');
      const lockFile = stateFile + '.lock';
      if (existsSync(lockFile)) {
        const previous = JSON.parse(readFileSync(lockFile, 'utf8'));
        if (previous.pid !== process.pid) {
          let running = true;
          try { process.kill(previous.pid, 0); } catch (error) { if (error.code === 'ESRCH') running = false; }
          if (running) throw new Error('Worduel is already running. Open port 43992 instead of starting a second instance.');
        }
      }
      const lock = { pid: process.pid, owner: randomUUID() };
      writeFileSync(lockFile, JSON.stringify(lock), { mode: 0o600 });
      server.httpServer?.once('close', () => {
        if (existsSync(lockFile) && JSON.parse(readFileSync(lockFile,'utf8')).owner === lock.owner) unlinkSync(lockFile);
      });
      const games = createLocalGames(stateFile);
      const challenges = createLocalChallenges(resolve(server.config.root, '.worduel-challenges.json'));
      const envFile = resolve(server.config.root, '.env.local');
      const env = existsSync(envFile) ? parse(readFileSync(envFile)) : {};
      const meanings = createWordMeanings({ file: resolve(server.config.root, '.worduel-meanings.json'),
        apiKey: process.env.ANTHROPIC_API_KEY ?? env.ANTHROPIC_API_KEY ?? '',
        dailyLimit: process.env.WORDUEL_AI_DAILY_LIMIT ?? env.WORDUEL_AI_DAILY_LIMIT ?? 50,
        monthlyLimit: process.env.WORDUEL_AI_MONTHLY_LIMIT ?? env.WORDUEL_AI_MONTHLY_LIMIT ?? 500,
      });
      server.middlewares.use((req, res, next) => {
        let path;
        try { path = decodeURIComponent(req.url ?? ''); } catch { res.statusCode = 400; return res.end(); }
        const privatePath = path.toLowerCase().replaceAll('\\', '/');
        if (privatePath.includes('.worduel-local-games.json') || privatePath.includes('.worduel-meanings.json') || privatePath.includes('.worduel-challenges.json') || privatePath.includes('/.env')) { res.statusCode = 404; return res.end(); }
        next();
      });
      const buckets = new Map();
      server.middlewares.use('/__worduel', async (req, res) => {
        res.setHeader('Cache-Control', 'no-store');
        res.setHeader('Content-Type', 'application/json');
        const send = (code, value) => { res.statusCode = code; res.end(JSON.stringify(value, (_, item) => typeof item === 'bigint' ? { __worduelBigInt: item.toString() } : item)); };
        if (req.method !== 'POST') return send(405, { error: 'Use POST.' });
        if (req.headers.origin && req.headers.origin !== `http://${req.headers.host}` && req.headers.origin !== `https://${req.headers.host}`) return send(403, { error: 'Cross-site request denied.' });
        try {
          let body = '';
          for await (const part of req) { body += part; if (body.length > 8192) return send(413, { error: 'Request too large.' }); }
          const { method, args = [] } = JSON.parse(body);
          if (typeof method !== 'string' || !Array.isArray(args)) throw new Error('Invalid request.');
          if (['guest','createPrivateGame','createPublicGame','joinGame','joinByToken','wordMeaning','wordQuiz','dailyChallenge','createReplay','submitChallengeGuess'].includes(method)) {
            const key = `${req.socket.remoteAddress}:${method}`, now = Date.now();
            const bucket = buckets.get(key);
            if (bucket && now - bucket.start < 60000) { if (++bucket.count > 60) return send(429, { error: 'Too many requests. Try again in a minute.' }); }
            else buckets.set(key, { start: now, count: 1 });
          }
          const token = req.headers.authorization?.replace(/^Bearer /, '') ?? '';
          if (['dailyChallenge','createReplay','challengeState','submitChallengeGuess','listChallenges'].includes(method)) {
            const username = games.call('getUsernameForSession', [], token);
            return send(200, challenges.call(method, args, token, username));
          }
          if (method === 'wordQuiz') {
            games.call('getUsernameForSession', [], token);
            return send(200, await meanings.quiz(args[0], args[1]));
          }
          if (method === 'wordMeaning') {
            games.call('getUsernameForSession', [], token);
            return send(200, await meanings.lookup(args[0]));
          }
          if (method === 'connection') {
            const addresses = Object.entries(networkInterfaces()).sort(([a],[b]) => Number(/virtual|vEthernet|vpn|wsl/i.test(a)) - Number(/virtual|vEthernet|vpn|wsl/i.test(b))).flatMap(([, list]) => list ?? []).filter(ip => ip.family === 'IPv4' && !ip.internal && !ip.address.startsWith('169.254.')).map(ip => `http://${ip.address}:${server.config.server.port}`);
            addresses.sort((a,b) => Number(!a.startsWith('http://192.168.')) - Number(!b.startsWith('http://192.168.')));
            return send(200, { origins: addresses });
          }
          send(200, games.call(method, args, token));
        } catch (error) { send(400, { error: error instanceof Error ? error.message : 'Local game request failed.' }); }
      });
    },
  };
}
