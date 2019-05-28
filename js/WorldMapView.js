class WorldMapView {
  constructor(options) {
    this._renderTo = options.renderTo;
    this._scene = null;
    this._camera = null;
    this._lights = {
      sun: null,
      ambient: null
    };
    this._sunlight = null;
    this._renderer = null;
    this._controls = null;
    this._meshes = {
      earth: null,
      cloud: null,
      boundaries: null,
      moon: null,
      sun: null,
      starfield: null
    };
    this._pivots = {
      moon: null,
      sun: null,
      sunlight: null
    };
    // Build final scene
    this._buildScene();
    this._buildObjects();
    // Place Earth facing Greenwich
    this._meshes.earth.rotation.y -= Math.PI / 2; // Earth rotation
    this._meshes.clouds.rotation.y -= Math.PI / 2; // Slowly move clouds over earth surface
    this._meshes.boundaries.rotation.y -= Math.PI / 2; // Rotate boundaries according to Earth's rotation

    this.reframeOn(48.866667, 2.333333, 0.5)

    window.addEventListener('resize', this._onResize.bind(this), false);
    this._renderTo.appendChild(this._renderer.domElement);
    this.animate();
  }


  /* Viewer creation */


  _buildScene() {
    // Instantiating 3D viewer components
    this._scene = new THREE.Scene();
    this._camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.01, 25000);
    this._lights.sun = new THREE.PointLight(0xffffff, 1, 0);
    this._lights.ambient = new THREE.AmbientLight(0x202020);
    this._renderer = new THREE.WebGLRenderer({ antialias: true });
    this._pivots.moon = new THREE.Object3D(); // For moon to orbit around earth
    this._pivots.sun = new THREE.Object3D(); // For moon to orbit around earth
    this._pivots.sunlight = new THREE.Object3D(); // For moon to orbit around earth
    this._controls = new THREE.TrackballControls(this._camera);
    // Configure viewer to match init scenario
    this._camera.position.z = 1.4;
    this._renderer.setPixelRatio(window.devicePixelRatio);
    this._renderer.setSize(window.innerWidth, window.innerHeight);
    // Building scene lights
    //this._scene.add(this._lights.sun); // From Sun
    this._scene.add(this._lights.ambient); // From cosmic noise, maybe ?
  }


  _buildObjects() {
    // Creating the generator wil open the loading modal. It ill be closed when all generator's state are consumed
    const loadingState = this.textureLoadingStateGenerator();
    const radius = 0.5; // Earth radius
    const segments = 32;
    // Build scene elements (Earth, Clouds, Outter space)
    this._meshes.earth = new MeshFactory('earth', loadingState);
    this._meshes.clouds = new MeshFactory('clouds', loadingState);
    this._meshes.boundaries = new MeshFactory('boundaries', loadingState);
    this._meshes.moon = new MeshFactory('moon', loadingState);
    this._meshes.sun = new MeshFactory('sun', loadingState);
    this._meshes.starfield = new MeshFactory('background', loadingState); // Put background with a much bigger radius so it is far away
    // Positioning meshes in space
    this._meshes.moon.position.set(-30, 0, 0); // True distance is 60 times earth radius, but it's too far otherwise
    this._meshes.sun.position.set(0, 0, 11160); // True distance is 23323 times earth radius, but it's too far otherwise
    this._lights.sun.position.set(0, 0, 10000);
    // Attaching elements to the scene
    this._pivots.moon.add(this._meshes.moon);
    this._pivots.sun.add(this._meshes.sun);
    this._pivots.sunlight.add(this._lights.sun)
    this._meshes.earth.add(this._pivots.moon);
    this._meshes.earth.add(this._pivots.sun);
    this._meshes.earth.add(this._pivots.sunlight);
    this._scene.add(this._meshes.earth);
    this._scene.add(this._meshes.clouds);
    this._scene.add(this._meshes.boundaries);
    this._scene.add(this._meshes.starfield);
    // Add a pin on Paris
    var pin = new MeshFactory('earthpin');
    var latlonpoint = this.getPosFromLatLonRad(48.866667, 2.333333, 0.5)
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
    this._meshes.earth.add(pin);
  }

  // Loading generator
  * textureLoadingStateGenerator() {
    // When ready, use a view class to handle a loading modal
    yield console.log('Earth map loaded');
    yield console.log('Earth bump elevation map loaded');
    yield console.log('Earth specular water map loaded');
    yield console.log('Earth clouds mask loaded');
    yield console.log('Earth boundaries mask loaded (1/3 env map)');
    yield console.log('Earth boundaries mask loaded (2/3 alpha map)');
    yield console.log('Earth boundaries mask loaded (3/3 bump map)');
    yield console.log('Moon map loaded');
    yield console.log('Sun map loaded');
    yield console.log('Space starfield loaded');
  }


  /* Viewer rendering */


  animate() {
    requestAnimationFrame(this.animate.bind(this));
    this._renderer.render(this._scene, this._camera);
    this._render();
  }


  // Mesh animation
  _render() {
    this._controls.update();
    this._pivots.moon.rotation.y += 0.0005; // Moon orbiting around earth
    this._pivots.sun.rotation.y += 0.0005; // Moon orbiting around earth
    this._pivots.sunlight.rotation.y += 0.0005; // Moon orbiting around earth
    this._meshes.moon.rotation.y -= 0.000001; // Moon rotation to compensate moon orbit around earth (so we only see clear side of the moon)
  }


  _onResize() {
    this._camera.aspect = window.innerWidth / window.innerHeight;
    this._camera.updateProjectionMatrix();
    this._renderer.setSize(window.innerWidth, window.innerHeight);
  }


  reframeOn(lat, lon, radius) {
    const targetPos = this.getPosFromLatLonRad(lat, lon, radius);
    console.log(targetPos);
    //this._camera.position.set(targetPos[0] * 100, targetPos[1] * 100, targetPos[2] * 100);
//    this._camera.lookAt(new THREE.Vector3(0, 0, 0));
  }


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

  /* Unit THREE meshes */
}
