/** EffectComposer.js content (see threejs main repository)
 * @author alteredq / http://alteredqualia.com/ */
THREE.EffectComposer = function ( renderer, renderTarget ) {
	this.renderer = renderer;
	if ( renderTarget === undefined ) {
		var parameters = {
			minFilter: THREE.LinearFilter,
			magFilter: THREE.LinearFilter,
			format: THREE.RGBAFormat,
			stencilBuffer: false
		};

		var size = renderer.getSize( new THREE.Vector2() );
		this._pixelRatio = renderer.getPixelRatio();
		this._width = size.width;
		this._height = size.height;

		renderTarget = new THREE.WebGLRenderTarget( this._width * this._pixelRatio, this._height * this._pixelRatio, parameters );
		renderTarget.texture.name = 'EffectComposer.rt1';
	} else {
		this._pixelRatio = 1;
		this._width = renderTarget.width;
		this._height = renderTarget.height;
	}

	this.renderTarget1 = renderTarget;
	this.renderTarget2 = renderTarget.clone();
	this.renderTarget2.texture.name = 'EffectComposer.rt2';
	this.writeBuffer = this.renderTarget1;
	this.readBuffer = this.renderTarget2;
	this.renderToScreen = true;
	this.passes = [];

	// dependencies
	if ( THREE.CopyShader === undefined ) {
		console.error( 'THREE.EffectComposer relies on THREE.CopyShader' );
	}

	if ( THREE.ShaderPass === undefined ) {
		console.error( 'THREE.EffectComposer relies on THREE.ShaderPass' );
	}

	this.copyPass = new THREE.ShaderPass( THREE.CopyShader );
	this.clock = new THREE.Clock();
};

Object.assign( THREE.EffectComposer.prototype, {
	swapBuffers: function () {
		var tmp = this.readBuffer;
		this.readBuffer = this.writeBuffer;
		this.writeBuffer = tmp;
	},
	addPass: function ( pass ) {
		this.passes.push( pass );
		pass.setSize( this._width * this._pixelRatio, this._height * this._pixelRatio );
	},
	insertPass: function ( pass, index ) {
		this.passes.splice( index, 0, pass );
	},
	isLastEnabledPass: function ( passIndex ) {
		for ( var i = passIndex + 1; i < this.passes.length; i ++ ) {
			if ( this.passes[ i ].enabled ) {
				return false;
			}
		}
		return true;
	},
	render: function ( deltaTime ) {
		// deltaTime value is in seconds
		if ( deltaTime === undefined ) {
			deltaTime = this.clock.getDelta();
		}

		var currentRenderTarget = this.renderer.getRenderTarget();
		var maskActive = false;
		var pass, i, il = this.passes.length;
		for ( i = 0; i < il; i ++ ) {
			pass = this.passes[ i ];
			if ( pass.enabled === false ) continue;
			pass.renderToScreen = ( this.renderToScreen && this.isLastEnabledPass( i ) );
			pass.render( this.renderer, this.writeBuffer, this.readBuffer, deltaTime, maskActive );
			if ( pass.needsSwap ) {
				if ( maskActive ) {
					var context = this.renderer.getContext();
					var stencil = this.renderer.state.buffers.stencil;
					//context.stencilFunc( context.NOTEQUAL, 1, 0xffffffff );
					stencil.setFunc( context.NOTEQUAL, 1, 0xffffffff );
					this.copyPass.render( this.renderer, this.writeBuffer, this.readBuffer, deltaTime );
					//context.stencilFunc( context.EQUAL, 1, 0xffffffff );
					stencil.setFunc( context.EQUAL, 1, 0xffffffff );
				}

				this.swapBuffers();
			}

			if ( THREE.MaskPass !== undefined ) {
				if ( pass instanceof THREE.MaskPass ) {
					maskActive = true;
				} else if ( pass instanceof THREE.ClearMaskPass ) {
					maskActive = false;
				}
			}
		}

		this.renderer.setRenderTarget( currentRenderTarget );
	},
	reset: function ( renderTarget ) {
		if ( renderTarget === undefined ) {
			var size = this.renderer.getSize( new THREE.Vector2() );
			this._pixelRatio = this.renderer.getPixelRatio();
			this._width = size.width;
			this._height = size.height;
			renderTarget = this.renderTarget1.clone();
			renderTarget.setSize( this._width * this._pixelRatio, this._height * this._pixelRatio );
		}

		this.renderTarget1.dispose();
		this.renderTarget2.dispose();
		this.renderTarget1 = renderTarget;
		this.renderTarget2 = renderTarget.clone();
		this.writeBuffer = this.renderTarget1;
		this.readBuffer = this.renderTarget2;
	},
	setSize: function ( width, height ) {
		this._width = width;
		this._height = height;
		var effectiveWidth = this._width * this._pixelRatio;
		var effectiveHeight = this._height * this._pixelRatio;
		this.renderTarget1.setSize( effectiveWidth, effectiveHeight );
		this.renderTarget2.setSize( effectiveWidth, effectiveHeight );
		for ( var i = 0; i < this.passes.length; i ++ ) {
			this.passes[ i ].setSize( effectiveWidth, effectiveHeight );
		}
	},
	setPixelRatio: function ( pixelRatio ) {
		this._pixelRatio = pixelRatio;
		this.setSize( this._width, this._height );
	}
} );

