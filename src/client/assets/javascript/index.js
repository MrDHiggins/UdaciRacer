// The store will hold all information needed globally
let store = {
  track_id: undefined,
  player_id: undefined,
  race_id: undefined,
};

// We need our javascript to wait until the DOM is loaded
document.addEventListener("DOMContentLoaded", async function () {
  try {
    await onPageLoad();
    setupClickHandlers();
  } catch (error) {
    console.log("Problem getting tracks and racers:", error.message);
    console.error(error);
  }
});

async function onPageLoad() {
  const tracksPromise = getTracks().then((tracks) => {
    const html = renderTrackCards(tracks);
    renderAt("#tracks", html);
  });

  const racersPromise = getRacers().then((racers) => {
    const html = renderRacerCars(racers);
    renderAt("#racers", html);
  });

  await Promise.all([tracksPromise, racersPromise]);
}

function setupClickHandlers() {
  document.addEventListener("click", function (event) {
    const { target } = event;

    let parent = event.target.parentElement;

    if (parent.matches(".card.track")) {
      handleSelectTrack(parent);
    }

    if (parent.matches(".card.podracer")) {
      handleSelectPodRacer(parent);
    }

    // Race track form field
    if (target.matches(".card.track")) {
      handleSelectTrack(target);
    }

    // Podracer form field
    if (target.matches(".card.podracer")) {
      handleSelectPodRacer(target);
    }

    // Submit create race form
    if (target.matches("#submit-create-race")) {
      event.preventDefault();

      // start race
      handleCreateRace();
    }

    // Handle acceleration click
    if (target.matches("#gas-peddle")) {
      handleAccelerate(target);
    }
  }, false);
}

async function delay(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function handleCreateRace() {
  const player_id = store.player_id;
  const track_id = store.track_id;

  if (!player_id || !track_id) {
    alert("Please select a track and racer to play a game!");
    return;
  }

  try {
    const race = await createRace(player_id, track_id);
    console.log("createRace:", race);

    renderAt("#race", renderRaceStartView(race.Track));

    store.race_id = parseInt(race.ID) - 1;

    await runCountdown();
    await startRace(store.race_id);
    const raceRun = await runRace(store.race_id);
    console.log("raceRun:", raceRun);
  } catch (error) {
    console.log("Error in handleCreateRace:", error);
  }
}

async function runRace(raceID) {
  return new Promise((resolve, reject) => {
    const racerInterval = setInterval(async () => {
      try {
        const data = await getRace(raceID);
        if (data.status == "in-progress") {
          renderAt("#leaderBoard", raceProgress(data.positions));
        } else if (data.status == "finished") {
          clearInterval(racerInterval);
          renderAt("#race", resultsView(data.positions));
          resolve(data);
        }
      } catch (error) {
        clearInterval(racerInterval);
        console.log("getRace error:", error);
        reject(error);
      }
    }, 500);
  });
}

async function runCountdown() {
  try {
    await delay(1000);
    let timer = 3;

    return new Promise((resolve) => {
      const interval = setInterval(() => {
        document.getElementById('big-numbers').innerHTML = timer;
        if (timer === 0) {
          clearInterval(interval);
          resolve();
        }
        timer--;
      }, 1000);
    });
  } catch (error) {
    console.log(error);
  }
}

function handleSelectPodRacer(target) {
  console.log("selected pod: ", target.id);

  const selected = document.querySelector('#racers .selected');
  if (selected) {
    selected.classList.remove('selected');
  }

  target.classList.add('selected');

  store.player_id = target.id;
}

function handleSelectTrack(target) {
  console.log("selected pod: ", target.id);

  const selected = document.querySelector('#tracks .selected');
  if (selected) {
    selected.classList.remove('selected');
  }

  target.classList.add('selected');

  store.track_id = target.id;
}

function handleAccelerate() {
  accelerate(store.race_id)
    .then(() => console.log("accelerate button clicked"))
    .catch((error) => console.log(error));
}

function renderRacerCars(racers) {
  if (!racers.length) {
    return `
      <h4>Loading Racers...</h4>
    `;
  }

  const results = racers.map(renderRacerCard).join('');

  return `
    <ul id="racers">
      ${results}
    </ul>
  `;
}

function renderRacerCard(racer) {
  const { id, driver_name, top_speed, acceleration, handling } = racer;

  return `
    <li class="card podracer" id="${id}">
      <h3>${driver_name}</h3>
      <p>${top_speed}</p>
      <p>${acceleration}</p>
      <p>${handling}</p>
    </li>
  `;
}

function renderTrackCards(tracks) {
  if (!tracks.length) {
    return `
      <h4>Loading Tracks...</h4>
    `;
  }

  const results = tracks.map(renderTrackCard).join('');

  return `
    <ul id="tracks">
      ${results}
    </ul>
  `;
}

function renderTrackCard(track) {
  const { id, name } = track;

  return `
    <li id="${id}" class="card track">
      <h3>${name}</h3>
    </li>
  `;
}

function renderCountdown(count) {
  return `
    <h2>Race Starts In...</h2>
    <p id="big-numbers">${count}</p>
  `;
}

function renderRaceStartView(track) {
  return `
    <header>
      <h1>Race: ${track.name}</h1>
    </header>
    <main id="two-columns">
      <section id="leaderBoard">
        ${renderCountdown(3)}
      </section>

      <section id="accelerate">
        <h2>Directions</h2>
        <p>Click the button as fast as you can to make your racer go faster!</p>
        <button id="gas-peddle">Click Me To Win!</button>
      </section>
    </main>
    <footer></footer>
  `;
}

function resultsView(positions) {
  positions.sort((a, b) => (a.final_position > b.final_position) ? 1 : -1);

  return `
    <header>
      <h1>Race Results</h1>
    </header>
    <main>
      ${raceProgress(positions)}
      <a href="/race">Start a new race</a>
    </main>
  `;
}

function raceProgress(positions) {
  positions = positions.sort((a, b) => (a.segment > b.segment) ? -1 : 1);
  let count = 1;

  const results = positions.map(p => {
    if (p.id == store.player_id) {
      return `
        <tr>
          <td>
            <h3>${count++} - ${p.driver_name}</h3>
          </td>
        </tr>
      `;
    } else {
      return `
        <tr>
          <td>
            <h3>${count++} - ${p.driver_name}</h3>
          </td>
        </tr>
      `;
    }
  });

  return `
    <main>
      <h3>Leaderboard</h3>
      <section id="leaderBoard">
        ${results.join(' ')}
      </section>
    </main>
  `;
}

function renderAt(element, html) {
  const node = document.querySelector(element);
  node.innerHTML = html;
}

const SERVER = 'http://localhost:3001';

function defaultFetchOpts() {
  return {
    mode: 'cors',
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': SERVER,
    },
  };
}

