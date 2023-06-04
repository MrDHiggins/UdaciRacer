// The store will hold all information needed globally
let store = {
	track_id: undefined,
	player_id: undefined,
	race_id: undefined,
}

// We need our javascript to wait until the DOM is loaded
document.addEventListener("DOMContentLoaded", function() {
	onPageLoad()
	setupClickHandlers()
})

async function onPageLoad() {
	try {
		getTracks()
			.then(tracks => {
				const html = renderTrackCards(tracks)
				renderAt('#tracks', html)
			})

		getRacers()
			.then((racers) => {
				const html = renderRacerCars(racers)
				renderAt('#racers', html)
			})
	} catch(error) {
		console.log("Problem getting tracks and racers ::", error.message)
		console.error(error)
	}
}

function setupClickHandlers() {
	document.addEventListener('click', function(event) {
		const { target } = event

		let parentEl = event.target.parentElElement

		if(parentEl.matches('.card.track')){
			handleSelectTrack(parentEl);
		}

		if(parentEl.matches('.card.podracer')){
			handleSelectPodRacer(parentEl);
		}

		// Race track form field
		if (target.matches('.card.track')) {
			handleSelectTrack(target)
		}

		// Podracer form field
		if (target.matches('.card.podracer')) {
			handleSelectPodRacer(target)
		}

		// Submit create race form
		if (target.matches('#submit-create-race')) {
			event.preventDefault()
	
			// start race
			handleCreateRace()
		}

		// Handle acceleration click
		if (target.matches('#gas-peddle')) {
			handleAccelerate(target)
		}

	}, false)
}

async function delay(ms) {
	try {
		return await new Promise(resolve => setTimeout(resolve, ms));
	} catch(error) {
		console.log("an error shouldn't be possible here")
		console.log(error)
	}
}
// ^ PROVIDED CODE ^ DO NOT REMOVE

// This async function controls the flow of the race, add the logic and error handling
async function handleCreateRace() {

	const { track_name, player_id, race_id } = store;

  //Alert user if they haven't selected a track or racer
  if(!track_name || !player_id) {
    alert("Please select a track and racer to start the race.")
  }

  try{
    const race = await createRace(player_id, track_id);
    renderAt('#race', renderRaceStartView(race.Track));
    race_id = parseInt(race.ID) - 1;
    await runCountdown();
    await startRace(race_id);
    await runRace(race_id);
  } catch(error) {
    console.log("Problem with handleCreateRace request: ", error)
  }
}

function runRace(raceID) {
	return new Promise(resolve => {
    const raceInterval = setInterval(async () => {
      await getRace(raceID)
        .then(res => {
          if(res.status === "in-progress") {
            renderAt('#leaderBoard', raceProgress(res.positions))
          } else if(res.status === "finished") {
            clearInterval(raceInterval);
            renderAt('#race', resultsView(res.positions))
            resolve(res)
          }
        })
        .catch(err => console.log("Problem with runRace request: ", err))
	}, 500)
	
	})
}

async function runCountdown() {
	try {
		await delay(1000)
		let timer = 3

		return new Promise(resolve => {
      const interval = setInterval(() => {

        for(let i = 0; i < timer; timer--) {
          document.getElementById('big-numbers').innerHTML = timer;

          if(timer === 0) {
            clearInterval(interval);
            resolve();
            return;
          }
        }
			}, 1000) 
		})
	} catch(error) {
		console.log(error);
	}
}

function handleSelectPodRacer(target) {
	console.log("selected pod: ", target.id)

	// remove class selected from all racer options
	const selected = document.querySelector('#racers .selected')
	if(selected) {
		selected.classList.remove('selected')
	}

	// add class selected to current target
	target.classList.add('selected')

	// TODO - save the selected racer to the store
	store.player_id = target.id;
	
}

function handleSelectTrack(target) {

	// remove class selected from all track options
	const selected = document.querySelector('#tracks .selected')
	if(selected) {
		selected.classList.remove('selected')
	}

	// add class selected to current target
	target.classList.add('selected')

	// TODO - save the selected track id to the store
	store.track_id = target.id;
	store.track_name = target.innerText;

	const { track_name } = store;

	console.log(`Testing track name: ${track_name}`)

}

function handleAccelerate() {
	console.log("accelerate button clicked")
	// TODO - Invoke the API call to accelerate
}

// HTML VIEWS ------------------------------------------------
// Provided code - do not remove

