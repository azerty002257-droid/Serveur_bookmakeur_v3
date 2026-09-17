
// Fournisseur SportMonks Football API 3.0
// Récupère matchs + équipes + statistiques + cotes

const BASE_URL = 'https://api.sportmonks.com/v3/football';

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

async function sportMonksRequest(path, apiKey) {
  const url = `${BASE_URL}${path}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: 'application/json'
    }
  });

  const body = await response.text();

  if (!response.ok) {
    throw new Error(
      `SportMonks ${response.status}: ${body}`
    );
  }

  return JSON.parse(body);
}

export async function getRawOdds(config) {
  if (!config.apiKey) {
    throw new Error(
      'SPORTMONKS_API_KEY est absente dans Render'
    );
  }

  const date = getTodayDate();

  const include = [
    'participants',
    'statistics.type',
    'odds.market',
    'odds.bookmaker',
    'scores',
    'state',
    'league',
    'season'
  ].join(';');

  const path =
    `/fixtures/date/${date}` +
    `?include=${encodeURIComponent(include)}` +
    `&per_page=50`;

  const result =
    await sportMonksRequest(path, config.apiKey);

  return {
    source: 'sportmonks',
    events: result.data || []
  };
}
