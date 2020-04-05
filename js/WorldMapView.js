import TrackballControls from './TrackballControls.js';
import MeshFactory from './MeshFactory.js';


let Meshes = null;
const AngularSpeeds = {
  moon: (2 * Math.PI) / (27.3 * 60 * 60), // True formula is (2 * Pi) / (27.3 * 24 * 60 * 60)
  sun: (2 * Math.PI) / (365 * 10 * 60), // True formula is (2 * Pi) / (365.25 * 24 * 60 * 60)
  clouds: (2 * Math.PI) / (42 * 60 * 60)
};


class WorldMapView {


  constructor(options) {
    THREE.TrackballControls = TrackballControls; // Override THREE TrackBallControl with provided module
    // View options
    this.debug = options.debug;
    this._renderTo = options.renderTo;
    this._countryClickedCB = options.countryClicked;
    this._worldData = options.worldData;
    this._geoData = options.geoData;
    this.CONST = options.const;
    // 3D context internals
    this._scene = null;
    this._camera = null;
    this._controls = null;
    this._renderer = null;
    this._rafId = -1;
    // Scene meshes
    this._meshes = {
      earth: null,
      boundaries: null,
      clouds: null,
      sun: null,
      moon: null,
      starfield: null,
      axisHelper: null
    };
    // Scene lights
    this._lights = {
      sun: null,
      ambient: null,
      enlightUniverse: null
    };
    // Animation pivots to simulate spheres orbiting
    this._pivots = {
      sun: null,
      moon: null
    };
    // Scene DOM elements
    this._selectedPin = null;
    this._selectedSurfaces = [];
    this._buttons = {
      toggleLight: null,
      controls: {
        top: null,
        left: null,
        bottom: null,
        right: null,
        center: null
      }
    };
    this._isLightOn = false;
    // Scene country pins, surface and trigram
    this._selectedCountryTrigram = null;
    this._geoSurfaces = [];
    this._pins = [];
    // Event bindings
    this._onResize = this._onResize.bind(this);
    this._onCanvasClicked = this._onCanvasClicked.bind(this);
    // Define MeshFactory
    Meshes = new MeshFactory({
      CONST: this.CONST,
      segments: 64
    });
    // Init 3D viewer
    this.init();
  }


  init() {
    const consolelog = console.log; // Store Js console.log behavior
    if (this.debug === false) { console.log = () => {}; } // Remove THREE Js log message when not debugging
    // View build sequence
    this._buildViewer()
      .then(this._buildLights.bind(this))
      .then(this._buildMeshes.bind(this))
      .then(this._placeElements.bind(this))
      .then(this._fillScene.bind(this))
      .then(this._buildControls.bind(this))
      .then(this._events.bind(this))
      .then(this._keyEvents.bind(this))
      .then(this.animate.bind(this))
      .then(() => { if (this.debug === false) { console.log = consolelog; } }) // Restore Js console.log behavior
      .catch(err => console.error(err) );
  }


  destroy() {
    return new Promise(resolve => {
      // Kill animation process
      cancelAnimationFrame(this._rafId);
      // Remove all events in view
      window.removeEventListener('resize', this._onResize, false);
      window.removeEventListener('click', this._onCanvasClicked, false);
      // Remove lights
      this._scene.remove(this._lights.ambient);
      // Remove pivots (moon, sun and sun light)
      this._scene.remove(this._pivots.moon);
      this._scene.remove(this._pivots.sun);
      // Remove meshes
      this._scene.remove(this._meshes.earth);
      this._scene.remove(this._meshes.clouds);
      this._scene.remove(this._meshes.starfield);
      this._scene.remove(this._meshes.axisHelper);
      // Remove pins
      for (let i = 0; i < this._pins.length; ++i) {
        this._scene.remove(this._pins[i]);
        delete this._pins[i];
      }
      // Dispose, call for destructors and clean parent
      this._controls.destroy();
      this._scene.dispose();
      this._renderer.dispose();
      this._renderTo.innerHTML = '';
      // Delete object attributes
      delete this._renderTo;
      delete this._countryClicked;
      delete this._worldData;
      delete this._rafId;
      delete this._selectedPin;
      delete this._pins;
      delete this._buttons;
      delete this._lights;
      delete this._pivots;
      delete this._meshes;
      delete this._controls;
      delete this._camera;
      delete this._renderer;
      delete this._scene;
      delete this.debug;
      delete this.CONST;
      delete this._onResize;
      delete this._onCanvasClicked;
      // Resolve Promise to notify that View has been completely destroyed
      resolve();
    });
  }


