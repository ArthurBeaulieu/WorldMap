import TrackballControls from './TrackballControls.js';
import MeshFactory from './MeshFactory.js';


let Meshes = null;


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
      clouds: null,
      sun: null,
      moon: null,
      starfield: null,
      axisHelper: null
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
    // Scene DOM elements
    this._selectedPin = null;
    this._selectedSurfaces = [];
    this._buttons = {
      resetCamera: null,
      resetPositions: null
    };
    // Scene country pins
    this._geoLines = [];
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
    // Build geolines for country boundaries
    for (let i = 0; i < this._geoData.features.length; ++i) {
      // Create geo line from feature geometry
      const geoLine = Meshes.new({ type: 'geoline', geometry: this._geoData.features[i].geometry });
      this._geoLines.push(geoLine);
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
        this._lights.ambient = new THREE.AmbientLight(0x101010);
        this._lights.sun = new THREE.PointLight(0xffee88, 3, 0);
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
        // Reset camera position button
        this._buttons.resetCamera = document.createElement('BUTTON');
        this._buttons.resetCamera.classList.add('reset-camera');
        this._buttons.resetCamera.innerHTML = 'Reset camera';
        this._renderTo.appendChild(this._buttons.resetCamera);
        // Reset planet/sun/moon position button
        this._buttons.resetPositions = document.createElement('BUTTON');
        this._buttons.resetPositions.classList.add('reset-positions');
        this._buttons.resetPositions.innerHTML = 'Reset position';
        this._renderTo.appendChild(this._buttons.resetPositions);
        resolve();
      } catch (err) {
        reject(`WorldMapView._buildControls\n${err}`);
      }
    });
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
        // Place Earth facing Greenwich
        this._meshes.moon.rotation.y += Math.PI / 2; // Put dark side of the moon to the dark
        this._meshes.earth.rotation.y += Math.PI / 2; // Earth rotation to face Greenwich
        this._meshes.clouds.rotation.y += Math.PI / 2;
        // Shift earth along its axis from 23.3° (average in between earth tilt axis extremums : 22.1° and 24.5°)
        this._meshes.earth.rotation.z += (23.3 * Math.PI) / 180; // Earth tilt
        this._pivots.moon.rotation.x += (5.145 * Math.PI) / 180; // 5.145° offset from the earth plane
        // Iterate over pins to configure their position
        for (let i = 0; i < this._pins.length; ++i) {
          const latlonpoint = this.getPosFromLatLonRad(this._pins[i].info.countryCenter.lat, this._pins[i].info.countryCenter.long, this.CONST.RADIUS.EARTH);
          this._pins[i].position.set(latlonpoint[0], latlonpoint[1], latlonpoint[2]);
          this._pins[i].lookAt(new THREE.Vector3(0, 0, 0)); // As referential is geocentric, we look at the earth's center
          this._pins[i].rotation.y += Math.PI / 2; // Rotate for cylinder to be orthonormal with earth surface
          this._pins[i].clickCallback = this._countryClicked;
        }

        for (let i = 0; i < this._geoLines.length; ++i) {
          this._geoLines[i].rotation.y -= Math.PI / 2;
        }

        for (let i = 0; i < this._geoSurfaces.length; ++i) {
          this._geoSurfaces[i].rotation.x += (23.3 * Math.PI) / 180;
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
      this._scene.add(this._meshes.clouds);
      this._scene.add(this._meshes.starfield);
      this._scene.add(this._lights.ambient);
      // Append geolines for every country
      for (let i = 0; i < this._geoLines.length; ++i) {
        this._meshes.earth.add(this._geoLines[i]);
      }
      // Append geosurfaces for every country
      for (let i = 0; i < this._geoSurfaces.length; ++i) {
        this._scene.add(this._geoSurfaces[i]);
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

        this._buttons.resetCamera.addEventListener('click', this._controls.targetOnCenter.bind(this._controls), false);
        this._buttons.resetPositions.addEventListener('click', this._resetPositions.bind(this), false);

        resolve();
      } catch (err) {
        reject(`WorldMapView._events\n${err}`);
      }
    });
  }


  animate() {
    this._rafId = requestAnimationFrame(this.animate.bind(this));
    this._renderer.render(this._scene, this._camera);
    this._render();
  }


  _render() {
    // Angular speed are tweaked to see an actual animation on render loop
    this._pivots.moon.rotation.y += (2 * Math.PI) / (27.3 * 60 * 60); // True formula is (2 * Pi) / (27.3 * 24 * 60 * 60)
    this._pivots.sun.rotation.y += (2 * Math.PI) / (365 * 10 * 60); // True formula is (2 * Pi) / (365.25 * 24 * 60 * 60)
    this._meshes.clouds.rotation.y += (2 * Math.PI) / (42 * 60 * 60);
    this._controls.update();
  }


  _resetPositions() {
    this._pivots.moon.rotation.y = 0;
    this._pivots.sun.rotation.y = 0;
    this._meshes.clouds.rotation.y = 0;
  }


  _onResize() {
    this._camera.aspect = window.innerWidth / window.innerHeight;
    this._camera.updateProjectionMatrix();
    this._renderer.setSize(window.innerWidth, window.innerHeight);
  }


  _onCanvasClicked(event) {
    event.preventDefault();
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    mouse.x = (event.clientX / this._renderer.domElement.clientWidth) * 2 - 1;
    mouse.y =  - (event.clientY / this._renderer.domElement.clientHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, this._camera);
    // Ray cast againt pins
    let intersects = raycaster.intersectObjects(this._pins);
    if (intersects.length > 0) {
      if (this._selectedPin !== null) {
        this._selectedPin.material.color.setHex(0x56d45b); // Reset pin color
      }

      this._selectedPin = intersects[0].object;
      this._selectedPin.material.color.setHex(0xFF6B67);
      this._selectedPin.clickCallback(this);
    } else {
      this._selectedPin.material.color.setHex(0x56d45b); // Reset pin color
      this._selectedPin = null;
    }
    // Ray cast againt geosurfaces
    intersects = raycaster.intersectObjects(this._geoSurfaces);
    if (intersects.length > 0) {
      if (this._selectedSurfaces.length > null) {
        this._selectedSurfaces.forEach(({ material }) => { material.opacity = 0; });
      }

      const countryParts = [];
      const targetCountry = intersects[0].object;
      // Check geosurfaces for same trigram parts
      for (let i = 0; i < this._geoSurfaces.length; ++i) {
        if (this._geoSurfaces[i].info.trigram === targetCountry.info.trigram) {
          this._geoSurfaces[i].material.opacity = 0.7;
          this._geoSurfaces[i].clickCallback(this);
          countryParts.push(this._geoSurfaces[i]);
        }
      }

      targetCountry.material.opacity = 0.7;
      targetCountry.clickCallback(this);
      countryParts.push(targetCountry);

      this._selectedSurfaces = countryParts;
    }
  }


  _countryClicked(WorldMapView) { // This is already binded to the target pin
    if (this.info.GEOUNIT) { // Country surface clicked, pin otherwise
      this.info.name = this.info.NAME;
      this.info.trigram = this.info.BRK_A3;
    }

    WorldMapView._countryClickedCB(this.info);
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
