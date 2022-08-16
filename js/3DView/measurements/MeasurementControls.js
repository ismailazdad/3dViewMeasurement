import {Object3D, Raycaster, Vector3} from 'three';
import {Projector} from '../../dependencies/Projector.js';

////////////////////////////////////////////////////////////////////////////////
//Control
//MeasurementControls class
////////////////////////////////////////////////////////////////////////////////


class MeasurementControls extends Object3D {
    constructor(viewport, camera, container, control) {
        super();
        const domElement = container.dom;
        this.measurementGizmos = [];
        this.pickers = [];
        this.enabled = false;
        this.selectedPicker = false;
        this.snap = true;
        this.dragging = false;
        this.domElement = container.dom;
        const scope = this;
        const sceneChangedEvent = {type: "sceneChanged"};
        this.changeEvent = {type: "change"};
        this.sceneChangedEvent = {type: "sceneChanged"};
        const ray = new Raycaster();
        this.ray = ray;
        const projector = new Projector();
        this.control = control

        this.domElement.addEventListener("mousedown", onPointerDown, false);
        this.domElement.addEventListener("touchstart", onPointerDown, false);
        this.domElement.addEventListener("mousemove", onPointerHover, false);
        this.domElement.addEventListener("touchmove", onPointerHover, false);
        this.domElement.addEventListener("mousemove", onPointerMove, false);
        this.domElement.addEventListener("touchmove", onPointerMove, false);
        this.domElement.addEventListener("mouseout", onPointerMove, false);
        this.domElement.addEventListener("mouseup", onPointerUp, false);
        this.domElement.addEventListener("mouseout", onPointerUp, false);
        this.domElement.addEventListener("touchend", onPointerUp, false);
        this.domElement.addEventListener("touchcancel", onPointerUp, false);
        this.domElement.addEventListener("touchleave", onPointerUp, false);

        window.addEventListener('keydown', onKeyDown, false);


        this.onGizmoTextSelected = function (event) {
            if (event.measurementGizmo) {
                notifyGizmoSelection(event.measurementGizmo);
                scope.select(event.measurementGizmo.measurement);
            }
        }

        this.onGizmoTextMouseDown = function (event) {
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
            if (measurementGizmo)
                scope.dispatchEvent({type: 'select', measurement: measurementGizmo.measurement});
            else
                scope.dispatchEvent({type: 'select'});
        }

        this.add = function (measurement) {
            var gizmo = measurement.createGizmo(container);
            this.addGizmo(gizmo);
        }

        this.remove = function (measurement) {
            if (measurement && measurement.measurementGizmo)
                this.removeGizmo(measurement.measurementGizmo);
            scope.dispatchEvent({type: "objectRemoved", object: measurement});
        }


        this.onAddedObject = function (measurement) {
            scope.dispatchEvent({type: "objectAdded", object: measurement});
        }


        this.select = function (measurement) {
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
            if (event && event.cancel) return; //the event is cancelled
            if (event && event.type == 'mouseout' && event.relatedTarget && event.relatedTarget.parentElement == domElement) return; //the mouse is actually over the child element

            if (scope.dragging)
                event.cancel = true; //prevent other listeners from getting this event
            var measurement = scope.selectedPicker ? scope.selectedPicker.measurementGizmo.measurement : null;

            scope.dragging = false;
            scope.selectedPicker = false;
            scope.control.enabled = true;
            domElement.style.cursor = 'default';

            if (!event.rendered) {
                event.rendered = true; //prevent other listeners from rendering
            }
            scope.dispatchEvent({type: "change", scope: "finishDragging", object: measurement});
            scope.update();
        }


        function onPointerHover(event) {
            if (event && event.cancel) return; //the event is cancelled
            if (!scope.enabled || scope.dragging) return;
            event.preventDefault();
            var pointer = event.touches ? event.touches[0] : event;
            var intersect = intersectObjects(pointer, scope.pickers, false);

            if (intersect) {
                if (scope.selectedPicker !== intersect.object) {
                    scope.selectedPicker = intersect.object;
                    scope.update();
                    if (!event.rendered) {
                        event.rendered = true; //prevent other listeners from rendering
                        scope.dispatchEvent({
                            type: "change",
                            scope: "hover",
                            object: scope.selectedPicker ? scope.selectedPicker.measurementGizmo.measurement : null
                        });
                    }
                }

            } else {
                if (scope.selectedPicker !== false) {
                    scope.selectedPicker = false;
                    scope.update();
                    if (!event.rendered) {
                        event.rendered = true; //prevent other listeners from rendering
                        scope.dispatchEvent({type: "change", scope: "hover"});
                    }
                }
            }
        };


        function onPointerDown(event) {
            if (event && event.cancel) return; //the event is cancelled
            if (!scope.enabled) return;
            event.preventDefault();
            event.stopPropagation();
            var pointer = event.touches ? event.touches[0] : event;
            if (pointer.button === 0 || pointer.button == undefined) {
                //check if last measurementGizmo is accepting points
                var measurementGizmo = (scope.measurementGizmos.length > 0) ? scope.measurementGizmos[scope.measurementGizmos.length - 1] : null;
                if (measurementGizmo && measurementGizmo.acceptPoints()) {
                    //check for intersection with scene objects
                    var intersect = intersectObjects(pointer, viewport.objects, false);
                    if (intersect) {
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
                    //check for intersection with gizmos
                    var intersect = intersectObjects(pointer, scope.pickers, false);
                    if (intersect) {
                        scope.selectedPicker = intersect.object;
                        var measurementGizmo = intersect.object.measurementGizmo;
                        if (measurementGizmo) {
                            camera.updateMatrixWorld();
                            var eye = getEyeVector(pointer);
                            measurementGizmo.dragStart(intersect.object.name, eye, intersect.point);
                            event.cancel = true; //prevent other listeners from getting this event
                            scope.dragging = true;
                            scope.control.enabled = false;
                            domElement.style.cursor = 'pointer';
                            scope.update();
                            notifyGizmoSelection(measurementGizmo);
                        }
                    } else {
                        scope.control.enabled = true;
                        domElement.style.cursor = 'default';
                    }
                }

            }

        };


        function onPointerMove(event) {
            if (event && event.cancel) return; //the event is cancelled
            if (!scope.enabled) return;
            var measurementGizmo = (scope.measurementGizmos.length > 0) ? scope.measurementGizmos[scope.measurementGizmos.length - 1] : null;
            if (measurementGizmo && measurementGizmo.acceptPoints())
                domElement.style.cursor = 'crosshair';
            if (!scope.dragging) return;
            event.preventDefault();
            event.stopPropagation();
            var pointer = event.touches ? event.touches[0] : event;
            if (scope.selectedPicker && scope.selectedPicker.measurementGizmo) {
                var measurementGizmo = scope.selectedPicker.measurementGizmo;
                camera.updateMatrixWorld();
                var eye = getEyeVector(pointer);
                var cameraPos = new Vector3().setFromMatrixPosition(camera.matrixWorld);
                measurementGizmo.dragMove(scope.selectedPicker.name, eye, cameraPos);
                event.cancel = true; //prevent other listeners from getting this event
                scope.dispatchEvent({
                    type: "change",
                    scope: "dragging",
                    object: scope.selectedPicker.measurementGizmo.measurement
                });
                scope.update();
            }
        }


        function onKeyDown(event) {
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
            if (intersect && intersect.face && intersect.object && intersect.object.geometry) {
                //new code
                const positionAttribute = intersect.object.geometry.attributes.position;
                const lists = [intersect.face.a, intersect.face.b, intersect.face.c]
                var vertexes = []
                for (const elem of lists) {
                    const vertex = new Vector3();
                    vertex.fromBufferAttribute(positionAttribute, elem); // read vertex
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
    }

    removeGizmo(measurementGizmo) {
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

