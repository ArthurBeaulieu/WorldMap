/* Libs import */
import CustomThreeModule from '../lib/CustomThreeModule.js';
import TWEEN from '../lib/Tween.js';
/* Class utils import */
import TrackballControls from '../utils/TrackballControls.js';
import MeshFactory from '../utils/MeshFactory.js';
import Constants from '../utils/Constants.js';


class WorldMapView {


  constructor(options) {
    // Override THREE TrackBallControl with provided module
    THREE.TrackballControls = TrackballControls;
    // View options
    this._assetsUrl = options.assetsUrl;
    this._renderTo = options.renderTo;
    this._countryClickedCB = options.countryClickedCB;
    this._configurationCB = options.configurationCB;
    this._worldData = options.worldData;
    this._userData = options.userData;
    this._centerOn = options.centerOn;
    this._geoData = options.geoData;
    this._preferences = options.preferences;
    // Texture loading management
    this._manager = null;
    this._loader = null;
    // 3D context internals
    this._scene = null;
    this._camera = null;
    this._controls = null;
    this._renderer = null;
    this._composer = null;
    this._fxaaPass = null;
    this._rafId = -1;
    // Scene meshes
    this._meshes = {
      earth: null,
      earthNight: null,
      earthBoundaries: null,
      earthClouds: null,
      earthAtmosphere: null,
      sun: 0,
      moon: null,
      milkyway: null,
      particles: null
    };
    // Scene lights
    this._lights = {
      sun: null,
      ambient: null
    };
    // Animation pivots to simulate spheres orbiting
    this._pivots = {
      sun: null,
      moon: null,
      particles: null
    };
    // THREE helpers
    this._helpers = {
      worldAxis: null,
      sunLightShadow: null
    };
    // Scene DOM elements
    this._controlsContainer = null;
    this._buttons = {
      left: null,
      autoRotate: null,
      center: null,
      right: null,
      configuration: null
    };
    // Icon opacity timeout id
    this._iconOpacityTimeoutId = null;
    // Camera manipulation
    this._cameraMoveAngle = Math.PI / 6; // Used with associated buttons
    this._cameraAutoRotation = false; // Lock camra auto rotation
    this._lockOnMoon = false;
    this._initialPosition = null;
    // Scene country pins, surface and trigram
    this._selectedCountryTrigram = null;
    this._geoSurfaces = [];
    this._pins = [];
    this._selectedPin = null;
    this._selectedSurfaces = [];
    // Event bindings
    this._onResize = this._onResize.bind(this);
    this._onCanvasClicked = this._onCanvasClicked.bind(this);
    // Define MeshFactory
    this.MeshFactory = new MeshFactory({
      assetsUrl: this._assetsUrl,
      segments: this._preferences.sphereSegments, // 32, 64, 128 depending on pref
      quality: this._preferences.textureQuality // 2k, 4k, 8k depending on pref
    });
    // Init 3D viewer
    this._init();
  }


  destroy() {
    return new Promise(resolve => {
      // Kill animation process
      cancelAnimationFrame(this._rafId);
      // Remove all events in view
      window.removeEventListener('resize', this._onResize, false);
      window.removeEventListener('click', this._onCanvasClicked, false);
      // Remove all internal DOM elements
      this._renderTo.removeChild(this._renderer.domElement);
      this._renderTo.removeChild(this._buttons.configuration);
      this._renderTo.removeChild(this._controlsContainer);
      // Also remove stats container if debug
      if (this._preferences.debug) {
        this._renderTo.removeChild(this._helpers.stats.dom);
      }
      // Dispose, call for destructors and clean parent
      this.MeshFactory.destroy();
      this._controls.destroy();
      this._scene.dispose();
      this._renderer.renderLists.dispose();
      this._renderer.forceContextLoss();
      this._renderer.dispose();
      // Resolve Promise to notify that View has been completely destroyed
      resolve();
    });
  }


  /*  ----------  Class init  ----------  */


  _init() {
    const consolelog = console.log; // Store Js console.log behavior
    if (this._preferences.debug === false) { console.log = () => {}; } // Remove THREE Js log message when not debugging
    // View build sequence
    this._createLoadingManager()
      .then(this._buildViewer.bind(this))
      .then(this._buildLights.bind(this))
      .then(this._buildMeshes.bind(this))
      .then(this._buildControls.bind(this))
      .then(this._buildHelpers.bind(this))
      .then(this._placeAndUpdateElements.bind(this))
      .then(this._fillScene.bind(this))
      .then(this._shaderPass.bind(this))
      .then(this._events.bind(this))
      .then(this._keyEvents.bind(this))
      .then(this.animate.bind(this))
      .then(() => { if (this._preferences.debug === false) { console.log = consolelog; } }) // Restore Js console.log behavior
      .catch(this._initFailed.bind(this));
  }


  _initFailed(error) {
    console.trace(error);
    // Create UI feedback for loading sequence
    const container = document.createElement('DIV');
    container.classList.add('loading-error');
    container.innerHTML = `
      <h1>Loading error</h1>
      <h2>Contact <a href="mailto:support@manazeak.org" alt="support-mail">support@manazeak.org</a></h2>
      <p><i>${error}</i></p>
    `;
    // Append loading container with progress bar
    this._renderTo.innerHTML = '';
    this._renderTo.appendChild(container);
    this.destroy();
  }


