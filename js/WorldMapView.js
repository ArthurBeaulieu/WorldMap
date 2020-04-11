import CustomThreeModule from './CustomThreeModule.js';
import TrackballControls from './TrackballControls.js';
import MeshFactory from './MeshFactory.js';
import TWEEN from './Tween.js';


const SceneConst = { // Scene constants, for consistent values across features
  RADIUS: {
    EARTH: 0.5,
    MOON: 0.25,
    SUN: 2,
    SCENE: 220
  },
  DISTANCE: {
    MOON: 8,
    SUN: 200,
    CLOUDS: 0.002,
    ATMOSPHERE: 0.002,
    COUNTRY: 0.01
  },
  PIN: {
    HEIGHT: 0.1,
    WIDTH: 0.0033
  }
};
const AngularSpeeds = { // Angular speed are tweaked to see an actual animation on render loop
  moon: (2 * Math.PI) / (27.3 * 60 * 60), // True formula is (2 * Pi) / (27.3 * 24 * 60 * 60)
  sun: (2 * Math.PI) / (365 * 10 * 60), // True formula is (2 * Pi) / (365.25 * 24 * 60 * 60)
  clouds: (2 * Math.PI) / (20 * 60 * 60),
  camera: Math.PI / 6
};
let MzkMeshes = null; // Mesh factory must be built in WorldMapView constructor, to send proper arguemnts


class WorldMapView {


  constructor(options) {
    THREE.TrackballControls = TrackballControls; // Override THREE TrackBallControl with provided module
    // View options
    this._assetsUrl = options.assetsUrl;
    this._renderTo = options.renderTo;
    this._countryClickedCB = options.countryClickedCB;
    this._configurationCB = options.configurationCB;
    this._worldData = options.userData;
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
      milkyway: null
    };
    // Scene lights
    this._lights = {
      sun: null,
      ambient: null
    };
    // Animation pivots to simulate spheres orbiting
    this._pivots = {
      sun: null,
      moon: null
    };
    // THREE helpers
    this._helpers = {
      worldAxis: null,
      sunLightShadow: null
    };
    // Scene DOM elements
    this._selectedPin = null;
    this._selectedSurfaces = [];
    this._controlsContainer = null;
    this._buttons = {
      top: null,
      left: null,
      bottom: null,
      right: null,
      center: null,
      configuration: null
    };
    this._isLightOn = false; // Used with associated button
    this._cameraSpeed = AngularSpeeds.camera; // Used with associated buttons
    // Scene country pins, surface and trigram
    this._selectedCountryTrigram = null;
    this._geoSurfaces = [];
    this._pins = [];
    // Event bindings
    this._onResize = this._onResize.bind(this);
    this._onCanvasClicked = this._onCanvasClicked.bind(this);
    // Define MeshFactory
    MzkMeshes = new MeshFactory({
      CONST: SceneConst,
      assetsUrl: this._assetsUrl,
      segments: this._preferences.sphereSegments, // 32, 64, 128 depending on pref
      quality: this._preferences.textureQuality // 2k, 4k, 8k depending on pref
    });
    // Init 3D viewer
    this.init();
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
      if (this._preferences.debug) {
        this._renderTo.removeChild(this._helpers.stats.dom);
      }
      // Dispose, call for destructors and clean parent
      MzkMeshes.destroy();
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


