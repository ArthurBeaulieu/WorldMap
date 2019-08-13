import WorldMapView from './WorldMapView.js';

class MzkWorldMap {
  constructor(options) {
    this.readJSONFile(options.worldDataPath, worldData => {
      this._view = new WorldMapView({
        debug: true,
        renderTo: options.renderTo,
        worldData: worldData,
        CONST: {
          CLOUDS: ['fair', 'africa', 'asia', 'australia', 'europe', 'na'],
          SIZES: { // Meter diameter sizes
            EARTH: 12756274,
            MOON: 3476000,
            SUN: 139200000000
          },
          DISTANCES: { // Meters
            MOON: 384400,
            SUN: 149597870700
          }
        }
      });
    });
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
