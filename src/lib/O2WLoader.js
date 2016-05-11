/**
 * @author gargsms / https://github.com/gargsms
 */

THREE.O2WLoader = function ( manager ) {

  this.manager = ( manager !== undefined ) ? manager : THREE.DefaultLoadingManager;

  this.objects = {

    /**
     * 3 : Vector 3D. These are origin vectors which can be referenced later
     *
     * 11 : Triangles. A group of triangles with similar properties.
     *
     * 12: Triangle_Strip, Triangle_Fan or Convex_Polygon. Doesn't really
     *     matter much because they are identical to parse and draw.
     *     For each of the objects in this list, we will add a type property
     */

    '3': [ ],

    '11': [ ],

    '12': [ ]

  };

}

THREE.O2WLoader.prototype = {

  constructor: THREE.O2WLoader,

  load: function ( url, onProgress, onError ) {

    THREE.Cache.enabled = true;

    var loader = new THREE.XHRLoader( );

    /**
     * We define the responseType as arraybuffer because we are handling
     * binary data
     * TODO: Discuss on CORS
     */

    loader.setResponseType( 'arraybuffer' );

    // Load the file in THREE.Cache
    loader.load( url, function ( ) {}, onProgress, onError );

  },

  parse: function ( url ) {

    var scope = this;

    var openPromise = new Promise( function ( res, rej ) {
      var file = THREE.Cache.get( url );
      if ( file ) {
        res( file );
      } else {
        rej( );
      }
    } );

    openPromise.then( function ( file ) {

        var RECURSE_MAX = 2500;

        /**
         * Get a view on this ArrayBuffer
         */

        var view = new DataView( file );

        var count = 0,
          offset = 0,
          iterator = 0;

        var tempView;

        /**
         * Counter to be reset at RECURSE_MAX for the repeat function
         */
        var recurseCount = 0;

        /**
         * Begin parsing the file
         * Start with zero offset and work on the way up
         * Based on the object type, calculate the distance to another object
         * Insert relevant data into this.objects
         */

        var repeat = function ( offset ) {

          recurseCount++;

          if ( offset >= view.byteLength ) {
            // Clear the Cached file
            THREE.Cache.remove( url );
            return;
          }

          var objectType = view.getUint8( offset++ );

          switch ( objectType ) {

          case 3:

            // This is the count of vertices
            count = view.getUint8( offset++ );

            for ( iterator = 0; iterator < count; iterator++ ) {

              scope.objects[ '3' ].push( scope.getVector3D(
                scope.getInt24( view, offset ),
                scope.getInt24( view, offset + 3 ),
                scope.getInt24( view, offset + 6 )
              ) );

              offset += 9;

            }

            /**
             * Call repeat with the incremented offset
             */
            if ( RECURSE_MAX > recurseCount ) {
              repeat( offset );
            } else {
              setTimeout( function ( ) {
                recurseCount = 0;
                repeat( offset );
              }, 0 );
            }

            break;

          case 11:
          case 12:
          case 13:
          case 14:

            count = view.getUint8( offset + 7 );

            tempView = new DataView( file, offset + 8, count * 2 );

            scope.getPrimitive( objectType, {
              r: view.getUint8( offset + 1 ),
              g: view.getUint8( offset + 2 ),
              b: view.getUint8( offset + 3 )
            }, {
              r: view.getUint8( offset + 4 ),
              g: view.getUint8( offset + 5 ),
              b: view.getUint8( offset + 6 )
            }, tempView );

            offset += count * 2 + 8;

            if ( RECURSE_MAX > recurseCount ) {
              repeat( offset );
            } else {
              setTimeout( function ( ) {
                recurseCount = 0;
                repeat( offset );
              }, 0 );
            }

            break;

          default:

            console.error( 'Bad block ' + objectType + ' at offset ' + offset );

          }
        };

        repeat( offset );

      },
      function ( ) {
        console.log( ':(' );
      } );
  },

  getVector3D: function ( x, y, z ) {

    return [
      x || 0,
      y || 0,
      z || 0
    ];

  },

  getPrimitive: function ( type, ambient, diffuse, indices ) {

    var dest = type === 11 ? 11 : 12;

    var primitive = [ ];

    primitive.ambient = ambient;
    primitive.diffuse = diffuse;
    primitive.type = type;

    var count = indices.byteLength,
      offset = 0,
      a, b, c;

    switch ( type ) {
    case 11:
      for ( ; offset < count; offset += 2 ) {
        a = indices.getUint16( offset, true );
        b = indices.getUint16( offset += 2, true );
        c = indices.getUint16( offset += 2, true );
        if ( !( a === b || b === c || c === a ) ) {
          primitive.push( [
            a,
            b,
            c
          ] );
        }
      }
      break;
    case 12:
      for ( ; offset < count - 4; offset += 2 ) {
        a = indices.getUint16( offset, true );
        b = indices.getUint16( offset + 2, true );
        c = indices.getUint16( offset + 4, true );
        if ( !( a === b || b === c || c === a ) ) {
          if ( offset % 4 ) {
            primitive.push( [
              a,
              c,
              b
            ] );
          } else {
            primitive.push( [
              a,
              b,
              c
            ] );
          }
        }
      }
      break;
    case 13:
    case 14:
      a = indices.getUint16( offset, true );
      for ( ; offset < count - 4; offset += 2 ) {
        b = indices.getUint16( offset + 2, true );
        c = indices.getUint16( offset + 4, true );
        if ( !( a === b || b === c || c === a ) ) {
          primitive.push( [
              a,
              b,
              c
            ] );
        }
      }
      break;
    }



    this.objects[ dest ].push( primitive );

  },

  getInt24: function ( view, offset ) {

    var out = ( view.getUint16( offset + 1, true ) << 8 | view.getUint8( offset ) );

    if ( out & 0x800000 ) { // Negative number
      out |= ~0xffffff;
    }

    return out;

  }

}
