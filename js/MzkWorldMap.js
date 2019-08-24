import WorldMapView from './WorldMapView.js';

class MzkWorldMap {
  constructor(options) {
    this.readJSONFile(options.worldDataPath, worldData => {
      this._view = new WorldMapView({
        debug: true,
        renderTo: options.renderTo,
        countryClicked: this._countryClicked,
        worldData: worldData,
        CONST: {
          CLOUDS: ['fair', 'africa', 'asia', 'australia', 'europe', 'na'],
          RADIUS: {
            EARTH: 0.5,
            MOON: 0.25,
            SUN: 2,
            SCENE: 200
          }
        }
      });
    });
  }


  _countryClicked(renderTo, info) {
    const filled = document.querySelector('.toast');
    renderTo.innerHTML = filled.innerHTML;
    renderTo.querySelector('#sc-country-name').innerHTML = info.name;
    renderTo.querySelector('#sc-flag').src = `assets/img/flags/${info.trigram}.svg`;
    console.log(info);
  }


  readJSONFile(path, callback) {
    const req = new XMLHttpRequest();
    req.overrideMimeType('application/json');
    req.open('GET', path, true);
    req.onreadystatechange = () => {
      if (req.readyState === 4 && req.status == '200') {
        callback(JSON.parse(req.responseText));
      }
    };
    req.send(null);
  }


}


export default MzkWorldMap;
