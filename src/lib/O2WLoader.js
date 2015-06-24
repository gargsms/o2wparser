/**
 * @author gargsms / https://github.com/gargsms
 */

THREE.O2WLoader = function ( manager ) {

  this.manager = ( manager !== undefined ) ? manager : THREE.DefaultLoadingManager;

  this.objects = {

    /*
     * 3 : Vector 3D. These are origin vectors which can be referenced later
     *
     * 11 : Triangles. A group of triangles with similar properties.
     *
     */

    '3': [],

    '11': []

  };

}

THREE.O2WLoader.prototype = {

  constructor: THREE.O2WLoader,

  load: function ( url, onProgress, onError ) {

    var loader = new THREE.XHRLoader();

    /**
     * We define the responseType as arraybuffer because we are handling
     * binary data
     * TODO: Discuss on CORS
     */

    loader.setResponseType( 'arraybuffer' );

    // Load the file in THREE.Cache
    loader.load( url, function () {}, onProgress, onError );

  },

  parse: function ( url ) {

    var scope = this;

    var openPromise = new Promise( function ( res, rej ) {
      var file = THREE.Cache.get( url );
      if ( file ) {
        res( file );
      } else {
        rej();
      }
    } );

    openPromise.then( function ( file ) {

        /*
         * Get a view on this ArrayBuffer
         */

        var view = new DataView( file );

        var count = 0,
          index = 0,
          iterator = 0;

        var tempView;

        /*
         * Begin parsing the file
         * Start with zero offset and work on the way up
         * Based on the object type, calculate the distance to another object
         * Insert relevant data into this.objects
         */

        var repeat = function ( index ) {

          var objectTypeCurrent = view.getUint8( index++ );

          if ( objectTypeCurrent === undefined )
            return;

          switch ( objectTypeCurrent ) {

          case 3:

            // This is the count of vertices
            count = view.getUint8( index++ );

            for ( iterator = 0; iterator < count; iterator++ ) {

              scope.objects[ '3' ].push( scope.getVector3D(
                scope.getInt24( view, index ),
                scope.getInt24( view, index + 3 ),
                scope.getInt24( view, index + 6 )
              ) );

              index += 9;

            }

            /*
             * Call repeat with the incremented index
             */

            repeat( index );

            break;

          case 11:

            count = view.getUint8( index + 9 );

            tempView = new DataView( file, index + 10, count * 2 * 3 );

            scope.objects[ '11' ].push( scope.getTriangleGroup( {
              r: view.getUint8( index++ ).toString( 16 ),
              g: view.getUint8( index++ ).toString( 16 ),
              b: view.getUint8( index++ ).toString( 16 )
            }, {
              r: view.getUint8( index++ ).toString( 16 ),
              g: view.getUint8( index++ ).toString( 16 ),
              b: view.getUint8( index++ ).toString( 16 )
            }, {
              r: view.getUint8( index++ ).toString( 16 ),
              g: view.getUint8( index++ ).toString( 16 ),
              b: view.getUint8( index++ ).toString( 16 )
            }, tempView ) );

            index += count * 2 * 3;

            repeat( index );

            break;

          default:

          }
        };

        repeat( index );

      },
      function () {
        console.log( ':(' );
      } );
  },

  render: function () {},

  getVector3D: function ( x, y, z ) {

    return [
      x,
      y,
      z
    ];

  },

  getTriangleGroup: function ( ambient, diffuse, specular, vertices ) {

    var triangle = [];

    triangle.ambient = ambient;
    triangle.diffuse = diffuse;
    triangle.specular = specular;

    var count = vertices.byteLength,
      index = 0;

    for ( ; index < count; index += 2 ) {
      triangle.push( [
        vertices.getInt16( index, true ),
        vertices.getInt16( index += 2, true ),
        vertices.getInt16( index += 2, true )
      ] );
    }

    return triangle;

  },

  getInt24: function ( view, index ) {

    return ( view.getInt16( index, true ) << 8 ) | ( view.getInt8( index + 2 ) );

  }

}
