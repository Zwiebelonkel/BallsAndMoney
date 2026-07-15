const crypto = require('node:crypto');
const express = require('express');
const app = express();
const port = Number(process.env.PORT || 3000);
const allowedOrigin = process.env.CORS_ORIGIN || '*';


const databaseUrl = (process.env.TURSO_DATABASE_URL || '').replace('libsql://', 'https://');
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
    throw new Error('TURSO_DATABASE_URL und TURSO_AUTH_TOKEN müssen gesetzt sein.');
  }

  const response = await fetch(`${databaseUrl}/v2/pipeline`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${authToken}`,
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
        { type: 'close' }
      ]
    })
  });
  const data = await response.json();

  if(!response.ok || data.results?.[0]?.type !== 'ok'){
    throw new Error(data.error?.message || data.results?.[0]?.error?.message || 'Turso-Abfrage fehlgeschlagen.');
  }

  const result = data.results[0].response.result;
  const columns = (result.cols || []).map(column => column.name);

  return {
    rows: (result.rows || []).map(row => Object.fromEntries(
      row.map((value, index) => [columns[index], fromTursoValue(value)])
    ))
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

function normalizeName(name){
  return String(name || '').trim().replace(/\s+/g, ' ').slice(0, 24);
}

function toNonNegativeInteger(value){
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.floor(number)) : 0;
}

async function getEntries(limit = 25){
  const result = await execute(`
    SELECT p.id AS playerId, p.name, s.prestige, s.money, s.balls, s.updated_at AS updatedAt
    FROM leaderboard_scores s
    JOIN leaderboard_players p ON p.id = s.player_id
    ORDER BY s.prestige DESC, s.money DESC, s.balls DESC, s.updated_at ASC
    LIMIT ?
  `, [Math.min(100, Math.max(1, toNonNegativeInteger(limit) || 25))]);

  return result.rows.map((row, index) => ({
    rank: index + 1,
    playerId: row.playerId,
    name: row.name,
    prestige: Number(row.prestige),
    money: Number(row.money),
    balls: Number(row.balls),
    updatedAt: row.updatedAt
  }));
}

app.get('/api/health', (request, response) => {
  response.json({ ok: true });
});

app.post('/api/leaderboard/login', async (request, response, next) => {
  try{
    const name = normalizeName(request.body.name);

    if(name.length < 2){
      response.status(400).json({ error: 'Name muss mindestens 2 Zeichen lang sein.' });
      return;
    }

    const existing = await execute('SELECT id FROM leaderboard_players WHERE name = ?', [name]);

    if(existing.rows.length > 0){
      response.status(409).json({ error: 'Dieser Name ist bereits vergeben.' });
      return;
    }

    const id = crypto.randomUUID();
    const token = crypto.randomBytes(32).toString('hex');

    await execute('INSERT INTO leaderboard_players (id, name, token_hash) VALUES (?, ?, ?)', [id, name, hashToken(token)]);

    response.status(201).json({ player: { id, name, token } });
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
    const player = await execute('SELECT id FROM leaderboard_players WHERE id = ? AND token_hash = ?', [playerId, hashToken(String(token || ''))]);

    if(player.rows.length === 0){
      response.status(401).json({ error: 'Anmeldung ungültig. Bitte neu anmelden.' });
      return;
    }

    const prestige = toNonNegativeInteger(request.body.prestige);
    const money = toNonNegativeInteger(request.body.money);
    const balls = toNonNegativeInteger(request.body.balls);

    await execute(`
      INSERT INTO leaderboard_scores (player_id, prestige, money, balls)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(player_id) DO UPDATE SET
        prestige = excluded.prestige,
        money = excluded.money,
        balls = excluded.balls,
        updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
    `, [playerId, prestige, money, balls]);

    response.json({ entries: await getEntries(25) });
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