function renderRacerCars(racers) {
	if (!racers.length) {
		return `
			<h4>Loading Racers...</4>
		`
	}

	const results = racers.map(renderRacerCard).join('')

	return `
		<ul id="racers">
			${results}
		</ul>
	`
}

function renderRacerCard(racer) {
	const { id, driver_name, top_speed, acceleration, handling } = racer

	return `
		<li class="card podracer" id="${id}">
			<h3>${driver_name}</h3>
			<p>${top_speed}</p>
			<p>${acceleration}</p>
			<p>${handling}</p>
		</li>
	`
}

function renderTrackCards(tracks) {
	if (!tracks.length) {
		return `
			<h4>Loading Tracks...</4>
		`
	}
	
	const results = tracks.map(renderTrackCard).join('')

	return `
		<ul id="tracks">
			${results}
		</ul>
	`
}

function renderTrackCard(track) {
	const { id, name } = track

	return `
		<li id="${id}" class="card track">
			<h3>${name}</h3>
		</li>
	`
}

function renderCountdown(count) {
	return `
		<h2>Race Starts In...</h2>
		<p id="big-numbers">${count}</p>
	`
}

function renderRaceStartView(trackName) {
	store.track_name = trackName;
	return `
		<header>
			<h1>Race: ${trackName}</h1>
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
	`
}

function resultsView(positions) {
	positions.sort((a, b) => (a.final_position > b.final_position) ? 1 : -1)

	return `
		<header>
			<h1>Race Results</h1>
		</header>
		<main>
			${raceProgress(positions)}
			<a href="/race">Start a new race</a>
		</main>
	`
}

function raceProgress(positions) {
	let userPlayer = positions.find(e => e.id === store.player_id)
	userPlayer.driver_name += " (you)"

	positions = positions.sort((a, b) => (a.segment > b.segment) ? -1 : 1)
	let count = 1

	const results = positions.map(p => {
		return `
			<tr>
				<td>
					<h3>${count++} - ${p.driver_name}</h3>
				</td>
			</tr>
		`
	})

	return `
		<main>
			<h3>Leaderboard</h3>
			<section id="leaderBoard">
				${results}
			</section>
		</main>
	`
}

function renderAt(element, html) {
	const node = document.querySelector(element)

	node.innerHTML = html
}

// ^ Provided code ^ do not remove


// API CALLS ------------------------------------------------

const SERVER = 'http://localhost:3001'

function defaultFetchOpts() {
	return {
		mode: 'cors',
		headers: {
			'Content-Type': 'application/json',
			'Access-Control-Allow-Origin' : SERVER,
		},
	}
}

// TODO - Make a fetch call (with error handling!) to each of the following API endpoints 

function getTracks() {
	// GET request to `${SERVER}/api/tracks`
	return fetch(`${SERVER}/api/tracks`, {
			method: 'GET',
			...defaultFetchOpts(),
		})
		.then(res => res.json())
		.catch(err => console.log("Problem with getTracks request: ", err))
	}

function getRacers() {
	// GET request to `${SERVER}/api/cars`
		return fetch(`${SERVER}/api/cars`, {
			method: 'GET',
			...defaultFetchOpts(),
		})
		.then(res => res.json())
		.catch(err => console.log("Problem with getRacers request: ", err))
}

async function createRace(player_id, track_id) {
	player_id = parseInt(player_id)
	track_id = parseInt(track_id)
	const body = { player_id, track_id }
	
	try {
		const res = await fetch(`${SERVER}/api/races`, {
			method: 'POST',
			...defaultFetchOpts(),
			dataType: 'jsonp',
			body: JSON.stringify(body)
		})
		return await res.json()
	} catch (err) {
		return console.log("Problem with createRace request: ", err)
	}
}

function getRace(id) {
	// GET request to `${SERVER}/api/races/${id}`
		return fetch(`${SERVER}/api/races/${id}`, {
			method: 'GET',
			...defaultFetchOpts(),
			})
			.then(res => res.json())
			.catch(err => console.log("Problem with getRace request: ", err))
}

function startRace(id) {
	return fetch(`${SERVER}/api/races/${id}/start`, {
		method: 'POST',
		...defaultFetchOpts(),
	})
	.then(res => res.json())
	.catch(err => console.log("Problem with getRace request:", err))
}

function accelerate(id) {
	// POST request to `${SERVER}/api/races/${id}/accelerate`
	// options parameter provided as defaultFetchOpts
	// no body or datatype needed for this request
}
