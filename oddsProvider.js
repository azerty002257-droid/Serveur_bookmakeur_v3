// Fournisseur de cotes : recupere les cotes soit depuis The Odds API,
// soit via un generateur de donnees simulees (mode demo).

const DEMO_MATCHES = [
  { home_team: 'Paris Saint-Germain', away_team: 'Olympique de Marseille' },
  { home_team: 'AS Monaco', away_team: 'Olympique Lyonnais' },
  { home_team: 'LOSC Lille', away_team: 'RC Lens' },
  { home_team: 'Stade Rennais', away_team: 'OGC Nice' }
];

// Genere des cotes plausibles (mode demo, sans cle API)
function buildDemoOdds() {
  return DEMO_MATCHES.map((m, i) => {
    const homeOdd = +(1.4 + Math.random() * 2.6).toFixed(2);
    const awayOdd = +(1.6 + Math.random() * 3.2).toFixed(2);
    const drawOdd = +(2.9 + Math.random() * 1.2).toFixed(2);
    return {
      id: `demo-${i}`,
      commence_time: new Date(Date.now() + 3600_000 * (i + 1)).toISOString(),
      home_team: m.home_team,
      away_team: m.away_team,
      bookmakers: [
        {
          key: 'demo',
          markets: [
            {
              key: 'h2h',
              outcomes: [
                { name: m.home_team, price: homeOdd },
                { name: m.away_team, price: awayOdd },
                { name: 'Draw', price: drawOdd }
              ]
            }
          ]
        }
      ]
    };
  });
}

// Appel reel a The Odds API
async function fetchRealOdds({ apiKey, sportKey, region }) {
  const url =
    `https://api.the-odds-api.com/v4/sports/${sportKey}/odds` +
    `?apiKey=${apiKey}&regions=${region}&markets=h2h&oddsFormat=decimal`;

  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Odds API ${res.status}: ${body}`);
  }
  return res.json();
}

export async function getRawOdds(config) {
  if (!config.apiKey) {
    return { source: 'demo', events: buildDemoOdds() };
  }
  const events = await fetchRealOdds(config);
  return { source: 'live', events };
}
