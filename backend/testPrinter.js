#!/usr/bin/env node

const { printTicket } = require('./utils/printer');

// Ticket de ejemplo para prueba
const testSale = {
    id: 1,
    fecha: new Date().toLocaleString('es-MX'),
    usuario: 'Admin',
    productos: [
        {
            nombre: 'Consulta Veterinaria',
            cantidad: 1,
            precio_unitario: 500.00,
            subtotal: 500.00
        },
        {
            nombre: 'Medicamento A',
            cantidad: 2,
            precio_unitario: 150.00,
            subtotal: 300.00
        }
    ],
    total: 800.00
};

console.log('🖨️  Iniciando prueba de impresora...\n');
console.log('Datos del ticket:', JSON.stringify(testSale, null, 2));
console.log('\n---\n');

printTicket(testSale).then((result) => {
    if (result.success) {
        console.log('\n✅ Prueba completada:', result.message);
        if (result.path) {
            console.log('📄 Ubicación:', result.path);
        }
    } else {
        console.log('\n❌ Error en la prueba:', result.message);
    }
}).catch((err) => {
    console.error('\n❌ Error inesperado:', err);
    process.exit(1);
});
