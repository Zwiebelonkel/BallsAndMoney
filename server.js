const crypto = require('node:crypto');
const express = require('express');
const app = express();
const port = Number(process.env.PORT || 3000);
const allowedOrigin = process.env.CORS_ORIGIN || '*';


const rawDatabaseUrl = process.env.TURSO_DATABASE_URL || '';
const databaseUrl = rawDatabaseUrl
  .replace(/^libsql:\/\//, 'https://')
  .replace(/\/+$/, '');
const authToken = process.env.TURSO_AUTH_TOKEN;

function toTursoValue(value){
  if(value === null || value === undefined){
    return { type: 'null' };
  }

  if(typeof value === 'number' || typeof value === 'bigint'){
    return { type: 'integer', value: String(value) };
  }

  return { type: 'text', value: String(value) };
}

function fromTursoValue(value){
  if(!value || value.type === 'null'){
    return null;
  }

  return value.value ?? value.base64 ?? null;
}

async function execute(sql, args = []){
  if(!databaseUrl || !authToken){
    throw new Error(
      'TURSO_DATABASE_URL oder TURSO_AUTH_TOKEN fehlt.'
    );
  }

  const response = await fetch(`${databaseUrl}/v2/pipeline`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      requests: [
        {
          type: 'execute',
          stmt: {
            sql,
            args: args.map(toTursoValue)
          }
        },
        {
          type: 'close'
        }
      ]
    })
  });

  const responseText = await response.text();

  let data;

  try{
    data = JSON.parse(responseText);
  } catch{
    throw new Error(
      `Turso lieferte keine gültige JSON-Antwort. HTTP ${response.status}: ${responseText}`
    );
  }

  const firstResult = data.results?.[0];

  if(!response.ok || firstResult?.type !== 'ok'){
    console.error('Turso HTTP-Status:', response.status);
    console.error('Turso-Antwort:', JSON.stringify(data, null, 2));

    const errorMessage =
      firstResult?.error?.message ||
      firstResult?.error ||
      data.error?.message ||
      data.error ||
      responseText;

    throw new Error(
      `Turso-Abfrage fehlgeschlagen – HTTP ${response.status}: ${errorMessage}`
    );
  }

  const result = firstResult.response?.result;

  if(!result){
    throw new Error(
      `Turso-Antwort enthält kein Abfrageergebnis: ${responseText}`
    );
  }

  const columns = (result.cols || []).map(column => column.name);

  return {
    rows: (result.rows || []).map(row =>
      Object.fromEntries(
        row.map((value, index) => [
          columns[index],
          fromTursoValue(value)
        ])
      )
    )
  };
}

app.use(express.json({ limit: '32kb' }));
app.use((request, response, next) => {
  response.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  response.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');

  if(request.method === 'OPTIONS'){
    response.sendStatus(204);
    return;
  }

  next();
});

function hashToken(token){
  return crypto.createHash('sha256').update(token).digest('hex');
}

function normalizeUsername(username){
  return String(username || '').trim().slice(0, 24);
}