THREE.Pass = function () {
	// if set to true, the pass is processed by the composer
	this.enabled = true;
	// if set to true, the pass indicates to swap read and write buffer after rendering
	this.needsSwap = true;
	// if set to true, the pass clears its buffer before rendering
	this.clear = false;
	// if set to true, the result of the pass is rendered to screen. This is set automatically by EffectComposer.
	this.renderToScreen = false;
};

Object.assign( THREE.Pass.prototype, {
	setSize: function ( /* width, height */ ) {},
	render: function ( /* renderer, writeBuffer, readBuffer, deltaTime, maskActive */ ) {
		console.error( 'THREE.Pass: .render() must be implemented in derived pass.' );
	}
} );

// Helper for passes that need to fill the viewport with a single quad.
THREE.Pass.FullScreenQuad = ( function () {
	var camera = new THREE.OrthographicCamera( - 1, 1, 1, - 1, 0, 1 );
	var geometry = new THREE.PlaneBufferGeometry( 2, 2 );
	var FullScreenQuad = function ( material ) {
		this._mesh = new THREE.Mesh( geometry, material );
	};

	Object.defineProperty( FullScreenQuad.prototype, 'material', {
		get: function () {
			return this._mesh.material;
		},
		set: function ( value ) {
			this._mesh.material = value;
		}
	} );

	Object.assign( FullScreenQuad.prototype, {
		dispose: function () {
			this._mesh.geometry.dispose();
		},
		render: function ( renderer ) {
			renderer.render( this._mesh, camera );
		}
	} );

	return FullScreenQuad;
} )();


/** CopyShader.js content (see threejs main repository)
 * @author alteredq / http://alteredqualia.com/
 * Full-screen textured quad shader */
THREE.CopyShader = {
	uniforms: {
		"tDiffuse": { value: null },
		"opacity": { value: 1.0 }
	},
	vertexShader: [
		"varying vec2 vUv;",
		"void main() {",
		"	vUv = uv;",
		"	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );",
		"}"
	].join( "\n" ),
	fragmentShader: [
		"uniform float opacity;",
		"uniform sampler2D tDiffuse;",
		"varying vec2 vUv;",
		"void main() {",
		"	vec4 texel = texture2D( tDiffuse, vUv );",
		"	gl_FragColor = opacity * texel;",
		"}"
	].join( "\n" )
};


/** ShaderPass.js content (see threejs main repository)
 * @author alteredq / http://alteredqualia.com/ */
