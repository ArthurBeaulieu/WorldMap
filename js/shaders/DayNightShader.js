THREE.DayNightShader = {
	uniforms: {},
	vertexShader: `
		uniform vec3 sunDirection;

		varying vec2 vUv;
		varying vec3 vNormal;
		varying vec3 vSunDir;

		void main() {
			vUv = uv;
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      vNormal = normalMatrix * normal;
      vSunDir = mat3(viewMatrix) * sunDirection;
      gl_Position = projectionMatrix * mvPosition;
		}
  `,
	fragmentShader: `
		uniform sampler2D nightTexture;

		varying vec2 vUv;
		varying vec3 vNormal;
		varying vec3 vSunDir;

		void main( void ) {
	    vec4 nightColor = vec4(texture2D( nightTexture, vUv + vec2(0.5, 0)).rgb, 1.0);
	    vec4 dayColor = vec4(0, 0, 0, 0);
	    vec3 sunDirection = vec3(viewMatrix * vec4(0, 0, 0, 1));
	    // compute cosine sun to normal so -1 is away from sun and +1 is toward sun.
	    float cosineAngleSunToNormal = dot(normalize(vNormal), vSunDir);
	    // sharpen the edge beween the transition
	    cosineAngleSunToNormal = clamp( cosineAngleSunToNormal / 100.0, -1.0, 1.0);
	    // convert to 0 to 1 for mixing
	    float mixAmount = cosineAngleSunToNormal * 0.5 + 0.5;
	    // Select day or night texture based on mixAmount.
	    vec4 color = mix( nightColor, dayColor, mixAmount );
	    gl_FragColor += vec4(color);
	    // comment in the next line to see the mixAmount
	    //gl_FragColor = vec4( mixAmount, mixAmount, mixAmount, 1.0 );
		}
  `
	// uniforms: {},
	// vertexShader: `
  //   varying vec2 vUv;
  //   varying vec3 vNormal;
  //   varying vec3 vSunDir;
	//
  //   uniform vec3 sunDirection;
	//
  //   void main() {
  //     vUv = uv;
  //     vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  //     vNormal = normalMatrix * normal;
  //     vSunDir = mat3(viewMatrix) * sunDirection;
  //     gl_Position = projectionMatrix * mvPosition;
  //   }
  // `,
	// fragmentShader: `
  //   uniform sampler2D dayTexture;
  //   uniform sampler2D nightTexture;
	//
  //   varying vec2 vUv;
  //   varying vec3 vNormal;
  //   varying vec3 vSunDir;
	//
  //   void main(void) {
	// 		// We add vec (0.5;0) to anti meridian maps
  //     vec3 dayColor = texture2D(dayTexture, vUv + vec2(0.5, 0)).rgb;
  //     vec3 nightColor = texture2D(nightTexture, vUv + vec2(0.5, 0)).rgb;
  //     float cosineAngleSunToNormal = dot(normalize(vNormal), normalize(vSunDir));
  //     cosineAngleSunToNormal = clamp(cosineAngleSunToNormal * 5.0, -1.0, 1.0);
  //     float mixAmount = cosineAngleSunToNormal * 0.5 + 0.5;
  //     vec3 color = mix(nightColor, dayColor, mixAmount);
  //     gl_FragColor = vec4(color, 1.0);
  //   }
  // `
};
