/** @author Eberhard Graether / http://egraether.com/
 * This was modified to become an ES6 module */
class TrackballControls {


  constructor(object, domElement) {
    this.STATE = { NONE: -1, ROTATE: 0, ZOOM: 1, PAN: 2, TOUCH_ROTATE: 3, TOUCH_ZOOM: 4, TOUCH_PAN: 5 };
    // The object to put controls on (preferably a camera)
    this.object = object;
    this.domElement = (domElement !== undefined) ? domElement : document;
    this.screen = {
      width: 0,
      height: 0,
      offsetLeft: 0,
      offsetTop: 0
    };
    // Radius to be computed in init method
    this.radius = 0;
    // Rotation parameters
    this.noRotate = false;
    this.rotateSpeed = 0.15;
    this._rotateStart = new THREE.Vector3();
    this._rotateEnd = new THREE.Vector3();
    // Zoom parameters
    this.noZoom = false;
    this.zoomSpeed = 1.33;
    this._zoomStart = new THREE.Vector2();
    this._zoomEnd = new THREE.Vector2();
    this._touchZoomDistanceStart = 0;
    this._touchZoomDistanceEnd = 0;

    this.panSpeed = 0.3;
    this.noPan = false;
    this._panStart = new THREE.Vector2();
    this._panEnd = new THREE.Vector2();
    // Camera movement inertia : Closer to 0 -> very slow decay ; closer to 1 -> very fast decay
    this.dynamicDampingFactor = 0.33;

    this._minDistance = 0;
    this._maxDistance = Infinity;

    this.target = new THREE.Vector3();
    this.lastPosition = new THREE.Vector3();
    // Controls state intialization
    this._state = this.STATE.NONE;
    this._prevState = this.STATE.NONE;

    this._eye = new THREE.Vector3();
    this.target0 = this.target.clone();
    this.position0 = this.object.position.clone();
    this.up0 = this.object.up.clone();

    this.enabled = true;
    this.hasMoved = false;

    this.init();
  }


  init() {
    this.screen.width = window.innerWidth;
    this.screen.height = window.innerHeight;
    this.screen.offsetLeft = 0;
    this.screen.offsetTop = 0;
    this.radius = (this.screen.width + this.screen.height) / 4;
    // Bind this for all events so they can be unsubscribed
    this.preventDefault = this.preventDefault.bind(this);
    this.mousedown = this.mousedown.bind(this);
    this.mousewheel = this.mousewheel.bind(this);
    this.touchstart = this.touchstart.bind(this);
    this.touchend = this.touchend.bind(this);
    this.touchmove = this.touchmove.bind(this);
    // Hook up on mouse and touch events
    this.domElement.addEventListener('contextmenu', this.preventDefault, false);
    this.domElement.addEventListener('mousedown', this.mousedown, false);
    this.domElement.addEventListener('mousewheel', this.mousewheel, false);
    this.domElement.addEventListener('DOMMouseScroll', this.mousewheel, false); // Firefox support
    this.domElement.addEventListener('touchstart', this.touchstart, false);
    this.domElement.addEventListener('touchend', this.touchend, false);
    this.domElement.addEventListener('touchmove', this.touchmove, false);
  }


  destroy() {
     // Clean all subscribe events
    this.domElement.removeEventListener('contextmenu', this.preventDefault, false);
    this.domElement.removeEventListener('mousedown', this.mousedown, false);
    this.domElement.removeEventListener('mousewheel', this.mousewheel, false);
    this.domElement.removeEventListener('DOMMouseScroll', this.mousewheel, false);
    this.domElement.removeEventListener('touchstart', this.touchstart, false);
    this.domElement.removeEventListener('touchend', this.touchend, false);
    this.domElement.removeEventListener('touchmove', this.touchmove, false);    
  }


  getMouseOnScreen(clientX, clientY) {
    return new THREE.Vector2(
      (clientX - this.screen.offsetLeft) / this.radius * 0.5,
      (clientY - this.screen.offsetTop) / this.radius * 0.5
    );
  }


  getMouseProjectionOnBall(clientX, clientY) {
    var mouseOnBall = new THREE.Vector3(
      (clientX - this.screen.width * 0.5 - this.screen.offsetLeft) / this.radius,
      (this.screen.height * 0.5 + this.screen.offsetTop - clientY) / this.radius,
      0.0
    );

    var length = mouseOnBall.length();
    if (length > 1.0) {
      mouseOnBall.normalize();
    } else {
      mouseOnBall.z = Math.sqrt(1.0 - length * length);
    }

    this._eye.copy(this.object.position).sub(this.target);
    var projection = this.object.up.clone().setLength(mouseOnBall.y);
    projection.add(this.object.up.clone().cross(this._eye).setLength(mouseOnBall.x));
    projection.add(this._eye.setLength(mouseOnBall.z ));

    return projection;
  }