THREE.ShaderPass = function ( shader, textureID ) {

	THREE.Pass.call( this );

	this.textureID = ( textureID !== undefined ) ? textureID : "tDiffuse";

	if ( shader instanceof THREE.ShaderMaterial ) {

		this.uniforms = shader.uniforms;

		this.material = shader;

	} else if ( shader ) {

		this.uniforms = THREE.UniformsUtils.clone( shader.uniforms );

		this.material = new THREE.ShaderMaterial( {

			defines: Object.assign( {}, shader.defines ),
			uniforms: this.uniforms,
			vertexShader: shader.vertexShader,
			fragmentShader: shader.fragmentShader

		} );

	}

	this.fsQuad = new THREE.Pass.FullScreenQuad( this.material );

};

THREE.ShaderPass.prototype = Object.assign( Object.create( THREE.Pass.prototype ), {

	constructor: THREE.ShaderPass,

	render: function ( renderer, writeBuffer, readBuffer /*, deltaTime, maskActive */ ) {

		if ( this.uniforms[ this.textureID ] ) {

			this.uniforms[ this.textureID ].value = readBuffer.texture;

		}

		this.fsQuad.material = this.material;

		if ( this.renderToScreen ) {

			renderer.setRenderTarget( null );
			this.fsQuad.render( renderer );

		} else {

			renderer.setRenderTarget( writeBuffer );
			// TODO: Avoid using autoClear properties, see https://github.com/mrdoob/three.js/pull/15571#issuecomment-465669600
			if ( this.clear ) renderer.clear( renderer.autoClearColor, renderer.autoClearDepth, renderer.autoClearStencil );
			this.fsQuad.render( renderer );

		}

	}

} );


/** TexturePass.js content (see threejs main repository)
 * @author alteredq / http://alteredqualia.com/ */
THREE.TexturePass = function ( map, opacity ) {

	THREE.Pass.call( this );

	if ( THREE.CopyShader === undefined )
		console.error( "THREE.TexturePass relies on THREE.CopyShader" );

	var shader = THREE.CopyShader;

	this.map = map;
	this.opacity = ( opacity !== undefined ) ? opacity : 1.0;

	this.uniforms = THREE.UniformsUtils.clone( shader.uniforms );

	this.material = new THREE.ShaderMaterial( {

		uniforms: this.uniforms,
		vertexShader: shader.vertexShader,
		fragmentShader: shader.fragmentShader,
		depthTest: false,
		depthWrite: false

	} );

	this.needsSwap = false;

	this.fsQuad = new THREE.Pass.FullScreenQuad( null );

};

THREE.TexturePass.prototype = Object.assign( Object.create( THREE.Pass.prototype ), {

	constructor: THREE.TexturePass,

	render: function ( renderer, writeBuffer, readBuffer /*, deltaTime, maskActive */ ) {

		var oldAutoClear = renderer.autoClear;
		renderer.autoClear = false;

		this.fsQuad.material = this.material;

		this.uniforms[ "opacity" ].value = this.opacity;
		this.uniforms[ "tDiffuse" ].value = this.map;
		this.material.transparent = ( this.opacity < 1.0 );

		renderer.setRenderTarget( this.renderToScreen ? null : readBuffer );
		if ( this.clear ) renderer.clear();
		this.fsQuad.render( renderer );

		renderer.autoClear = oldAutoClear;

	}

} );


/** RenderPass.js content (see threejs main repository)
 * @author alteredq / http://alteredqualia.com/ */
THREE.RenderPass = function ( scene, camera, overrideMaterial, clearColor, clearAlpha ) {

	THREE.Pass.call( this );

	this.scene = scene;
	this.camera = camera;

	this.overrideMaterial = overrideMaterial;

	this.clearColor = clearColor;
	this.clearAlpha = ( clearAlpha !== undefined ) ? clearAlpha : 0;

	this.clear = true;
	this.clearDepth = false;
	this.needsSwap = false;

};