  /*  ----------  WorldMapView creation  ----------  */


  _createLoadingManager() {
    return new Promise(resolve => {
      if (this._preferences.debug) { console.log('WorldMapView._createLoadingManager'); }
      // Create UI feedback for loading sequence
      const container = document.createElement('DIV');
      container.classList.add('loading-container');
      container.innerHTML = `
        <h1>ManaZeak World Map</h1>
        <h2>Loading world data...</h2>
        <p>Version ${Constants.MzkWorldMapVersion}</p>
        <div id="track" class="track"><div id="current" class="current"></div></div>
      `;
      // Append loading container with progress bar
      this._renderTo.appendChild(container);
      // We raf to ensure the fade in of loading screen is gonna occur
      requestAnimationFrame(() => {
        container.style.opacity = 1;
        const current = container.querySelector('#current');
        // Now handling texture loader and loading completion
        this._manager = new THREE.LoadingManager();
        // Progress and error callbacks
        this._manager.onError = url => { console.log( `WorldMapView._createLoadingManager: Error loading ${url}`); };
        this._manager.onProgress = (url, loaded, total) => {
          if (this._preferences.debug) { console.log(`WorldMapView._createLoadingManager: Loading file ${url} (${loaded}/${total} loaded)`); }
          current.style.width = `${(loaded / total) * 100}%`;
        };
        // Texture loading complete
        this._manager.onLoad = () => {
          if (this._preferences.debug) { console.log('WorldMapView._createLoadingManager: Loading complete, waiting for browser to render'); }
          // Loading screen can properly disapear with css transition
          container.style.opacity = 0;
          // Delay according to CSS transition value with extra timing
          setTimeout(() => {
            this._renderTo.removeChild(container);
            // Start opacity transition loop (see mouse move event on render to div)
            this._updateOpacityTransition();
            // Animation ended, viewer might be ready
          }, 1000);
        };
        // Define loader to be sent in MeshFactory
        this._loader = new THREE.TextureLoader(this._manager);
        // Ensure all DOM manipulation are done by delaying resolve from animation time
        setTimeout(resolve, 1000);
      });
    });
  }