  rotateCamera() {
    var angle = Math.acos(this._rotateStart.dot(this._rotateEnd) / this._rotateStart.length() / this._rotateEnd.length());
    if (angle) {
      var axis = (new THREE.Vector3()).crossVectors(this._rotateStart, this._rotateEnd).normalize();
      var quaternion = new THREE.Quaternion();
      angle *= this.rotateSpeed;
      quaternion.setFromAxisAngle(axis, -angle);

      this._eye.applyQuaternion(quaternion);
      this.object.up.applyQuaternion(quaternion);
      this._rotateEnd.applyQuaternion(quaternion);

      quaternion.setFromAxisAngle(axis, angle * (this.dynamicDampingFactor - 1.0));
      this._rotateStart.applyQuaternion(quaternion);
    }
  }


  zoomCamera() {
    if (this._state === this.STATE.TOUCH_ZOOM) {
      var factor = this._touchZoomDistanceStart / this._touchZoomDistanceEnd;
      this._touchZoomDistanceStart = this._touchZoomDistanceEnd;
      this._eye.multiplyScalar(factor);
    } else {
      var factor = 1.0 + (this._zoomEnd.y - this._zoomStart.y) * this.zoomSpeed;
      if (factor !== 1.0 && factor > 0.0) {
        this._eye.multiplyScalar(factor);
        this._zoomStart.y += (this._zoomEnd.y - this._zoomStart.y) * this.dynamicDampingFactor;
      }
    }
  }


  zoom(value) {
    this._eye.multiplyScalar(value);
    this._zoomStart.y += (this._zoomEnd.y - this._zoomStart.y) * this.dynamicDampingFactor;
  }


  panCamera() {
    var mouseChange = this._panEnd.clone().sub( this._panStart );
    if ( mouseChange.lengthSq() ) {
      mouseChange.multiplyScalar( this._eye.length() * this.panSpeed );
      var pan = this._eye.clone().cross( this.object.up ).setLength( mouseChange.x );
      pan.add( this.object.up.clone().setLength( mouseChange.y ) );
      this.object.position.add( pan );
      this.target.add( pan );
      this._panStart.add( mouseChange.subVectors( this._panEnd, this._panStart ).multiplyScalar( this.dynamicDampingFactor ) );
    }
  }


  checkDistances() {
    if (!this.noZoom || !this.noPan) {
      if (this.object.position.lengthSq() > this._maxDistance * this._maxDistance) {
        this.object.position.setLength(this._maxDistance);
      }

      if (this._eye.lengthSq() < this._minDistance * this._minDistance) {
        this.object.position.addVectors(this.target, this._eye.setLength(this._minDistance));
      }
    }
  }


  update() {
    this._eye.subVectors(this.object.position, this.target);

    if (!this.noRotate) {
      this.rotateCamera();
    }

    if (!this.noZoom) {
      this.zoomCamera();
    }

    if ( !this.noPan ) {
      this.panCamera();
    }

    this.object.position.addVectors(this.target, this._eye);
    this.checkDistances();
    this.object.lookAt(this.target);

    if (this.lastPosition.distanceToSquared(this.object.position) > 0) {
      this.lastPosition.copy(this.object.position);
    }
  }


  reset() {
    this._state = this.STATE.NONE;
    this._prevState = this.STATE.NONE;

    this.target.copy(this.target0);
    this.object.position.copy(this.position0);
    this.object.up.copy(this.up0);
    this._eye.subVectors(this.object.position, this.target);
    this.object.lookAt(this.target);
    this.lastPosition.copy(this.object.position);
  }


  targetOnCenter() {
    this.target.copy(this.target0);
    this.object.position.copy(this.position0);
    this.object.up.copy(this.up0);
    this._eye.subVectors(this.object.position, this.target);
    this.object.lookAt(this.target);
    this.lastPosition.copy(this.object.position);
  }


  mousedown(event) {
    if (this.enabled === false) { return; }

    event.preventDefault();
    event.stopPropagation();

    if (this._state === this.STATE.NONE) {
      this._state = event.button;
    }

    if (this._state === this.STATE.ROTATE && !this.noRotate) {
      this._rotateStart = this._rotateEnd = this.getMouseProjectionOnBall(event.clientX, event.clientY);
    } else if (this._state === this.STATE.ZOOM && !this.noZoom) {
      this._zoomStart = this._zoomEnd = this.getMouseOnScreen( event.clientX, event.clientY );
    } else if ( this._state === this.STATE.PAN && !this.noPan ) {
      this._panStart = this._panEnd = this.getMouseOnScreen( event.clientX, event.clientY );
    }

    document.addEventListener( 'mousemove', this.mousemove.bind(this), false );
    document.addEventListener( 'mouseup', this.mouseup.bind(this), false );
  }