THREE.RenderPass.prototype = Object.assign( Object.create( THREE.Pass.prototype ), {

	constructor: THREE.RenderPass,

	render: function ( renderer, writeBuffer, readBuffer /*, deltaTime, maskActive */ ) {

		var oldAutoClear = renderer.autoClear;
		renderer.autoClear = false;

		var oldClearColor, oldClearAlpha, oldOverrideMaterial;

		if ( this.overrideMaterial !== undefined ) {

			oldOverrideMaterial = this.scene.overrideMaterial;

			this.scene.overrideMaterial = this.overrideMaterial;

		}

		if ( this.clearColor ) {

			oldClearColor = renderer.getClearColor().getHex();
			oldClearAlpha = renderer.getClearAlpha();

			renderer.setClearColor( this.clearColor, this.clearAlpha );

		}

		if ( this.clearDepth ) {

			renderer.clearDepth();

		}

		renderer.setRenderTarget( this.renderToScreen ? null : readBuffer );

		// TODO: Avoid using autoClear properties, see https://github.com/mrdoob/three.js/pull/15571#issuecomment-465669600
		if ( this.clear ) renderer.clear( renderer.autoClearColor, renderer.autoClearDepth, renderer.autoClearStencil );
		renderer.render( this.scene, this.camera );

		if ( this.clearColor ) {

			renderer.setClearColor( oldClearColor, oldClearAlpha );

		}

		if ( this.overrideMaterial !== undefined ) {

			this.scene.overrideMaterial = oldOverrideMaterial;

		}

		renderer.autoClear = oldAutoClear;

	}

} );


/** Lensflare.js content (see threejs main repository)
 * @author Mugen87 / https://github.com/Mugen87
 * @author mrdoob / http://mrdoob.com/ */
