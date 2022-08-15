////////////////////////////////////////////////////////////////////////////////
//MeasurementInfo class
////////////////////////////////////////////////////////////////////////////////
// import {Mesh,MeasurementGizmoMaterial,SphereGeometry,Matrix4,Matrix3} from 'three';
import {Matrix3, Matrix4, Mesh, SphereGeometry, Vector3} from 'three';
import {Measurement, MeasurementGizmo, MeasurementGizmoMaterial} from './Measurement.js';
import {computeFaceNormal} from '../3DView.Measurements.js';

class MeasurementInfo extends Measurement {
	constructor( container) {
		super();
		this.container = container;
		this.createGizmo = function(container) {
			console.log('MeasurementInfo createGizmo')
			this.measurementGizmo = new MeasurementGizmoInfo( this, container );
			return this.measurementGizmo;
		};

		this.getValue = function() {
			console.log('MeasurementInfo getValue')
			return null;
		};

		this.getInfo = function() {
			console.log('MeasurementInfo getInfo')
			var value = this.measurementGizmo.getValue();
			if (value == null) return [];

			return value;
		};

		this.getType = function() {
			console.log('MeasurementInfo getType')
			return 'Point';
		};

		this.getDescription = function() {
			console.log('MeasurementInfo getDescription')
			return 'Point information';
		}
	}

}
export{MeasurementInfo}

////////////////////////////////////////////////////////////////////////////////////////////////
//class MeasurementGizmoInfo
////////////////////////////////////////////////////////////////////////////////////////////////

class MeasurementGizmoInfo extends MeasurementGizmo {
	constructor(  measurement, container) {
		console.log('MeasurementGizmoInfo constructor')
		super();
		this.measurement = measurement
		this.container = container
		const scope = this;
		this.selectedFace = null;
		this.selectedObject = null;
		// this.compute = null;
		this.handleGizmos = {
			'START': [
				new Mesh( new SphereGeometry( 2 ), new MeasurementGizmoMaterial( { color: 0xff0000, opacity: 0.4 } ) )
			]
		}

		this.pickerGizmos = {

		}

		this.getValue = function() {
			console.log('MeasurementGizmoInfo getValue')
			if (this.controlPoints.length < 1 || !this.selectedFace || !this.selectedObject || !this.selectedObject.geometry) return null;
			//get points in local coordinates
			var controlPoints = this.getControlPointsWorld();
			console.log('-------- controlPoints',controlPoints)
			var geometry = this.selectedObject.geometry;

			const positionAttribute = geometry.attributes.position;
			const lists =  [this.selectedFace.a,this.selectedFace.b,this.selectedFace.c]
			var facePoints = []
			for ( const elem of lists) {
				const vertex = new Vector3();
				vertex.fromBufferAttribute( positionAttribute, elem ); // read vertex
				facePoints.push(this.selectedObject.localToWorld(vertex.clone()))

			}
			console.log('-------- facePoints')
			console.log(facePoints)

			var matrixWorldInverse = new Matrix4();
			matrixWorldInverse.invert(this.selectedObject.parent.matrixWorld);
			var normalMatrix = new Matrix3().getNormalMatrix( matrixWorldInverse );
			this.compute = new computeFaceNormal(geometry, this.selectedFace);

			var normal = this.selectedFace.normal.clone().applyMatrix3( normalMatrix ).normalize();

			var results = [
				{name: 'Point' , values: [controlPoints[0].x, controlPoints[0].y, controlPoints[0].z]},
				{name: 'Face' , values: [
						{name: 'Point1' , values:[facePoints[0].x, facePoints[0].y, facePoints[0].z]},
						{name: 'Point2' , values:[facePoints[1].x, facePoints[1].y, facePoints[1].z]},
						{name: 'Point3' , values:[facePoints[2].x, facePoints[2].y, facePoints[2].z]}
					]
				},
				{name: 'Normal' , values:[normal.x, normal.y, normal.z]}
			];
			console.log('results',results)
			return results
		};

		this.acceptPoints = function() {
			// console.log('MeasurementGizmoInfo acceptPoints')
			return this.controlPoints.length < 1;
		}

		this.mustDragGizmo = function() {
			console.log('MeasurementGizmoInfo mustDragGizmo')
			return false;
		}

		this.mustSnapToPart = function() {
			console.log('MeasurementGizmoInfo mustSnapToPart')
			return this.controlPoints.length < 1;
		}

		this.update = function ( camera ) {
			console.log('MeasurementGizmoInfo update')
			//update gizmos
			if (this.isVisible()) {
				this.show();
				// updateGizmosFromControlPoints( camera );
				this.updateGizmosFromControlPoints( camera );
			} else {
				this.hide();
			}
		}

		this.init();


	}

	addControlPoint(point, object, forceAdd, face, callbackAddedObject) {
		console.log('MeasurementGizmoInfo addControlPoint')
		super.addControlPoint( point, object, forceAdd, face, callbackAddedObject)
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
		console.log('MeasurementGizmoInfo updateGizmosFromControlPoints')
		//getting width
		// var width = scope.getWidth(scope.getCenterPointWorld(), camera);
		var width = this.getWidth(this.getCenterPointWorld(), camera);
		//get control points in world coordinates
		var controlPoints = this.getControlPointsWorld();
		if(this.controlPoints.length == 1){
			var object = this.handleGizmos['START'][0];
			object.position.copy(controlPoints[0]);
			object.scale.set(width, width, width);
			object.visible = true;
		}
	}

}


export{MeasurementGizmoInfo}