  mousemove(event) {
    if (this.enabled === false) { return; }

    event.preventDefault();
    event.stopPropagation();
    // Only update hasMoved flag if moving state is not none
    if (this._state === this.STATE.ROTATE && !this.noRotate) {
      this.hasMoved = true;
      this._rotateEnd = this.getMouseProjectionOnBall(event.clientX, event.clientY);
    } else if (this._state === this.STATE.ZOOM && !this.noZoom) {
      this.hasMoved = true;
      this._zoomEnd = this.getMouseOnScreen(event.clientX, event.clientY);
    } else if ( this._state === this.STATE.PAN && !this.noPan ) {
      this.hasMoved = true;
      this._panEnd = this.getMouseOnScreen( event.clientX, event.clientY );
    }
  }


  mouseup(event) {
    if (this.enabled === false) { return; }

    event.preventDefault();
    event.stopPropagation();

    this._state = this.STATE.NONE;

    if (this.hasMoved === true) { // Restore hasMoved flag to free country click
      setTimeout(() => { this.hasMoved = false; }, 10);
    }

    document.removeEventListener('mousemove', this.mousemove.bind(this));
    document.removeEventListener('mouseup', this.mouseup.bind(this));
  }


  mousewheel(event) {
    if (this.enabled === false) { return; }

    event.preventDefault();
    event.stopPropagation();

    var delta = 0;
    if (event.wheelDelta) { // WebKit / Opera / Explorer 9
      delta = event.wheelDelta / 40;
    } else if (event.detail) { // Firefox
      delta = - event.detail / 3;
    }

    this._zoomStart.y += delta * 0.01;
  }


  touchstart(event) {
    if (this.enabled === false) { return; }

    switch (event.touches.length) {
      case 1:
        this._state = this.STATE.TOUCH_ROTATE;
        this._rotateStart = this._rotateEnd = this.getMouseProjectionOnBall(event.touches[0].pageX, event.touches[0].pageY);
        break;
      case 2:
        this._state = this.STATE.TOUCH_ZOOM;
        var dx = event.touches[0].pageX - event.touches[1].pageX;
        var dy = event.touches[0].pageY - event.touches[1].pageY;
        this._touchZoomDistanceEnd = this._touchZoomDistanceStart = Math.sqrt(dx * dx + dy * dy);
        break;
      case 3:
        this._state = this.STATE.TOUCH_PAN;
        this._panStart = this._panEnd = this.getMouseOnScreen( event.touches[0].pageX, event.touches[0].pageY);
        break;
      default:
        this._state = this.STATE.NONE;
    }
  }


  touchmove(event) {
    if (this.enabled === false) { return; }

    event.preventDefault();
    event.stopPropagation();

    switch (event.touches.length) {
      case 1:
        this._rotateEnd = this.getMouseProjectionOnBall(event.touches[0].pageX, event.touches[0].pageY);
        break;
      case 2:
        var dx = event.touches[0].pageX - event.touches[1].pageX;
        var dy = event.touches[0].pageY - event.touches[1].pageY;
        this._touchZoomDistanceEnd = Math.sqrt(dx * dx + dy * dy)
        break;
      case 3:
        this._panEnd = this.getMouseOnScreen(event.touches[0].pageX, event.touches[0].pageY );
        break;
      default:
        this._state = this.STATE.NONE;
    }
  }


  touchend(event) {
    if (this.enabled === false) { return; }

    switch (event.touches.length) {
      case 1:
        this._rotateStart = this._rotateEnd = this.getMouseProjectionOnBall(event.touches[0].pageX, event.touches[0].pageY);
        break;
      case 2:
        this._touchZoomDistanceStart = this._touchZoomDistanceEnd = 0;
        break;
      case 3:
        this._panStart = this._panEnd = this.getMouseOnScreen(event.touches[0].pageX, event.touches[0].pageY );
        break;
    }

    this._state = this.STATE.NONE;
  }


  preventDefault(event) {
    event.preventDefault();
  }


  set maxDistance(maxDistance) {
    this._maxDistance = maxDistance;
  }


  set minDistance(minDistance) {
    this._minDistance = minDistance;
  }


}


export default TrackballControls;
