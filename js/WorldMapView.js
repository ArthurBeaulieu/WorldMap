import TrackballControls from './TrackballControls.js';
import MeshFactory from './MeshFactory.js';


class WorldMapView {


  constructor(options) {
    THREE.TrackballControls = TrackballControls; // Override THREE TrackBallControl with provided module
    // View options
    this.debug = options.debug;
    this._renderTo = options.renderTo;
    this._countryClicked = options.countryClicked;
    this._worldData = options.worldData;
    this.CONST = options.CONST;
    // 3D context internals
    this._scene = null;
    this._camera = null;
    this._controls = null;
    this._renderer = null;
    this._rafId = -1;
    // Scene meshes
    this._meshes = {
      earth: null,
      cloud: null,
      boundaries: null,
      sun: null,
      moon: null,
      starfield: null
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
    this._selectedCountry = null;
    this._selectedPin = null;
    this._buttons = {
      resetCamera: null,
      resetPositions: null
    };
    // Scene country pins
    this._pins = [];
    // Init 3D viewer
    this.init();
  }


  init() {
    const consolelog = console.log; // Store Js console.log behavior
    if (this.debug === false) { console.log = () => {}; } // Remove THREE Js log message when not debugging

    this._buildViewer()
      .then(this._buildLights.bind(this))
      .then(this._buildMeshes.bind(this))
      .then(this._placeElements.bind(this))
      .then(this._fillScene.bind(this))
      .then(this._buildControls.bind(this))
      .then(this._events.bind(this))
      .then(this.animate.bind(this))
      .then(() => { if (this.debug === false) { console.log = consolelog; } }) // Restore Js console.log behavior
      .catch(this._initFailed.bind(this));
  }


  _initFailed(e) {
    console.error(e);
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
        this._renderer.toneMapping = THREE.ReinhardToneMapping;
        this._renderer.setClearColor(0x040404, 1.0);
        this._renderer.setPixelRatio(window.devicePixelRatio);
        this._renderer.setSize(window.innerWidth, window.innerHeight);
        this._renderTo.appendChild(this._renderer.domElement);
        resolve();
      } catch (e) {
        reject(`WorldMapView._buildViewer\n${e}`);
      }
    });
  }


  _buildMeshes() {
    return new Promise((resolve, reject) => {
      if (this.debug) { console.log('WorldMapView._buildMeshes'); }
      try {
        const Meshes = new MeshFactory({
          CONST: this.CONST,
          segments: 64
        });
        // Pivots are for animating objects
        this._pivots.sun = new THREE.Object3D();
        this._pivots.moon = new THREE.Object3D();        
        // Build scene elements (Earth, Clouds, Outter space)
        this._meshes.earth = Meshes.new('earth');
        this._meshes.clouds = Meshes.new('clouds');
        this._meshes.boundaries = Meshes.new('boundaries');
        this._meshes.sun = Meshes.new('sun');
        this._meshes.moon = Meshes.new('moon');
        this._meshes.starfield = Meshes.new('background');
        // Build country pins on Earth
        for (let i = 0; i < this._worldData.countries.length; ++i) {
          let pin = Meshes.new('earthpin');
          pin.info = this._worldData.countries[i]; // Attach country information to the pin
          this._pins.push(pin);
        }

        resolve();
      } catch (e) {
        reject(`WorldMapView._buildMeshes\n${e}`);
      }
    });
  }


  _buildLights() {
    return new Promise((resolve, reject) => {
      if (this.debug) { console.log('WorldMapView._buildLights'); }
      try {
        this._lights.ambient = new THREE.AmbientLight(0x101010);
        this._lights.sun = new THREE.PointLight(0xffee88, 3, 0);
        resolve();
      } catch (e) {
        reject(`WorldMapView._buildLights\n${e}`);
      }
    });
  }


  _placeElements() {
    return new Promise((resolve, reject) => {
      if (this.debug) { console.log('WorldMapView._placeElements'); }
      try {       
        this._camera.position.z = 3;

        this._meshes.earth.position.set(0, 0, 0);        
        this._meshes.moon.position.set(0, 0, -5);
        this._meshes.sun.position.set(0, 0, this.CONST.RADIUS.SCENE);
        this._lights.sun.position.set(0, 0, this.CONST.RADIUS.SCENE - (2 * this.CONST.RADIUS.SUN)); // Place sunlight before sun sphere 
        this._pivots.moon.position.set(0, 0, 0);
        this._pivots.sun.position.set(0, 0, 0);
        // Place Earth facing Greenwich
        this._meshes.moon.rotation.y += Math.PI / 2; // Put dark side of the moon to the dark
        this._meshes.earth.rotation.y += Math.PI / 2; // Earth rotation to face Greenwich
        this._meshes.clouds.rotation.y += Math.PI / 2;
        this._meshes.boundaries.rotation.y += Math.PI / 2;
        // Shift earth along its axis from 23.3° (average in between earth tilt axis extremums : 22.1 and 24.5)
        this._meshes.earth.rotation.z += (23.3 * Math.PI) / 180; // Earth tilt
        this._meshes.boundaries.rotation.z += (23.3 * Math.PI) / 180;
        this._pivots.moon.rotation.x += (5.145 * Math.PI) / 180; // 5.145° offset from the earth plane

        for (let i = 0; i < this._pins.length; ++i) {
          var latlonpoint = this.getPosFromLatLonRad(this._pins[i].info.countryCenter.lat, this._pins[i].info.countryCenter.long, this.CONST.RADIUS.EARTH);
          // Add border using wireframe
          var wireframe = new THREE.LineSegments(
            new THREE.EdgesGeometry(this._pins[i].geometry),
            new THREE.LineBasicMaterial({
              color: 0x000000,
              linewidth: 4
            })
          );
          wireframe.renderOrder = 1;
          this._pins[i].add(wireframe);
          this._pins[i].position.set(latlonpoint[0], latlonpoint[1], latlonpoint[2]);
          this._pins[i].lookAt(new THREE.Vector3(0, 0, 0)); // As referential is geocentric, we look at the earth's center
          this._pins[i].clickCallback = this._pinClicked;

          this._meshes.earth.add(this._pins[i]);
        }

        if (this.debug) { this._scene.add(new THREE.AxesHelper(this.CONST.RADIUS.SCENE)); }
        resolve();
      } catch (e) {
        reject(`WorldMapView._placeElements\n${e}`);
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
      this._scene.add(this._meshes.boundaries);
      this._scene.add(this._meshes.starfield);      
      this._scene.add(this._lights.ambient);
      resolve();
    });
  }


  _buildControls() {
    return new Promise((resolve, reject) => {
      if (this.debug) { console.log('WorldMapView._buildControls'); }
      try {
        // Camera controls
        this._controls = new THREE.TrackballControls(this._camera, this._renderTo);
        this._controls.minDistance = this.CONST.RADIUS.EARTH + 0.2; // Prevent zooming to get into Earth
        this._controls.maxDistance = this.CONST.RADIUS.SCENE;
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
      } catch (e) {
        reject(`WorldMapView._buildControls\n${e}`);
      }
    });
  }


  _events() {
    return new Promise((resolve, reject) => {
      if (this.debug) { console.log('WorldMapView._events'); }
      try {
        window.addEventListener('resize', this._onResize.bind(this), false);
        window.addEventListener('beforeunload', this._onDestroy.bind(this), false);
        window.addEventListener('click', this._onCanvasClicked.bind(this), false);

        this._buttons.resetCamera.addEventListener('click', this._controls.targetOnCenter.bind(this._controls), false);
        this._buttons.resetPositions.addEventListener('click', this._resetPositions.bind(this), false);
        resolve();
      } catch (e) {
        reject(`WorldMapView._events\n${e}`);
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
    this._pivots.sun.rotation.y += (2 * Math.PI) / (365 * 90); // True formula is (2 * Pi) / (365.25 * 24 * 60 * 60)
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


  _onDestroy() {
    cancelAnimationFrame(this._rafId);
    this._controls.reset();
    this._renderer.forceContextLoss();
    this._renderer.context = null;
    this._renderer.domElement = null;
    this._renderer.dispose();
    this._renderer = null;
  }


  _onCanvasClicked(event) {
    event.preventDefault();
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    mouse.x = (event.clientX / this._renderer.domElement.clientWidth) * 2 - 1;
    mouse.y =  - (event.clientY / this._renderer.domElement.clientHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, this._camera);
    const intersects = raycaster.intersectObjects(this._pins);
    if (intersects.length > 0) {
      if (this._selectedPin !== null) {
        this._selectedPin.material.color.setHex(0x56d45b); // Reset pin color
      }

      this._selectedPin = intersects[0].object;
      this._selectedPin.material.color.setHex(0xFF6B67);
      this._selectedPin.clickCallback(this);
    } else if (this._selectedCountry !== null && event.target.closest('div').classList.contains('worldmap')) {
      this._selectedCountry.style.left = '-20%';
      this._selectedPin.material.color.setHex(0x56d45b); // Reset pin color
      setTimeout(() => {
        this._renderTo.removeChild(this._selectedCountry);
        this._selectedCountry = null;
        this._selectedPin = null;
      }, 300);
    }
  }


  _pinClicked(WorldMapView) { // This is already binded to the target pin
    if (WorldMapView._selectedCountry === null) {
      WorldMapView._selectedCountry = document.createElement('DIV');
      WorldMapView._selectedCountry.classList.add('selected-country');
      WorldMapView._renderTo.appendChild(WorldMapView._selectedCountry);

      setTimeout(() => {
        WorldMapView._selectedCountry.style.left = '0';
      }, 50);
    }

    WorldMapView._countryClicked(WorldMapView._selectedCountry, this.info);
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
