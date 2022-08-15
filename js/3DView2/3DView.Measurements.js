import {
	Color,
	DoubleSide,
	EventDispatcher,
	FlatShading,
	Fog,
	Mesh,
	MeshPhongMaterial,
	PointLight,
	Scene,
	TorusGeometry,
	Vector2,
	Vector3
} from 'three';
// import * as THREE from 'three';
import {MeasurementControls} from './measurements/MeasurementControls.js';
import {Measurement} from './measurements/Measurement.js';
import {DragControls} from '../dependencies/DragControls.js';


class View3D extends EventDispatcher {
	constructor(dom, renderer, control,camera) {
		super();
		var scene = new Scene();
		scene.background = new Color('#ffffff');
		scene.fog = new Fog(0x72645b, 2, 15);
		this.scene = scene;
		this.dom = dom;
		this.renderer = renderer;
		this.controls = control;
		this.camera = camera;
		///////////////////////////private section
		const scope = this;
		const container = new UI.Panel().setPosition('absolute');
		var measurementControls,light;

		this.addMeasurement = function (measurement) {
			console.log('View3D addMeasurement')
			measurementControls.add(measurement);
			measurementControls.enabled = true;
		}

		this.removeMeasurement = function (measurement) {
			console.log('View3D removeMeasurement')
			measurementControls.remove(measurement);
			if (measurement.parent)
				measurement.parent.remove(measurement);
		}

		this.addObject = function (mesh) {
			console.log('View3D addObject')
			if (!(mesh instanceof Mesh))
				return null;

			var geometry = mesh.geometry;
			var boundingSphere = geometry.boundingSphere.clone();

			mesh.rotateX(-Math.PI / 2);
			mesh.updateMatrixWorld();
			scene.add(mesh);
			var center = mesh.localToWorld(boundingSphere.center);

			scope.controls.target.copy(center);
			scope.controls.minDistance = boundingSphere.radius * 0.5;
			scope.controls.maxDistance = boundingSphere.radius * 3;
			camera.position.set(0, 0, boundingSphere.radius * 0.5).add(center);
			camera.lookAt(center);



		}

		this.addGeometry = function(geometry) {

			console.log('View3D addGeometry')

			var material =  (geometry.hasColors)
				?
				new MeshPhongMaterial( { specular: 0x111111, emissive: 0X151515, color:  0xff5533, shininess:20, side: DoubleSide,  opacity: geometry.alpha, vertexColors: true, flatShading: FlatShading } )
				:
				new MeshPhongMaterial( { specular: 0x111111, emissive: 0X050505, color:  0xff5533, shininess:20, side: DoubleSide, flatShading: FlatShading } );

			const mesh = new Mesh(geometry, material);

			mesh.position.set(-0.7, -0.7, -0.7);
			mesh.scale.set(0.15, 0.15, 0.15);
			mesh.castShadow = true;
			mesh.receiveShadow = true;
			mesh.normalsNeedUpdate=true;
			mesh.center = true;
			// geometry.computeFaceNormals()

			geometry.computeBoundingSphere();
			// return this.scene.add(mesh)
			return this.addObject(mesh);
		}



		this.clear = function() {
			console.log('View3D clear')
			while (scene.children.length)
				scene.remove(scene.children[0]);
		}

		this.clearMeasurements = function() {
			console.log('View3D clearMeasurements')
			for (var key in scene.children) {
				var measurements = [];
				scene.children[key].traverse( function ( child ) {
					if ( child instanceof Measurement )
						measurements.push(child);
				} );
			}

			for (var key in measurements) {
				this.removeMeasurement(measurements[key]);
			}

		}



		function init() {
			console.log('View3D init')
			dom = dom ? dom : window;
			dom.appendChild(container.dom);
			container.dom.appendChild( renderer.domElement );
			console.log('container')
			console.log(container)
			//controls
			scope.controls = control
			scope.controls.enableDamping = true;
			scope.controls.dampingFactor = 0.25;
			scope.controls.enableZoom = true;

			// lights
			light = new PointLight( 0xFFFFFF, 1, 0 );
			scene.add( light );



			// measurement controls
			measurementControls = new MeasurementControls({objects: scene.children}, camera, container);
			measurementControls.enabled = true;
			measurementControls.snap = true;

			scope.controls.addEventListener( 'change', function () {
				measurementControls.update();
				render();
			} );

			measurementControls.addEventListener( 'change', function (event) {
				console.log('View3D MeasurementControls change')
				scope.dispatchEvent( {type: "measurementChanged", object: event.object} );
				render();
			} );

			measurementControls.addEventListener( 'objectAdded', function (event) {
				console.log('View3D MeasurementControls objectAdded')
				scope.dispatchEvent( { type: "measurementAdded", object: event.object } );
				render();
			} );
			measurementControls.addEventListener( 'objectRemoved', function (event) {
				console.log('View3D MeasurementControls objectRemoved')
				scope.dispatchEvent( { type: "measurementRemoved", object: event.object } );
			} );

			scene.add( measurementControls );

			//window
			window.addEventListener( 'resize', onWindowResize, false );
			onWindowResize();

		}




		function onWindowResize() {
			camera.aspect = dom.offsetWidth / dom.offsetHeight;
			camera.updateProjectionMatrix();
			renderer.setSize( dom.offsetWidth, dom.offsetHeight );
			measurementControls.update();
		}

		function animate() {
			requestAnimationFrame( animate );
			scope.controls.update();
			light.position.copy(camera.position);
			render();
		}

		function render() {
			renderer.render( scene, camera );
		}



		init();
		animate();

	}


}
export { View3D };