async function getTracks() {
  return await fetch(`${SERVER}/api/tracks`, {
      method: 'GET',
      ...defaultFetchOpts(),
    })
    .then(res => res.json())
    .catch(err => console.log("Problem with getTracks request: ", err));
}

async function getRacers() {
  return await fetch(`${SERVER}/api/cars`, {
      method: 'GET',
      ...defaultFetchOpts(),
    })
    .then(res => res.json())
    .catch(err => console.log("Problem with getRacers request: ", err));
}

async function createRace(player_id, track_id) {
  player_id = parseInt(player_id);
  track_id = parseInt(track_id);
  const body = { player_id, track_id };

  try {
    const res = await fetch(`${SERVER}/api/races`, {
      method: 'POST',
      ...defaultFetchOpts(),
      body: JSON.stringify(body)
    });
    return await res.json();
  } catch (err) {
    return console.log("Problem with createRace request: ", err);
  }
}

async function getRace(id) {
  const raceId = parseInt(id);
  try {
    const data = await fetch(`${SERVER}/api/races/${raceId}`, {
      method: "GET",
      ...defaultFetchOpts(),
    });
    return data.json();
  } catch (error) {
    console.log("Problem with getRace request::", error);
  }
}

async function startRace(id) {
  const raceId = parseInt(id);
  try {
    const data = await fetch(`${SERVER}/api/races/${raceId}/start`, {
      method: `POST`,
      ...defaultFetchOpts(),
    });
    return data;
  } catch (err) {
    console.log("Problem with startRace request::", err);
  }
}


async function accelerate(id) {
  const raceId = parseInt(id);
	try {
		await fetch (`${SERVER}/api/races/${raceId}/accelerate`, {
			method: 'POST',
			...defaultFetchOpts(),
		});
	} catch (error) {
		console.log("Problem with accelerate request::", error);
	}
}
