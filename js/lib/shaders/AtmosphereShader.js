// THREE.AtmosphereShader = {
//   uniforms: {},
//   vertexShader: [
//     'varying vec3 vNormal;',
//     'void main() {',
//     'vNormal = normalize( normalMatrix * normal );',
//     'gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );',
//     '}'
//   ].join('\n'),
//   fragmentShader: [
//     'varying vec3 vNormal;',
//     'void main() {',
//     'float intensity = pow( 0.8 - dot( vNormal, vec3( 0, 0, 1.0 ) ), 12.0 );',
//     'gl_FragColor = vec4( 1.0, 1.0, 1.0, 1.0 ) * intensity;',
//     '}'
//   ].join('\n')
// };
THREE.AtmosphereShader = {
  uniforms: {},
  vertexShader: [
    'uniform vec3 viewVector;',
    'uniform float c;',
    'uniform float p;',
    'varying float intensity;',
    'void main() {',
        'vec3 vNormal = normalize( normalMatrix * normal );',
    	'vec3 vNormel = normalize( normalMatrix * viewVector );',
    	'intensity = pow( c - dot(vNormal, vNormel), p );',
        'gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );',
    '}'
  ].join('\n'),
  fragmentShader: [
    'uniform vec3 glowColor;',
    'varying float intensity;',
    'void main() {',
    	'vec3 glow = glowColor * intensity;',
      'gl_FragColor = vec4( glow, 1.0 );',
    '}'
  ].join('\n')
};
