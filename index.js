import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';

import { fileURLToPath } from 'url';
// Bring in the ability to create the 'require' method
import { createRequire } from "module";


// construct the require method
const require = createRequire( import.meta.url );

// Solves: "__dirname is not defined in ES module scope"
const __filename = fileURLToPath( import.meta.url );
const __dirname = path.dirname( __filename );

const xml2js = require( 'xml2js' );

const parser = new xml2js.Parser(/* options */ );

//const mediaPath = path.resolve( __dirname, 'sweitzerconstruction.WordPress.2022-05-02.xml' );
const mediaPath = path.resolve( __dirname, 'test.xml' );
const mediaXml = fs.readFileSync( mediaPath );

parser.parseString( mediaXml, async function ( err, result ) {
    for ( const item of result.rss.channel[0].item ) {
        const url = ( item?.['wp:attachment_url']?.[0] ).trim();

        const image = await fetch( url );

        saveWithRelativePath( url, image );

    }
    console.log( 'Done' );
} );


function schemaFromUrl ( path ) {
    const reg = /^https?:\/\/w{3}?\.?(\w+?\.com)\/([\w\-\/]+?)\/([\w\-]+.(?:jpg|jpeg|png|tif|webp))$/g;
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
    const domainDir = path.resolve( __dirname, schema?.domain );
    if ( !fs.existsSync( domainDir ) ) fs.mkdirSync( domainDir );
    let wd = __dirname;
    for ( const dir of schema?.dirPath ) {
        const currentDir = path.resolve( wd, dir );
        if ( !fs.existsSync( currentDir ) ) fs.mkdirSync( currentDir );
        wd = currentDir;
    }
    fs.writeFileSync( path.resolve( wd, schema.fileName ), data );
}