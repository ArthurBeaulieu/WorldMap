const MeshUtils = {
  antiMeridian: new THREE.Vector2((Math.PI) / (2 * Math.PI), 0)
};


class MeshFactory {


  constructor(options) {
    this.CONST = options.CONST;
    this._baseUrl = options.baseUrl;
    this._segments = options.segments;
    this._quality = options.quality;
  }


  new(args) {
    if (args.type === 'earth') { // Earth sphere
      return this._buildEarthSphere(args.loader);
    } else if (args.type === 'earthnight') { // Night side of earth
      return this._buildEarthNightSphere(args.loader);
    } else if (args.type === 'earthclouds') { // Clouds layer for Earth
      return this._buildEarthCloudSphere(args.loader);
    } else if (args.type === 'earthboundaries') { // Political country boundaries
      return this._buildEarthBoundariesSphere(args.loader);
    } else if (args.type === 'earthatmosphere') { // Atmosphere
      return this._buildEarthAtmoSphere(args.loader);
    } else if (args.type === 'sun') { // Sun sphere
      return this._buildSunSphere(args.loader);
    } else if (args.type === 'moon') { // Moon sphere
      return this._buildMoonSphere(args.loader);
    } else if (args.type === 'background') { // Milkyway
      return this._buildMilkyWayBackground(args.loader);
    } else if (args.type === 'wireframe') { // Wireframe of a given geometry
      return this._buildWireframe(args.geometry);
    } else if (args.type === 'earthpin') { // Earth pin to locate country center
      return this._buildEarthPin(args.scale);
    } else if (args.type === 'geosurface') { // Geosurface to locate countries
      return this._buildGeoSurface(args.geometry);
    }
  }

  /*  ----------  Earth Meshes  ----------  */


  _buildEarthSphere(loader) {
    const map = loader.load(`${this._baseUrl}assets/img/maps/world_${this._quality}.jpg`);
    const bumpMap = loader.load(`${this._baseUrl}assets/img/maps/bump_${this._quality}.png`);
    const specularMap = loader.load(`${this._baseUrl}assets/img/maps/specular_${this._quality}.png`); // PNG is lighter on greyscale images
    // Allow texture repetition
    map.wrapS = THREE.RepeatWrapping;
    bumpMap.wrapS = THREE.RepeatWrapping;
    specularMap.wrapS = THREE.RepeatWrapping;
    // Rotating the textures to match Lat/Long earth values
    map.offset = MeshUtils.antiMeridian;
    bumpMap.offset = MeshUtils.antiMeridian;
    specularMap.offset = MeshUtils.antiMeridian;
    // Creating the mesh
    return new THREE.Mesh(
      new THREE.SphereGeometry(this.CONST.RADIUS.EARTH, this._segments, this._segments),
      new THREE.MeshPhongMaterial({
        map: map,
        bumpMap: bumpMap,
        bumpScale: 0.0005,
        specularMap: specularMap,
        specular: new THREE.Color(0xDDDDFF),
        shininess: 13
      })
    );
  }


  _buildEarthNightSphere(loader) {
    const nightMap = loader.load(`${this._baseUrl}assets/img/maps/night_${this._quality}.jpg`);
    nightMap.wrapS = THREE.RepeatWrapping;
    // Anti meridian rotation is made in shader code
    return new THREE.Mesh(
      new THREE.SphereGeometry(this.CONST.RADIUS.EARTH, this._segments, this._segments),
      new THREE.ShaderMaterial({
        uniforms: {
          sunDirection: { value: new THREE.Vector3(0, 0, 0) }, // Needs to be updated in render loop
          nightTexture: { value: nightMap }
        },
        vertexShader: THREE.DayNightShader.vertexShader,
        fragmentShader: THREE.DayNightShader.fragmentShader,
        transparent: true,
        blending: THREE.CustomBlending,
        blendEquation: THREE.AddEquation
      })
    );
  }


  _buildEarthCloudSphere(loader) {
    const alphaMap = loader.load(`${this._baseUrl}assets/img/maps/clouds_${this._quality}.jpg`);
    alphaMap.wrapS = THREE.RepeatWrapping;
    alphaMap.offset = MeshUtils.antiMeridian;
    return new THREE.Mesh(
      new THREE.SphereGeometry(this.CONST.RADIUS.EARTH + this.CONST.DISTANCE.CLOUDS, this._segments, this._segments),
      new THREE.MeshPhongMaterial({
        alphaMap: alphaMap,
        transparent: true,
        depthWrite: false
      })
    );
  }


