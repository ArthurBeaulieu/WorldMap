/* Class utils import */
import WorldMapView from './view/WorldMapView.js';
import Constants from './utils/Constants.js';


class MzkWorldMap {


  /** @author Arthur Beaulieu
   * @param {object} options
   * @param {string} options.baseUrl - URL to for 'assets/' folder
   * @param {object} options.renderTo - The DOM element to render MzkWorldMap to
   * @param {function} [options.countryClicked] - The callback to call when a country is clicked
   * @param {object} [options.userData] - User 'object per country' data, see README.md
   * @param {object} [options.centerOn] - The country to center world map on **/
  constructor(options) {
    // Save options in controller
    this._assetsUrl = options.assetsUrl || null;
    this._renderTo = options.renderTo || null;
    if (this._renderTo === null || this._assetsUrl === null) {
      console.error('Missing arguments in new MzkWorldMap()'); return;
    }
    // Optional arguments
    this._countryClicked = options.countryClicked || (() => {});
    this._userData = options.data || { type: 'default', countries: [] };
    this._centerOn = options.centerOn || 'FRA';
    // Check local storage for previous preferences
    this._preferences = this._getLocalPreferences();
    this._view = null; // Active WorldMapView
    // Init parent with css base style for views to be properly rendered
    this._renderTo.classList.add('mzkworldmap');
    // Determine if session is user first connection
    if (!this._hasLocalPreferences()) { // No local preferences or incorrect local preferences
      this._buildConfigurationView({ emptyLocalStorage: true }); // Init with configuration to store preferences
    } else {
      this._buildWorldMapView(); // Build WorldMapView with local preferences
    }
  }


  /** Destroy view and all internals **/
  destroy() {
    return new Promise(resolve => {
      this._view.destroy();
      // Delete object attributes
      Object.keys(this).forEach(key => { delete this[key]; });
      resolve();
    });
  }


  /*  ----------  WorlMapView handler and configurator  ----------  */


  /** Build the configuration view either with local preferences or nothing
   * The configuration view aim to modify the WorldMapView rendering according to graphical preferences.
   * The method will render the ConfigurationHTML template to its parent (this._renderTo) full size and wait a <form> submission event.
   * When submitted, preferences are saved in the local storage to skip this configuration view on user's next session.
   * When true, the options.emptyLocalStorage flag will initialize radios and checkbox according to the local storage content.
   * When false, it will keep the initial template radios (all radio checked with Medium, Debug unchecked).
   * It provides preferences for texture resolution, geojson point distance, sphere segments and shadow map resolution.
   * For each of these preferences, there are three levels ; Low, Medium and High.
   * Finally, a debug checkbox allow to open map with THREE helpers displayed **/
  _buildConfigurationView(options) {
    // The container form container (mostly define padding on sides)
    const container = document.createElement('DIV');
    container.classList.add('configuration-form');
    container.innerHTML = Constants.ConfigurationHTML; // Import configuration HTML
    // Set checked radio and checkbox according to local preferences if session has valid preferences
    if (options.emptyLocalStorage === false) {
      this._preferences = this._getLocalPreferences();
      container.querySelector(`#id-${this._preferences.textureQuality}`).checked = true;
      container.querySelector(`#id-${this._preferences.borderPrecision}`).checked = true;
      container.querySelector(`#id-${this._preferences.sphereSegments}`).checked = true;
      container.querySelector(`#id-${this._preferences.shadowResolution}`).checked = true;
      container.querySelector(`#id-trueSpeeds`).checked = this._preferences.trueSpeeds;
      container.querySelector(`#id-debug`).checked = this._preferences.debug;
    }
    // Handle form submission
    const form = container.querySelector('form');
    form.addEventListener('submit', event => {
      event.preventDefault(); // Prevent location redirection with params
      const data = new FormData(form);
      const output = [];
      // Iterate over radios/checkboxes to extract values
      for (const entry of data) {
        output.push(entry[1]);
      }
      // Set true speeds from checkbox state
      let trueSpeeds = form[12].checked;
      // Set debug from checkbox state
      let debug = form[13].checked;
      // Update local storage and session preferences
      this._setLocalPreferences(output, trueSpeeds, debug);
      this._preferences = this._getLocalPreferences();
      // Remove configuration view and build WorldMapView
      requestAnimationFrame(() => {
        container.style.opacity = 0
        setTimeout(() => {
          this._renderTo.removeChild(container);
          this._buildWorldMapView();
        }, 1000); // 2.5s delay according to CSS transition value
      });
    }, false);
    // Append configuration view and start opacity transition
    this._renderTo.appendChild(container);
    requestAnimationFrame(() => container.style.opacity = 1);
  }


