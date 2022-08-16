import {Color, DoubleSide, Matrix4, Object3D, Vector2, Vector3,MeshBasicMaterial} from 'three';
import {Projector} from '../../dependencies/Projector.js';
////////////////////////////////////////////////////////////////////////////////
//MeasurementGizmoMaterial
////////////////////////////////////////////////////////////////////////////////
class MeasurementGizmoMaterial extends MeshBasicMaterial {
	constructor(parameters) {
		super();
		this.depthTest = false;
		this.depthWrite = false;
		this.side = DoubleSide;
		this.transparent = true;
		this.setValues( parameters );
	}
}
export {MeasurementGizmoMaterial}

////////////////////////////////////////////////////////////////////////////////
//Measurements
//Measurement interface (base class)
////////////////////////////////////////////////////////////////////////////////
class Measurement extends Object3D {
	constructor() {
		super();
		this.measurementGizmo = null;
		this.color = new Color(0xc75050);
		this.comments = "";
		this.visible = false;

		this.createGizmo = function(container) {
			return this.measurementGizmo;
		};

		this.getValue = function() {
			return null;
		};

		this.getInfo = function() {
			return [];
		};

		this.getType = function() {
			return 'Measurement';
		};

		this.getDescription = function() {
			return 'Generic Measurement';
		}

		this.getComments = function() {
			return this.comments;
		};

		this.setComments = function(text) {
			this.comments = text;
		};

	}

	}
export {Measurement}

////////////////////////////////////////////////////////////////////////////////
//Gizmos
//MeasurementGizmo base class
////////////////////////////////////////////////////////////////////////////////

