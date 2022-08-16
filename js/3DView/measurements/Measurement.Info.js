////////////////////////////////////////////////////////////////////////////////
//MeasurementInfo class
////////////////////////////////////////////////////////////////////////////////
import {Matrix3, Matrix4, Mesh, SphereGeometry, Vector3} from 'three';
import {Measurement, MeasurementGizmo, MeasurementGizmoMaterial} from './Measurement.js';
import {computeFaceNormal} from '../3DView.Measurements.js';

class MeasurementInfo extends Measurement {
    constructor() {
        super();
        this.createGizmo = function (container) {
            this.measurementGizmo = new MeasurementGizmoInfo(this, container);
            return this.measurementGizmo;
        };

        this.getValue = function () {
            return null;
        };

        this.getInfo = function () {
            var value = this.measurementGizmo.getValue();
            if (value == null) return [];

            return value;
        };

        this.getType = function () {
            return 'Point';
        };

        this.getDescription = function () {
            return 'Point information';
        }
    }

}

export {MeasurementInfo}

////////////////////////////////////////////////////////////////////////////////////////////////
//class MeasurementGizmoInfo
////////////////////////////////////////////////////////////////////////////////////////////////

class MeasurementGizmoInfo extends MeasurementGizmo {
    constructor(measurement, container) {
        super();
        this.measurement = measurement
        this.container = container
        this.selectedFace = null;
        this.selectedObject = null;
        this.handleGizmos = {
            'START': [
                new Mesh(new SphereGeometry(2), new MeasurementGizmoMaterial({color: 0xff0000, opacity: 0.4}))
            ]
        }

        this.pickerGizmos = {}

        this.getValue = function () {
            if (this.controlPoints.length < 1 || !this.selectedFace || !this.selectedObject || !this.selectedObject.geometry) return null;
            //get points in local coordinates
            var controlPoints = this.getControlPointsWorld();
            var geometry = this.selectedObject.geometry;
            const positionAttribute = geometry.attributes.position;
            const lists = [this.selectedFace.a, this.selectedFace.b, this.selectedFace.c]
            var facePoints = []
            for (const elem of lists) {
                const vertex = new Vector3();
                vertex.fromBufferAttribute(positionAttribute, elem); // read vertex
                facePoints.push(this.selectedObject.localToWorld(vertex.clone()))

            }

            var matrixWorldInverse = new Matrix4();
            matrixWorldInverse.invert(this.selectedObject.parent.matrixWorld);
            var normalMatrix = new Matrix3().getNormalMatrix(matrixWorldInverse);
            this.compute = new computeFaceNormal(geometry, this.selectedFace);
            var normal = this.selectedFace.normal.clone().applyMatrix3(normalMatrix).normalize();
            var results = [
                {name: 'Point', values: [controlPoints[0].x, controlPoints[0].y, controlPoints[0].z]},
                {
                    name: 'Face', values: [
                        {name: 'Point1', values: [facePoints[0].x, facePoints[0].y, facePoints[0].z]},
                        {name: 'Point2', values: [facePoints[1].x, facePoints[1].y, facePoints[1].z]},
                        {name: 'Point3', values: [facePoints[2].x, facePoints[2].y, facePoints[2].z]}
                    ]
                },
                {name: 'Normal', values: [normal.x, normal.y, normal.z]}
            ];
            return results
        };

        this.acceptPoints = function () {
            return this.controlPoints.length < 1;
        }

        this.mustDragGizmo = function () {
            return false;
        }

        this.mustSnapToPart = function () {
            return this.controlPoints.length < 1;
        }

        this.update = function (camera) {
            //update gizmos
            if (this.isVisible()) {
                this.show();
                this.updateGizmosFromControlPoints(camera);
            } else {
                this.hide();
            }
        }

        this.init();


    }

    addControlPoint(point, object, forceAdd, face, callbackAddedObject) {
        super.addControlPoint(point, object, forceAdd, face, callbackAddedObject)
        if (this.controlPoints.length == 1) {
            //1st point - add measurement to object
            if (object) {
                this.selectedFace = face;
                this.selectedObject = object;
                object.add(this.measurement);
                if (callbackAddedObject) callbackAddedObject(this.measurement);
            }
        }
        this.show();
    }

    updateGizmosFromControlPoints(camera) {
        //getting width
        var width = this.getWidth(this.getCenterPointWorld(), camera);
        //get control points in world coordinates
        var controlPoints = this.getControlPointsWorld();
        if (this.controlPoints.length == 1) {
            var object = this.handleGizmos['START'][0];
            object.position.copy(controlPoints[0]);
            object.scale.set(width, width, width);
            object.visible = true;
        }
    }
}

export {MeasurementGizmoInfo}
