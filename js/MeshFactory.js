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
    } else if (type === 'background') {
      return this._buildSpaceBackground();
    } else if (type === 'earthpin') {
      return this._buildEarthPin();
    }
  }


  _buildEarthSphere() {
    // Loading textures from img folder
    let map = new THREE.TextureLoader().load('assets/img/maps/world.jpg');
    let bumpMap = new THREE.TextureLoader().load('assets/img/maps/bump_elevation.png');
    let specularMap = new THREE.TextureLoader().load('assets/img/maps/specular_water.png');
    // Allow texture repetition
    map.wrapS = THREE.RepeatWrapping;
    bumpMap.wrapS = THREE.RepeatWrapping;
    specularMap.wrapS = THREE.RepeatWrapping;
    // Rotating the textures to match Lat/Long earth values
    map.offset = new THREE.Vector2((Math.PI) / (2 * Math.PI), 0);
    bumpMap.offset = new THREE.Vector2((Math.PI) / (2 * Math.PI), 0);
    specularMap.offset = new THREE.Vector2((Math.PI) / (2 * Math.PI), 0);
    // Creating the mesh
    return new THREE.Mesh(
      new THREE.SphereGeometry(this.CONST.RADIUS.EARTH, this._segments, this._segments),
      new THREE.MeshPhongMaterial({
        map: map,
        bumpMap: bumpMap,
        bumpScale: this.CONST.RADIUS.EARTH / 20,
        specularMap: specularMap,
        specular: new THREE.Color('grey'),
        shininess: 10 // Light reflexion on the specular map
      })
    );
  }


  _buildCloudLayer() {
    let alphaMap = new THREE.TextureLoader().load(`assets/img/clouds/${this.CONST.CLOUDS[0]}.jpg`);    
    alphaMap.wrapS = THREE.RepeatWrapping;
    alphaMap.offset = new THREE.Vector2((Math.PI) / (2 * Math.PI), 0);
    return new THREE.Mesh(
      new THREE.SphereGeometry(this.CONST.RADIUS.EARTH + 0.002, this._segments, this._segments),
      new THREE.MeshPhongMaterial({
        alphaMap: alphaMap,
        transparent: true,
        depthWrite: false
      })
    );
  }


  _buildBoundariesSphere() {
    // Loading textures from img folder
    let envMap = new THREE.TextureLoader().load(`assets/img/maps/mask_boundaries.png`);
    let alphaMap = new THREE.TextureLoader().load(`assets/img/maps/mask_boundaries.png`);
    let bumpMap = new THREE.TextureLoader().load(`assets/img/maps/mask_boundaries.png`);
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
        bumpScale: this.CONST.RADIUS.EARTH * 10,
        transparent: true
      })
    );
  }


  _buildSunSphere() {
    let map = new THREE.TextureLoader().load('assets/img/maps/sun.jpg');    
    return new THREE.Mesh(
      new THREE.SphereGeometry(this.CONST.RADIUS.SUN, this._segments, this._segments),
      new THREE.MeshPhongMaterial({
        map: map,
        specular: new THREE.Color(0x111111),
        shininess: 50
      })
    );
  }


  _buildMoonSphere() {
    // Loading textures from img folder
    let map = new THREE.TextureLoader().load('assets/img/maps/moon.jpg');
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
    let map = new THREE.TextureLoader().load('assets/img/milkyway.jpg');    
    return new THREE.Mesh(
      new THREE.SphereGeometry(this.CONST.RADIUS.SCENE, this._segments, this._segments),
      new THREE.MeshBasicMaterial({
        map: map,
        side: THREE.BackSide // Display on the inner side of the external sphere
      })
    );
  }


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