  init() {
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
      .catch(err => console.trace(err) );
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
        <div id="track" class="track"><div id="current" class="current"></div></div>
      `;
      // Append loading container with progress bar
      this._renderTo.appendChild(container);
      requestAnimationFrame(() => { // We raf to ensure the fade in of loading screen is gonna occur
        container.style.opacity = 1;
        const current = container.querySelector('#current');
        // Now handling texture loader and loading completion
        this._manager = new THREE.LoadingManager();
        // Texture loading complete
        this._manager.onLoad = () => {
          if (this._preferences.debug) { console.log( 'WorldMapView._createLoadingManager: Loading complete, waiting for browser to render'); }
          // Loading screen can properly disapear with css transition
          container.style.opacity = 0;
          // Delay according to CSS transition value with extra timing
          setTimeout(() => { this._renderTo.removeChild(container); resolve(); }, 1000);
        };
        // Progress and error callbacks
        this._manager.onError = url => { console.log( `WorldMapView._createLoadingManager: Error loading ${url}`); };
        this._manager.onProgress = (url, loaded, total) => {
          if (this._preferences.debug) { console.log(`WorldMapView._createLoadingManager: Loading file ${url} (${loaded}/${total} loaded)`); }
          current.style.width = `${(loaded / total) * 100}%`;
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

        this._renderer.setClearColor(0x040404, 1.0);
        this._renderer.setPixelRatio(window.devicePixelRatio);
        this._renderer.setSize(window.innerWidth, window.innerHeight);
        this._renderTo.appendChild(this._renderer.domElement);

        this._composer = new CustomThreeModule.EffectComposer(this._renderer);
        this._composer.addPass(new CustomThreeModule.RenderPass(this._scene, this._camera));

        resolve();
      } catch (err) {
        reject(`WorldMapView._buildViewer\n${err}`);
      }
    });
  }


  _buildLights() {
    return new Promise((resolve, reject) => {
      if (this._preferences.debug) { console.log('WorldMapView._buildLights'); }
      try {
        this._lights.sun = new THREE.DirectionalLight(0xFFFEEE, 2);
        this._lights.ambient = new THREE.AmbientLight(0x070707);

        this._lights.sun.lookAt(new THREE.Vector3(0, 0, 0));
        this._lights.sun.castShadow	= true

        this._lights.sun.shadow.radius = 5;
        this._lights.sun.shadow.mapSize.width = this._preferences.shadowResolution;
        this._lights.sun.shadow.mapSize.height = this._preferences.shadowResolution;

        this._lights.sun.shadow.camera.near = 0.01;
        this._lights.sun.shadow.camera.far = 400;

        resolve();
      } catch (err) {
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
        // Build scene elements (Earthwith all its sub-meshes)
        this._meshes.earth = MzkMeshes.new({ type: 'earth', loader: this._loader });
        this._meshes.earthNight = MzkMeshes.new({ type: 'earthnight', loader: this._loader });
        this._meshes.earthClouds = MzkMeshes.new({ type: 'earthclouds', loader: this._loader });
        this._meshes.earthBoundaries = MzkMeshes.new({ type: 'earthboundaries', loader: this._loader });
        this._meshes.earthAtmosphere = MzkMeshes.new({ type: 'earthatmosphere', loader: this._loader });
        // Spherical meshes for sun, moon and milky way
        this._meshes.sun = MzkMeshes.new({ type: 'sun', loader: this._loader });
        this._meshes.moon = MzkMeshes.new({ type: 'moon', loader: this._loader });
        this._meshes.milkyway = MzkMeshes.new({ type: 'background', loader: this._loader });

        this._meshes.moon.receiveShadow	= true;
        this._meshes.moon.castShadow = true;
        this._meshes.earth.receiveShadow	= true;
        this._meshes.earth.castShadow = true;
        // Build advanced data structures
        this._buildCountryPins();
        this._buildGeoMeshes();
        resolve();
      } catch (err) {
        reject(`WorldMapView._buildMeshes\n${err}`);
      }
    });
  }


  _buildCountryPins() {
    if (this._preferences.debug) { console.log('WorldMapView._buildCountryPins'); }
    for (let i = 0; i < this._worldData.length; ++i) { // Build country pins on Earth
      const pin = MzkMeshes.new({ type: 'earthpin', scale: this._worldData[i].scale });
      const wireframe = MzkMeshes.new({ type: 'wireframe', geometry: pin.geometry }); // Add border using wireframe
      pin.info = this._worldData[i]; // Attach country information to the pin
      wireframe.renderOrder = 1; // Force wireframe render on top
      pin.add(wireframe);
      this._pins.push(pin);
    }
  }


  _buildGeoMeshes() {
    if (this._preferences.debug) { console.log('WorldMapView._buildGeoMeshes'); }
    for (let i = 0; i < this._geoData.features.length; ++i) {
      // Check polygon type for feature
      const polygons = this._geoData.features[i].geometry.type === 'Polygon' ? [this._geoData.features[i].geometry.coordinates] : this._geoData.features[i].geometry.coordinates;
      for (let j = 0; j < polygons.length; ++j) {
        const geoSurface = MzkMeshes.new({ type: 'geosurface', geometry: polygons[j] });
        // Attach info to mesh
        geoSurface.info = this._geoData.features[i].properties;
        geoSurface.info.hasArtists = false;
        geoSurface.info.trigram = this._geoData.features[i].properties.GU_A3;
        // Find in world data the matching country data
        for (let k = 0; k < this._worldData.length; ++k) {
          if (this._worldData[k].trigram === this._geoData.features[i].properties.GU_A3) {
            geoSurface.info = this._worldData[k];
            geoSurface.info.hasArtists = true;
            break;
          }
        }
        // Append surface to mesh array
        this._geoSurfaces.push(geoSurface);
      }
    }
  }


  _buildControls() {
    return new Promise((resolve, reject) => {
      if (this._preferences.debug) { console.log('WorldMapView._buildControls'); }
      try {
        // Camera controls
        this._controls = new THREE.TrackballControls(this._camera, this._renderTo);
        this._controls.minDistance = SceneConst.RADIUS.EARTH + 0.2; // Prevent zooming to get into Earth
        this._controls.maxDistance = SceneConst.DISTANCE.SUN / 2; // Constraint dezoom
        // Build configuration panel
        this._buttons.configuration = document.createElement('IMG');
        this._buttons.configuration.classList.add('configuration');
        this._buttons.configuration.src = `${this._assetsUrl}img/icons/conf.svg`;
        this._renderTo.appendChild(this._buttons.configuration);
        // Camera control buttons
        this._buildCameraControls();
        resolve();
      } catch (err) {
        reject(`WorldMapView._buildControls\n${err}`);
      }
    });
  }


  _buildCameraControls() {
    if (this._preferences.debug) { console.log('WorldMapView._buildCameraControls'); }
    this._controlsContainer = document.createElement('DIV');
    this._controlsContainer.classList.add('camera-controls-container');
    const controls = document.createElement('DIV');
    controls.classList.add('camera-controls');

    this._buttons.top = document.createElement('IMG');
    this._buttons.left = document.createElement('IMG');
    this._buttons.bottom = document.createElement('IMG');
    this._buttons.right = document.createElement('IMG');
    this._buttons.center = document.createElement('IMG');

    this._buttons.top.classList.add('camera-top');
    this._buttons.left.classList.add('camera-left');
    this._buttons.bottom.classList.add('camera-bottom');
    this._buttons.right.classList.add('camera-right');
    this._buttons.center.classList.add('camera-center');

    this._buttons.top.alt = 'move-camera-top';
    this._buttons.left.alt = 'move-camera-left';
    this._buttons.bottom.alt = 'move-camera-bottom';
    this._buttons.right.alt = 'move-camera-right';
    this._buttons.center.alt = 'move-camera-center';

    this._buttons.top.src = `${this._assetsUrl}img/icons/nav-up.svg`;
    this._buttons.left.src = `${this._assetsUrl}img/icons/nav-left.svg`;
    this._buttons.bottom.src = `${this._assetsUrl}img/icons/nav-down.svg`;
    this._buttons.right.src = `${this._assetsUrl}img/icons/nav-right.svg`;
    this._buttons.center.src = `${this._assetsUrl}img/icons/nav-center.svg`;

    controls.appendChild(this._buttons.top);
    controls.appendChild(this._buttons.left);
    controls.appendChild(this._buttons.bottom);
    controls.appendChild(this._buttons.right);
    controls.appendChild(this._buttons.center);

    this._controlsContainer.appendChild(controls);
    this._renderTo.appendChild(this._controlsContainer);
  }


  _buildHelpers() {
    return new Promise(resolve => {
      if (this._preferences.debug) {
        console.log('WorldMapView._buildHelpers');
        this._helpers.worldAxis = new THREE.AxesHelper(SceneConst.RADIUS.SCENE);
        this._scene.add(this._helpers.worldAxis);

        this._helpers.sunLightShadow = new THREE.CameraHelper(this._lights.sun.shadow.camera);
        this._scene.add(this._helpers.sunLightShadow);

        this._helpers.stats = new CustomThreeModule.Stats();
        this._helpers.stats.showPanel(0);
        this._renderTo.appendChild(this._helpers.stats.dom);
      }

      resolve();
    });
  }


  _placeAndUpdateElements() {
    return new Promise((resolve, reject) => {
      if (this._preferences.debug) { console.log('WorldMapView._placeAndUpdateElements'); }
      try {
        this._camera.position.z = 1.66;

        this._meshes.earth.position.set(0, 0, 0);
        this._meshes.moon.position.set(0, 0, -SceneConst.DISTANCE.MOON);
        // Light will hold sun meshes as lens flare must be related to light source
        this._lights.sun.position.set(0, 0, SceneConst.DISTANCE.SUN);
        this._pivots.moon.position.set(0, 0, 0);
        this._pivots.sun.position.set(0, 0, 0);
        // Anti-meridian alignement
        this._meshes.moon.rotation.y += Math.PI / 2; // Put dark side of the moon to the dark
        this._meshes.earth.rotation.y += Math.PI / 2; // Earth rotation to face Greenwich
        this._meshes.earthBoundaries.rotation.y += Math.PI / 2;
        this._meshes.earthClouds.rotation.y += Math.PI / 2;
        // Shift earth along its axis from 23.3° (average in between earth tilt axis extremums : 22.1° and 24.5°)
        this._meshes.earth.rotation.z += (23.3 * Math.PI) / 180; // Earth tilt
        this._meshes.earthBoundaries.rotation.z += (23.3 * Math.PI) / 180;
        this._pivots.moon.rotation.x += (5.145 * Math.PI) / 180; // 5.145° offset from the earth plane
        // Iterate over pins to configure their position
        for (let i = 0; i < this._pins.length; ++i) {
          const latlonpoint = this.getPosFromLatLonRad(this._pins[i].info.countryCenter.lat, this._pins[i].info.countryCenter.long, SceneConst.RADIUS.EARTH);
          this._pins[i].position.set(latlonpoint[0], latlonpoint[1], latlonpoint[2]);
          this._pins[i].lookAt(new THREE.Vector3(0, 0, 0)); // As referential is geocentric, we look at the earth's center
          this._pins[i].rotation.y += Math.PI / 2; // Rotate for cylinder to be orthonormal with earth surface
          this._pins[i].clickCallback = this._countryClicked;
        }

        for (let i = 0; i < this._geoSurfaces.length; ++i) {
          this._geoSurfaces[i].rotation.y -= Math.PI / 2;
          this._geoSurfaces[i].clickCallback = this._countryClicked;
        }

        resolve();
      } catch (err) {
        reject(`WorldMapView._placeAndUpdateElements\n${err}`);
      }
    });
  }


  _fillScene() {
    return new Promise(resolve => {
      if (this._preferences.debug) { console.log('WorldMapView._fillScene'); }
      // Shader must be placed on Earth mesh
      this._meshes.earth.add(this._meshes.earthNight);
      this._pivots.moon.add(this._meshes.moon);
      this._lights.sun.add(this._meshes.sun);
      this._pivots.sun.add(this._lights.sun);
      this._scene.add(this._pivots.moon);
      this._scene.add(this._pivots.sun);
      this._scene.add(this._meshes.earth);
      this._scene.add(this._meshes.earthBoundaries);
      this._scene.add(this._meshes.earthClouds);
      this._scene.add(this._meshes.earthAtmosphere);
      this._scene.add(this._meshes.milkyway);
      this._scene.add(this._lights.ambient);
      // Append every stored pins according to given data
      for (let i = 0; i < this._pins.length; ++i) {
        this._meshes.earth.add(this._pins[i]);
      }
      // Append geosurfaces for every country
      for (let i = 0; i < this._geoSurfaces.length; ++i) {
        this._meshes.earth.add(this._geoSurfaces[i]);
      }

      resolve();
    });
  }


  _shaderPass() {
    return new Promise(resolve => {
      if (this._preferences.debug) { console.log('WorldMapView._shaderPass'); }
      // Anti aliasing with FXAA
      const pixelRatio = this._renderer.getPixelRatio();
      const fxaaPass = MzkMeshes.new({ type: 'fxaa' });
      fxaaPass.uniforms.resolution.value.x = 1 / (this._renderTo.offsetWidth * pixelRatio);
      fxaaPass.uniforms.resolution.value.y = 1 / (this._renderTo.offsetHeight * pixelRatio);
      this._composer.addPass(fxaaPass);
      // Apply light vignetting on scene for better focus on center
      const vignettePass = MzkMeshes.new({ type: 'vignette' });
      vignettePass.uniforms.darkness.value = 1.05;
      this._composer.renderToScreen = true;
      this._composer.addPass(vignettePass);

      resolve();
    });
  }


/*  ----------  App, click and keyboard events  ----------  */


  _events() {
    return new Promise((resolve, reject) => {
      if (this._preferences.debug) { console.log('WorldMapView._events'); }
      try {
        window.addEventListener('resize', this._onResize, false);
        window.addEventListener('click', this._onCanvasClicked, false);

        this._buttons.top.addEventListener('click', this._moveCameraTop.bind(this), false);
        this._buttons.left.addEventListener('click', this._moveCameraLeft.bind(this), false);
        this._buttons.bottom.addEventListener('click', this._moveCameraBottom.bind(this), false);
        this._buttons.right.addEventListener('click', this._moveCameraRight.bind(this), false);
        this._buttons.center.addEventListener('click', this._moveCameraToInitPos.bind(this), false);
        this._buttons.configuration.addEventListener('click', this._configurationCB, false);

        resolve();
      } catch (err) {
        reject(`WorldMapView._events\n${err}`);
      }
    });
  }


  _keyEvents() {
    return new Promise(resolve => {
      if (this._preferences.debug) { console.log('WorldMapView._keyEvents'); }
      window.addEventListener('keyup', event => {
        if (event.key === 'ArrowUp' || event.key === 'z') {
          this._moveCameraTop();
        } else if (event.key === 'ArrowLeft' || event.key === 'q') {
          this._moveCameraLeft();
        } else if (event.key === 'ArrowDown' || event.key === 's') {
          this._moveCameraBottom();
        } else if (event.key === 'ArrowRight' || event.key === 'd') {
          this._moveCameraRight();
        }
      }, false);
      resolve();
    });
  }


  _onResize() {
    if (this._preferences.debug) { console.log('WorldMapView._onResize'); }
    this._camera.aspect = window.innerWidth / window.innerHeight;
    this._camera.updateProjectionMatrix();
    this._renderer.setSize(window.innerWidth, window.innerHeight);
  }


/*  ----------  Animation and rendering  ----------  */


  animate() {
    if (this._preferences.debug) {
      this._helpers.stats.begin();
    }

    TWEEN.update(); // Update Tween for animations
    this._composer.render(this._scene, this._camera);
    this._render();

    if (this._preferences.debug) {
      this._helpers.stats.end();
    }

    this._rafId = requestAnimationFrame(this.animate.bind(this)); // Keep animation
  }


  _render() {
    // Put const here, avoid any calculation to reduce CPU load
    this._pivots.moon.rotation.y += AngularSpeeds.moon;
    this._pivots.sun.rotation.y += AngularSpeeds.sun;
    this._meshes.earthClouds.rotation.y += AngularSpeeds.clouds;
    // Update DayNightShader sun light direction according to light world matrix, same for atmosphere view vector
    this._meshes.earthNight.material.uniforms.sunDirection.value = new THREE.Vector3().applyMatrix4(this._lights.sun.matrixWorld);
    this._meshes.earthAtmosphere.material.uniforms.viewVector.value = this._camera.position;
    this._controls.update();
  }


/*  ----------  Country selection and callback management  ----------  */


  _unselectAll() {
    if (this._preferences.debug) { console.log('WorldMapView._unselectAll'); }
    if (this._selectedPin !== null) {
      this._selectedPin.geometry.scale(1, 0.5, 1);
      this._selectedPin.material.color.setHex(0x56d45b); // Reset pin color
      this._selectedPin = null;
    }

    if (this._selectedSurfaces.length > 0) {
      this._selectedSurfaces.forEach(({ material }) => { material.opacity = 0; });
      this._selectedSurfaces = [];
    }
  }


  _onCanvasClicked(event) {
    if (this._preferences.debug) { console.log('WorldMapView._onCanvasClicked'); }
    // Only check for clicked country if user is not moving in scene
    if (this._controls.hasMoved === false) {
      event.preventDefault();
      this._unselectAll();

      const raycaster = new THREE.Raycaster();
      const mouse = new THREE.Vector2();

      mouse.x = (event.clientX / this._renderer.domElement.clientWidth) * 2 - 1;
      mouse.y =  - (event.clientY / this._renderer.domElement.clientHeight) * 2 + 1;
      // Configure ray caster with mouse and camera
      raycaster.setFromCamera(mouse, this._camera);
      // Ray cast againt pins
      let intersects = raycaster.intersectObjects(this._pins);
      // Check if intersects exists and if target is not selected country
      if (intersects.length > 0 && intersects[0].object.info.trigram !== this._selectedCountryTrigram) {
        this._selectedPin = intersects[0].object;
        this._selectedCountryTrigram = this._selectedPin.info.trigram;
        this._selectedPin.clickCallback(this, intersects[0].point);
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
          targetCountry.clickCallback(this, intersects[0].point);
        }
      } else {
        this._selectedCountryTrigram = null;
      }
    }
  }


  _countryClicked(WorldMapView, point) { // This is already binded to the target
    if (WorldMapView._preferences.debug) { console.log('WorldMapView._countryClicked'); }
    // Writtin straight into Meshes (this scope)
    if (this.info.GEOUNIT) { // Country surface clicked, pin otherwise
      this.info.name = this.info.NAME;
      this.info.trigram = this.info.GU_A3;
    }
    // Update selected pin
    WorldMapView._selectedPin = null; // We reset selection bc we don't know if pin or surface clicked
    for (let i = 0; i < WorldMapView._pins.length; ++i) {
      if (WorldMapView._pins[i].info.trigram === WorldMapView._selectedCountryTrigram) {
        WorldMapView._pins[i].material.color.setHex(0xFF6B67);
        WorldMapView._selectedPin = WorldMapView._pins[i]; // Save pin in case evt comes from surface
        WorldMapView._selectedPin.geometry.scale(1, 2, 1);
        break; // Break beacause we have one pin per country
      }
    }
    // Update selected surfaces
    WorldMapView._selectedSurfaces = [];
    for (let i = 0; i < WorldMapView._geoSurfaces.length; ++i) {
      if (WorldMapView._geoSurfaces[i].info.trigram === WorldMapView._selectedCountryTrigram) {
        WorldMapView._geoSurfaces[i].material.opacity = 0.4;
        WorldMapView._selectedSurfaces.push(WorldMapView._geoSurfaces[i]);
      }
    }
    // Animate camera to go over clicked country
    const camDistance = WorldMapView._camera.position.length();
    WorldMapView._animateCameraPosition({
      x: WorldMapView._camera.position.x,
      y: WorldMapView._camera.position.y,
      z: WorldMapView._camera.position.z
    }, {
      x: WorldMapView._camera.position.copy(point).normalize().multiplyScalar(camDistance).x,
      y: WorldMapView._camera.position.copy(point).normalize().multiplyScalar(camDistance).y,
      z: WorldMapView._camera.position.copy(point).normalize().multiplyScalar(camDistance).z
    });
    // Call plugin callback
    WorldMapView._countryClickedCB(this.info);
  }


/*  ----------  Camera controls and manipulation  ----------  */


  _animateCameraPosition(from, to) {
    if (this._preferences.debug) { console.log('WorldMapView._animateCameraPosition'); }
    return new TWEEN.Tween(from).to(to, 500)
      .easing(TWEEN.Easing.Quadratic.InOut)
      .onUpdate(() => {
        this._camera.position.x = from.x;
        this._camera.position.y = from.y;
        this._camera.position.z = from.z;
        this._camera.lookAt(this._scene.position);
      }).start();
  }


  _moveCameraTop() {
    if (this._preferences.debug) { console.log('WorldMapView._moveCameraTop'); }
    this._animateCameraPosition({
      x: this._camera.position.x,
      y: this._camera.position.y,
      z: this._camera.position.z
    }, {
      x: this._camera.position.x,
      y: this._camera.position.y * Math.cos(this._cameraSpeed) + this._camera.position.z * Math.sin(this._cameraSpeed),
      z: this._camera.position.z * Math.cos(this._cameraSpeed) - this._camera.position.y * Math.sin(this._cameraSpeed)
    });
  }


  _moveCameraLeft() {
    if (this._preferences.debug) { console.log('WorldMapView._moveCameraLeft'); }
    this._animateCameraPosition({
      x: this._camera.position.x,
      y: this._camera.position.y,
      z: this._camera.position.z
    }, {
      x: this._camera.position.x * Math.cos(this._cameraSpeed) - this._camera.position.z * Math.sin(this._cameraSpeed),
      y: this._camera.position.y,
      z: this._camera.position.z * Math.cos(this._cameraSpeed) + this._camera.position.x * Math.sin(this._cameraSpeed)
    });
  }


  _moveCameraBottom() {
    if (this._preferences.debug) { console.log('WorldMapView._moveCameraBottom'); }
    this._animateCameraPosition({
      x: this._camera.position.x,
      y: this._camera.position.y,
      z: this._camera.position.z
    }, {
      x: this._camera.position.x,
      y: this._camera.position.y * Math.cos(this._cameraSpeed) - this._camera.position.z * Math.sin(this._cameraSpeed),
      z: this._camera.position.z * Math.cos(this._cameraSpeed) + this._camera.position.y * Math.sin(this._cameraSpeed)
    });
  }


  _moveCameraRight() {
    if (this._preferences.debug) { console.log('WorldMapView._moveCameraRight'); }
    this._animateCameraPosition({
      x: this._camera.position.x,
      y: this._camera.position.y,
      z: this._camera.position.z
    }, {
      x: this._camera.position.x * Math.cos(this._cameraSpeed) + this._camera.position.z * Math.sin(this._cameraSpeed),
      y: this._camera.position.y,
      z: this._camera.position.z * Math.cos(this._cameraSpeed) - this._camera.position.x * Math.sin(this._cameraSpeed)
    });
  }


  _moveCameraToInitPos() {
    if (this._preferences.debug) { console.log('WorldMapView._moveCameraToInitPos'); }
    this._animateCameraPosition({
      x: this._camera.position.x,
      y: this._camera.position.y,
      z: this._camera.position.z
    }, {
      x: 0,
      y: 0,
      z: 1.66
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