THREE.Lensflare = function () {

	THREE.Mesh.call( this, THREE.Lensflare.Geometry, new THREE.MeshBasicMaterial( { opacity: 0, transparent: true } ) );

	this.type = 'Lensflare';
	this.frustumCulled = false;
	this.renderOrder = Infinity;

	//

	var positionScreen = new THREE.Vector3();
	var positionView = new THREE.Vector3();

	// textures

	var tempMap = new THREE.DataTexture( new Uint8Array( 16 * 16 * 3 ), 16, 16, THREE.RGBFormat );
	tempMap.minFilter = THREE.NearestFilter;
	tempMap.magFilter = THREE.NearestFilter;
	tempMap.wrapS = THREE.ClampToEdgeWrapping;
	tempMap.wrapT = THREE.ClampToEdgeWrapping;

	var occlusionMap = new THREE.DataTexture( new Uint8Array( 16 * 16 * 3 ), 16, 16, THREE.RGBFormat );
	occlusionMap.minFilter = THREE.NearestFilter;
	occlusionMap.magFilter = THREE.NearestFilter;
	occlusionMap.wrapS = THREE.ClampToEdgeWrapping;
	occlusionMap.wrapT = THREE.ClampToEdgeWrapping;

	// material

	var geometry = THREE.Lensflare.Geometry;

	var material1a = new THREE.RawShaderMaterial( {
		uniforms: {
			'scale': { value: null },
			'screenPosition': { value: null }
		},
		vertexShader: [

			'precision highp float;',

			'uniform vec3 screenPosition;',
			'uniform vec2 scale;',

			'attribute vec3 position;',

			'void main() {',

			'	gl_Position = vec4( position.xy * scale + screenPosition.xy, screenPosition.z, 1.0 );',

			'}'

		].join( '\n' ),
		fragmentShader: [

			'precision highp float;',

			'void main() {',

			'	gl_FragColor = vec4( 1.0, 0.0, 1.0, 1.0 );',

			'}'

		].join( '\n' ),
		depthTest: true,
		depthWrite: false,
		transparent: false
	} );

	var material1b = new THREE.RawShaderMaterial( {
		uniforms: {
			'map': { value: tempMap },
			'scale': { value: null },
			'screenPosition': { value: null }
		},
		vertexShader: [

			'precision highp float;',

			'uniform vec3 screenPosition;',
			'uniform vec2 scale;',

			'attribute vec3 position;',
			'attribute vec2 uv;',

			'varying vec2 vUV;',

			'void main() {',

			'	vUV = uv;',

			'	gl_Position = vec4( position.xy * scale + screenPosition.xy, screenPosition.z, 1.0 );',

			'}'

		].join( '\n' ),
		fragmentShader: [

			'precision highp float;',

			'uniform sampler2D map;',

			'varying vec2 vUV;',

			'void main() {',

			'	gl_FragColor = texture2D( map, vUV );',

			'}'

		].join( '\n' ),
		depthTest: false,
		depthWrite: false,
		transparent: false
	} );

	// the following object is used for occlusionMap generation

	var mesh1 = new THREE.Mesh( geometry, material1a );

	//

	var elements = [];

	var shader = THREE.LensflareElement.Shader;

	var material2 = new THREE.RawShaderMaterial( {
		uniforms: {
			'map': { value: null },
			'occlusionMap': { value: occlusionMap },
			'color': { value: new THREE.Color( 0xffffff ) },
			'scale': { value: new THREE.Vector2() },
			'screenPosition': { value: new THREE.Vector3() }
		},
		vertexShader: shader.vertexShader,
		fragmentShader: shader.fragmentShader,
		blending: THREE.AdditiveBlending,
		transparent: true,
		depthWrite: false
	} );

	var mesh2 = new THREE.Mesh( geometry, material2 );

	this.addElement = function ( element ) {

		elements.push( element );

	};

	//

	var scale = new THREE.Vector2();
	var screenPositionPixels = new THREE.Vector2();
	var validArea = new THREE.Box2();
	var viewport = new THREE.Vector4();

	this.onBeforeRender = function ( renderer, scene, camera ) {

		renderer.getCurrentViewport( viewport );

		var invAspect = viewport.w / viewport.z;
		var halfViewportWidth = viewport.z / 2.0;
		var halfViewportHeight = viewport.w / 2.0;

		var size = 16 / viewport.w;
		scale.set( size * invAspect, size );

		validArea.min.set( viewport.x, viewport.y );
		validArea.max.set( viewport.x + ( viewport.z - 16 ), viewport.y + ( viewport.w - 16 ) );

		// calculate position in screen space

		positionView.setFromMatrixPosition( this.matrixWorld );
		positionView.applyMatrix4( camera.matrixWorldInverse );

		if ( positionView.z > 0 ) return; // lensflare is behind the camera

		positionScreen.copy( positionView ).applyMatrix4( camera.projectionMatrix );

		// horizontal and vertical coordinate of the lower left corner of the pixels to copy

		screenPositionPixels.x = viewport.x + ( positionScreen.x * halfViewportWidth ) + halfViewportWidth - 8;
		screenPositionPixels.y = viewport.y + ( positionScreen.y * halfViewportHeight ) + halfViewportHeight - 8;

		// screen cull

		if ( validArea.containsPoint( screenPositionPixels ) ) {

			// save current RGB to temp texture

			renderer.copyFramebufferToTexture( screenPositionPixels, tempMap );

			// render pink quad

			var uniforms = material1a.uniforms;
			uniforms[ "scale" ].value = scale;
			uniforms[ "screenPosition" ].value = positionScreen;

			renderer.renderBufferDirect( camera, null, geometry, material1a, mesh1, null );

			// copy result to occlusionMap

			renderer.copyFramebufferToTexture( screenPositionPixels, occlusionMap );

			// restore graphics

			var uniforms = material1b.uniforms;
			uniforms[ "scale" ].value = scale;
			uniforms[ "screenPosition" ].value = positionScreen;

			renderer.renderBufferDirect( camera, null, geometry, material1b, mesh1, null );

			// render elements

			var vecX = - positionScreen.x * 2;
			var vecY = - positionScreen.y * 2;

			for ( var i = 0, l = elements.length; i < l; i ++ ) {

				var element = elements[ i ];

				var uniforms = material2.uniforms;

				uniforms[ "color" ].value.copy( element.color );
				uniforms[ "map" ].value = element.texture;
				uniforms[ "screenPosition" ].value.x = positionScreen.x + vecX * element.distance;
				uniforms[ "screenPosition" ].value.y = positionScreen.y + vecY * element.distance;

				var size = element.size / viewport.w;
				var invAspect = viewport.w / viewport.z;

				uniforms[ "scale" ].value.set( size * invAspect, size );

				material2.uniformsNeedUpdate = true;

				renderer.renderBufferDirect( camera, null, geometry, material2, mesh2, null );

			}

		}

	};

	this.dispose = function () {

		material1a.dispose();
		material1b.dispose();
		material2.dispose();

		tempMap.dispose();
		occlusionMap.dispose();

		for ( var i = 0, l = elements.length; i < l; i ++ ) {

			elements[ i ].texture.dispose();

		}

	};

};

