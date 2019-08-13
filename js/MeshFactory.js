class MeshFactory {


  constructor(options) {
    this.CONST = options.CONST;
    this._segments = options.segments || 64;
  }


  new(type) {
    if (type === 'earth') { // Earth sphere
      return this._buildEarthSphere();
    } else if (type === 'clouds') { // Clouds layer for Earth
      return this._buildCloudLayer();
    } else if (type === 'boundaries') { // Political country boundaries
      return this._buildBoundariesSphere();
    } else if (type === 'sun') { // Sun sphere
      return this._buildSunSphere();
    } else if (type === 'moon') { // Moon sphere
      return this._buildMoonSphere();
    } else if (type === 'background') { //
      return this._buildSpaceBackground();
    } else if (type === 'earthpin') {
      return this._buildEarthPin();
    }
  }


  /* This is Sphere land */

  _buildEarthSphere() {
    // Loading textures from img folder
    var map = new THREE.TextureLoader().load('assets/img/maps/world.jpg');
    var bumpMap = new THREE.TextureLoader().load('assets/img/maps/bump_elevation.jpg');
    var specularMap = new THREE.TextureLoader().load('assets/img/maps/specular_water.png');
    // Allow texture repetition
    map.wrapS = THREE.RepeatWrapping;
    bumpMap.wrapS = THREE.RepeatWrapping;
    specularMap.wrapS = THREE.RepeatWrapping;
    // Rotating the texture to match Lat/Long earth values
    map.offset = new THREE.Vector2((Math.PI) / (2 * Math.PI), 0);
    bumpMap.offset = new THREE.Vector2((Math.PI) / (2 * Math.PI), 0);
    specularMap.offset = new THREE.Vector2((Math.PI) / (2 * Math.PI), 0);
    // Creating the mesh
    return new THREE.Mesh(
      new THREE.SphereGeometry(this.CONST.RADIUS.EARTH, this._segments, this._segments),
      new THREE.MeshPhongMaterial({
        map: map,
        bumpMap: bumpMap,
        bumpScale: 0.005,
        specularMap: specularMap,
        specular: new THREE.Color('grey'),
        shininess: 10 // Light reflexion on the specular map
      })
    );
  }


  _buildCloudLayer() {
    return new THREE.Mesh(
      new THREE.SphereGeometry(this.CONST.RADIUS.EARTH + 0.002, this._segments, this._segments),
      new THREE.MeshPhongMaterial({
        alphaMap: new THREE.TextureLoader().load(`assets/img/clouds/${this.CONST.CLOUDS[0]}.jpg`),
        transparent: true,
        depthWrite: false
      })
    );
  }


  _buildBoundariesSphere() {
    // Loading textures from img folder
    var envMap = new THREE.TextureLoader().load(`assets/img/maps/mask_boundaries.jpg`);
    var alphaMap = new THREE.TextureLoader().load(`assets/img/maps/mask_boundaries.jpg`);
    var bumpMap = new THREE.TextureLoader().load(`assets/img/maps/mask_boundaries.jpg`);
    // Allow texture repetition
    envMap.wrapS = THREE.RepeatWrapping;
    alphaMap.wrapS = THREE.RepeatWrapping;
    bumpMap.wrapS = THREE.RepeatWrapping;
    // Rotating the texture to match Lat/Long earth values
    envMap.offset = new THREE.Vector2((Math.PI) / (2 * Math.PI), 0);
    alphaMap.offset = new THREE.Vector2((Math.PI) / (2 * Math.PI), 0);
    bumpMap.offset = new THREE.Vector2((Math.PI) / (2 * Math.PI), 0);
    // Creating the mesh
    return new THREE.Mesh(
      new THREE.SphereGeometry(this.CONST.RADIUS.EARTH, this._segments, this._segments),
      new THREE.MeshPhongMaterial({
        envMap: envMap,
        alphaMap: alphaMap,
        bumpMap: bumpMap,
        bumpScale: 5,
        transparent: true
      })
    );
  }


  _buildSunSphere() {
    return new THREE.Mesh(
      new THREE.SphereGeometry(this.CONST.RADIUS.SUN, this._segments, this._segments),
      new THREE.MeshPhongMaterial({
        emissive: 0xffee88,
        emissiveIntensity: 8,
        map: new THREE.TextureLoader().load('assets/img/maps/sun.jpg'),
      })
    );
  }


  _buildMoonSphere() {
    // Loading textures from img folder
    var map = new THREE.TextureLoader().load('assets/img/maps/moon.jpg');
    map.wrapS = THREE.RepeatWrapping;
    map.offset = new THREE.Vector2((Math.PI) / (2 * Math.PI), 0);

    return new THREE.Mesh(
      new THREE.SphereGeometry(this.CONST.RADIUS.MOON, this._segments, this._segments),
      new THREE.MeshPhongMaterial({
        map: map,
        shininess: 2
      })
    );
  }


  _buildSpaceBackground() {
    return new THREE.Mesh(
      new THREE.SphereGeometry(this.CONST.RADIUS.SCENE, this._segments, this._segments),
      new THREE.MeshBasicMaterial({
        map: new THREE.TextureLoader().load('assets/img/milkyway.jpg'),
        side: THREE.BackSide
      })
    );
  }


  /* View utilities */


  _buildEarthPin() {
    return new THREE.Mesh(
      new THREE.BoxGeometry(0.003, 0.003, 0.05),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(0x56d45b)
      })
    );
  }


}


export default MeshFactory;