  _buildEarthBoundariesSphere(loader) {
    // Loading textures from img folder
    const envMap = loader.load(`${this._baseUrl}assets/img/maps/boundaries_${this._quality}.png`);
    const alphaMap = loader.load(`${this._baseUrl}assets/img/maps/boundaries_${this._quality}.png`);
    // Allow texture repetition
    envMap.wrapS = THREE.RepeatWrapping;
    alphaMap.wrapS = THREE.RepeatWrapping;
    // Rotating the texture to match Lat/Long earth values - Anti-meridian alignement
    envMap.offset = MeshUtils.antiMeridian;
    alphaMap.offset = MeshUtils.antiMeridian;
    // Creating the mesh
    return new THREE.Mesh(
      new THREE.SphereGeometry(this.CONST.RADIUS.EARTH, this._segments, this._segments),
      new THREE.MeshPhongMaterial({
        envMap: envMap,
        alphaMap: alphaMap,
        transparent: true,
        opacity: 0.7
      })
    );
  }


  _buildEarthAtmoSphere(loader) {
    return new THREE.Mesh(
      new THREE.SphereGeometry(this.CONST.RADIUS.EARTH + this.CONST.DISTANCE.ATMOSPHERE, this._segments, this._segments),
      new THREE.ShaderMaterial({
        uniforms: {
    			c: { type: 'f', value: 0.95 },
    			p: { type: 'f', value: 3.4 },
    			glowColor: { type: 'c', value: new THREE.Color(0x6b96ff) },
    			viewVector: { type: 'v', value: new THREE.Vector3(0, 0, 0) } // To be set in render loop
    		},
        vertexShader: THREE.AtmosphereShader.vertexShader,
        fragmentShader: THREE.AtmosphereShader.fragmentShader,
        side: THREE.FrontSide,
        blending: THREE.AdditiveBlending,
        transparent: true
      })
    );
  }


  /*  ----------  Other spherical Meshes  ----------  */


  _buildSunSphere(loader) {
    const flareMain = loader.load(`${this._baseUrl}assets/img/flare_main.png`);
    const flarePoint = loader.load(`${this._baseUrl}assets/img/flare_point.png`);

    const mesh = new THREE.Lensflare();
    mesh.addElement(new THREE.LensflareElement(flareMain, 500, 0));
    mesh.addElement(new THREE.LensflareElement(flarePoint, 60, 0.6));
    mesh.addElement(new THREE.LensflareElement(flarePoint, 70, 0.7));
    mesh.addElement(new THREE.LensflareElement(flarePoint, 120, 0.9));
    mesh.addElement(new THREE.LensflareElement(flarePoint, 70, 1));

    return mesh;
  }


  _buildMoonSphere(loader) {
    const map = loader.load(`${this._baseUrl}assets/img/maps/moon_${this._quality}.jpg`);
    map.wrapS = THREE.RepeatWrapping;
    map.offset = MeshUtils.antiMeridian;
    return new THREE.Mesh(
      new THREE.SphereGeometry(this.CONST.RADIUS.MOON, this._segments, this._segments),
      new THREE.MeshPhongMaterial({
        map: map,
        shininess: 2
      })
    );
  }


  _buildMilkyWayBackground(loader) {
    const map = loader.load(`${this._baseUrl}assets/img/maps/milkyway_${this._quality}.jpg`);
    map.wrapS = THREE.RepeatWrapping;
    map.offset = MeshUtils.antiMeridian;
    return new THREE.Mesh(
      new THREE.SphereGeometry(this.CONST.RADIUS.SCENE, this._segments, this._segments),
      new THREE.MeshBasicMaterial({
        map: map,
        side: THREE.BackSide // Display on the inner side of the external sphere
      })
    );
  }


  /*  ----------  Space utils Meshes  ----------  */


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
        shininess: 50,
        reflectivity: 1
      })
    );
  }


  _buildGeoSurface(geometry) {
    return new THREE.Mesh(
      new THREE.ConicPolygonBufferGeometry(
        geometry, // GeoJSON feature
        this.CONST.RADIUS.EARTH + this.CONST.DISTANCE.COUNTRY, // Cone low base
        this.CONST.RADIUS.EARTH + (this.CONST.DISTANCE.COUNTRY * 2) // Cone high base
      ),
      new THREE.MeshLambertMaterial({
        side: THREE.DoubleSide,
        color: new THREE.Color(0x56D45B),
        opacity: 0,
        transparent: true
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


}


export default MeshFactory;
