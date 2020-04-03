import WorldMapView from './WorldMapView.js';


class MzkWorldMap {


  constructor(options) {
    this._readJSONFile(options.worldDataPath)
      .then(worldData => {
        this._readJSONFile(options.libraryDataPath)
          .then(libraryData => {
            this._readJSONFile(options.geoDataPath)
              .then(geoData => {
                this._view = new WorldMapView({
                  renderTo: options.renderTo,
                  countryClicked: options.countryClicked,
                  worldData: this._buildFinalData(worldData, libraryData),
                  geoData: geoData,
                  const: options.const,
                  debug: options.debug
                });
                // Clean WebGL and WorldMapView when user leave page
                window.addEventListener('beforeunload', this.destroy.bind(this), false);
          }).catch(err => console.error(err));
      }).catch(err => console.error(err));
    }).catch(err => console.error(err));
  }


  destroy() {
    return new Promise(resolve => {
      this._view.destroy();
      delete this._view;
      resolve();
    });
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


}


export default MzkWorldMap;
