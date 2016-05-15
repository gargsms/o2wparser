/**
 * @author gargsms / https://github.com/gargsms
 */

THREE.O2WLoader = function ( manager ) {

  this.manager = ( manager !== undefined ) ? manager : THREE.DefaultLoadingManager;

  this.objects = {

  };

};

THREE.O2WLoader.prototype = {

  constructor: THREE.O2WLoader,

  getBlank: function ( ) {

    return {

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

  },

  getVector3D: function ( x, y, z ) {

    return [
      x / SCALE_FACTOR || 0,
      y / SCALE_FACTOR || 0,
      z / SCALE_FACTOR || 0
    ];

  },

  getPrimitive: function ( type, diffuse, indices ) {

    var primitive = [ ];

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

    return primitive;

  },

  getInt24: function ( view, offset ) {

    var out = ( view.getUint16( offset + 1, true ) << 8 | view.getUint8( offset ) );

    if ( out & 0x800000 ) { // Negative number
      out |= ~0xffffff;
    }

    return out;

  },

  getColorByRGB: function ( map ) {
    return new THREE.Color( 'rgb(' + map.r +
      ',' + map.g +
      ',' + map.b + ')' );
  },

  getVectorByIndex: function ( url, index ) {
    var vertices = this.objects[ url ][ '3' ];
    return new THREE.Vector3( vertices[ index ][ 0 ],
      vertices[ index ][ 1 ],
      vertices[ index ][ 2 ] );
  },

  load: function ( url, onProgress ) {

    THREE.Cache.enabled = true;

    var scope = this;

    var promisify = new Promise( function ( res, rej ) {

      var loader = new THREE.XHRLoader( );

      /**
       * We define the responseType as arraybuffer because we are handling
       * binary data
       */
      loader.setResponseType( 'arraybuffer' );

      // Load the file in THREE.Cache
      loader.load( url, function ( ) {
        scope.objects[ url ] = scope.getBlank( );
        res( );
      }, onProgress, function ( ) {
        rej( );
      } );

    } );

    return promisify;

  },

  parse: function ( url ) {

    var RECURSE_MAX = 2500;
    var scope = this;

    var promisify = new Promise( function ( res, rej ) {

      var file = THREE.Cache.get( url );

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
          res( );
          return;
        }

        var objectType = view.getUint8( offset++ ),
          dest = 0;

        switch ( objectType ) {

        case 3:

          // This is the count of vertices
          count = view.getUint8( offset++ );

          for ( iterator = 0; iterator < count; iterator++ ) {

            scope.objects[ url ][ '3' ].push( scope.getVector3D(
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

          count = view.getUint8( offset + 4 );

          tempView = new DataView( file, offset + 5, count * 2 );

          dest = objectType === 11 ? 11 : 12;

          scope.objects[ url ][ dest ].push(
            scope.getPrimitive( objectType, {
              r: view.getUint8( offset + 1 ),
              g: view.getUint8( offset + 2 ),
              b: view.getUint8( offset + 3 )
            }, tempView ) );

          offset += count * 2 + 5;

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

          rej( objectType, offset );

        }
      };

      repeat( offset );
    } );

    return promisify;

  },

  render: function ( url, scene ) {

    var scope = this;

    if ( url ) {
      scope.load( url )
        .then( function ( ) {
          scope.parse( url )
            .then( function ( ) {
              var renderedObject = new THREE.Object3D( ),
                geo, mat, mesh,
                vertices = scope.objects[ url ][ '3' ];

              function drawPrimitive( primitive ) {
                primitive.forEach( function ( group ) {

                  geo = new THREE.Geometry( );

                  group.forEach( function ( indexArray, i ) {

                    geo.vertices.push( scope.getVectorByIndex( url, indexArray[ 0 ] ) );
                    geo.vertices.push( scope.getVectorByIndex( url, indexArray[ 1 ] ) );
                    geo.vertices.push( scope.getVectorByIndex( url, indexArray[ 2 ] ) );

                    geo.faces.push( new THREE.Face3( 3 * i + 1, 3 * i + 0, 3 * i + 2 ) );

                  } );

                  geo.computeFaceNormals( );

                  mat = new THREE.MeshBasicMaterial( {
                    side: THREE.DoubleSide,
                    color: scope.getColorByRGB( group.diffuse )
                  } );

                  mesh = new THREE.Mesh( geo, mat );


                  renderedObject.add( mesh );

                } );
              }

              // Iterate over the primitives and append each to the renderedObject
              if ( scope.objects[ url ][ '11' ].length ) {

                drawPrimitive( scope.objects[ url ][ '11' ] );

              }

              // TODO: Find if TriangleStripDrawMode, TriangleFanDrawMode are of any use
              // Optimize this block, or merge it in the block above if no distinction
              // in case of TriangleStrip or TriangleFan than just Triangles
              if ( scope.objects[ url ][ '12' ].length ) {

                drawPrimitive( scope.objects[ url ][ '12' ] );

              }

              scene.add( renderedObject );

              delete scope.objects[ url ];

            }, function ( objectType, offset ) {
              console.error( 'Bad object ' + objectType + ' at offset ' + offset );
            } );
        }, function ( ) {
          console.error( 'Failed to load the file' );
        } );
    }

  }

};
