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
          RADIUS: {
            EARTH: 0.5,
            MOON: 0.33,
            SUN: 5,
            SCENE: 100
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
