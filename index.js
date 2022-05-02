import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';

import { fileURLToPath } from 'url';
// Bring in the ability to create the 'require' method
import { createRequire } from "module";

// construct the require method
const require = createRequire( import.meta.url );

const backoff = require( 'oibackoff' ).backoff( {
    algorithm: 'exponential',
    delayRatio: 0.4,
    maxTries: 6,
} );

// Solves: "__dirname is not defined in ES module scope"
const __filename = fileURLToPath( import.meta.url );
const __dirname = path.dirname( __filename );

const xml2js = require( 'xml2js' );

const parser = new xml2js.Parser(/* options */ );

const mediaPath = path.resolve( __dirname, 'sweitzerconstruction.WordPress.2022-05-02.xml' );
const mediaXml = fs.readFileSync( mediaPath );

parser.parseString( mediaXml, async function ( err, result ) {
    console.log( `Processing ${result.rss.channel[0].item
        .length} items . . .` );
    for ( const item of result.rss.channel[0].item ) {
        const getImage = async () => {
            const url = ( item?.['wp:attachment_url']?.[0] ).trim();
            const image = await ( await ( await fetch( url ) )?.blob() )?.arrayBuffer();
            if ( !url || !image ) {
                console.error( 'Failed on: ', url, image );
                return;
            }
            saveWithRelativePath( url, toBuffer( image ) );
        };
        backoff( getImage, ( err, addresses, priorErrors ) => {
            if ( err ) {
                // do something to recover from this error
                return;
            }
            // do something with addresses
            console.log( addresses );
        } );
    }
} );

function toBuffer ( ab ) {
    const buf = Buffer.alloc( ab.byteLength );
    const view = new Uint8Array( ab );
    for ( let i = 0; i < buf.length; ++i ) {
        buf[i] = view[i];
    }
    return buf;
}

function schemaFromUrl ( path ) {
    const reg = /^https?:\/\/w{3}?\.?(\w+?\.com)\/([\w\-\/]+?)\/([\w\-\.]+.(?:jpg|jpeg|png|tif|webp))$/g;
    let matches = [];
    const match = reg.exec( path );
    if ( match !== null ) {
        return {
            domain: match?.[1],
            dirPath: match?.[2].split( '/' ),
            fileName: match?.[3]
        };
    }
    return null;
}


function saveWithRelativePath ( url, data ) {
    const schema = schemaFromUrl( url );
    if ( !schema ) {
        console.log( `Failed to schematize ${url} !` );
        return;
    }
    const domainDir = path.resolve( __dirname, schema.domain );
    if ( !fs.existsSync( domainDir ) ) fs.mkdirSync( domainDir );
    let wd = domainDir;
    for ( const dir of schema?.dirPath ) {
        const currentDir = path.resolve( wd, dir );
        if ( !fs.existsSync( currentDir ) ) fs.mkdirSync( currentDir );
        wd = currentDir;
    }
    fs.writeFileSync( path.resolve( wd, schema.fileName ), data );
}