#!/usr/bin/env node

/**
 * Script para probar el endpoint de impresión
 * Uso: node testPrintEndpoint.js <ventaId>
 */

const ventaId = process.argv[2];

if (!ventaId) {
    console.log('Uso: node testPrintEndpoint.js <ventaId>');
    console.log('Ejemplo: node testPrintEndpoint.js 11');
    process.exit(1);
}

console.log(`\n🧪 Probando endpoint de impresión para venta ID: ${ventaId}\n`);

const http = require('http');

const options = {
    hostname: 'localhost',
    port: 3000,
    path: `/api/ventas/${ventaId}/print`,
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    }
};

const req = http.request(options, (res) => {
    console.log(`Status: ${res.statusCode}`);
    console.log(`Headers:`, res.headers);
    
    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });
    
    res.on('end', () => {
        console.log('\n📦 Respuesta del servidor:');
        try {
            const json = JSON.parse(data);
            console.log(JSON.stringify(json, null, 2));
        } catch (e) {
            console.log(data);
        }
    });
});

req.on('error', (error) => {
    console.error('❌ Error de conexión:', error.message);
    process.exit(1);
});

req.end();

console.log('⏳ Esperando respuesta...\n');