THREE.Lensflare.prototype = Object.create( THREE.Mesh.prototype );
THREE.Lensflare.prototype.constructor = THREE.Lensflare;
THREE.Lensflare.prototype.isLensflare = true;

THREE.LensflareElement = function ( texture, size, distance, color ) {
	this.texture = texture;
	this.size = size || 1;
	this.distance = distance || 0;
	this.color = color || new THREE.Color( 0xffffff );
};

THREE.LensflareElement.Shader = {

	uniforms: {

		'map': { value: null },
		'occlusionMap': { value: null },
		'color': { value: null },
		'scale': { value: null },
		'screenPosition': { value: null }

	},

	vertexShader: [

		'precision highp float;',

		'uniform vec3 screenPosition;',
		'uniform vec2 scale;',

		'uniform sampler2D occlusionMap;',

		'attribute vec3 position;',
		'attribute vec2 uv;',

		'varying vec2 vUV;',
		'varying float vVisibility;',

		'void main() {',

		'	vUV = uv;',

		'	vec2 pos = position.xy;',

		'	vec4 visibility = texture2D( occlusionMap, vec2( 0.1, 0.1 ) );',
		'	visibility += texture2D( occlusionMap, vec2( 0.5, 0.1 ) );',
		'	visibility += texture2D( occlusionMap, vec2( 0.9, 0.1 ) );',
		'	visibility += texture2D( occlusionMap, vec2( 0.9, 0.5 ) );',
		'	visibility += texture2D( occlusionMap, vec2( 0.9, 0.9 ) );',
		'	visibility += texture2D( occlusionMap, vec2( 0.5, 0.9 ) );',
		'	visibility += texture2D( occlusionMap, vec2( 0.1, 0.9 ) );',
		'	visibility += texture2D( occlusionMap, vec2( 0.1, 0.5 ) );',
		'	visibility += texture2D( occlusionMap, vec2( 0.5, 0.5 ) );',

		'	vVisibility =        visibility.r / 9.0;',
		'	vVisibility *= 1.0 - visibility.g / 9.0;',
		'	vVisibility *=       visibility.b / 9.0;',

		'	gl_Position = vec4( ( pos * scale + screenPosition.xy ).xy, screenPosition.z, 1.0 );',

		'}'

	].join( '\n' ),

	fragmentShader: [

		'precision highp float;',

		'uniform sampler2D map;',
		'uniform vec3 color;',

		'varying vec2 vUV;',
		'varying float vVisibility;',

		'void main() {',

		'	vec4 texture = texture2D( map, vUV );',
		'	texture.a *= vVisibility;',
		'	gl_FragColor = texture;',
		'	gl_FragColor.rgb *= color;',

		'}'

	].join( '\n' )

};

THREE.Lensflare.Geometry = (function () {
	var geometry = new THREE.BufferGeometry();
	var float32Array = new Float32Array( [
		- 1, - 1, 0, 0, 0,
		1, - 1, 0, 1, 0,
		1, 1, 0, 1, 1,
		- 1, 1, 0, 0, 1
	] );

	var interleavedBuffer = new THREE.InterleavedBuffer( float32Array, 5 );
	geometry.setIndex( [ 0, 1, 2,	0, 2, 3 ] );
	geometry.addAttribute( 'position', new THREE.InterleavedBufferAttribute( interleavedBuffer, 3, 0, false ) );
	geometry.addAttribute( 'uv', new THREE.InterleavedBufferAttribute( interleavedBuffer, 2, 3, false ) );

	return geometry;
} )();