function hashPassword(password, salt){
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

function passwordMatches(password, salt, expectedHash){
  const actual = Buffer.from(hashPassword(password, salt), 'hex');
  const expected = Buffer.from(expectedHash, 'hex');
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

const PROFILE_EMOJIS = new Set(['🙂', '😎', '🤩', '🥳', '🤖', '👾', '🐸', '🦊', '🐼', '🐵', '🦁', '🐯']);

function normalizeEmoji(emoji){
  return PROFILE_EMOJIS.has(emoji) ? emoji : '🙂';
}

async function createSession(userId){
  const token = crypto.randomBytes(32).toString('hex');
  await execute('INSERT INTO user_sessions (token_hash, user_id) VALUES (?, ?)', [hashToken(token), userId]);
  return token;
}

function toNonNegativeInteger(value){
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.floor(number)) : 0;
}

const LEADERBOARD_LIMIT = 25;

async function getEntries(limit = LEADERBOARD_LIMIT){
  const result = await execute(`
    SELECT u.id AS playerId, u.username AS name, u.profile_emoji AS emoji, s.prestige, s.money, s.balls, s.updated_at AS updatedAt
    FROM leaderboard_scores s
    JOIN users u ON u.id = s.user_id
    ORDER BY s.prestige DESC, s.money DESC, s.balls DESC, s.updated_at ASC
    LIMIT ?
  `, [Math.min(LEADERBOARD_LIMIT, Math.max(1, toNonNegativeInteger(limit) || LEADERBOARD_LIMIT))]);

  return result.rows.map((row, index) => ({
    rank: index + 1,
    playerId: row.playerId,
    name: row.name,
    emoji: row.emoji,
    prestige: Number(row.prestige),
    money: Number(row.money),
    balls: Number(row.balls),
    updatedAt: row.updatedAt
  }));
}

app.get('/api/health', (request, response) => {
  response.json({ ok: true });
});

app.post('/api/leaderboard/register', async (request, response, next) => {
  try{
    const username = normalizeUsername(request.body.username);
    const password = String(request.body.password || '');
    const emoji = normalizeEmoji(request.body.emoji);

    if(!/^[a-zA-Z0-9_.-]{2,24}$/.test(username)){
      response.status(400).json({ error: 'Username: 2–24 Zeichen; erlaubt sind Buchstaben, Zahlen, Punkt, _ und -.' });
      return;
    }
    if(password.length < 8 || password.length > 128){
      response.status(400).json({ error: 'Das Passwort muss 8–128 Zeichen lang sein.' });
      return;
    }

    const id = crypto.randomUUID();
    const salt = crypto.randomBytes(16).toString('hex');

    try{
      await execute('INSERT INTO users (id, username, password_hash, password_salt, profile_emoji) VALUES (?, ?, ?, ?, ?)', [id, username, hashPassword(password, salt), salt, emoji]);
    } catch(error){
      if(String(error.message).toLowerCase().includes('unique')){
        response.status(409).json({ error: 'Dieser Username ist bereits vergeben.' });
        return;
      }
      throw error;
    }

    const token = await createSession(id);
    response.status(201).json({ player: { id, name: username, emoji, token } });
  } catch(error){
    next(error);
  }
});

app.post('/api/leaderboard/login', async (request, response, next) => {
  try{
    const username = normalizeUsername(request.body.username);
    const password = String(request.body.password || '');
    const result = await execute('SELECT id, username, password_hash, password_salt, profile_emoji FROM users WHERE username = ?', [username]);
    const user = result.rows[0];

    if(!user || !passwordMatches(password, user.password_salt, user.password_hash)){
      response.status(401).json({ error: 'Username oder Passwort ist falsch.' });
      return;
    }

    const token = await createSession(user.id);
    response.json({ player: { id: user.id, name: user.username, emoji: user.profile_emoji, token } });
  } catch(error){
    next(error);
  }
});

app.get('/api/leaderboard', async (request, response, next) => {
  try{
    response.json({ entries: await getEntries(request.query.limit) });
  } catch(error){
    next(error);
  }
});

app.post('/api/leaderboard/score', async (request, response, next) => {
  try{
    const { playerId, token } = request.body;
    const player = await execute('SELECT user_id AS id FROM user_sessions WHERE user_id = ? AND token_hash = ?', [playerId, hashToken(String(token || ''))]);

    if(player.rows.length === 0){
      response.status(401).json({ error: 'Anmeldung ungültig. Bitte neu anmelden.' });
      return;
    }

    const prestige = toNonNegativeInteger(request.body.prestige);
    const money = toNonNegativeInteger(request.body.money);
    const balls = toNonNegativeInteger(request.body.balls);

    await execute(`
      INSERT INTO leaderboard_scores (user_id, prestige, money, balls)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        prestige = excluded.prestige,
        money = excluded.money,
        balls = excluded.balls,
        updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
    `, [playerId, prestige, money, balls]);

    response.json({ entries: await getEntries(LEADERBOARD_LIMIT) });
  } catch(error){
    next(error);
  }
});


app.use((request, response) => {
  response.status(404).json({ error: 'Nicht gefunden.' });
});

app.use((error, request, response, next) => {
  console.error(error);
  response.status(500).json({ error: 'Serverfehler.' });
});

app.listen(port, () => {
  console.log(`Leaderboard server listening on port ${port}`);
});