  /** Build a WorldMapView with local preferences.
   * The wmv allows to navigate in 3D around Earth, click on countries and do stuff on caller to those country clicked.
   * As this view is meant to be launched as a plugin, several data must be retrieved:
   * - The ManaZeak WorldData, that contains all countries, with capital city and country center lat/long among others.
   * - The Geo data (geojson) that will allow the country clicking part, also to render countries as unique meshes.
   * - Finally, the library data is an external object that contains country with artists (the ones to be displayed with a bar).
   * Graphical preferences must be sent through the wmv constructor (implying they are already set when calling new). **/
  _buildWorldMapView() {
    const worldDataPath = `${this._assetsUrl}json/WorldData.json` // WorldData is lat/long for all countries
    const geoPath = `${this._assetsUrl}json/GeojsonData_${this._preferences.borderPrecision}.json`; // All world geojson dataset must be loaded to draw boundaries properly
    // Load ManaZeak WorldData and Geo data according to given base url and build WorldMapView with all parameters
    this._readJSONFile(worldDataPath)
      .then(worldData => {
        this._readJSONFile(geoPath)
          .then(geoData => {
            this._view = new WorldMapView({
              renderTo: this._renderTo, // DOM element to render canva to
              assetsUrl: this._assetsUrl || './', // Fallback on local execution context
              countryClickedCB: this._countryClicked, // Country clicked external callback
              configurationCB: this._congigurationClicked.bind(this), // Keep scope at definition
              worldData: worldData, // Lat/Long for interresting points
              userData: this._buildFinalData(worldData, this._userData, geoData), // Extend library data with world data (only country that has artists will be filled)
              centerOn: this._centerOn,
              geoData: geoData, // Raw Geojson data
              preferences: this._preferences // Local storage preferences
            });
            // Clean WebGL and WorldMapView when user leave page
            window.addEventListener('beforeunload', this.destroy.bind(this), false);
          }) // Catch for geojson data loading
          .catch(err => console.error(err));
      }) // Catch for world data loading
      .catch(err => console.error(err));
  }


  /** Callback that needs to be sent to WorldMapView, to open up the configuration view when clicked on gear icon.
   * This allow to destroy the current WorldMapView to launch it again with new settings without reloading.
   * Since this method is called from WorldMapView, and therefor testifies that preferences are set, we build the
   * configuration view with the local storage content (emptyLocalStorage false). **/
  _congigurationClicked() {
    this._buildConfigurationView({ emptyLocalStorage: false });
    setTimeout(() => {
      this._view.destroy().then(() => this._view = null);
    }, 2000); // Delay view destruction to let fade in animation end
  }


  /*  ----------  Local storage utils  ----------  */


  /** Get local storage items and return as preferences object with these.
   * Debug must be json parsed because local storage only contains string. **/
  _getLocalPreferences() {
    return {
      textureQuality: localStorage.getItem('mzkworldmap-texture-quality'),
      borderPrecision: localStorage.getItem('mzkworldmap-border-precision'),
      sphereSegments: localStorage.getItem('mzkworldmap-sphere-segments'),
      shadowResolution: localStorage.getItem('mzkworldmap-shadow-resolution'),
      trueSpeeds: JSON.parse(localStorage.getItem('mzkworldmap-true-speeds')), // Convert string to bool
      debug: JSON.parse(localStorage.getItem('mzkworldmap-debug')) // Convert string to bool
    };
  }