  _buildViewer() {
    return new Promise((resolve, reject) => {
      if (this._preferences.debug) { console.log('WorldMapView._buildViewer'); }
      try {
        // Viewer utils
        this._scene = new THREE.Scene();
        this._camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 25000);
        // Renderer parameters
        this._renderer = new THREE.WebGLRenderer(); // Anti aliasing is handled by FXAA shader pass
        this._renderer.gammaInput = true;
        this._renderer.gammaOutput = true;
        this._renderer.gammaFactor = 2.3;
        this._renderer.toneMapping = THREE.ReinhardToneMapping;
        this._renderer.shadowMap.enabled	= true;
        // Renderer setters
        this._renderer.setClearColor(0x040404, 1.0);
        this._renderer.setPixelRatio(window.devicePixelRatio);
        this._renderer.setSize(window.innerWidth, window.innerHeight);
        // Append renderer dom to the module parent
        this._renderTo.appendChild(this._renderer.domElement);
        // Build composer from renderer
        this._composer = new CustomThreeModule.EffectComposer(this._renderer);
        this._composer.addPass(new CustomThreeModule.RenderPass(this._scene, this._camera));
        resolve();
      } catch(err) {
        reject(`WorldMapView._buildViewer\n${err}`);
      }
    });
  }


  _buildLights() {
    return new Promise((resolve, reject) => {
      if (this._preferences.debug) { console.log('WorldMapView._buildLights'); }
      try {
        // Build scene lights
        this._lights.sun = new THREE.DirectionalLight(0xFFFEEE, 2);
        this._lights.ambient = new THREE.AmbientLight(0x070707);
        // Configure sun light
        this._lights.sun.castShadow	= true
        this._lights.sun.shadow.radius = 5;
        this._lights.sun.shadow.mapSize.width = this._preferences.shadowResolution;
        this._lights.sun.shadow.mapSize.height = this._preferences.shadowResolution;
        this._lights.sun.shadow.camera.near = 0.01;
        this._lights.sun.shadow.camera.far = 400;
        this._lights.sun.lookAt(new THREE.Vector3(0, 0, 0));
        resolve();
      } catch(err) {
        reject(`WorldMapView._buildLights\n${err}`);
      }
    });
  }


  _buildMeshes() {
    return new Promise((resolve, reject) => {
      if (this._preferences.debug) { console.log('WorldMapView._buildMeshes'); }
      try {
        // Pivots are for animating objects
        this._pivots.sun = new THREE.Object3D();
        this._pivots.moon = new THREE.Object3D();
        this._pivots.particles = new THREE.Object3D();
        // Build scene elements (Earthwith all its sub-meshes)
        this._meshes.earth = this.MeshFactory.new({ type: 'earth', loader: this._loader });
        this._meshes.earthNight = this.MeshFactory.new({ type: 'earthnight', loader: this._loader });
        this._meshes.earthClouds = this.MeshFactory.new({ type: 'earthclouds', loader: this._loader });
        this._meshes.earthBoundaries = this.MeshFactory.new({ type: 'earthboundaries', loader: this._loader });
        this._meshes.earthAtmosphere = this.MeshFactory.new({ type: 'earthatmosphere', loader: this._loader });
        // Spherical meshes for sun, moon, milky way and particles
        this._meshes.sun = this.MeshFactory.new({ type: 'sun', loader: this._loader });
        this._meshes.moon = this.MeshFactory.new({ type: 'moon', loader: this._loader });
        this._meshes.milkyway = this.MeshFactory.new({ type: 'milkyway', loader: this._loader });
        this._meshes.particles = this.MeshFactory.new({ type: 'particles', loader: this._loader });
        // Make earth and moon 'shadow friendly'
        this._meshes.moon.receiveShadow	= true;
        this._meshes.moon.castShadow = true;
        this._meshes.earth.receiveShadow	= true;
        this._meshes.earth.castShadow = true;
        // Build advanced data structures
        this._buildCountryPins()
          .then(this._buildGeoMeshes.bind(this))
          .then(resolve).catch(reject);
      } catch(err) {
        reject(`WorldMapView._buildMeshes\n${err}`);
      }
    });
  }


  _buildCountryPins() {
    return new Promise((resolve, reject) => {
      if (this._preferences.debug) { console.log('WorldMapView._buildCountryPins'); }
      try {
        // Only build pins from user data. Will not build any pins if no data is sent through the constructor
        for (let i = 0; i < this._userData.length; ++i) { // Build country pins on Earth
          const pin = this.MeshFactory.new({ type: 'earthpin', scale: this._userData[i].scale });
          const wireframe = this.MeshFactory.new({ type: 'wireframe', geometry: pin.geometry }); // Add border using wireframe
          pin.info = this._userData[i]; // Attach country information to the pin
          wireframe.renderOrder = 1; // Force wireframe render on top
          pin.add(wireframe);
          this._pins.push(pin);
        }
        resolve();
      } catch(err) {
        reject(`WorldMapView._buildCountryPins\n${err}`);
      }
    });
  }


  _buildGeoMeshes() {
    return new Promise((resolve, reject) => {
      if (this._preferences.debug) { console.log('WorldMapView._buildGeoMeshes'); }
      try {
        // Iterate over all country in geojson dataset and create associated geometry
        for (let i = 0; i < this._geoData.features.length; ++i) {
          // Check polygon type for feature
          const polygons = this._geoData.features[i].geometry.type === 'Polygon' ? [this._geoData.features[i].geometry.coordinates] : this._geoData.features[i].geometry.coordinates;
          // Iterate over polygons set to build country geosurfaces
          for (let j = 0; j < polygons.length; ++j) {
            const geoSurface = this.MeshFactory.new({ type: 'geosurface', geometry: polygons[j] });
            // Attach info to mesh
            geoSurface.info = this._geoData.features[i].properties;
            geoSurface.info.hasData = false;
            geoSurface.info.trigram = this._geoData.features[i].properties.GU_A3;
            // Find in world data the matching country data
            for (let k = 0; k < this._userData.length; ++k) {
              if (this._userData[k].trigram === this._geoData.features[i].properties.GU_A3) {
                geoSurface.info = this._userData[k];
                geoSurface.info.hasData = true;
                break;
              }
            }
            // Append surface to mesh array
            this._geoSurfaces.push(geoSurface);
          }
        }
        resolve();
      } catch(err) {
        reject(`WorldMapView._buildGeoMeshes\n${err}`);
      }
    });
  }


  _buildControls() {
    return new Promise((resolve, reject) => {
      if (this._preferences.debug) { console.log('WorldMapView._buildControls'); }
      try {
        // Camera controls
        this._controls = new THREE.TrackballControls(this._camera, this._renderTo);
        this._controls.minDistance = Constants.Scene.RADIUS.EARTH + 0.2; // Prevent zooming to get into Earth
        this._controls.maxDistance = Constants.Scene.DISTANCE.SUN / 2; // Constraint dezoom to half scene
        // Constraint dezoom to scene size in debug
        if (this._preferences.debug) {
          this._controls.maxDistance = Constants.Scene.DISTANCE.SUN;
        }
        // Build configuration panel
        this._buttons.configuration = document.createElement('IMG');
        this._buttons.configuration.classList.add('configuration');
        this._buttons.configuration.src = `${this._assetsUrl}img/icons/conf.svg`;
        this._renderTo.appendChild(this._buttons.configuration);
        // Camera control buttons
        this._buildViewControls()
          .then(resolve).catch(reject);
      } catch(err) {
        reject(`WorldMapView._buildControls\n${err}`);
      }
    });
  }


  _buildViewControls() {
    return new Promise((resolve, reject) => {
      if (this._preferences.debug) { console.log('WorldMapView._buildViewControls'); }
      try {
        // Class and local control container
        this._controlsContainer = document.createElement('DIV');
        this._controlsContainer.classList.add('camera-controls-container');
        const controls = document.createElement('DIV');
        controls.classList.add('camera-controls');
        // Create HTML elements
        this._buttons.left = document.createElement('IMG');
        this._buttons.autoRotate = document.createElement('IMG');
        this._buttons.center = document.createElement('IMG');
        this._buttons.right = document.createElement('IMG');
        // Set css classes
        this._buttons.left.classList.add('camera-left');
        this._buttons.autoRotate.classList.add('auto-rotate');
        this._buttons.center.classList.add('camera-center');
        this._buttons.right.classList.add('camera-right');
        // Provide accessibilty alt attribute
        this._buttons.left.alt = 'move-camera-left';
        this._buttons.center.alt = 'auto-rotate-camera';
        this._buttons.center.alt = 'move-camera-center';
        this._buttons.right.alt = 'move-camera-right';
        // Define icon src from assets url
        this._buttons.left.src = `${this._assetsUrl}img/icons/nav-arrow-right.svg`; // 180 rotate in css
        this._buttons.autoRotate.src = `${this._assetsUrl}img/icons/nav-auto-rotate.svg`;
        this._buttons.center.src = `${this._assetsUrl}img/icons/nav-center.svg`;
        this._buttons.right.src = `${this._assetsUrl}img/icons/nav-arrow-right.svg`;
        // Append to controls container
        controls.appendChild(this._buttons.left);
        controls.appendChild(this._buttons.center);
        controls.appendChild(this._buttons.autoRotate);
        controls.appendChild(this._buttons.right);
        // Store in class controls container and append to module parent
        this._controlsContainer.appendChild(controls);
        this._renderTo.appendChild(this._controlsContainer);
        resolve();
      } catch(err) {
        reject(`WorldMapView._buildViewControls\n${err}`);
      }
    });
  }


  _buildHelpers() {
    return new Promise((resolve, reject) => {
      if (this._preferences.debug) {
        console.log('WorldMapView._buildHelpers');
        try {
          // World geocentric axis
          this._helpers.worldAxis = new THREE.AxesHelper(Constants.Scene.RADIUS.SCENE);
          this._scene.add(this._helpers.worldAxis);
          // Sun light shadow helper
          this._helpers.sunLightShadow = new THREE.CameraHelper(this._lights.sun.shadow.camera);
          this._scene.add(this._helpers.sunLightShadow);
          // Stats.js
          this._helpers.stats = new CustomThreeModule.Stats();
          this._helpers.stats.showPanel(0);
          this._renderTo.appendChild(this._helpers.stats.dom);
        } catch(e) {
          reject(`WorldMapView._buildHelpers\n${err}`);
        }
      }
      resolve();
    });
  }


  _placeAndUpdateElements() {
    return new Promise((resolve, reject) => {
      if (this._preferences.debug) { console.log('WorldMapView._placeAndUpdateElements'); }
      try {
        // Position camera to face centerOn country
        let cameraPos = new THREE.Vector3(0, 0, 0);
        for (let i = 0; i < this._worldData.countries.length; ++i) {
          if (this._worldData.countries[i].trigram === this._centerOn) {
            const latLon = {
              lat: this._worldData.countries[i].countryCenter.lat,
              long: this._worldData.countries[i].countryCenter.long
            };
            const cameraCartesian = this.getPosFromLatLonRad(latLon.lat, latLon.long, 1);
            cameraPos = new THREE.Vector3(cameraCartesian[0], cameraCartesian[1], cameraCartesian[2]);
          }
        }
        // Update camera position
        this._camera.position.x = cameraPos.normalize().multiplyScalar(1.66).x;
        this._camera.position.y = cameraPos.normalize().multiplyScalar(1.66).y;
        this._camera.position.z = cameraPos.normalize().multiplyScalar(1.66).z;
        // Save initial position to be restored at any time using DOM control
        this._initialPosition = this._camera.position.clone();
        // Center pivots as referential is geocentric
        this._pivots.moon.position.set(0, 0, 0);
        this._pivots.sun.position.set(0, 0, 0);
        this._pivots.particles.position.set(0, 0, 0);
        // Place earth, moon and sun to their initial position
        this._meshes.earth.position.set(0, 0, 0);
        this._meshes.moon.position.set(0, 0, -Constants.Scene.DISTANCE.MOON);
        // Light will hold sun meshes as lens flare must be related to light source
        this._lights.sun.position.set(0, 0, Constants.Scene.DISTANCE.SUN);
        // Place sun depending on current time UTC
        let utcTime = new Date().toLocaleString('en-US', { timeZone: 'UTC' });
        utcTime = new Date(utcTime);
        const hours = utcTime.getHours() - 12; // Center interval on noon
        const minutes = utcTime.getMinutes();
        // Had to put it on paper to find this!
        this._pivots.sun.rotation.y += (Math.PI * (hours + (minutes / 60)) / 12) - (Math.PI / 2); // Pi/2 is for texture offset
        // Reverse anti meridian texture alignement (to face greenwich properly on lat/long coordinates)
        this._meshes.moon.rotation.y += Math.PI / 2; // Put dark side of the moon to the dark
        this._meshes.earthClouds.rotation.y += Math.PI / 2; // Align clouds on day/night bound
        this._pivots.moon.rotation.x += (5.145 * Math.PI) / 180; // 5.145° offset from the earth plane
        // Iterate over pins to configure their position
        for (let i = 0; i < this._pins.length; ++i) {
          const pos = this.getPosFromLatLonRad(this._pins[i].info.countryCenter.lat, this._pins[i].info.countryCenter.long, Constants.Scene.RADIUS.EARTH);
          this._pins[i].position.set(pos[0], pos[1], pos[2]);
          this._pins[i].lookAt(new THREE.Vector3(0, 0, 0)); // As referential is geocentric, we look at the earth's center
          this._pins[i].rotation.y += Math.PI / 2; // Rotate for cylinder to be orthonormal with earth surface
          this._pins[i].clickCallback = this._countryClicked;
        }
        // Iterate over geosurfaces to configure their position and callback
        for (let i = 0; i < this._geoSurfaces.length; ++i) {
          this._geoSurfaces[i].rotation.y -= Math.PI / 2; // Texture anti-meridian alignement
          this._geoSurfaces[i].clickCallback = this._countryClicked;
        }
        // Select country parts only if user requested a country to centerOn
        if (this._centerOn) {
          this._selectedCountryTrigram = this._centerOn;
          this._selectCountry(this._centerOn);
        }
        resolve();
      } catch(err) {
        reject(`WorldMapView._placeAndUpdateElements\n${err}`);
      }
    });
  }


  _fillScene() {
    return new Promise((resolve, reject) => {
      if (this._preferences.debug) { console.log('WorldMapView._fillScene'); }
      try {
        // Shader must be placed on Earth mesh
        this._meshes.earth.add(this._meshes.earthNight);
        this._pivots.moon.add(this._meshes.moon);
        this._lights.sun.add(this._meshes.sun);
        this._pivots.sun.add(this._lights.sun);
        this._pivots.particles.add(this._meshes.particles);
        // Fill scene with all meshes and lights
        this._scene.add(this._lights.ambient);
        this._scene.add(this._pivots.moon);
        this._scene.add(this._pivots.sun);
        this._scene.add(this._pivots.particles);
        this._scene.add(this._meshes.earth);
        this._scene.add(this._meshes.earthBoundaries);
        this._scene.add(this._meshes.earthClouds);
        this._scene.add(this._meshes.earthAtmosphere);
        this._scene.add(this._meshes.milkyway);
        // Append every stored pins according to given data
        for (let i = 0; i < this._pins.length; ++i) {
          this._meshes.earth.add(this._pins[i]);
        }
        // Append geosurfaces for every country
        for (let i = 0; i < this._geoSurfaces.length; ++i) {
          this._meshes.earth.add(this._geoSurfaces[i]);
        }
        // Update scene matrix world for positions
        this._scene.updateMatrixWorld(true);
        resolve();
      } catch(err) {
        reject(`WorldMapView._fillScene\n${err}`);
      }
    });
  }


  _shaderPass() {
    return new Promise((resolve, reject) => {
      if (this._preferences.debug) { console.log('WorldMapView._shaderPass'); }
      try {
        // Anti aliasing with FXAA (uniforms must be updated on resize)
        const pixelRatio = this._renderer.getPixelRatio();
        this._fxaaPass = this.MeshFactory.new({ type: 'fxaa' });
        this._fxaaPass.uniforms.resolution.value.x = 1 / (this._renderTo.offsetWidth * pixelRatio);
        this._fxaaPass.uniforms.resolution.value.y = 1 / (this._renderTo.offsetHeight * pixelRatio);
        this._composer.addPass(this._fxaaPass);
        // Apply light vignetting on scene for better focus on center
        const vignettePass = this.MeshFactory.new({ type: 'vignette' });
        vignettePass.uniforms.darkness.value = 1.05;
        this._composer.renderToScreen = true;
        this._composer.addPass(vignettePass);
        resolve();
      } catch(err) {
        reject(`WorldMapView._shaderPass\n${err}`);
      }
    });
  }


  /*  ----------  Animation and rendering  ----------  */


  animate() {
    // Start debug measure
    if (this._preferences.debug) { this._helpers.stats.begin(); }
    // Scene update routine
    TWEEN.update(); // Update Tween for camera animations
    this._render(); // Animate scene objects
    this._composer.render(this._scene, this._camera); // Render scene in composer
    // End debug measures
    if (this._preferences.debug) { this._helpers.stats.end(); }
    // Register next frame and ask for it
    this._rafId = requestAnimationFrame(this.animate.bind(this));
  }


  _render() { // Put only const here, avoid any calculation to reduce CPU load
    // Moon and sun speed according to true speeds preference
    let moonSpeed = Constants.AngularSpeeds.moon;
    if (this._preferences.trueSpeeds) {
      // Set moon and sun real radial speed around earth
      this._pivots.moon.rotation.y += Constants.AngularSpeeds.r_moon;
      this._pivots.sun.rotation.y += Constants.AngularSpeeds.r_sun;
      moonSpeed = Constants.AngularSpeeds.r_moon;
    } else {
      this._pivots.moon.rotation.y += Constants.AngularSpeeds.moon;
      this._pivots.sun.rotation.y += Constants.AngularSpeeds.sun;
    }
    // Update camera if it is lock on auto-rotation
    if (this._cameraAutoRotation === true) {
      // Init camera speed to the regular one
      let speed = Constants.AngularSpeeds.camera;
      // If locked on moon, update the speed to match moon radial speed
      if (this._lockOnMoon === true) {
        speed = moonSpeed
      }
      // Build quaternion object to make the camera position to rotate at given speed
      const quaternion = new THREE.Quaternion;
      this._camera.position.applyQuaternion(this._meshes.moon.quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0).normalize(), speed));
      this._camera.lookAt(this._scene.position);
    }
    // Update other pivots
    this._meshes.earthClouds.rotation.y += Constants.AngularSpeeds.clouds;
    this._meshes.milkyway.rotation.z += Constants.AngularSpeeds.milkyway; // Give a nice 'drifting in space' effect
    this._pivots.particles.rotation.y -= Constants.AngularSpeeds.particles;
    // Update DayNightShader sun light direction according to light world matrix, same for atmosphere view vector
    this._meshes.earthNight.material.uniforms.sunDirection.value = new THREE.Vector3().applyMatrix4(this._lights.sun.matrixWorld);
    this._meshes.earthAtmosphere.material.uniforms.viewVector.value = this._camera.position;
    this._controls.update();
  }


  /*  ----------  App, click and keyboard events  ----------  */


  _events() {
    return new Promise((resolve, reject) => {
      if (this._preferences.debug) { console.log('WorldMapView._events'); }
      try {
        // Window global events
        window.addEventListener('resize', this._onResize, false);
        window.addEventListener('click', this._onCanvasClicked, false);
        // DOM Controls events
        this._buttons.left.addEventListener('click', this._moveCameraLeft.bind(this), false);
        this._buttons.autoRotate.addEventListener('click', this._toggleAutoRotate.bind(this), false);
        this._buttons.center.addEventListener('click', this._moveCameraToInitPos.bind(this), false);
        this._buttons.right.addEventListener('click', this._moveCameraRight.bind(this), false);
        this._buttons.configuration.addEventListener('click', this._configurationCB, false);
        // Icon opacity events
        this._renderTo.addEventListener('mousemove', this._updateOpacityTransition.bind(this), false);
        resolve();
      } catch(err) {
        reject(`WorldMapView._events\n${err}`);
      }
    });
  }


  _keyEvents() {
    return new Promise(resolve => {
      if (this._preferences.debug) { console.log('WorldMapView._keyEvents'); }
      window.addEventListener('keyup', event => {
        if (event.key === 'ArrowLeft' || event.key === 'q') { // Std left key
          this._moveCameraLeft();
        } else if (event.key === 'ArrowRight' || event.key === 'd') { // Std right key
          this._moveCameraRight();
        }
      }, false);
      resolve();
    });
  }


  _onResize() {
    if (this._preferences.debug) { console.log('WorldMapView._onResize'); }
    // Get pixel ratio from renderer
    const pixelRatio = this._renderer.getPixelRatio();
    // Update FXAA shader's uniforms
    this._fxaaPass.uniforms.resolution.value.x = 1 / (this._renderTo.offsetWidth * pixelRatio);
    this._fxaaPass.uniforms.resolution.value.y = 1 / (this._renderTo.offsetHeight * pixelRatio);
    // Set camera aspect from window
    this._camera.aspect = window.innerWidth / window.innerHeight;
    // Update camera projection matrix
    this._camera.updateProjectionMatrix();
    // Update renderer size
    this._renderer.setSize(window.innerWidth, window.innerHeight);
  }


  _updateOpacityTransition() {
    // Clear previous opacity timeout
    clearTimeout(this._iconOpacityTimeoutId);
    // Force style to be displayed
    this._buttons.configuration.style.opacity = 1;
    this._controlsContainer.style.opacity = 1;
    // Store and start new timeout for icon opacity
    this._iconOpacityTimeoutId = setTimeout(() => {
      // Make icon invisible
      this._buttons.configuration.style.opacity = 0;
      this._controlsContainer.style.opacity = 0;
    }, Constants.Scene.ANIMATION.ICON);
  }


  _toggleAutoRotate() {
    if (this._preferences.debug) { console.log('WorldMapView._toggleAutoRotate'); }
    // Toggle auto rotate depending on DOM classlist
    if (this._buttons.autoRotate.classList.contains('toggle')) {
      this._disableCameraAutoRotation();
    } else {
      this._enableCameraAutoRotation();
    }
  }


  _enableCameraAutoRotation() {
    if (this._preferences.debug) { console.log('WorldMapView._enableCameraAutoRotation'); }
    // Update DOM classlist
    this._buttons.autoRotate.classList.add('toggle');
    // Only set boolean to make it active (see _render method)
    this._cameraAutoRotation = true;
    // Move camera up vector along Y axis
    this._animateCameraUp(this._camera.up, new THREE.Vector3(0, 1, 0));
  }


  _disableCameraAutoRotation() {
    if (this._preferences.debug) { console.log('WorldMapView._disableCameraAutoRotation'); }
    // Update DOM classlist
    this._buttons.autoRotate.classList.remove('toggle');
    // Freeze camera to its position in animate
    this._cameraAutoRotation = false;
  }


  /*  ----------  Country selection and callback management  ----------  */


  _unselectAll() {
    if (this._preferences.debug) { console.log('WorldMapView._unselectAll'); }
    // If any pin is already selected, reset its color and unsave it
    if (this._selectedPin !== null) {
      this._selectedPin.material.color.setHex(0x56d45b); // Reset pin color
      this._selectedPin = null;
    }
    // Do aswell for geosurfaces
    if (this._selectedSurfaces.length > 0) {
      // Clear opacity for every material
      for (let i = 0; i < this._selectedSurfaces.length; ++i) {
        this._selectedSurfaces[i].material.opacity = 0;
      }
      // Reset selected surface array
      this._selectedSurfaces = [];
    }
  }


  _onCanvasClicked(event) {
    if (this._preferences.debug) { console.log('WorldMapView._onCanvasClicked'); }
    // Only check for clicked country if user is not moving in scene
    if (this._controls.hasMoved === false) {
      event.preventDefault();
      this._unselectAll();
      // Create click event utils
      const raycaster = new THREE.Raycaster();
      const mouse = new THREE.Vector2();
      let countryHit = false;
      // Set mouse position from event
      mouse.x = (event.clientX / this._renderer.domElement.clientWidth) * 2 - 1;
      mouse.y =  - (event.clientY / this._renderer.domElement.clientHeight) * 2 + 1;
      // Configure ray caster with mouse and camera
      raycaster.setFromCamera(mouse, this._camera);
      // Avoid ray caster to match country on other side of planet
      raycaster.far = Math.sqrt((this._camera.position.x ** 2) + (this._camera.position.y ** 2) + (this._camera.position.z ** 2));
      // Ray cast againt pins
      let intersects = raycaster.intersectObjects(this._pins);
      // Check if intersects exists and if target is not selected country
      if (intersects.length > 0 && intersects[0].object.info.trigram !== this._selectedCountryTrigram) {
        this._selectedPin = intersects[0].object;
        this._selectedCountryTrigram = this._selectedPin.info.trigram;
        this._selectedPin.clickCallback(this);
        return; // We return there as selection occurs in callback to select both pins and surfaces
      }
      // Ray cast againt geosurfaces
      intersects = raycaster.intersectObjects(this._geoSurfaces);
      // Check if intersects exists and if target is not selected country aswell on surfaces
      if (intersects.length > 0 && intersects[0].object.info.trigram !== this._selectedCountryTrigram) {
        const targetCountry = intersects[0].object;
        const countryParts = []; // We group each country part into on single array
        // Check geosurfaces for same trigram parts
        for (let i = 0; i < this._geoSurfaces.length; ++i) {
          if (this._geoSurfaces[i].info.trigram === targetCountry.info.trigram) {
            countryParts.push(this._geoSurfaces[i]);
          }
        }
        // Add target to countryParts array
        countryParts.push(targetCountry);
        // If any countryParts, selection routine
        if (countryParts.length > 0) {
          this._selectedSurfaces = countryParts; // Update selected surfaces
          this._selectedCountryTrigram = targetCountry.info.trigram; // Update selected country trigram
          // All selected surface match the same country, we take 0 as reference for cb
          targetCountry.clickCallback(this);
          return; // We return there as selection occurs in callback to select both pins and surfaces
        }
      } else {
        this._selectedCountryTrigram = null;
      }
      // Ray cast againt moon
      raycaster.far = Constants.Scene.RADIUS.SCENE; // Restore raycaster far to be able to hit the moon/earth
      intersects = raycaster.intersectObjects([this._meshes.moon]);
      if (intersects.length > 0) {
        this._lockOnMoon = true;
        this._moveCameraToMoon();
        return; // No need to further raycast as user wanna go to the moon!
      }
      // Ray cast againt earth
      intersects = raycaster.intersectObjects([this._meshes.earth]);
      if (intersects.length > 0) {
        this._lockOnMoon = false;
        this._disableCameraAutoRotation();
      }
      // Send caller a callback to notify the unselect
      this._countryClickedCB({
        unselect: true,
        hasData: false, artists: [], name: '', trigram: '' // Default values
      });
    }
  }


  _countryClicked(WorldMapView) { // This is already binded to the target
    if (WorldMapView._preferences.debug) { console.log('WorldMapView._countryClicked'); }
    // Writtin straight into Meshes (this scope)
    if (this.info.GEOUNIT) { // Country surface clicked, pin otherwise
      this.info.name = this.info.NAME;
      this.info.trigram = this.info.GU_A3; // NATO trigram value in geojson, may vary from one set to another
    }
    // Select country on map
    WorldMapView._selectCountry(WorldMapView._selectedCountryTrigram);
    // Call plugin callback
    WorldMapView._countryClickedCB(this.info);
  }


  _selectCountry(trigram = this._selectedCountryTrigram) {
    if (this._preferences.debug) { console.log('WorldMapView._selectCountry'); }
    // Update selected pin
    this._selectedPin = null; // We reset selection bc we don't know if pin or surface clicked
    for (let i = 0; i < this._pins.length; ++i) {
      if (this._pins[i].info.trigram === trigram) {
        this._pins[i].material.color.setHex(0xE31C17);
        this._selectedPin = this._pins[i]; // Save pin in case evt comes from surface
        break; // Break beacause we have one pin per country
      }
    }
    // Update selected surfaces
    this._selectedSurfaces = [];
    for (let i = 0; i < this._geoSurfaces.length; ++i) {
      if (this._geoSurfaces[i].info.trigram === trigram) {
        this._geoSurfaces[i].material.opacity = 0.4;
        this._selectedSurfaces.push(this._geoSurfaces[i]);
      }
    }
    // Found country clicked country center and convert it to a camera position on sphere
    let countrCenter = this._camera.position; // Don't move camera by default
    for (let i = 0; i < this._worldData.countries.length; ++i) {
      if (this._worldData.countries[i].trigram === trigram) {
        const latLon = {
          lat: this._worldData.countries[i].countryCenter.lat,
          long: this._worldData.countries[i].countryCenter.long
        };
        const cartesian = this.getPosFromLatLonRad(latLon.lat, latLon.long, Constants.Scene.RADIUS.EARTH);
        countrCenter = new THREE.Vector3(cartesian[0], cartesian[1], cartesian[2]);
      }
    }
    // Animate camera to go over clicked country with its own distance to center kept
    const camDistance = this._camera.position.length();
    // In case auto rotation is locked
    this._disableCameraAutoRotation();
    this._animateCameraPosition({
      x: this._camera.position.x,
      y: this._camera.position.y,
      z: this._camera.position.z
    }, {
      x: this._camera.position.copy(countrCenter).normalize().multiplyScalar(camDistance).x,
      y: this._camera.position.copy(countrCenter).normalize().multiplyScalar(camDistance).y,
      z: this._camera.position.copy(countrCenter).normalize().multiplyScalar(camDistance).z
    });
  }


