import MeshFactory from './MeshFactory.js';
import TrackballControls from './TrackballControls.js';

class WorldMapView {
  constructor(options) {
    THREE.TrackballControls = TrackballControls; // Override THREE TrackBallControl with provided module
    // View options
    this._renderTo = options.renderTo;
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
      moon: null,
      starfield: null
    };
    this._pins = [];
    // Scene lights
    this._lights = {
      sun: null,
      ambient: null
    };
    // Init 3D viewer
    this.init();
  }


  init() {
    this._buildViewer();
    this._buildMeshes();
    this._buildLights();
    this._placeElements();
    this._events();
    this.animate();
  }


  _buildViewer() {
    // Viewer utils
    this._scene = new THREE.Scene();
    this._camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 25000);
    this._controls = new THREE.TrackballControls(this._camera, this._renderTo);
    // Renderer parameters
    this._renderer = new THREE.WebGLRenderer({ antialias: true });
    this._renderer.gammaInput = true;
    this._renderer.gammaOutput = true;
    this._renderer.toneMapping = THREE.ReinhardToneMapping;
    this._renderer.setClearColor(0x040404, 1.0);
    this._renderer.setPixelRatio(window.devicePixelRatio);
    this._renderer.setSize(window.innerWidth, window.innerHeight);
    this._renderTo.appendChild(this._renderer.domElement);
  }


  _buildMeshes() {
    // Build scene elements (Earth, Clouds, Outter space)
    this._meshes.earth = new MeshFactory('earth', { CONST: this.CONST });
    this._meshes.clouds = new MeshFactory('clouds', { CONST: this.CONST });
    this._meshes.boundaries = new MeshFactory('boundaries', { CONST: this.CONST });
    this._meshes.moon = new MeshFactory('moon', { CONST: this.CONST });
    this._meshes.starfield = new MeshFactory('background', { CONST: this.CONST });
  }


  _buildLights() {
    this._lights.ambient = new THREE.AmbientLight(0x202020);
    this._lights.sun = new THREE.PointLight(0xffee88, 4, 0);
  }


  _placeElements() {
    this._camera.position.z = 3;
    // Place Earth facing Greenwich
    this._meshes.moon.rotation.y += Math.PI / 2;
    this._meshes.earth.rotation.y += Math.PI / 2; // Earth rotation
    this._meshes.clouds.rotation.y += Math.PI / 2; // Slowly move clouds over earth surface
    this._meshes.boundaries.rotation.y += Math.PI / 2; // Rotate boundaries according to Earth's rotation

    // Shift earth along its axis from 23.3 deg (average in between earth tilt axis extremums : 22.1 and 24.5)
    this._meshes.moon.rotation.z += (23.3 * Math.PI) / 180;
    this._meshes.earth.rotation.z += (23.3 * Math.PI) / 180; // Earth rotation
    this._meshes.clouds.rotation.z += (23.3 * Math.PI) / 180; // Slowly move clouds over earth surface
    this._meshes.boundaries.rotation.z += (23.3 * Math.PI) / 180; // Rotate boundaries according to Earth's rotation

    this._lights.sun.position.set(0, 0, 5);

    this._meshes.earth.position.set(0, 0, 0);
    this._meshes.moon.position.set(-0.5, 0, -2);

    this._scene.add(this._lights.sun); // From Sun
    this._scene.add(this._lights.ambient); // From cosmic noise, maybe ?

    this._scene.add(this._meshes.earth);
    this._scene.add(this._meshes.clouds);
    this._scene.add(this._meshes.boundaries);
    this._scene.add(this._meshes.starfield);
    this._scene.add(this._meshes.moon);

    var axesHelper = new THREE.AxesHelper( 5 );
    this._scene.add( axesHelper );

    for (let i = 0; i < this._worldData.countries.length; ++i) {
      var pin = new MeshFactory('earthpin', { CONST: this.CONST });
      pin.info = this._worldData.countries[i];
      var latlonpoint = this.getPosFromLatLonRad(pin.info.countryCenter.lat, pin.info.countryCenter.long, 0.5)
      // Add border using wireframe
      var wireframe = new THREE.LineSegments(
        new THREE.EdgesGeometry(pin.geometry),
        new THREE.LineBasicMaterial({
          color: 0x000000,
          linewidth: 4
        })
        );
      wireframe.renderOrder = 1;
      pin.add(wireframe);
      pin.position.set(latlonpoint[0], latlonpoint[1], latlonpoint[2]);
      pin.lookAt(new THREE.Vector3(0, 0, 0)); // As referential is geocentric, we look at the earth's center

      pin.clickCallback = function() {
        console.log(this.info);
      };

      this._pins.push(pin);
      this._meshes.earth.add(pin);
    }
  }


  animate() {
    this._rafId = requestAnimationFrame(this.animate.bind(this));
    this._renderer.render(this._scene, this._camera);
    this._render();
  }


  // Mesh animation
  _render() {
    // Compute angular velocities : https://www.calculator.org/properties/angular_velocity.html
    this._controls.update();
  }


  _events() {
    window.addEventListener('resize', this._onResize.bind(this), false);
    window.addEventListener('beforeunload', this._onDestroy.bind(this), false);

    window.addEventListener('click', evt => {
        evt.preventDefault();
        var raycaster = new THREE.Raycaster();
        var mouse = new THREE.Vector2();

        mouse.x = (evt.clientX / this._renderer.domElement.clientWidth) * 2 - 1;
        mouse.y =  - (evt.clientY / this._renderer.domElement.clientHeight) * 2 + 1;

        raycaster.setFromCamera(mouse, this._camera);
        var intersects = raycaster.intersectObjects(this._pins);
        if (intersects.length > 0) {
            intersects[0].object.clickCallback();
        }
    }, false);
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
    this._renderer = null;
  }

  // Move in utils or some kind of
  getPosFromLatLonRad(lat, lon, radius) {
    // 'member old spherical to cartesian ?
    const phi   = (90 - lat) * (Math.PI / 180);
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