///////////////////////////////////////////////////////////////////////////////
//Service functions
///////////////////////////////////////////////////////////////////////////////

function projectPointToVector(point, vectorOrigin, vector) {

	return new Vector3().copy(point).sub(vectorOrigin).projectOnVector(vector).add(vectorOrigin);

}

function projectPointToPlane(point, planeOrigin, planeNormal) {

	return new Vector3().copy(point).sub(planeOrigin).projectOnPlane(planeNormal).add(planeOrigin);

}

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

function CircleFitting() {
	this.radius = -1;
	this.center = new Vector3();
	this.normal = new Vector3();

	this.fitPoints = function(pt1, pt2, pt3) {
		var bc = new Vector3().subVectors( pt2, pt3 );
		var ab = new Vector3().subVectors( pt1, pt2 );
		this.normal.copy(bc).cross(ab);
		this.radius = -1;

		if (this.normal.length() > 0.0001) {
			this.normal.normalize();
			var na = new Vector3().copy(ab).cross(this.normal);
			var nc = new Vector3().copy(bc).cross(this.normal);
			var ca = new Vector3().addVectors( pt1, pt2 ).divideScalar(2);
			var cc = new Vector3().addVectors( pt2, pt3 ).divideScalar(2);
			var intersection1 = linePlaneIntersection(cc, nc, ca, ab);
			var intersection2 = linePlaneIntersection(ca, na, cc, bc);
			if (intersection1 && intersection2)
				this.center = intersection1.add(intersection2).divideScalar(2);
			else if (intersection1)
				this.center = intersection1;
			else if (intersection2)
				this.center = intersection2;
			else return false;

			this.radius = (this.center.distanceTo(pt1) + this.center.distanceTo(pt2) + this.center.distanceTo(pt3)) /3;
			return true;
		}
		return false;

	}

}



class computeFaceNormal  {

	constructor(geometry,face) {
		console.log('passage constructor computeFaceNormal');
		console.log('face',face)

		var cb = new Vector3(), ab = new Vector3();
		if (!face)
			return cb;
		//new method
		const positionAttribute = geometry.attributes.position;
		const vertex = new Vector3();
		var vA = vertex.fromBufferAttribute( positionAttribute, face.a  );
		var vB =vertex.fromBufferAttribute( positionAttribute, face.b  );
		var vC =vertex.fromBufferAttribute( positionAttribute, face.c  );

		cb.subVectors( vC, vB );
		ab.subVectors( vA, vB );
		cb.cross( ab );

		cb.normalize();

		face.normal.copy( cb );
		return face.normal;
	}
}

export {computeFaceNormal};


