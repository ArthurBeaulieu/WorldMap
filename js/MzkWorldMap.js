import WorldMapView from './WorldMapView.js';


class MzkWorldMap {


  constructor(options) {
    // Save options in controller
    this._renderTo = options.renderTo;
    this._baseUrl = options.baseUrl;
    this._libraryDataPath = options.libraryDataPath
    this._countryClicked = options.countryClicked;
    this._debug = options.debug;
    this._preferences = this._getLocalPreferences();
    this._view = null;
    // We must here invite the user to set texture quality and border precision settings
    if (!this._preferences.textureQuality || !this._preferences.borderPrecision || !this._preferences.sphereSegments) {
      this._buildWelcomePage();
    } else {
      this._buildWorldMapView();
    }
  }


  destroy() {
    return new Promise(resolve => {
      this._view.destroy();
      delete this._view;
      resolve();
    });
  }


  _buildWelcomePage() {
    const container = document.createElement('DIV');
    container.classList.add('configuration-form');
    // Less expensive in lines to HTML in Js
    container.innerHTML = `
      <h1>MzkWorldMap configuration</h1>
      <p>Please set the following preferences, according to your computer's specifications.<br>
      <i>MzkWorldMap</i> requires a modern web browser that uses WebGL for 3D animation.</p>
      <form>
        <h3>Texture quality :</h3>
        <p>Select the default resolution to be used when building world map.<br>
        <span>Warning, this has a heavy network cost.</span></p>
        <label for="2k">Low (2048 x 1024)</label>
        <input type="radio" id="2k" name="textureQuality" value="2k"><br>
        <label for="4k">Medium (4096 x 2048)</label>
        <input type="radio" id="4k" name="textureQuality" value="4k" checked><br>
        <label for="2k">High (8192 x 2048)</label>
        <input type="radio" id="8k" name="textureQuality" value="8k">
        <h3>Country border precision :</h3>
        <p>Select the max distance between points to draw country borders.<br>
        <span>Warning, this has a heavy CPU cost.</span></p>
        <label for="2k">Low (110m)</label>
        <input type="radio" id="110m" name="borderPrecision" value="110m"><br>
        <label for="4k">Medium (50m)</label>
        <input type="radio" id="50m" name="borderPrecision" value="50m" checked><br>
        <label for="2k">High (10m)</label>
        <input type="radio" id="10m" name="borderPrecision" value="10m">
        <h3>Sphere segments :</h3>
        <p>Select the number of segments needed to draw a sphere.</p>
        <label for="2k">Low (32)</label>
        <input type="radio" id="32" name="sphereSegments" value="32"><br>
        <label for="4k">Medium (64)</label>
        <input type="radio" id="64" name="sphereSegments" value="64" checked><br>
        <label for="2k">High (128)</label>
        <input type="radio" id="128" name="sphereSegments" value="128"><br>
        <button type="submit">Save</button>
      </form>
    `;
    // Handle form submission
    const form = container.querySelector('form');
    form.addEventListener('submit', (event) => {
      event.preventDefault(); // Prevent location redirection with params
      const data = new FormData(form);
      const output = [];
      // Iterate over radios to extract values
      for (const entry of data) {
        output.push(entry[1]);
      }
      // Update local storage
      localStorage.setItem('mzkworldmap-texture-quality', output[0]);
      localStorage.setItem('mzkworldmap-border-precision', output[1]);
      localStorage.setItem('mzkworldmap-sphere segments', output[2]);
      // Update session preferences
      this._preferences = this._getLocalPreferences();
      // Remove form and open mzk view
      requestAnimationFrame(() => { container.style.opacity = 0 });
      setTimeout(() => { this._renderTo.removeChild(container); this._buildWorldMapView(); }, 2500); // Delay according to CSS transition value
    }, false);
    // Append welcome page and start opacity transition
    this._renderTo.appendChild(container);
    requestAnimationFrame(() => container.style.opacity = 1);
  }


  _buildWorldMapView() {
    const worldDataPath = `${this._baseUrl}assets/json/WorldData.json` // WorldData is lat/long for all countries
    const geoPath = `${this._baseUrl}assets/json/GeojsonData_${this._preferences.borderPrecision}.json`; // All world geojson dataset must be loaded to draw boundaries properly

    this._readJSONFile(worldDataPath)
      .then(worldData => {
        this._readJSONFile(geoPath)
          .then(geoData => {
            this._readJSONFile(this._libraryDataPath)
              .then(libraryData => {
                this._view = new WorldMapView({
                  renderTo: this._renderTo,
                  baseUrl: this._baseUrl || './', // Fallback on local execution context
                  countryClickedCB: this._countryClicked,
                  configurationCB: this._congigurationClicked.bind(this), // Keep scope at definition
                  worldData: worldData,
                  libraryData: this._buildFinalData(worldData, libraryData),
                  geoData: geoData,
                  preferences: this._preferences,
                  debug: this._debug
                });
                // Clean WebGL and WorldMapView when user leave page
                window.addEventListener('beforeunload', this.destroy.bind(this), false);
          }).catch(err => console.error(err));
      }).catch(err => console.error(err));
    }).catch(err => console.error(err));
  }


  _congigurationClicked() {
    this._view.destroy()
      .then(() => {
        this._view = null;
        this._buildWelcomePage();
      });
  }


  /*  ----------  Controller utils  ----------  */


  _getLocalPreferences() {
    return {
      textureQuality: localStorage.getItem('mzkworldmap-texture-quality'),
      borderPrecision: localStorage.getItem('mzkworldmap-border-precision'),
      sphereSegments: localStorage.getItem('mzkworldmap-sphere segments')
    };
  }


  _buildFinalData(worldData, libraryData) {
    const output = []; // Output array that consist of all countries that has artists
    let maxArtistsCount = 0; // The maxArtistsCount is to know which country have the most artists, so it can be the high bound for pin height
    // First of, we only select contries that have artists
    for (let i = 0; i < libraryData.countries.length; ++i) {
      for (let j = 0; j < worldData.countries.length; ++j) {
        if (libraryData.countries[i].trigram === worldData.countries[j].trigram) {
          const country = worldData.countries[j];
          country.artists = libraryData.countries[i].artists; // Append artists in output
          country.artistsCount = libraryData.countries[i].artists.length;
          // Update country that has the most artists if needed
          if (maxArtistsCount < libraryData.countries[i].artists.length) {
            maxArtistsCount = libraryData.countries[i].artists.length;
          }
          output.push(country); // Completting output array with current artist
          break; // Go one to next libraryData country
        }
      }
    }
    // Then we compute their associated height on map in percentage
    for (let i = 0; i < output.length; ++i) {
      output[i].scale = output[i].artists.length / maxArtistsCount;
    }
    // Finally return data object
    return output;
  }


  _readJSONFile(path, callback) {
    return new Promise((resolve, reject) => {
      try {
        const request = new XMLHttpRequest();
        request.overrideMimeType('application/json');
        request.open('GET', path, true);
        request.onreadystatechange = () => {
          if (request.readyState === 4) {
            if (request.status === 200) {
              resolve(JSON.parse(request.responseText));
            } else {
              reject(`Error when loading ${path}.\nPlease contact support (request status: ${request.status}).`);
            }
          }
        };
        request.send();
      } catch(err) {
        reject(`Error when loading ${path}.\nPlease contact support (${err}).`);
      }
    });
  }


}


export default MzkWorldMap;
