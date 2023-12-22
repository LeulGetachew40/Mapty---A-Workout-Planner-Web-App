'use strict';

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10);
  clicks = 0;
  constructor(coords, distance, duration) {
    this.distance = distance; //in KM
    this.duration = duration; // in Min
    this.coords = coords; // [lat, lng]
  }
  click() {
    this.clicks++;
    console.log(this.clicks);
  }
}

class Running extends Workout {
  type = 'running';
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this._workoutIcon = L.icon({
      iconUrl: 'jogging.png',

      iconSize: [32, 37],
      iconAnchor: null,
      popupAnchor: [0, -20],
    });

    this.calcPace();
  }
  calcPace() {
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  type = 'cycling';
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this._workoutIcon = L.icon({
      iconUrl: 'cycling.png',

      iconSize: [32, 37],
      iconAnchor: null,
      popupAnchor: [0, -20],
    });
    this.calcSpeed();
  }
  calcSpeed() {
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

/// FOR THE APPLICATION ARCHITECTURE

let map;
let mapEvent;

class App {
  #workouts = [];
  #map;
  #mapEvent;
  #mapZoomLevel = 13;
  // this method is called immediately as soon as we create a new instance from the class
  // so if we create an instance inside the code, it will run immedately when the script is loaded
  constructor() {
    this._getPosition();

    this._getLocalStorage();

    // when we click 'enter' key or submit the form
    // attached to the _newWorkout method
    form.addEventListener('submit', this._newWorkout.bind(this));

    // attached to the _toggleElevationField method
    inputType.addEventListener('change', this._toggleElevationField.bind(this));

    containerWorkouts.addEventListener('click', this._moveToMarker.bind(this));
  }

  _getPosition() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert(`Couldn't get your location`);
        }
      );
    }
  }
  // success callback
  _loadMap(position) {
    // extract the coordinates using destructuring
    const { latitude, longitude } = position.coords;
    // not 100% accurate but its fine
    // console.log(
    //   `https://www.google.com/maps/@${latitude},${longitude},12z?entry=ttu`
    // );
    const coords = [latitude, longitude];
    // the map is assigned synchronously

    this.#map = L.map('map', { zoomControl: false }).setView(
      coords,
      this.#mapZoomLevel
    );
    // We can change the theme of the tileLayer (.fr/hot/)
    // the tiles are loaded asynchronously
    L.tileLayer('https://tile.openstreetmap.fr/hot/{z}/{x}/{y}.png').addTo(
      this.#map
    );
    document.querySelector('.leaflet-control-attribution').innerText =
      'Mapty : A Workout Planner Web App';

    // L.circle(center, { radius: value }).addTo(map);

    // pin on the map of current position
    L.marker(coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({ autoClose: false, closeOnClick: false, closeButton: false })
      )
      .setPopupContent("I'm Here")
      .openPopup();
    // handling clicks on map
    this.#map.on('click', this._showForm.bind(this));

    this.#workouts.forEach(work => {
      this._renderWorkoutMarker(work);
    });
  }
  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
  }
  _hideForm() {
    // Clear input fields
    inputCadence.value =
      inputDistance.value =
      inputDuration.value =
      inputElevation.value =
        '';
    containerWorkouts.querySelector('.form').classList.toggle('hidden');
  }
  _toggleElevationField() {
    [inputElevation, inputCadence].forEach(el =>
      el.closest('.form__row').classList.toggle('form__row--hidden')
    );
  }
  _renderWorkoutMarker({ coords, _workoutIcon, type, date }) {
    const workoutMarker = L.marker(coords, {
      icon: _workoutIcon,
    })
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 200,
          minwidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${type}-popup`,
        })
      )
      .setPopupContent(
        `${type === 'running' ? '🏃' : '🚴'} ${this._getDescription({
          type,
          date,
        })}`
      );
    workoutMarker.on('mouseover', function () {
      console.log(workoutMarker);
      workoutMarker.openPopup();
    });
    workoutMarker.on('mouseout', function () {
      workoutMarker.closePopup();
    });
  }
  // Activity on Month Date
  _getDescription({ type, date }) {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return `${[type[0].toUpperCase(), type.slice(1)].join('')} on ${
      months[new Date(date).getMonth()]
    }, ${new Date(date).getDate()}`;
  }
  _processSave(workoutObject) {
    this.#workouts.push(workoutObject);
    this._renderWorkoutListItem(workoutObject);
    this._renderWorkoutMarker(workoutObject);
  }
  _newWorkout(evt) {
    // checks whether the input values are not a string
    function validInputs(...inputs) {
      return inputs.every(input => Number.isFinite(input));
    }
    // checks if every input is a positive number
    function allPositive(...inputs) {
      return inputs.every(input => input >= 0);
    }
    evt.preventDefault();
    // extract the lat and lng of the map click event
    if (this.#mapEvent) {
      const { lat, lng } = this.#mapEvent.latlng;
      // Get data from the form
      const type = inputType.value;
      const distance = +inputDistance.value;
      const duration = +inputDuration.value;
      // If workout is running, create running object

      let toWork;
      if (type == 'running') {
        const cadence = +inputCadence.value;
        //  Check if the data is valid
        if (
          !validInputs(distance, duration, cadence) ||
          !allPositive(distance, duration, cadence)
        ) {
          return alert('Please enter POSITIVE numeric values');
        }
        // coords, distance, duration, cadence
        toWork = new Running([lat, lng], distance, duration, cadence);
      }

      // If workout is cycling, create cycling object
      else if (type == 'cycling') {
        const elevation = +inputElevation.value;
        //  Check if the data is valid
        if (
          !validInputs(distance, duration, elevation) ||
          !allPositive(distance, duration, elevation)
        ) {
          return alert('Please enter POSITIVE numeric values');
        }
        // coords, distance, duration, elevationGain
        toWork = new Cycling([lat, lng], distance, duration, elevation);
        // If we want animation as well
        // this.#map.flyTo([19.021871978194826, 38.74502420425415], 8);

        // need to figure out how to pass in the zoom level here as well
        // this.#map.panTo(new L.LatLng(19.021871978194826, 38.74502420425415));

        // I used the setView method on the map with a pan option
      }
      // clear the event that the button was clicked,
      // so for the next form submission we will click a location on the map
      this.#mapEvent = null;
      this._processSave(toWork);

      // Set the localStorage Item for either the cycling or the running workout
      this._setLocalStorage();
    } else {
      alert('Select a workout location');
    }
  }
  _renderWorkoutListItem(workout) {
    this._hideForm();
    let html = `<li class="workout workout--${workout.type}" data-id="${
      workout.id
    }">
  <h2 class="workout__title">${this._getDescription(workout)}</h2>
  <div class="workout__details">
    <span class="workout__icon">${
      workout.type === 'running' ? '🏃' : '🚴'
    }</span>
    <span class="workout__value">${workout.distance}</span>
    <span class="workout__unit">km</span>
  </div>
  <div class="workout__details">
    <span class="workout__icon">⏱</span>
    <span class="workout__value">${workout.duration}</span>
    <span class="workout__unit">min</span>
  </div>`;
    // Need to only add unique list item
    if (workout.type == 'running') {
      html += `
    <div class="workout__details">
      <span class="workout__icon">⚡️</span>
      <span class="workout__value">${workout.cadence}</span>
      <span class="workout__unit">min/km</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">🦶🏼</span>
      <span class="workout__value">${workout.pace.toFixed(1)}</span>
      <span class="workout__unit">spm</span>
    </div>
  </li>`;
    } else if (workout.type == 'cycling') {
      html += `
      <div class="workout__details">
        <span class="workout__icon">⚡️</span>
        <span class="workout__value">${workout.speed.toFixed(1)}</span>
        <span class="workout__unit">km/h</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">⛰</span>
        <span class="workout__value">${workout.elevationGain}</span>
        <span class="workout__unit">m</span>
      </div>
    </li>`;
    } // we insert it next to the form because we are inserting it as a sibling
    // then we will hide the form
    // still confuding need to learn more
    form.insertAdjacentHTML('afterend', html);
  }
  _moveToMarker(e) {
    const workoutEl = e.target.closest('.workout');

    if (workoutEl) {
      const workout = this.#workouts.find(workout => {
        return workoutEl.dataset.id == workout.id;
      });
      this.#map.setView(workout.coords, this.#mapZoomLevel, {
        pan: {
          animate: true,
          duration: 1,
        },
      });
      // workout.click();
    }
  }
  _setLocalStorage() {
    // we will only contact the this.#workouts, then we will store it on the localStorage
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }
  _getLocalStorage() {
    let storedWorkouts = JSON.parse(localStorage.getItem('workouts'));

    // overwrite the stored Workouts on the app class
    if (storedWorkouts) {
      this.#workouts = storedWorkouts;
      this.#workouts.forEach(workout => {
        if (workout.type == 'running') {
          workout.__proto__ = Running.prototype;
        } else {
          workout.__proto__ = Cycling.prototype;
        }
        this._renderWorkoutListItem(workout);
      });
    }
  }
  reset() {
    localStorage.removeItem('workouts');

    //refreshes the page
    location.reload();
  }
}

const app = new App();
// app.reset();

// Geolocation API
// navigator.geolocation.getCurrentPosition(successCallback, failureCallback)

// To make sure it doesn't fail on old browsers
// It has to support the geolocation api
// We need to make sure it has the navigator.geolocation property in the api

// 75100311485

/// TASKS AT HAND
// - retrieve the workouts and display them on the list
// - generate a workout item and render it on the list
// - properly handle the localStorage using a function
// - properly handle the html string
