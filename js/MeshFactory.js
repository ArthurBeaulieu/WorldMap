const CLOUDS = ['fair', 'africa', 'asia', 'australia', 'europe', 'na'];

class MeshFactory {
  constructor(type, stateGenerator) {
    const radius = 0.5; // Earth radius
    const segments = 64; // 32 segments gives a fair rounded shpere

    this._mesh = null;

    if (type === 'earth') { // Earth sphere
      this._mesh = this._buildEarthSphere(radius, segments, stateGenerator);
    } else if (type === 'clouds') { // Clouds layer for Earth
      this._mesh = this._buildCloudLayer(radius, segments, stateGenerator);
    } else if (type === 'boundaries') { // Clouds layer for Earth
      this._mesh = this._buildBoundariesSphere(radius, segments, stateGenerator);
    } else if (type === 'sun') { // Sun sphere
      this._mesh = this._buildSunSphere(radius, segments, stateGenerator);
    } else if (type === 'moon') { // Moon sphere
      this._mesh = this._buildMoonSphere(radius, segments, stateGenerator);
    } else if (type === 'background') { //
      this._mesh = this._buildSpaceBackground(15000, segments, stateGenerator);
    } else if (type === 'earthpin') {
      this._mesh = this._buildEarthPin();
    }

    return this._mesh;
  }

  /* This is Sphere land */

  _buildEarthSphere(radius, segments, loadingStateGenerator) {
    const nextState = () => { loadingStateGenerator.next(); };

    return new THREE.Mesh(
      new THREE.SphereGeometry(radius, segments, segments),
      new THREE.MeshPhongMaterial({
        map: new THREE.TextureLoader().load('img/maps/world.jpg', nextState),
        bumpMap: new THREE.TextureLoader().load('img/maps/bump_elevation.jpg', nextState),
        bumpScale: 0.005,
        specularMap: new THREE.TextureLoader().load('img/maps/specular_water.png', nextState),
        specular: new THREE.Color('grey'),
        shininess: 10 // Light reflexion on the specular map
      })
    );
  }


  _buildCloudLayer(radius, segments, loadingStateGenerator) {
    const nextState = () => { loadingStateGenerator.next(); };

    return new THREE.Mesh(
      new THREE.SphereGeometry(radius + 0.002, segments, segments),
      new THREE.MeshPhongMaterial({
        alphaMap: new THREE.TextureLoader().load(`img/clouds/${CLOUDS[0]}.jpg`, nextState),
        transparent: true,
        depthWrite: false
      })
    );
  }


  _buildBoundariesSphere(radius, segments, loadingStateGenerator) {
    const nextState = () => { loadingStateGenerator.next(); };

    return new THREE.Mesh(
      new THREE.SphereGeometry(radius, segments, segments),
      new THREE.MeshPhongMaterial({
        envMap: new THREE.TextureLoader().load(`img/maps/mask_boundaries.jpg`, nextState), // Using envMap will invert boundaries color
        alphaMap: new THREE.TextureLoader().load(`img/maps/mask_boundaries.jpg`, nextState),
        bumpMap: new THREE.TextureLoader().load('img/maps/mask_boundaries.jpg', nextState),
        bumpScale: 0.005,
        transparent: true,
        depthWrite: false
      })
    );
  }


  _buildSunSphere(radius, segments, loadingStateGenerator) {
    const nextState = () => { loadingStateGenerator.next(); };

    return new THREE.Mesh(
      new THREE.SphereGeometry(radius * 109, segments, segments), // Sun is approximatively 109 larger than earth
      new THREE.MeshPhongMaterial({
        map: new THREE.TextureLoader().load('img/maps/sun.jpg', nextState),
      })
    );
  }


  _buildMoonSphere(radius, segments, loadingStateGenerator) {
    const nextState = () => { loadingStateGenerator.next(); };

    return new THREE.Mesh(
      new THREE.SphereGeometry(radius, segments, segments), // Moon is approximatively a third of earth radius, but we keep earth size to make is more visible
      new THREE.MeshPhongMaterial({
        map: new THREE.TextureLoader().load('img/maps/moon.jpg', nextState)
      })
    );
  }


  _buildSpaceBackground(radius, segments, loadingStateGenerator) {
    const nextState = () => { loadingStateGenerator.next(); };

    return new THREE.Mesh(
      new THREE.SphereGeometry(radius, segments, segments),
      new THREE.MeshBasicMaterial({
        map: new THREE.TextureLoader().load('img/starfield.jpg', nextState),
        side: THREE.BackSide
      })
    );
  }


  /* View utilities */


  _buildEarthPin() {
    return new THREE.Mesh(
      new THREE.BoxGeometry(0.001, 0.001, 0.1),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color('white')
      })
    );
  }
}
