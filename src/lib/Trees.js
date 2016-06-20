/**
 * @author gargsms / https://github.com/gargsms
 */

/**
 * This file appends a TREE factory to the THREE global
 * We instanciate multiple TREEs as the need be with different parameters
 */

( function ( global ) {

  global.TREE = function ( pos, height, coniferous ) {

    return TreeGeometry( pos, height, coniferous ? 0 : null );
  };

  var TreeGeometry = function ( pos, height, radiusTop ) {

    if( height < 0.5 ) {
      return null;
    }

    var tree = new global.Object3D( );
    var stemRatio = radiusTop === 0 ? 0.3 : 0.5;
    var baseSegments = 16;
    var radiusBottom = ( 1 - stemRatio ) * 0.5 * height;
    var trunkRadius = ( 1 - stemRatio ) * 0.15 * height;

    radiusTop = radiusTop === null ? radiusBottom : radiusTop;

    var trunk = new THREE.CylinderGeometry(
      trunkRadius, trunkRadius, stemRatio * height, baseSegments, 1, true );
    trunk.translate( 0, stemRatio * height / 2, 0 );

    var leaves = new THREE.CylinderGeometry(
      radiusTop, radiusBottom, ( 1 - stemRatio ) * height, baseSegments, 1, false );
    leaves.translate( 0, ( 1 + stemRatio ) * height / 2, 0 );

    var trunkMat = new THREE.MeshBasicMaterial( {
      color: new THREE.Color( 0x6b5425 )
    } );

    var leavesMat = new THREE.MeshLambertMaterial( {
      color: new THREE.Color( 0x5cb404 )
    } );

    tree.add( new THREE.Mesh( trunk, trunkMat ) );
    tree.add( new THREE.Mesh( leaves, leavesMat ) );

    tree.position.x = pos[ 0 ];
    tree.position.y = pos[ 1 ];
    tree.position.z = pos[ 2 ];

    return tree;

  };

}( THREE ) );
