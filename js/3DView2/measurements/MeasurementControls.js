import {Object3D, Raycaster, Vector3} from 'three';
import {Projector} from '../../dependencies/Projector.js';
import {DragControls} from '../../dependencies/DragControls.js';


////////////////////////////////////////////////////////////////////////////////
//Control
//MeasurementControls class
////////////////////////////////////////////////////////////////////////////////


class MeasurementControls extends Object3D {
	constructor(viewport, camera, container) {
		super(viewport, camera, container);
		const domElement = container.dom;
		this.measurementGizmos = [];
		this.pickers = [];
		this.enabled = false;
		this.selectedPicker = false;
		this.snap = true;
		this.dragging = false;
		// this.camera = camera;
		this.domElement = container.dom;
		// this.viewport = viewport;
		// this.container = container
		const scope = this;
		// this.scope = this
		// const changeEvent = {type: "change"};
		const sceneChangedEvent = {type: "sceneChanged"};
		this.changeEvent = {type: "change"};
		this.sceneChangedEvent = {type: "sceneChanged"};
		const ray = new Raycaster();
		this.ray = ray;
		const projector = new Projector();




		this.domElement.addEventListener( "mousedown", onPointerDown, false );
		this.domElement.addEventListener( "touchstart", onPointerDown, false );

		this.domElement.addEventListener( "mousemove", onPointerHover, false );
		this.domElement.addEventListener( "touchmove", onPointerHover, false );

		this.domElement.addEventListener( "mousemove", onPointerMove, false );
		this.domElement.addEventListener( "touchmove", onPointerMove, false );


		this.domElement.addEventListener( "mouseout", onPointerMove, false );



		this.domElement.addEventListener( "mouseup", onPointerUp, false );
		this.domElement.addEventListener( "mouseout", onPointerUp, false );
		this.domElement.addEventListener( "touchend", onPointerUp, false );
		this.domElement.addEventListener( "touchcancel", onPointerUp, false );
		this.domElement.addEventListener( "touchleave", onPointerUp, false );

		window.addEventListener( 'keydown', onKeyDown, false );




		this.onGizmoTextSelected= function(event) {
			// console.log('MeasurementControls onGizmoTextSelected')
			alert('MeasurementControls onGizmoTextSelected')
			if (event.measurementGizmo) {
				notifyGizmoSelection(event.measurementGizmo);
				scope.select(event.measurementGizmo.measurement);
				// this.select(event.measurementGizmo.measurement);
			}
		}

		this.onGizmoTextMouseDown= function(event) {
			console.log('MeasurementControls onGizmoTextMouseDown')
			if (event.measurementGizmo && event.originalEvent) {
				scope.selectedPicker = event.measurementGizmo.getTextPicker();
				if (scope.selectedPicker) {
					camera.updateMatrixWorld();
					var pointer = event.originalEvent.touches ? event.originalEvent.touches[0] : event.originalEvent;
					var eye = getEyeVector(pointer);

					var planeNormal = new Vector3(0, 0, 1);
					if (planeNormal.unproject)
						planeNormal.unproject(camera)
					else
						projector.unprojectVector(planeNormal, camera);
					var position = this.linePlaneIntersection(camera.position, eye, scope.selectedPicker.position, planeNormal);

					event.measurementGizmo.dragStart(scope.selectedPicker.name, eye, position);
					scope.dragging = true;
					scope.update();
				}
				notifyGizmoSelection(event.measurementGizmo);
			}

		}


		function notifyGizmoSelection(measurementGizmo) {
			console.log('MeasurementControls notifyGizmoSelection')
			if (measurementGizmo)
				scope.dispatchEvent({type: 'select', measurement: measurementGizmo.measurement});
			else
				scope.dispatchEvent({type: 'select'});
		}

		this.add = function (measurement) {
			console.log('MeasurementControls add measurement',measurement)
			var gizmo = measurement.createGizmo(container);
			this.addGizmo(gizmo);
		}

		this.remove = function (measurement) {
			console.log('MeasurementControls remove')
			if (measurement && measurement.measurementGizmo)
				this.removeGizmo(measurement.measurementGizmo);
			scope.dispatchEvent({type: "objectRemoved", object: measurement});
		}

		this.attachGizmo = function (gizmo) {
			this.addGizmo(gizmo);
			gizmo.restore();
		}

		this.onAddedObject = function (measurement) {
			console.log('MeasurementControls onAddedObject')
			scope.dispatchEvent({type: "objectAdded", object: measurement});
		}


		this.select = function (measurement) {
			console.log('MeasurementControls select')
			//unselect everything
			for (var i = 0; i < this.measurementGizmos.length; ++i) {
				this.measurementGizmos[i].select(false);
			}
			//select what is needed
			if (measurement && measurement.measurementGizmo) {
				measurement.measurementGizmo.select();
				scope.update();
				scope.dispatchEvent({type: "change", scope: "select", object: measurement});
			}
		}

		this.update = function () {
			console.log('MeasurementControls update')
			camera.updateMatrixWorld();
			for (var i = 0; i < this.measurementGizmos.length; ++i) {
				this.measurementGizmos[i].highlight(false);
				this.measurementGizmos[i].update(camera);
			}

			if (scope.selectedPicker)
				scope.selectedPicker.measurementGizmo.highlight(scope.selectedPicker.name);
		}


		this.acceptPoints = function () {
			var measurementGizmo = (scope.measurementGizmos.length > 0) ? scope.measurementGizmos[scope.measurementGizmos.length - 1] : null;
			return measurementGizmo && measurementGizmo.acceptPoints();
		}

		function onPointerUp(event) {
			console.log('MeasurementControls onPointerUp')
			if (event && event.cancel) return; //the event is cancelled
			if (event && event.type == 'mouseout' && event.relatedTarget && event.relatedTarget.parentElement == domElement) return; //the mouse is actually over the child element

			if (scope.dragging)
				event.cancel = true; //prevent other listeners from getting this event
			var measurement = scope.selectedPicker ? scope.selectedPicker.measurementGizmo.measurement : null;

			scope.dragging = false;
			scope.selectedPicker = false;

			if (!event.rendered) {
				event.rendered = true; //prevent other listeners from rendering
			}
			scope.dispatchEvent({type: "change", scope: "finishDragging", object: measurement});
			scope.update();
		}


		function onPointerHover( event ) {
			// console.log('MeasurementControls onPointerHover')
			if (event && event.cancel)  return; //the event is cancelled
			if ( !scope.enabled || scope.dragging ) return;
			event.preventDefault();
			// event.stopPropagation();

			var pointer = event.touches? event.touches[0] : event;

			var intersect = intersectObjects( pointer, scope.pickers, false );

			if ( intersect ) {
				// console.log('MeasurementControls intersect')
				if (scope.selectedPicker !== intersect.object) {
					scope.selectedPicker = intersect.object;
					scope.update();
					if (!event.rendered) {
						event.rendered = true; //prevent other listeners from rendering
						scope.dispatchEvent( { type: "change", scope: "hover", object: scope.selectedPicker ? scope.selectedPicker.measurementGizmo.measurement : null } );
					}
				}

			}
			else {
				// console.log('MeasurementControls intersect no')
				if (scope.selectedPicker !== false) {
					scope.selectedPicker = false;
					scope.update();
					if (!event.rendered) {
						event.rendered = true; //prevent other listeners from rendering
						scope.dispatchEvent( { type: "change", scope: "hover" } );
					}
				}
			}
		};


		function onPointerDown(event) {
			console.log('MeasurementControls onPointerDown')
			if (event && event.cancel) return; //the event is cancelled
			if (!scope.enabled) return;

			event.preventDefault();
			event.stopPropagation();

			var pointer = event.touches ? event.touches[0] : event;


			if (pointer.button === 0 || pointer.button == undefined) {

				//check if last measurementGizmo is accepting points
				var measurementGizmo = (scope.measurementGizmos.length > 0) ? scope.measurementGizmos[scope.measurementGizmos.length - 1] : null;
				console.log('MeasurementControls measurementGizmo',measurementGizmo)
				// console.log('MeasurementControls measurementGizmo.acceptPoints()',measurementGizmo.acceptPoints())
				if (measurementGizmo && measurementGizmo.acceptPoints()) {
					console.log('MeasurementControls cas 1')
					//check for intersection with scene objects
					var intersect = intersectObjects(pointer, viewport.objects, false);

					if (intersect) {
						console.log('MeasurementControls measurementGizmo cas1 intersect',intersect)
						if (scope.snap && measurementGizmo.mustSnapToPart())
							snapToFaceCorner(intersect, measurementGizmo);

						measurementGizmo.addControlPoint(intersect.point, intersect.object, null, intersect.face, scope.onAddedObject);
						if (measurementGizmo.mustDragGizmo()) {
							scope.selectedPicker = measurementGizmo.mustDragGizmo();
							var eye = getEyeVector(pointer);
							measurementGizmo.addControlPoint(intersect.point, intersect.object, null, null, scope.onAddedObject);
							measurementGizmo.dragStart(scope.selectedPicker.name, eye, intersect.point);
							domElement.style.cursor = 'default';
							scope.dragging = true;

						} else
							domElement.style.cursor = measurementGizmo.acceptPoints() ? 'crosshair' : 'default';


						event.cancel = true; //prevent other listeners from getting this event
						scope.update();
						notifyGizmoSelection(measurementGizmo);
						scope.dispatchEvent(sceneChangedEvent);
					}
				} else {
					console.log('MeasurementControls cas 2')
					//check for intersection with gizmos
					var intersect = intersectObjects(pointer, scope.pickers, false);
					// var intersect = intersectObjects(pointer, scope.pickers, true);

					if (intersect) {

						console.log('MeasurementControls measurementGizmo cas2 intersect',intersect)
						scope.selectedPicker = intersect.object;
						console.log('MeasurementControls measurementGizmo cas2 scope.selectedPicker',scope.selectedPicker)
						var measurementGizmo = intersect.object.measurementGizmo;


						if (scope.selectedPicker && measurementGizmo) {
							camera.updateMatrixWorld();
							var eye = getEyeVector( pointer );

							var planeNormal = new Vector3( 0, 0, 1 );
							if (planeNormal.unproject)
								planeNormal.unproject( camera )
							else
								projector.unprojectVector( planeNormal, camera );
							var position = linePlaneIntersection(camera.position, eye, scope.selectedPicker.position, planeNormal);

							// measurementGizmo.dragStart(scope.parent, eye, position);
							// measurementGizmo.dragStart(scope.parent, eye, intersect.point);
							// measurementGizmo.dragStart( intersect.object, eye, intersect.point);
							measurementGizmo.dragStart( intersect.object,position,eye);
							scope.dragging = true;
							scope.update();
							notifyGizmoSelection(measurementGizmo);
						}



						// if (measurementGizmo) {
						// 	camera.updateMatrixWorld();
						// 	var eye = getEyeVector(pointer);
						// 	measurementGizmo.dragStart(intersect.object.name, eye, intersect.point);
						//
						// 	event.cancel = true; //prevent other listeners from getting this event
						// 	scope.dragging = true;
						// 	scope.update();
						// 	notifyGizmoSelection(measurementGizmo);
						// }



					}
				}

			}

		};

		function linePlaneIntersection(lineOrigin, lineNormal, planeOrigin, planeNormal) {
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

		function onPointerMove( event ) {
			if (event && event.cancel)  return; //the event is cancelled
			if ( !scope.enabled ) return;

			var measurementGizmo = (scope.measurementGizmos.length > 0) ? scope.measurementGizmos[scope.measurementGizmos.length - 1] : null;
			if (measurementGizmo && measurementGizmo.acceptPoints())
				domElement.style.cursor = 'crosshair';

			if ( !scope.dragging ) return;
			event.preventDefault();
			event.stopPropagation();
			var pointer = event.touches? event.touches[0] : event;
			if (scope.selectedPicker && scope.selectedPicker.measurementGizmo) {
				// console.log('MeasurementControls onPointerMove')
				var measurementGizmo = scope.selectedPicker.measurementGizmo;
				camera.updateMatrixWorld();
				var eye = getEyeVector( pointer );
				var cameraPos = new Vector3().setFromMatrixPosition( camera.matrixWorld );
				measurementGizmo.dragMove(scope.selectedPicker.name, eye, cameraPos);

				event.cancel = true; //prevent other listeners from getting this event
				scope.dispatchEvent( { type: "change", scope: "dragging", object: scope.selectedPicker.measurementGizmo.measurement } );
				scope.update();
			}


		}


		function onKeyDown(event) {
			console.log('onKeyDown')
			if (this.enabled === false) return;
			switch (event.keyCode) {
				case 27: //ESC
					cancelMeasurement();
					break;
			}
		}

		function cancelMeasurement() {
			var measurementGizmo = (this.measurementGizmos.length > 0) ? this.measurementGizmos[this.measurementGizmos.length - 1] : null;
			if (measurementGizmo && measurementGizmo.acceptPoints()) {
				this.remove(measurementGizmo.measurement);
				measurementGizmo.removeUIObject();
				notifyGizmoSelection();
				this.dispatchEvent(this.sceneChangedEvent);
			}
		}

		function getEyeVector(pointer) {
			// console.log('getEyeVector')
			var rect = domElement.getBoundingClientRect();
			var x = (pointer.clientX - rect.left) / rect.width;
			var y = (pointer.clientY - rect.top) / rect.height;
			var pointerVector = new Vector3((x) * 2 - 1, -(y) * 2 + 1, 0.5);

			if (pointerVector.unproject)
				pointerVector.unproject(camera)
			else
				projector.unprojectVector(pointerVector, camera);
			return pointerVector.sub(camera.position).normalize();
		}

		function intersectObjects(pointer, objects, recursive) {

			ray.set(camera.position, getEyeVector(pointer));
			if (!objects) {
				console.log('err');
			}
			var intersections = ray.intersectObjects(objects, recursive);
			if (intersections.length > 0) {
				while (intersections.length > 0
				&& ((intersections[0].object.measurementGizmo && intersections[0].object.measurementGizmo.isVisible() === false)
					|| (!intersections[0].object.measurementGizmo && intersections[0].object.visible === false)
				)) {
					intersections.shift();
				}
			}
			return intersections[0] ? intersections[0] : false;
		}




		function snapToFaceCorner(intersect, measurementGizmo) {
			console.log('MeasurementControls snapToFaceCorner')
			if (intersect && intersect.face && intersect.object && intersect.object.geometry) {

				//new code
				const positionAttribute = intersect.object.geometry.attributes.position;
				const lists =  [intersect.face.a,intersect.face.b,intersect.face.c]
				var vertexes = []
				for ( const elem of lists) {
					const vertex = new Vector3();
					vertex.fromBufferAttribute( positionAttribute, elem ); // read vertex
					vertexes.push(vertex)
				}
				camera.updateMatrixWorld();
				var maxSnapDistance = measurementGizmo.getWidth(intersect.point, camera) * 4;

				//getting min distance to the points within maxSnapDistance
				var facePoint, distance, minDistance, minDistancePoint = null;
				for (var i = 0; i < 3; ++i) {
					facePoint = new Vector3().copy(vertexes[i]);
					intersect.object.localToWorld(facePoint);

					distance = intersect.point.distanceTo(facePoint);
					if (distance <= maxSnapDistance && (!minDistancePoint || distance < minDistance)) {
						minDistance = distance;
						minDistancePoint = facePoint;
					}
				}
				if (minDistancePoint) {//update intersect point
					intersect.point = minDistancePoint;
					return true;
				}
			}
			return false;
		}

	}

	addGizmo(measurementGizmo) {
		console.log('MeasurementControls ADDGIZMO')
		console.log(measurementGizmo)
		super.add(measurementGizmo);
		this.measurementGizmos.push(measurementGizmo);
		measurementGizmo.addEventListener('select', this.onGizmoTextSelected);
		measurementGizmo.addEventListener('textMouseDown', this.onGizmoTextMouseDown);

		if (measurementGizmo.acceptPoints())
			this.domElement.style.cursor = 'crosshair';

		for (var i = 0; i < measurementGizmo.pickers.children.length; ++i) {
			var picker = measurementGizmo.pickers.children[i];
			this.pickers.push(picker);
		}

		this.update();
		this.dispatchEvent(this.sceneChangedEvent);
		// this.dispatchEvent({type: "sceneChanged"});
	}

	removeGizmo(measurementGizmo) {
		console.log('MeasurementControls remove gizmo')
		for (var i = 0; i < measurementGizmo.pickers.children.length; ++i) {
			var picker = measurementGizmo.pickers.children[i];
			var index = this.pickers.indexOf(picker);
			if (index >= 0)
				this.pickers.splice(index, 1);
		}
		measurementGizmo.removeEventListener('select', this.onGizmoTextSelected);
		measurementGizmo.removeEventListener('textMouseDown', this.onGizmoTextMouseDown);
		var index = this.measurementGizmos.indexOf(measurementGizmo);
		if (index >= 0)
			this.measurementGizmos.splice(index, 1);
		measurementGizmo.clean();
		super.remove(measurementGizmo);
		this.update();
	}

}

export {MeasurementControls};

