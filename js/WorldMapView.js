const CLOUDS = ['fair', 'africa', 'asia', 'australia', 'europe', 'na'];

class WorldMapView {
  constructor(options) {
    this._renderTo = options.renderTo;
    this._buildScene()
    this._renderTo.appendChild(this._renderer.domElement);
    this.render();
  }

  /* Viewer creation */

  _buildScene() {
    const radius = 0.5;
    const segments = 32;
    // Instantiating 3D viewer components
    this._scene = new THREE.Scene();
    this._camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.01, 1000);
    this._light = new THREE.DirectionalLight(0xffffff, 1);
    this._renderer = new THREE.WebGLRenderer();
    // Configure viewer to match init scenario
    this._camera.position.z = 1.5;
    this._light.position.set(5, 3, 5);
    this._renderer.setSize(window.innerWidth, window.innerHeight);
    this._controls = new THREE.TrackballControls(this._camera);
    // Building viewer content
    this._scene.add(this._light);
    this._scene.add(this._buildEarthSphere(radius, segments));
    this._scene.add(this._buildCloudLayer(radius, segments));
    this._scene.add(this._buildSpaceBackground(90, 64)); // Put background with a much bigger radius
  }

  /* Viewer rendering */

  render() {
    this._controls.update();
    this._renderer.render(this._scene, this._camera);
    requestAnimationFrame(this.render.bind(this));
  }

  /* Unit THREE meshes */

  _buildEarthSphere(radius, segments) {
    return new THREE.Mesh(
      new THREE.SphereGeometry(radius, segments, segments),
      new THREE.MeshPhongMaterial({
        map: THREE.ImageUtils.loadTexture('img/maps/world.jpg'),
        bumpMap: THREE.ImageUtils.loadTexture('img/maps/bump_elevation.jpg'),
        bumpScale: 0.005,
        specularMap: THREE.ImageUtils.loadTexture('img/maps/specular_water.png'),
        specular: new THREE.Color('grey')
      })
    );
  }

  _buildCloudLayer(radius, segments) {
    return new THREE.Mesh(
      new THREE.SphereGeometry(radius + 0.003, segments, segments),
      new THREE.MeshPhongMaterial({
        map: THREE.ImageUtils.loadTexture(`img/clouds/${CLOUDS[0]}.png`),
        transparent: true
      })
    );
  }

  _buildSpaceBackground(radius, segments) {
    return new THREE.Mesh(
      new THREE.SphereGeometry(radius, segments, segments),
      new THREE.MeshBasicMaterial({
        map: THREE.ImageUtils.loadTexture('img/starfield.jpg'),
        side: THREE.BackSide
      })
    );
  }
}
