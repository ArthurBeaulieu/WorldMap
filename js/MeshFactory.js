class MeshFactory {
  constructor(type, options) {
    this.CONST = options.CONST
    this._mesh = null;

    let radius = 0.5; // Earth diameter is equal to 1
    const segments = 128;

    if (type === 'earth') { // Earth sphere
      this._mesh = this._buildEarthSphere(radius, segments);
    } else if (type === 'clouds') { // Clouds layer for Earth
      this._mesh = this._buildCloudLayer(radius, segments);
    } else if (type === 'boundaries') { // Political country boundaries
      this._mesh = this._buildBoundariesSphere(radius, segments);
    } else if (type === 'sun') { // Sun sphere
      radius = options.CONST.SIZES.SUN / (options.CONST.SIZES.EARTH * 100);
      this._mesh = this._buildSunSphere(radius, segments);
    } else if (type === 'moon') { // Moon sphere
      radius *= 2/3;      
      this._mesh = this._buildMoonSphere(radius, segments);
    } else if (type === 'background') { //
      this._mesh = this._buildSpaceBackground(15000, segments);
    } else if (type === 'earthpin') {
      this._mesh = this._buildEarthPin();
    }

    return this._mesh;
  }

  /* This is Sphere land */

  _buildEarthSphere(radius, segments) {
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
      new THREE.SphereGeometry(radius, segments, segments),
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


  _buildCloudLayer(radius, segments) {
    return new THREE.Mesh(
      new THREE.SphereGeometry(radius + 0.002, segments, segments),
      new THREE.MeshPhongMaterial({
        alphaMap: new THREE.TextureLoader().load(`assets/img/clouds/${this.CONST.CLOUDS[0]}.jpg`),
        transparent: true,
        depthWrite: false
      })
    );
  }


  _buildBoundariesSphere(radius, segments) {
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
      new THREE.SphereGeometry(radius, segments, segments),
      new THREE.MeshPhongMaterial({
        envMap: envMap,
        alphaMap: alphaMap,
        bumpMap: bumpMap,
        bumpScale: 5,
        transparent: true
      })
    );
  }


  _buildSunSphere(radius, segments) {
    return new THREE.Mesh(
      new THREE.SphereGeometry(radius, segments, segments),
      new THREE.MeshPhongMaterial({
        emissive: 0xffee88,
        emissiveIntensity: 8,
        map: new THREE.TextureLoader().load('assets/img/maps/sun.jpg'),
      })
    );
  }


  _buildMoonSphere(radius, segments) {
    // Loading textures from img folder
    var map = new THREE.TextureLoader().load('assets/img/maps/moon.jpg');
    map.wrapS = THREE.RepeatWrapping;
    map.offset = new THREE.Vector2((Math.PI) / (2 * Math.PI), 0);  

    return new THREE.Mesh(
      new THREE.SphereGeometry(radius, segments, segments),
      new THREE.MeshPhongMaterial({
        map: map,
        shininess: 2
      })
    );
  }


  _buildSpaceBackground(radius, segments) {
    return new THREE.Mesh(
      new THREE.SphereGeometry(radius, segments, segments),
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