class MeasurementGizmo extends Object3D{
	constructor(measurement, container ) {
		super();
		this.handleGizmos = {}
		var showPickers = true;
		this.dragNormal = new Vector3();
		this.dragOrigin = new Vector3();
		this.lastPosition = new Vector3();
		this.dragGizmo = '';
		this.selected = false;
		const scope = this;
		this.controlPoints = [];
		var projector = new Projector();

		this.transformGizmo = function(mesh, translate, rotate) {
			if ( translate ) {
				mesh.geometry.applyMatrix4( new Matrix4().makeTranslation( translate.x, translate.y, translate.z ) );
			}
			if ( rotate ) {
				var m = new Matrix4();
				var m1 = new Matrix4();
				var m2 = new Matrix4();
				var m3 = new Matrix4();

				m1.makeRotationX( rotate.x );
				m2.makeRotationY( rotate.y );
				m3.makeRotationZ( rotate.z );

				m.multiplyMatrices( m1, m2 );
				m.multiply( m3 );
				mesh.geometry.applyMatrix4( m );
			}
		}

		this.init = function () {
			this.handles = new Object3D();
			this.pickers = new Object3D();
			this.add(this.handles);
			this.add(this.pickers);

			if (this.container) {
				this.text = new UI.Text();
				this.text.setDisplay( 'none' );
				this.text.setPosition( 'absolute' );
				this.text.setColor('#000000');
				this.text.setPadding('3px');
				this.text.setPaddingRight('8px');
				this.text.setPaddingLeft('8px');
				this.text.setBackgroundColor('#FFFFFF');
				this.text.setBorder('1px solid #FF0000');
				this.text.setOpacity('0.9');
				this.text.setStyle('font', ["normal normal normal 13px/normal 'Helvetica Neue', arial, sans-serif"]);
				this.text.setStyle('overflow', ['hidden']);
				this.container.add( this.text );

				this.text.dom.addEventListener( 'mousedown', function(event) {
					event.cancel = true;
					scope.dispatchEvent( { type: 'textMouseDown', measurementGizmo: scope, originalEvent: event} );
				});

				this.text.dom.addEventListener( 'mouseover', function(event) {
					if (this.selected !== false) {
						scope.text.setBackgroundColor('#FFFF88');
						scope.text.setBorder('2px solid #FF0000');
						scope.text.setOpacity('1');
					} else {
						scope.text.setBackgroundColor('#ffffff');
						scope.text.setBorder('1px solid #FF0000');
						scope.text.setOpacity('1');
					}


				});

				this.text.dom.addEventListener( 'mouseout', function(event) {
					if (scope.selected !== false) {
						scope.text.setBackgroundColor('#FFFF88');
						scope.text.setBorder('2px solid #FF0000');
						scope.text.setOpacity('1');
					} else {
						scope.text.setBackgroundColor('#FFFFFF');
						scope.text.setBorder('1px solid #FF0000');
						scope.text.setOpacity('0.8');
					}
				});
			}

			for ( var i in this.handleGizmos ) {
				var handle = this.handleGizmos[i][0];
				handle.name = i;
				this.transformGizmo(handle, this.handleGizmos[i][1], this.handleGizmos[i][2]);
				handle.visible = false;
				this.handles.add( handle );
			}

			for ( var i in this.pickerGizmos ) {
				var picker = this.pickerGizmos[i][0];
				picker.name = i;
				this.transformGizmo(picker, this.pickerGizmos[i][1], this.pickerGizmos[i][2]);
				picker.visible = showPickers;
				picker.measurementGizmo = this;
				this.pickers.add( picker );
			}

		}

		this.hide = function () {
			for ( var j in this.handles.children ) this.handles.children[j].visible = false;
			for ( var j in this.pickers.children ) this.pickers.children[j].visible = false;
			if (this.text) this.text.setDisplay( 'none' );
			this.measurement.visible = false;
		}

		this.show = function () {
			for ( var j in this.handles.children ) this.handles.children[j].visible = false;
			for ( var j in this.pickers.children ) this.pickers.children[j].visible = showPickers;
			if (this.text && this.text.dom.textContent) this.text.setDisplay( 'block' );
			this.measurement.visible = true;
		}

		this.isVisible = function () {
			return this.measurement.visible;
		}


		this.getTextPicker = function () {
			if (this.pickerGizmos['TEXT'])
				return this.pickerGizmos['TEXT'][0];
			else
				return null;
		}

		this.highlight = function (control) {
			var handle;
			for (var i in this.handleGizmos) {
				handle = this.handleGizmos[i][0];
				if (handle.material.oldColor) {
					handle.material.color.copy(handle.material.oldColor);
					handle.material.opacity = handle.material.oldOpacity;
				}
			}
			if (control && this.handleGizmos[control]) {
				handle = this.handleGizmos[control][0];
				handle.material.oldColor = handle.material.color.clone();
				handle.material.oldOpacity = handle.material.opacity;
				// handle.material.color.setRGB(1, 1, 0);
				const white = new Color( 0x000000 );
				handle.material.color.set(white);
				handle.material.opacity = 0.8;
			}
		}

		this.dragStart = function(gizmo, eye, origin) {
			this.dragNormal.copy(eye);
			this.dragGizmo = gizmo;
			this.dragOrigin = origin;
			this.lastPosition = new Vector3().copy(origin);
		}

		this.onGizmoMoved = function(gizmo, offset) {
			if (this.pickerGizmos && this.pickerGizmos[gizmo])
				this.pickerGizmos[gizmo][0].position.add(offset);

			if (this.handleGizmos && this.handleGizmos[gizmo])
				this.handleGizmos[gizmo][0].position.add(offset);
		}

		this.dragMove = function(gizmo, eye, cameraPosition) {
			if (gizmo !== this.dragGizmo) {
				return;
			}

			var intersection = this.linePlaneIntersection(cameraPosition, eye, this.dragOrigin, this.dragNormal);
			if (intersection) {
				this.onGizmoMoved(gizmo, this.lastPosition.sub(intersection).negate());
				this.lastPosition = new Vector3().copy(intersection);
			}
		}

		this.mustDragGizmo = function() {
			return false;
		}

		this.mustSnapToPart = function() {
			return true;
		}

		this.acceptPoints = function() {
			return false;
		}

		this.getCenterPointWorld = function() {
			var center = new Vector3();
			var controlPoints = this.getControlPointsWorld();
			for (var i=0; i < controlPoints.length; ++i) {
				center.add(controlPoints[i]);
			}
			if (controlPoints.length > 0)
				center.divideScalar(controlPoints.length);

			return center;
		}

		this.getWidth = function(point, camera) {
			var camPosition = new Vector3().setFromMatrixPosition( camera.matrixWorld );
			return point.distanceTo( camPosition ) / 300;
		}

		this.getScreenCoords = function( position, camera ) {
			var rect = this.container.dom.getBoundingClientRect();
			var widthHalf = rect.width / 2, heightHalf = rect.height / 2;
			var vector = new Vector3().copy(position);
			if (vector.project)
				vector.project(camera);
			else
				projector.projectVector( vector, camera );
			return new Vector2(( vector.x * widthHalf ) + widthHalf, - ( vector.y * heightHalf ) + heightHalf);
		}

		this.getControlPointsWorld = function() {
			//get points in world coordinates
			var controlPoints = [];
			for (var i=0; i<this.controlPoints.length; ++i) {
				controlPoints[i] = new Vector3().copy(this.controlPoints[i].point);
				if (this.controlPoints[i].object)
					this.controlPoints[i].object.localToWorld(controlPoints[i]);
			}
			return controlPoints;
		}

		this.offsetControlPoint = function(i, offset) {
			//get points in world coordinates
			if (i >= this.controlPoints.length || !this.controlPoints[i].point) return;
			if (this.controlPoints[i].object) {
				var point = new Vector3().copy(this.controlPoints[i].point);
				this.controlPoints[i].object.localToWorld(point);
				point.add(offset);
				this.controlPoints[i].object.worldToLocal(point);
				this.controlPoints[i].point.copy(point);
			} else
				this.controlPoints[i].point.add(offset);
		}

		this.setText = function(text, position, camera) {
			if (this.text) {
				this.text.setDisplay( 'block' );
				var coords = this.getScreenCoords(position, camera);
				var rect = this.text.dom.getBoundingClientRect();
				coords.x -= rect.width/2;
				coords.y -= rect.height/2;
				var containerRect = this.container.dom.getBoundingClientRect();
				if (text) this.text.setValue( text );
				this.text.setLeft(coords.x.toString() +'px');
				this.text.setTop(coords.y.toString() +'px');
				rect = this.text.dom.getBoundingClientRect();
				if (rect.width > 0 && rect.height > 0 && (rect.left > containerRect.right || rect.right < containerRect.left || rect.top > containerRect.bottom || rect.bottom < containerRect.top))
					this.text.setDisplay( 'none' );
			}
		}

		this.getValue = function() {
			return null;
		};


		this.clean = function() {
			if (this.container && this.text) {
				this.text.setDisplay( 'none' );
				this.container.remove(this.text);
			}
		}

		this.restore = function() {
			if (this.container && this.text) {
				if (this.text.dom.textContent)
					this.text.setDisplay( 'block' );
				this.container.add(this.text);
			}
		}

		this.removeUIObject = function() {
			if (this.measurement && this.measurement.parent)
				this.measurement.parent.remove( this.measurement );
		}

		this.select = function (selected) {
			if (this.text) {
				if (this.selected !== false) {
					this.text.setBackgroundColor('#FFFF88');
					this.text.setBorder('2px solid #FF0000');
					this.text.setOpacity('1');
					this.text.setStyle('z-index', ['2']);
					this.highlight("TOPLINE");
				} else {
					this.text.setBackgroundColor('#FFFFFF');
					this.text.setBorder('1px solid #FF0000');
					this.text.setOpacity('0.92');
					this.text.setStyle('z-index', ['1']);
				}
			}
		}

		this.linePlaneIntersection= function(lineOrigin, lineNormal, planeOrigin, planeNormal) {
			var u = new Vector3().copy(lineNormal);
			var w = new Vector3().copy(lineOrigin).sub(planeOrigin);
			var pN = new Vector3().copy(planeNormal);
			var d = pN.dot(u);
			var n = pN.dot(w) *-1.0;

			if (Math.abs(d) < 0.00001) { // segment is (almost) parallel to plane
				return;
			}

			var sI = n / d;
			return new Vector3().copy(lineOrigin).add(u.multiplyScalar(sI));   // compute segment intersect point
		}
	}

	addControlPoint( point, object, forceAdd, face, callbackAddedObject ) {
		var point = new Vector3().copy(point);
		if (object) {
			object.worldToLocal(point);
		}
		this.controlPoints.push({point: point, object: object});
	}
}
export {MeasurementGizmo}





