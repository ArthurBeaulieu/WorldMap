/* Import libs */
import CustomThreeModule from '../lib/CustomThreeModule.js';
/* Class utils */
import Constants from '../utils/Constants.js';


class MeshFactory {


  constructor(options) {
    this._assetsUrl = options.assetsUrl;
    this._segments = options.segments;
    this._quality = options.quality;
    this._textures = [];
    this._geometries = [];
    this._materials = [];
  }


  destroy() {
    return new Promise(resolve => {
      for (let i = 0; i < this._textures.length; ++i) {
        this._textures[i].dispose();
      }

      for (let i = 0; i < this._geometries.length; ++i) {
        this._geometries[i].dispose();
      }

      for (let i = 0; i < this._materials.length; ++i) {
        this._materials[i].dispose();
      }

      // Delete object attributes
      Object.keys(this).forEach(key => { delete this[key]; });
    });
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
    } else if (args.type === 'milkyway') { // Milkyway
      return this._buildMilkyWayBackground(args.loader);
    } else if (args.type === 'particles') {
      return this._buildParticles(args.loader);
    } else if (args.type === 'wireframe') { // Wireframe of a given geometry
      return this._buildWireframe(args.geometry);
    } else if (args.type === 'earthpin') { // Earth pin to locate country center
      return this._buildEarthPin(args.scale);
    } else if (args.type === 'geosurface') { // Geosurface to locate countries
      return this._buildGeoSurface(args.geometry);
    } else if (args.type === 'vignette') {
      return this._buildVignettePass();
    } else if (args.type === 'fxaa') {
      return this._buildFXAAPass();
    }
  }


  /*  ----------  Earth Meshes  ----------  */


  _buildEarthSphere(loader) {
    const map = loader.load(`${this._assetsUrl}img/maps/world_${this._quality}.jpg`);
    const bumpMap = loader.load(`${this._assetsUrl}img/maps/bump_${this._quality}.png`);
    const specularMap = loader.load(`${this._assetsUrl}img/maps/specular_${this._quality}.png`);
    // Allow texture repetition
    map.wrapS = THREE.RepeatWrapping;
    bumpMap.wrapS = THREE.RepeatWrapping;
    specularMap.wrapS = THREE.RepeatWrapping;
    // Anti-meridian alignement to match Lat/Long earth values
    map.offset = Constants.MeshUtils.antiMeridian;
    bumpMap.offset = Constants.MeshUtils.antiMeridian;
    specularMap.offset = Constants.MeshUtils.antiMeridian;
    // Add to loaded textures
    this._textures.push(map);
    this._textures.push(bumpMap);
    this._textures.push(specularMap);
    // Create mesh geometry and add it to loaded geometries
    const meshGeometry = new THREE.SphereGeometry(Constants.Scene.RADIUS.EARTH, this._segments, this._segments);
    this._geometries.push(meshGeometry);
    // Create mesh material and add it to loaded materials
    const meshMaterial = new THREE.MeshPhongMaterial({
      map: map,
      bumpMap: bumpMap,
      bumpScale: 0.0008,
      specularMap: specularMap,
      specular: new THREE.Color(0xDDDDFF),
      shininess: 13
    });
    this._materials.push(meshMaterial);
    // Creating the mesh
    return new THREE.Mesh(meshGeometry, meshMaterial);
  }


  _buildEarthNightSphere(loader) {
    // Anti meridian rotation of night map is made in shader code
    const nightMap = loader.load(`${this._assetsUrl}img/maps/night_${this._quality}.jpg`);
    // Allow texture repetition
    nightMap.wrapS = THREE.RepeatWrapping;
    this._textures.push(nightMap);
    // Create mesh geometry and add it to loaded geometries
    const meshGeometry = new THREE.SphereGeometry(Constants.Scene.RADIUS.EARTH, this._segments, this._segments);
    this._geometries.push(meshGeometry);
    // Create mesh material and add it to loaded materials
    const meshMaterial = new THREE.ShaderMaterial({
      uniforms: {
        sunDirection: { value: new THREE.Vector3(0, 0, 0) }, // Needs to be updated in render loop
        nightTexture: { value: nightMap }
      },
      vertexShader: CustomThreeModule.DayNightShader.vertexShader,
      fragmentShader: CustomThreeModule.DayNightShader.fragmentShader,
      transparent: true,
      blending: THREE.CustomBlending,
      blendEquation: THREE.AddEquation
    });
    this._materials.push(meshMaterial);
    // Creating the mesh
    return new THREE.Mesh(meshGeometry, meshMaterial);
  }


  _buildEarthCloudSphere(loader) {
    const alphaMap = loader.load(`${this._assetsUrl}img/maps/clouds_${this._quality}.jpg`);
    // Allow texture repetition
    alphaMap.wrapS = THREE.RepeatWrapping;
    // Anti-meridian alignement to match Lat/Long earth values
    alphaMap.offset = Constants.MeshUtils.antiMeridian;
    this._textures.push(alphaMap);
    // Create mesh geometry and add it to loaded geometries
    const meshGeometry = new THREE.SphereGeometry(Constants.Scene.RADIUS.EARTH + Constants.Scene.DISTANCE.CLOUDS, this._segments, this._segments);
    this._geometries.push(meshGeometry);
    // Create mesh material and add it to loaded materials
    const meshMaterial = new THREE.MeshPhongMaterial({
      alphaMap: alphaMap,
      transparent: true,
      depthWrite: false
    });
    this._materials.push(meshMaterial);
    // Creating the mesh
    return new THREE.Mesh(meshGeometry, meshMaterial);
  }


  _buildEarthBoundariesSphere(loader) {
    // Loading textures from img folder
    const envMap = loader.load(`${this._assetsUrl}img/maps/boundaries_${this._quality}.png`);
    const alphaMap = loader.load(`${this._assetsUrl}img/maps/boundaries_${this._quality}.png`);
    // Allow texture repetition
    envMap.wrapS = THREE.RepeatWrapping;
    alphaMap.wrapS = THREE.RepeatWrapping;
    // Anti-meridian alignement to match Lat/Long earth values
    envMap.offset = Constants.MeshUtils.antiMeridian;
    alphaMap.offset = Constants.MeshUtils.antiMeridian;
    this._textures.push(envMap);
    this._textures.push(alphaMap);
    // Create mesh geometry and add it to loaded geometries
    const meshGeometry = new THREE.SphereGeometry(Constants.Scene.RADIUS.EARTH, this._segments, this._segments);
    this._geometries.push(meshGeometry);
    // Create mesh material and add it to loaded materials
    const meshMaterial = new THREE.MeshPhongMaterial({
      envMap: envMap,
      alphaMap: alphaMap,
      transparent: true,
      opacity: 0.7
    });
    this._materials.push(meshMaterial);
    // Creating the mesh
    return new THREE.Mesh(meshGeometry, meshMaterial);
  }


  _buildEarthAtmoSphere(loader) {
    // Create mesh geometry and add it to loaded geometries
    const meshGeometry = new THREE.SphereGeometry(Constants.Scene.RADIUS.EARTH + Constants.Scene.DISTANCE.ATMOSPHERE, this._segments, this._segments);
    this._geometries.push(meshGeometry);
    // Create mesh material and add it to loaded materials
    const meshMaterial = new THREE.ShaderMaterial({
      uniforms: {
        c: { type: 'f', value: 0.95 },
        p: { type: 'f', value: 3.4 },
        glowColor: { type: 'c', value: new THREE.Color(0x6b96ff) },
        viewVector: { type: 'v', value: new THREE.Vector3(0, 0, 0) } // To be set in render loop
      },
      vertexShader: CustomThreeModule.AtmosphereShader.vertexShader,
      fragmentShader: CustomThreeModule.AtmosphereShader.fragmentShader,
      side: THREE.FrontSide,
      blending: THREE.AdditiveBlending,
      transparent: true
    });
    this._materials.push(meshMaterial);
    // Creating the mesh
    return new THREE.Mesh(meshGeometry, meshMaterial);
  }


  /*  ----------  Other spherical Meshes  ----------  */


  _buildSunSphere(loader) {
    const flareSource = loader.load(`${this._assetsUrl}img/flares/flare_source.png`);
    const flareCircle = loader.load(`${this._assetsUrl}img/flares/flare_circle.png`);
    const flareHexangle = loader.load(`${this._assetsUrl}img/flares/flare_hexangle.png`);

    this._textures.push(flareSource);
    this._textures.push(flareCircle);
    this._textures.push(flareHexangle);

    const mesh = new CustomThreeModule.Lensflare();
    mesh.addElement(new CustomThreeModule.LensflareElement(flareSource, 333, 0));
    mesh.addElement(new CustomThreeModule.LensflareElement(flareCircle, 60, 0.38, new THREE.Color(0xFFAD67)));
    mesh.addElement(new CustomThreeModule.LensflareElement(flareHexangle, 40, 0.4, new THREE.Color(0xE37517)));
    mesh.addElement(new CustomThreeModule.LensflareElement(flareHexangle, 70, 0.53, new THREE.Color(0x56D45B)));
    mesh.addElement(new CustomThreeModule.LensflareElement(flareCircle, 45, 0.57, new THREE.Color(0x12B31D)));
    mesh.addElement(new CustomThreeModule.LensflareElement(flareCircle, 40, 0.8, new THREE.Color(0x48ABAF)));

    return mesh;
  }


  _buildMoonSphere(loader) {
    const map = loader.load(`${this._assetsUrl}img/maps/moon_${this._quality}.jpg`);
    // Allow texture repetition
    map.wrapS = THREE.RepeatWrapping;
    // Anti-meridian alignement to match Lat/Long earth values
    map.offset = Constants.MeshUtils.antiMeridian;
    this._textures.push(map);
    // Create mesh geometry and add it to loaded geometries
    const meshGeometry = new THREE.SphereGeometry(Constants.Scene.RADIUS.MOON, this._segments, this._segments);
    this._geometries.push(meshGeometry);
    // Create mesh material and add it to loaded materials
    const meshMaterial = new THREE.MeshPhongMaterial({
      map: map,
      shininess: 2
    });
    this._materials.push(meshMaterial);
    // Creating the mesh
    return new THREE.Mesh(meshGeometry, meshMaterial);
  }


  _buildMilkyWayBackground(loader) {
    const map = loader.load(`${this._assetsUrl}img/maps/milkyway_${this._quality}.jpg`);
    // Allow texture repetition
    map.wrapS = THREE.RepeatWrapping;
    // Anti-meridian alignement to match Lat/Long earth values
    map.offset = Constants.MeshUtils.antiMeridian;
    this._textures.push(map);
    // Create mesh geometry and add it to loaded geometries
    const meshGeometry = new THREE.SphereGeometry(Constants.Scene.RADIUS.SCENE, this._segments, this._segments);
    this._geometries.push(meshGeometry);
    // Create mesh material and add it to loaded materials
    const meshMaterial = new THREE.MeshBasicMaterial({
      map: map,
      side: THREE.BackSide // Display on the inner side of the external sphere
    });
    this._materials.push(meshMaterial);
    // Creating the mesh
    return new THREE.Mesh(meshGeometry, meshMaterial);
  }


  /*  ----------  Space utils Meshes  ----------  */


  _buildParticles(loader) {
    const geometry = new THREE.Geometry();
    for (let i = 0; i < 100000; ++i) {
      const vertex = new THREE.Vector3();
      vertex.x = Math.random() * 200 - 100;
      vertex.y = Math.random() * 200 - 100;
      vertex.z = Math.random() * 200 - 100;
      geometry.vertices.push(vertex);
    }

    const map = loader.load(`${this._assetsUrl}img/flares/flare_circle.png`);
    const material = new THREE.PointsMaterial({
      size: 0.2,
      sizeAttenuation: true,
      map: map,
      transparent: true,
      depthWrite: false
    });
    // Enable transparency of texture
    material.transparent = true;
    material.blending = THREE.AdditiveBlending;
    material.blendSrc = THREE['SrcAlphaFactor'];
    material.blendDst = THREE['DstAlphaColor'];
    material.blendEquation = THREE.AddEquation;

    return new THREE.Points(geometry, material);
  }


  _buildEarthPin(scale) {
    // Limit min height to 25% of pin max height
    if (scale < 0.25) {
      scale = 0.25;
    }
    const width = Constants.Scene.PIN.WIDTH + (Constants.Scene.PIN.WIDTH * scale);
    const height = Constants.Scene.PIN.HEIGHT * scale;
    // Create mesh geometry and add it to loaded geometries
    const meshGeometry = new THREE.CylinderGeometry(width, width, height, this._segments);
    this._geometries.push(meshGeometry);
    // Create mesh material and add it to loaded materials
    const meshMaterial = new THREE.MeshPhongMaterial({
      color: new THREE.Color(0x12B31D),
      specular: new THREE.Color(0x55FFAA),
      shininess: 50,
      reflectivity: 1
    });
    this._materials.push(meshMaterial);
    // Creating the mesh
    return new THREE.Mesh(meshGeometry, meshMaterial);
  }


  _buildGeoSurface(geometry) {
    // Create mesh geometry and add it to loaded geometries
    const meshGeometry = new THREE.ConicPolygonBufferGeometry(
      geometry, // GeoJSON feature
      Constants.Scene.RADIUS.EARTH + Constants.Scene.DISTANCE.COUNTRY, // Cone low base
      Constants.Scene.RADIUS.EARTH + (Constants.Scene.DISTANCE.COUNTRY * 2) // Cone high base
    );
    this._geometries.push(meshGeometry);
    // Create mesh material and add it to loaded materials
    const meshMaterial = new THREE.MeshLambertMaterial({
      side: THREE.DoubleSide,
      color: new THREE.Color(0x333333),
      emissive: new THREE.Color(0x12B31D),
      opacity: 0,
      transparent: true
    });
    this._materials.push(meshMaterial);
    // Creating the mesh
    return new THREE.Mesh(meshGeometry, meshMaterial);
  }


  _buildWireframe(geometry) {
    // Create mesh geometry and add it to loaded geometries
    const meshGeometry = new THREE.EdgesGeometry(geometry, 30);
    this._geometries.push(meshGeometry);
    // Create mesh material and add it to loaded materials
    const meshMaterial = new THREE.LineBasicMaterial({
      color: 0x000000,
      opacity: 0.1,
      transparent: true
    });
    this._materials.push(meshMaterial);
    // Creating the mesh
    return new THREE.LineSegments(meshGeometry, meshMaterial);
  }


  _buildVignettePass() {
    return new CustomThreeModule.ShaderPass(CustomThreeModule.VignetteShader);
  }


  _buildFXAAPass() {
    return new CustomThreeModule.ShaderPass(CustomThreeModule.FXAAShader);
  }


}


export default MeshFactory;