  /** Set local storage items according to submitted form values in configuration HTML. **/
  _setLocalPreferences(preferences, trueSpeeds, debug) {
    // Array order follows HTML template order
    localStorage.setItem('mzkworldmap-texture-quality', preferences[0]);
    localStorage.setItem('mzkworldmap-border-precision', preferences[1]);
    localStorage.setItem('mzkworldmap-sphere-segments', preferences[2]);
    localStorage.setItem('mzkworldmap-shadow-resolution', preferences[3]);
    localStorage.setItem('mzkworldmap-true-speeds', trueSpeeds);
    localStorage.setItem('mzkworldmap-debug', debug);
  }


  /** Return true only when local storage do contain every needed preferences, and with values
   * that are valid to send in WorldMapView, return false otherwise. **/
  _hasLocalPreferences() {
    return Constants.ConfigurationValues.textures.indexOf(this._preferences.textureQuality) !== -1 &&
           Constants.ConfigurationValues.borders.indexOf(this._preferences.borderPrecision) !== -1 &&
           Constants.ConfigurationValues.segments.indexOf(this._preferences.sphereSegments) !== -1 &&
           Constants.ConfigurationValues.shadows.indexOf(this._preferences.shadowResolution) !== -1 &&
           typeof this._preferences.trueSpeeds === 'boolean' &&
           typeof this._preferences.debug === 'boolean'; // Debug checkbox in necessarly a bool
  }


  /*  ----------  WorldMapView controller utils  ----------  */


  /** This method prepare libraryData for WorldMapView. A height scale must be computed, according to artists count.
   * The height scale factor represents the 'weight' of a country by its artists number. Countries with lot of artists
   * will be rendered with a high cylinder on country center. Otherwise, the cylinder will remain low.
   * Output array contains countries with artists, relative scale, and extend every property of their respective country from ManaZeak WorldData **/
  _buildFinalData(worldData, userData, geoData) {
    const output = []; // Output array that consist of all countries that has artists
    const type = userData.type; // Get data object type per country
    let maxCount = 0; // The maxArtistsCount is to know which country have the most artists, so it can be the high bound for pin height
    // First of, we only select contries that have artists
    for (let i = 0; i < userData.countries.length; ++i) {
      for (let j = 0; j < worldData.countries.length; ++j) {
        // We found in world data, the country associated with the current library data country
        if (userData.countries[i].trigram === worldData.countries[j].trigram) {
          const country = worldData.countries[j];
          country[type] = userData.countries[i][type]; // Append objects in output
          // Update country that has the most artists if needed
          if (maxCount < userData.countries[i][type].length) {
            maxCount = userData.countries[i][type].length;
          }
          output.push(country); // Completting output array with current artist
          break; // Go on to next data country, break worldData iteration
        }
      }
    }
    // Then we fill each selected countries with geojson properties
    for (let i = 0; i < output.length; ++i) {
      // Then we compute their associated height on map in percentage
      output[i].scale = output[i][type].length / maxCount;
      for (let j = 0; j < geoData.features.length; ++j) {
        if (output[i].trigram === geoData.features[j].properties.GU_A3) {
          // Extend geojson properties
          output[i] = { ...output[i], ...geoData.features[j].properties };
          break;
        }
      }
    }
    // Finally return data object
    return output;
  }


  /** Read JSON file with XMLHttpRequest.
   * When running standalone, the browser cors policy must be disabled to load local JSON files.
   * Please beware to set this cors policy back to its default when done playing with MzkWorldMap. **/
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
              reject(`Error when loading ${path}.\nPlease contact support@manazeak.org (request status: ${request.status}).`);
            }
          }
        };
        request.send();
      } catch(err) {
        reject(`Error when loading ${path}.\nPlease contact support@manazeak.org (${err}).`);
      }
    });
  }


}


// Global scope attachment will be made when bundling this file
window.MzkWorldMap = MzkWorldMap;
export default MzkWorldMap;
