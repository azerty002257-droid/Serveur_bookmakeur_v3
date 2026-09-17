// Transforme les cotes brutes en un format enrichi :
// - identifie l'equipe a domicile / exterieur
// - identifie le favori / l'outsider (cote la plus basse = favori)

function averagePrice(events, teamName) {
  const prices = [];
  for (const bm of events.bookmakers || []) {
    for (const market of bm.markets || []) {
      if (market.key !== 'h2h') continue;
      for (const o of market.outcomes || []) {
        if (o.name === teamName) prices.push(o.price);
      }
    }
  }
  if (!prices.length) return null;
  return prices.reduce((a, b) => a + b, 0) / prices.length;
}

// Convertit une cote decimale en probabilite implicite (%)
function impliedProbability(odd) {
  if (!odd) return null;
  return +((1 / odd) * 100).toFixed(1);
}

export function enrichEvents(rawEvents) {
  return rawEvents.map((ev) => {
    const homeOdd = averagePrice(ev, ev.home_team);
    const awayOdd = averagePrice(ev, ev.away_team);

    let favorite = null;
    let underdog = null;
    if (homeOdd != null && awayOdd != null) {
      if (homeOdd < awayOdd) {
        favorite = ev.home_team;
        underdog = ev.away_team;
      } else {
        favorite = ev.away_team;
        underdog = ev.home_team;
      }
    }

    return {
      id: ev.id,
      commenceTime: ev.commence_time,
      home: {
        team: ev.home_team,
        role: 'home', // joue a domicile
        odd: homeOdd != null ? +homeOdd.toFixed(2) : null,
        impliedProbability: impliedProbability(homeOdd),
        isFavorite: favorite === ev.home_team
      },
      away: {
        team: ev.away_team,
        role: 'away', // joue a l'exterieur
        odd: awayOdd != null ? +awayOdd.toFixed(2) : null,
        impliedProbability: impliedProbability(awayOdd),
        isFavorite: favorite === ev.away_team
      },
      favorite,
      underdog
    };
  });
}
