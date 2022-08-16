# 3dViewMeasurement
This repository is an update of 3DView.Measurements with the last threejs library (release 142)

conversion process :

    * convert class to es6
    
    * change deprecated method 


# 3DView.Measurements
Advanced JavaScript 3D models viewing control with interactive measurements

### Description ###
3D viewing control with interactive measurements based on [Three.js] (http://threejs.org/).

Supports:
 * All modern browsers (including mobile)
 * WebGL or Canvas rendering
 * all type of loader (ply and stl tested, show example html file)
 * Point info and distance measurements (feel free to develop thickness, angle and radius measurements :smiley: :boom:)
 * Getting information about selected point on a 3D model (coordinates, face, normal)
	


### License ###
[LGPL v3] (https://github.com/ismailazdad/3dViewMeasurement/LICENSE)

Author: ismail azdad / ismail.azdad@gmail.com

### Usage ###

[Live sample] ()

Link all necessary JS files from Three.js r142 (included)  
```html
<script async src="https://unpkg.com/es-module-shims@1.3.6/dist/es-module-shims.js"></script>

<script type="importmap">
			{
				"imports": {
					"three": "./js/dependencies/three.module.js"
				}
			}
</script>
<script src="js/dependencies/ui.js"></script>
```

Link all necessary JS files in module :
```html
<script type="module">
    import * as THREE from 'three';
    import {
        PerspectiveCamera,
        WebGLRenderer,
        sRGBEncoding,
        HemisphereLight
    } from 'three';
    import {OrbitControls} from './js/dependencies/OrbitControls.js';
    import {TrackballControls} from './js/dependencies/TrackballControls.js';
    import {STLLoader} from './js/dependencies/STLLoader.js';
    import {PLYLoader} from './js/dependencies/PLYLoader.js';
    import {View3D} from './js/3DView2/3DView.Measurements.js';
    import {MeasurementInfo} from './js/3DView2/measurements/Measurement.Info.js';
    import {MeasurementDistance} from './js/3DView2/measurements/Measurement.Distance.js';
   </script>
```
		
This code creates creates a renderer; loads the STL file; request the user to add a measurement and listens to measurement events.

```html
<script>

    let container, stats, camera, scene, renderer, controls;
    container = document.createElement('div');
    document.body.appendChild(container);
    camera = new PerspectiveCamera(35, window.innerWidth / window.innerHeight, 1, 15);
    camera.position.set(3, 0.15, 3);
    // renderer
    renderer = new WebGLRenderer({antialias: true});
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputEncoding = sRGBEncoding;
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);
    //set controls
    //you can use the type of controls you want TrackballControls,OrbitControls...
    const control = new OrbitControls(camera, renderer.domElement);
    control.enableDamping = true;
    control.dampingFactor = 0.25;
    control.enableZoom = true;
	//set view
     var view = new View3D(
        document.getElementById( 'container' ), 
        renderer, 
        control,
        camera);
	
	//load STL file from URL
    const loader = new STLLoader();
    // //load STL file
    // for STL object you can use addGeometry method or adding object directly
    loader.load('./models/Box.stl', function (geometry) {
        view.addGeometry( geometry );
    });
	
	//other method load STL file from URL
    loader.load('./models/Box.stl', function (geometry) {
        const material = new THREE.MeshPhongMaterial({color: 0xff5533, specular: 0x111111, shininess: 200});
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(-0.7, -0.7, -0.7);
        mesh.scale.set(0.15, 0.15, 0.15);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        view.scene.add(mesh)
    });

	//request user to make new measurement
    var element=document.getElementById("infobutton");
    var listener=element.addEventListener('click',function(event){
        view.addMeasurement(new MeasurementInfo());
    });

    var element=document.getElementById("clearbutton");
    var listener=element.addEventListener('click',function(event){
        view.clearMeasurements();
    });

    var element=document.getElementById("distancebutton");
    var listener=element.addEventListener('click',function(event){
        view.addMeasurement(new MeasurementDistance());
    });

	//.....
	
	//events
	
	//on measurement added
	view.addEventListener( 'measurementAdded', function (event) {

		//measurement is added after user picks 1st point on the 3D model
		
		var measurement = event.object;
		//....
			
		
	} );

	//on measurement changed
	view.addEventListener( 'measurementChanged', function (event) {

		//measurement has changed
		
		var measurement = event.object;
		if (measurement) {
			// measurement.getType(); 
			// measurement.getValue();
			// measurement.getInfo();
		}
		//....
		
	} );

	//on measurement removed
	view.addEventListener( 'measurementRemoved', function (event) {

		//measurement is removed
	
		var measurement = event.object;
		//....
		
	} );

</script>
```

