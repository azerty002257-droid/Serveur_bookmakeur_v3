
function getParticipants(event) {
  return Array.isArray(event.participants)
    ? event.participants
    : [];
}

function getHomeTeam(event) {
  return getParticipants(event).find(
    p => p.meta?.location === 'home'
  );
}

function getAwayTeam(event) {
  return getParticipants(event).find(
    p => p.meta?.location === 'away'
  );
}

function getMatchWinnerOdds(event) {
  const odds = Array.isArray(event.odds)
    ? event.odds
    : [];

  return odds.filter(odd => {
    const market = String(
      odd.market_description || ''
    ).toLowerCase();

    return (
      market.includes('match winner') ||
      market.includes('fulltime result') ||
      odd.market_id === 1
    );
  });
}

function findOdd(odds, labels) {
  const odd = odds.find(o => {
    const label = String(
      o.label || ''
    ).toLowerCase();

    const name = String(
      o.name || ''
    ).toLowerCase();

    return labels.some(
      value =>
        label === value ||
        name === value
    );
  });

  if (!odd) return null;

  const value = Number(odd.value);

  return Number.isFinite(value)
    ? +value.toFixed(2)
    : null;
}

function impliedProbability(odd) {
  if (!odd || odd <= 0) return null;

  return +((1 / odd) * 100).toFixed(1);
}

function normalizeStatistics(event) {
  const statistics = Array.isArray(event.statistics)
    ? event.statistics
    : [];

  return statistics.map(stat => ({
    participantId:
      stat.participant_id ?? null,

    typeId:
      stat.type_id ?? stat.type?.id ?? null,

    typeName:
      stat.type?.name ??
      stat.name ??
      null,

    value:
      stat.data?.value ??
      stat.value ??
      null
  }));
}

export function enrichEvents(events) {
  return events
    .map(event => {
      const homeTeam = getHomeTeam(event);
      const awayTeam = getAwayTeam(event);

      if (!homeTeam || !awayTeam) {
        return null;
      }

      const odds =
        getMatchWinnerOdds(event);

      const homeOdd =
        findOdd(odds, ['home']);

      const awayOdd =
        findOdd(odds, ['away']);

      const drawOdd =
        findOdd(odds, ['x', 'draw']);

      let favorite = null;
      let underdog = null;

      if (
        homeOdd !== null &&
        awayOdd !== null
      ) {
        if (homeOdd < awayOdd) {
          favorite = homeTeam.name;
          underdog = awayTeam.name;
        } else if (awayOdd < homeOdd) {
          favorite = awayTeam.name;
          underdog = homeTeam.name;
        }
      }

      return {
        id: event.id,

        name: event.name ?? null,

        commenceTime:
          event.starting_at ?? null,

        state:
          event.state ?? null,

        league:
          event.league ?? null,

        season:
          event.season ?? null,

        home: {
          id: homeTeam.id,

          team: homeTeam.name,

          logo:
            homeTeam.image_path ?? null,

          role: 'home',

          odd: homeOdd,

          impliedProbability:
            impliedProbability(homeOdd),

          isFavorite:
            favorite === homeTeam.name
        },

        away: {
          id: awayTeam.id,

          team: awayTeam.name,

          logo:
            awayTeam.image_path ?? null,

          role: 'away',

          odd: awayOdd,

          impliedProbability:
            impliedProbability(awayOdd),

          isFavorite:
            favorite === awayTeam.name
        },

        draw: {
          odd: drawOdd,

          impliedProbability:
            impliedProbability(drawOdd)
        },

        favorite,

        underdog,

        statistics:
          normalizeStatistics(event),

        scores:
          event.scores ?? [],

        rawUpdatedAt:
          event.updated_at ?? null
      };
    })
    .filter(Boolean);
}