/*  ----------  Camera controls and manipulation  ----------  */


  _animateCameraPosition(from, to) {
    if (this._preferences.debug) { console.log('WorldMapView._animateCameraPosition'); }
    // Put camera up in Y axis alignement
    this._animateCameraUp(this._camera.up, new THREE.Vector3(0, 1, 0));
    return new TWEEN.Tween(from).to(to, Constants.Scene.ANIMATION.CAMERA)
      .easing(TWEEN.Easing.Quadratic.InOut)
      .onUpdate(() => {
        this._camera.position.x = from.x;
        this._camera.position.y = from.y;
        this._camera.position.z = from.z;
        this._camera.lookAt(this._scene.position);
      }).start();
  }


  _animateCameraUp(from, to) {
    if (this._preferences.debug) { console.log('WorldMapView._animateCameraUp'); }
    return new TWEEN.Tween(from).to(to, Constants.Scene.ANIMATION.CAMERA)
      .easing(TWEEN.Easing.Quadratic.InOut)
      .onUpdate(() => {
        this._camera.up.set(from.x, from.y, from.z);
      }).start();
  }


  _moveCameraLeft() {
    if (this._preferences.debug) { console.log('WorldMapView._moveCameraLeft'); }
    this._animateCameraPosition({
      x: this._camera.position.x,
      y: this._camera.position.y,
      z: this._camera.position.z
    }, {
      x: this._camera.position.x * Math.cos(this._cameraMoveAngle) - this._camera.position.z * Math.sin(this._cameraMoveAngle),
      y: this._camera.position.y,
      z: this._camera.position.z * Math.cos(this._cameraMoveAngle) + this._camera.position.x * Math.sin(this._cameraMoveAngle)
    });
  }


  _moveCameraRight() {
    if (this._preferences.debug) { console.log('WorldMapView._moveCameraRight'); }
    this._animateCameraPosition({
      x: this._camera.position.x,
      y: this._camera.position.y,
      z: this._camera.position.z
    }, {
      x: this._camera.position.x * Math.cos(this._cameraMoveAngle) + this._camera.position.z * Math.sin(this._cameraMoveAngle),
      y: this._camera.position.y,
      z: this._camera.position.z * Math.cos(this._cameraMoveAngle) - this._camera.position.x * Math.sin(this._cameraMoveAngle)
    });
  }


  _moveCameraToInitPos() {
    if (this._preferences.debug) { console.log('WorldMapView._moveCameraToInitPos'); }
    // Remove auto rotation when user is asking to go to its init pos
    this._disableCameraAutoRotation();
    this._animateCameraPosition({
      x: this._camera.position.x,
      y: this._camera.position.y,
      z: this._camera.position.z
    }, {
      x: this._initialPosition.x,
      y: this._initialPosition.y,
      z: this._initialPosition.z
    });
  }


  _moveCameraToMoon() {
    if (this._preferences.debug) { console.log('WorldMapView._moveCameraToMoon'); }
    this._enableCameraAutoRotation();
    const distanceFactor = 1.1;
    const moonPos = new THREE.Vector3().getPositionFromMatrix(this._meshes.moon.matrixWorld);
    this._animateCameraPosition({
      x: this._camera.position.x,
      y: this._camera.position.y,
      z: this._camera.position.z
    }, {
      x: moonPos.multiplyScalar(distanceFactor).x,
      y: moonPos.multiplyScalar(distanceFactor).y - Constants.Scene.RADIUS.EARTH, // This way moon appear up camera and earth is made visible
      z: moonPos.multiplyScalar(distanceFactor).z
    });
  }


/*  ----------  Utils  ----------  */


  getPosFromLatLonRad(lat, lon, radius) {
    // 'member old spherical to cartesian ?
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);
    // Return as cartesian coordinates
    return [
      -radius * Math.sin(phi) * Math.cos(theta),
      radius * Math.cos(phi),
      radius * Math.sin(phi) * Math.sin(theta)
    ];
  }


}


export default WorldMapView;
