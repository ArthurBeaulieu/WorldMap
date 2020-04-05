class MeshFactory {


  constructor(options) {
    this.CONST = options.CONST;
    this._segments = options.segments || 64;
  }


  new(args) {
    if (args.type === 'earth') { // Earth sphere
      return this._buildEarthSphere();
    } else if (args.type === 'clouds') { // Clouds layer for Earth
      return this._buildCloudLayer();
    } else if (args.type === 'boundaries') { // Political country boundaries
      return this._buildBoundariesSphere();
    } else if (args.type === 'sun') { // Sun sphere
      return this._buildSunSphere();
    } else if (args.type === 'moon') { // Moon sphere
      return this._buildMoonSphere();
    } else if (args.type === 'background') {
      return this._buildSpaceBackground();
    } else if (args.type === 'wireframe') {
      return this._buildWireframe(args.geometry);
    } else if (args.type === 'earthpin') {
      return this._buildEarthPin(args.scale);
    } else if (args.type === 'geosurface') {
      return this._buildGeoSurface(args.geometry);
    }
  }


  _buildEarthSphere() {
    // Loading textures from img folder
    let map = new THREE.TextureLoader().load('assets/img/maps/worldarctic.jpg');
    let bumpMap = new THREE.TextureLoader().load('assets/img/maps/bump.png');
    let specularMap = new THREE.TextureLoader().load('assets/img/maps/specular.png');
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
        bumpScale: this.CONST.RADIUS.EARTH / 12,
        specularMap: specularMap,
        specular: new THREE.Color(0xFFFFFF),
        shininess: 15 // Light reflexion on the specular map
      })
    );
  }


  _buildCloudLayer() {
    let alphaMap = new THREE.TextureLoader().load(`assets/img/clouds/${this.CONST.CLOUDS[Math.floor(Math.random() * this.CONST.CLOUDS.length)]}.jpg`);
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
    let envMap = new THREE.TextureLoader().load(`assets/img/maps/boundaries.png`);
    let alphaMap = new THREE.TextureLoader().load(`assets/img/maps/boundaries.png`);
    let bumpMap = new THREE.TextureLoader().load(`assets/img/maps/boundaries.png`);
    // Allow texture repetition
    envMap.wrapS = THREE.RepeatWrapping;
    alphaMap.wrapS = THREE.RepeatWrapping;
    bumpMap.wrapS = THREE.RepeatWrapping;
    // Rotating the texture to match Lat/Long earth values - Anti-meridian alignement
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
        transparent: true,
        opacity: 0.7
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
    let map = new THREE.TextureLoader().load('assets/img/maps/milkyway.jpg');
    return new THREE.Mesh(
      new THREE.SphereGeometry(this.CONST.RADIUS.SCENE, this._segments, this._segments),
      new THREE.MeshBasicMaterial({
        map: map,
        side: THREE.BackSide // Display on the inner side of the external sphere
      })
    );
  }


  _buildWireframe(geometry) {
    return new THREE.LineSegments(
      new THREE.EdgesGeometry(geometry, 30),
      new THREE.LineBasicMaterial({
        color: 0x000000,
        opacity: 0.1,
        transparent: true
      })
    );
  }


  _buildEarthPin(scale) {
    // Limit min height to 25% of pin max height
    if (scale < 0.25) {
      scale = 0.25;
    }
    const width = this.CONST.PIN.WIDTH + (this.CONST.PIN.WIDTH * scale);
    const height = this.CONST.PIN.HEIGHT * scale;
    // Build mesh according to given height
    return new THREE.Mesh(
      new THREE.CylinderGeometry(width, width, height, this._segments),
      new THREE.MeshPhongMaterial({
        color: new THREE.Color(0x56d45b),
        specular: new THREE.Color(0x55FFAA),
        shininess: 100,
        reflectivity: 1
      })
    );
  }


  _buildGeoSurface(geometry) {
    return new THREE.Mesh(
      new THREE.ConicPolygonBufferGeometry(geometry, this.CONST.RADIUS.EARTH - 0.008, this.CONST.RADIUS.EARTH + 0.008),
      new THREE.MeshLambertMaterial({
        side: THREE.DoubleSide,
        color: new THREE.Color(0x56D45B),
        opacity: 0,
        transparent: true
      })
    );
  }


}


export default MeshFactory;
