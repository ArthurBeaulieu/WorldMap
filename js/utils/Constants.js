/* ----------  MzkWorldMap version  ----------  */


const MzkWorldMapVersion = '0.9.3';


/* ----------  MzkWorldMap.js specific ----------  */


// Configuration menu constants
const ConfigurationHTML = `
  <h1>MzkWorldMap ${MzkWorldMapVersion}</h1>
  <p>Please set the following preferences, according to your computer's specifications.<br>
  <i>MzkWorldMap</i> requires a modern web browser that uses WebGL for 3D animation.</p>
  <form>
    <div>
      <h3>Texture quality :</h3>
      <p>Select the default resolution to be used when building world map.<br>
      <span class="warning">Warning, this has a heavy network cost.</span></p>
      <label class="custom-control custom-radio">
        Low (2K, 2048 x 1024)
        <input type="radio" id="id-2k" name="textureQuality" value="2k">
        <div class="custom-box round"></div>
      </label><br>
      <label class="custom-control custom-radio">
        Medium (4K, 4096 x 2048)
        <input type="radio" id="id-4k" name="textureQuality" value="4k" checked>
        <div class="custom-box round"></div>
      </label><br>
      <label class="custom-control custom-radio">
        High (8K, 8192 x 2048)
        <input type="radio" id="id-8k" name="textureQuality" value="8k">
        <div class="custom-box round"></div>
      </label>
    </div><div>
      <h3>Country border precision :</h3>
      <p>Select the max distance between points to draw country borders.<br>
      <span class="warning">Warning, this has a heavy CPU cost.</span></p>
      <label class="custom-control custom-radio">
        Low (110m)
        <input type="radio" id="id-110m" name="borderPrecision" value="110m">
        <div class="custom-box round"></div>
      </label><br>
      <label class="custom-control custom-radio">
        Medium (50m)
        <input type="radio" id="id-50m" name="borderPrecision" value="50m" checked>
        <div class="custom-box round"></div>
      </label><br>
      <label class="custom-control custom-radio">
        High (10m)
        <input type="radio" id="id-10m" name="borderPrecision" value="10m">
        <div class="custom-box round"></div>
      </label>
    </div><div>
      <h3>Sphere segments :</h3>
      <p>Select the number of segments needed to draw a sphere.<br>
      <span class="info">Moderate impact on CPU.</span></p>
      <label class="custom-control custom-radio">
        Low (32)
        <input type="radio" id="id-32" name="sphereSegments" value="32">
        <div class="custom-box round"></div>
      </label><br>
      <label class="custom-control custom-radio">
        Medium (64)
        <input type="radio" id="id-64" name="sphereSegments" value="64" checked>
        <div class="custom-box round"></div>
      </label><br>
      <label class="custom-control custom-radio">
        High (128)
        <input type="radio" id="id-128" name="sphereSegments" value="128">
        <div class="custom-box round"></div>
      </label>
    </div><div>
      <h3>Shadow resolution :</h3>
      <p>Define the shadow map square resolution.<br>
      <span class="warning">Warning, this has a heavy CPU cost.</span></p>
      <label class="custom-control custom-radio">
        Low (512x512)
        <input type="radio" id="id-512" name="shadowResolution" value="512">
        <div class="custom-box round"></div>
      </label><br>
      <label class="custom-control custom-radio">
        Medium (2048x2048)
        <input type="radio" id="id-2048" name="shadowResolution" value="2048" checked>
        <div class="custom-box round"></div>
      </label><br>
      <label class="custom-control custom-radio">
        High (8192x8192)
        <input type="radio" id="id-8192" name="shadowResolution" value="8192">
        <div class="custom-box round"></div>
      </label>
    </div>
    <label class="custom-control custom-checkbox">
      True speeds
      <input type="checkbox" id="id-trueSpeeds" name="trueSpeeds">
      <div class="custom-box"></div>
    </label>
    <label class="custom-control custom-checkbox">
      Debug modes
      <input type="checkbox" id="id-debug" name="debug">
      <div class="custom-box"></div>
    </label>
    <button type="submit">Start MzkWorldMap</button>
  </form>
`;


// Allowed values for preferences
const ConfigurationValues = {
  textures: ['2k', '4k', '8k'],
  borders: ['110m', '50m', '10m'],
  segments: ['32', '64', '128'],
  shadows: ['512', '2048', '8192']
};


/* WMV */
// Scene constants, for consistent values across features
const Scene = {
  RADIUS: {
    EARTH: 0.5,
    MOON: 0.25,
    SUN: 2,
    SCENE: 220
  },
  DISTANCE: {
    MOON: 8,
    SUN: 200,
    CLOUDS: 0.004,
    ATMOSPHERE: 0.004,
    COUNTRY: 0.01
  },
  PIN: {
    HEIGHT: 0.1,
    WIDTH: 0.002
  },
  ANIMATION: {
    CAMERA: 366,
    ICON: 5000
  }
};


// Angular speeds used for animation
const AngularSpeeds = {
  moon: ((2 * Math.PI) / (27.3 * 60 * 60)) * 12,
  sun: ((2 * Math.PI) / (365.25 * 24 * 60 * 60)) * 12,
  clouds: (2 * Math.PI) / (20 * 60 * 60),
  camera: ((2 * Math.PI) / (60 * 120)),
  particles: (2 * -Math.PI) / (365 * 10 * 60),
  milkyway: (2 * -Math.PI) / (20 * 60 * 60),
  r_moon: (2 * Math.PI) / (27.3 * 24 * 60 * 60),
  r_sun: (2 * Math.PI) / (365.25 * 24 * 60 * 60)
};


/* MeshFactory */
const MeshUtils = {
  antiMeridian: new THREE.Vector2((Math.PI) / (2 * Math.PI), 0)
};


export default {
  MzkWorldMapVersion: MzkWorldMapVersion,
  ConfigurationHTML: ConfigurationHTML,
  ConfigurationValues: ConfigurationValues,
  Scene: Scene,
  MeshUtils: MeshUtils,
  AngularSpeeds: AngularSpeeds
};