  _buildViewer() {
    return new Promise((resolve, reject) => {
      if (this.debug) { console.log('WorldMapView._buildViewer'); }
      try {
        // Viewer utils
        this._scene = new THREE.Scene();
        this._camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 25000);
        // Renderer parameters
        this._renderer = new THREE.WebGLRenderer({ antialias: true });
        this._renderer.gammaInput = true;
        this._renderer.gammaOutput = true;
        this._renderer.gammaFactor = 2.3;
        this._renderer.toneMapping = THREE.ReinhardToneMapping;
        this._renderer.setClearColor(0x040404, 1.0);
        this._renderer.setPixelRatio(window.devicePixelRatio);
        this._renderer.setSize(window.innerWidth, window.innerHeight);
        this._renderTo.appendChild(this._renderer.domElement);
        resolve();
      } catch (err) {
        reject(`WorldMapView._buildViewer\n${err}`);
      }
    });
  }


  _buildMeshes() {
    return new Promise((resolve, reject) => {
      if (this.debug) { console.log('WorldMapView._buildMeshes'); }
      try {
        // Pivots are for animating objects
        this._pivots.sun = new THREE.Object3D();
        this._pivots.moon = new THREE.Object3D();
        // Build scene elements (Earth, Clouds, Outter space)
        this._meshes.earth = Meshes.new({ type: 'earth' });
        this._meshes.boundaries = Meshes.new({ type: 'boundaries' });
        this._meshes.clouds = Meshes.new({ type: 'clouds' });
        this._meshes.sun = Meshes.new({ type: 'sun' });
        this._meshes.moon = Meshes.new({ type: 'moon' });
        this._meshes.starfield = Meshes.new({ type: 'background' });
        // Axis helper displayed on debug true
        this._meshes.axisHelper = new THREE.AxesHelper(this.CONST.RADIUS.SCENE);
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
    for (let i = 0; i < this._worldData.length; ++i) { // Build country pins on Earth
      const pin = Meshes.new({ type: 'earthpin', scale: this._worldData[i].scale });
      const wireframe = Meshes.new({ type: 'wireframe', geometry: pin.geometry }); // Add border using wireframe

      pin.info = this._worldData[i]; // Attach country information to the pin
      wireframe.renderOrder = 1; // Force wireframe render on top

      pin.add(wireframe);
      this._pins.push(pin);
    }
  }


  _buildGeoMeshes() {
    for (let i = 0; i < this._geoData.features.length; ++i) {
      // Check polygon type for feature
      const polygons = this._geoData.features[i].geometry.type === 'Polygon' ? [this._geoData.features[i].geometry.coordinates] : this._geoData.features[i].geometry.coordinates;
      for (let j = 0; j < polygons.length; ++j) {
        const geoSurface = Meshes.new({ type: 'geosurface', geometry: polygons[j] });
        // Attach info to mesh
        geoSurface.info = this._geoData.features[i].properties;
        geoSurface.info.hasArtists = false;
        geoSurface.info.trigram = this._geoData.features[i].properties.BRK_A3;
        // Find in world data the matching country data
        for (let k = 0; k < this._worldData.length; ++k) {
          if (this._worldData[k].trigram === this._geoData.features[i].properties.BRK_A3) {
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


  _buildLights() {
    return new Promise((resolve, reject) => {
      if (this.debug) { console.log('WorldMapView._buildLights'); }
      try {
        this._lights.sun = new THREE.PointLight(0xffee88, 3, 0);
        this._lights.ambient = new THREE.AmbientLight(0x101010);
        this._lights.enlightUniverse = new THREE.AmbientLight(0xFFFFFF);
        resolve();
      } catch (err) {
        reject(`WorldMapView._buildLights\n${err}`);
      }
    });
  }


  _buildControls() {
    return new Promise((resolve, reject) => {
      if (this.debug) { console.log('WorldMapView._buildControls'); }
      try {
        // Camera controls
        this._controls = new THREE.TrackballControls(this._camera, this._renderTo);
        this._controls.minDistance = this.CONST.RADIUS.EARTH + 0.2; // Prevent zooming to get into Earth
        this._controls.maxDistance = this.CONST.DISTANCE.MOON + (this.CONST.RADIUS.MOON * 3); // Constraint dezoom to a little behind the moon
        // Reset planet/sun/moon position button
        this._buttons.toggleLight = document.createElement('BUTTON');
        this._buttons.toggleLight.classList.add('toggle-light');
        this._buttons.toggleLight.innerHTML = 'Toggle light';
        this._renderTo.appendChild(this._buttons.toggleLight);
        // Camera control buttons
        this._buildCameraControls();
        resolve();
      } catch (err) {
        reject(`WorldMapView._buildControls\n${err}`);
      }
    });
  }


  _buildCameraControls() {
    const controlsContainer = document.createElement('DIV');
    controlsContainer.classList.add('camera-controls-container');
    const controls = document.createElement('DIV');
    controls.classList.add('camera-controls');
    this._buttons.controls.top = document.createElement('IMG');
    this._buttons.controls.left = document.createElement('IMG');
    this._buttons.controls.bottom = document.createElement('IMG');
    this._buttons.controls.right = document.createElement('IMG');
    this._buttons.controls.center = document.createElement('IMG');
    this._buttons.controls.top.classList.add('camera-top');
    this._buttons.controls.left.classList.add('camera-left');
    this._buttons.controls.bottom.classList.add('camera-bottom');
    this._buttons.controls.right.classList.add('camera-right');
    this._buttons.controls.center.classList.add('camera-center');
    this._buttons.controls.top.src = './assets/img/icons/nav-up.svg';
    this._buttons.controls.left.src = './assets/img/icons/nav-left.svg';
    this._buttons.controls.bottom.src = './assets/img/icons/nav-down.svg';
    this._buttons.controls.right.src = './assets/img/icons/nav-right.svg';
    this._buttons.controls.center.src = './assets/img/icons/nav-center.svg';
    controls.appendChild(this._buttons.controls.top);
    controls.appendChild(this._buttons.controls.left);
    controls.appendChild(this._buttons.controls.bottom);
    controls.appendChild(this._buttons.controls.right);
    controls.appendChild(this._buttons.controls.center);
    controlsContainer.appendChild(controls);
    this._renderTo.appendChild(controlsContainer);
  }


  _placeElements() {
    return new Promise((resolve, reject) => {
      if (this.debug) { console.log('WorldMapView._placeElements'); }
      try {
        this._camera.position.z = 1.66;

        this._meshes.earth.position.set(0, 0, 0);
        this._meshes.moon.position.set(0, 0, -this.CONST.DISTANCE.MOON);
        this._meshes.sun.position.set(0, 0, this.CONST.DISTANCE.SUN);
        this._lights.sun.position.set(0, 0, this.CONST.DISTANCE.SUN - (this.CONST.RADIUS.SUN * 3)); // Place sunlight before sun sphere
        this._pivots.moon.position.set(0, 0, 0);
        this._pivots.sun.position.set(0, 0, 0);
        // Anti-meridian alignement
        this._meshes.moon.rotation.y += Math.PI / 2; // Put dark side of the moon to the dark
        this._meshes.earth.rotation.y += Math.PI / 2; // Earth rotation to face Greenwich
        this._meshes.boundaries.rotation.y += Math.PI / 2;
        this._meshes.clouds.rotation.y += Math.PI / 2;
        // Shift earth along its axis from 23.3° (average in between earth tilt axis extremums : 22.1° and 24.5°)
        this._meshes.earth.rotation.z += (23.3 * Math.PI) / 180; // Earth tilt
        this._meshes.boundaries.rotation.z += (23.3 * Math.PI) / 180;
        this._pivots.moon.rotation.x += (5.145 * Math.PI) / 180; // 5.145° offset from the earth plane
        // Iterate over pins to configure their position
        for (let i = 0; i < this._pins.length; ++i) {
          const latlonpoint = this.getPosFromLatLonRad(this._pins[i].info.countryCenter.lat, this._pins[i].info.countryCenter.long, this.CONST.RADIUS.EARTH);
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
        reject(`WorldMapView._placeElements\n${err}`);
      }
    });
  }


  _fillScene() {
    return new Promise(resolve => {
      this._pivots.moon.add(this._meshes.moon);
      this._pivots.sun.add(this._meshes.sun);
      this._pivots.sun.add(this._lights.sun);
      this._scene.add(this._pivots.moon);
      this._scene.add(this._pivots.sun);
      this._scene.add(this._meshes.earth);
      this._scene.add(this._meshes.boundaries);
      this._scene.add(this._meshes.clouds);
      this._scene.add(this._meshes.starfield);
      this._scene.add(this._lights.ambient);
      // Append geosurfaces for every country
      for (let i = 0; i < this._geoSurfaces.length; ++i) {
        this._meshes.earth.add(this._geoSurfaces[i]);
      }
      // Append every stored pins according to given data
      for (let i = 0; i < this._pins.length; ++i) {
        this._meshes.earth.add(this._pins[i]);
      }
      // In debug, append AxisHelper to the scene
      if (this.debug) {
        this._scene.add(this._meshes.axisHelper);
      }

      resolve();
    });
  }


  _events() {
    return new Promise((resolve, reject) => {
      if (this.debug) { console.log('WorldMapView._events'); }
      try {
        window.addEventListener('resize', this._onResize, false);
        window.addEventListener('click', this._onCanvasClicked, false);

        const cameraSpeed = Math.PI / 12;
        this._buttons.controls.top.addEventListener('click', () => {
          const y = this._camera.position.y;
          const z = this._camera.position.z;
          this._camera.position.y = y * Math.cos(cameraSpeed) + z * Math.sin(cameraSpeed);
          this._camera.position.z = z * Math.cos(cameraSpeed) - y * Math.sin(cameraSpeed);
          this._camera.lookAt(this._scene.position);
        }, false);
        this._buttons.controls.left.addEventListener('click', () => {
          const x = this._camera.position.x;
          const z = this._camera.position.z;
          this._camera.position.x = x * Math.cos(cameraSpeed) - z * Math.sin(cameraSpeed);
          this._camera.position.z = z * Math.cos(cameraSpeed) + x * Math.sin(cameraSpeed);
          this._camera.lookAt(this._scene.position);
        }, false);
        this._buttons.controls.bottom.addEventListener('click', () => {
          const y = this._camera.position.y;
          const z = this._camera.position.z;
          this._camera.position.y = y * Math.cos(cameraSpeed) - z * Math.sin(cameraSpeed);
          this._camera.position.z = z * Math.cos(cameraSpeed) + y * Math.sin(cameraSpeed);
          this._camera.lookAt(this._scene.position);
        }, false);
        this._buttons.controls.right.addEventListener('click', () => {
          const x = this._camera.position.x;
          const z = this._camera.position.z;
          this._camera.position.x = x * Math.cos(cameraSpeed) + z * Math.sin(cameraSpeed);
          this._camera.position.z = z * Math.cos(cameraSpeed) - x * Math.sin(cameraSpeed);
          this._camera.lookAt(this._scene.position);
        }, false);
        this._buttons.controls.center.addEventListener('click', this._controls.targetOnCenter.bind(this._controls), false);
        this._buttons.toggleLight.addEventListener('click', this._toggleUniverseLight.bind(this), false);

        resolve();
      } catch (err) {
        reject(`WorldMapView._events\n${err}`);
      }
    });
  }


  _keyEvents() {

  }


  animate() {
    this._rafId = requestAnimationFrame(this.animate.bind(this));
    this._renderer.render(this._scene, this._camera);
    this._render();
  }


  _render() { // Put const here, avoid any calculation to reduce CPU load
    // Angular speed are tweaked to see an actual animation on render loop
    this._pivots.moon.rotation.y += AngularSpeeds.moon; // True formula is (2 * Pi) / (27.3 * 24 * 60 * 60)
    this._pivots.sun.rotation.y += AngularSpeeds.sun; // True formula is (2 * Pi) / (365.25 * 24 * 60 * 60)
    this._meshes.clouds.rotation.y += AngularSpeeds.clouds;
    this._controls.update();
  }


  _toggleUniverseLight() {
    if (this._isLightOn === false) {
      this._isLightOn = true;
      this._scene.add(this._lights.enlightUniverse);
    } else {
      this._isLightOn = false;
      this._scene.remove(this._lights.enlightUniverse);
    }
  }


  _onResize() {
    this._camera.aspect = window.innerWidth / window.innerHeight;
    this._camera.updateProjectionMatrix();
    this._renderer.setSize(window.innerWidth, window.innerHeight);
  }


  _onCanvasClicked(event) {
    event.preventDefault();
    this._unselectAll();
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    mouse.x = (event.clientX / this._renderer.domElement.clientWidth) * 2 - 1;
    mouse.y =  - (event.clientY / this._renderer.domElement.clientHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, this._camera);
    // Ray cast againt pins
    let intersects = raycaster.intersectObjects(this._pins);
    if (intersects.length > 0) {
      this._selectedPin = intersects[0].object;
      this._selectedCountryTrigram = this._selectedPin.info.trigram;
      this._selectedPin.clickCallback(this);
      return; // We return there as selection occurs in callback to select both pins and surfaces
    }
    // Ray cast againt geosurfaces
    intersects = raycaster.intersectObjects(this._geoSurfaces);
    if (intersects.length > 0) {
      const countryParts = [];
      const targetCountry = intersects[0].object;
      // Check geosurfaces for same trigram parts
      for (let i = 0; i < this._geoSurfaces.length; ++i) {
        if (this._geoSurfaces[i].info.trigram === targetCountry.info.trigram) {
          countryParts.push(this._geoSurfaces[i]);
        }
      }

      countryParts.push(targetCountry);

      if (countryParts.length > 0) {
        this._selectedSurfaces = countryParts;
        this._selectedCountryTrigram = targetCountry.info.trigram;
        // All selected surface match the same country, we take 0 as reference for cb
        targetCountry.clickCallback(this);
      }
    }
  }


  _countryClicked(WorldMapView) { // This is already binded to the target pin
    // Writtin straight into Meshe (this scope)
    if (this.info.GEOUNIT) { // Country surface clicked, pin otherwise
      this.info.name = this.info.NAME;
      this.info.trigram = this.info.BRK_A3;
    }

    WorldMapView._selectedPin = null; // We reset selection bc we don't know if pin or surface clicked
    for (let i = 0; i < WorldMapView._pins.length; ++i) {
      if (WorldMapView._pins[i].info.trigram === WorldMapView._selectedCountryTrigram) {
        WorldMapView._pins[i].material.color.setHex(0xFF6B67);
        WorldMapView._selectedPin = WorldMapView._pins[i]; // Save pin in case evt comes from surface
        break; // Break beacause we have one pin per country
      }
    }

    WorldMapView._selectedSurfaces = [];
    for (let i = 0; i < WorldMapView._geoSurfaces.length; ++i) {
      if (WorldMapView._geoSurfaces[i].info.trigram === WorldMapView._selectedCountryTrigram) {
        WorldMapView._geoSurfaces[i].material.opacity = 0.7;
        WorldMapView._selectedSurfaces.push(WorldMapView._geoSurfaces[i]);
      }
    }

    WorldMapView._countryClickedCB(this.info);
  }


  _unselectAll() {
    if (this._selectedPin !== null) {
      this._selectedPin.material.color.setHex(0x56d45b); // Reset pin color
      this._selectedPin = null;
    }

    if (this._selectedSurfaces.length > 0) {
      this._selectedSurfaces.forEach(({ material }) => { material.opacity = 0; });
      this._selectedSurfaces = [];
    }
  }


  // Move in utils or some kind of
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
