const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// NO cachear la configuración - leerla cada vez que se necesite
function getPrinterConfig() {
    // Borrar el cache para asegurar que se lee la configuración actualizada
    delete require.cache[require.resolve('../config/printer.js')];
    return require('../config/printer.js');
}

const printsDir = path.join(__dirname, '..', 'prints');
if (!fs.existsSync(printsDir)) fs.mkdirSync(printsDir, { recursive: true });

function formatTicket(sale) {
    const width = 48; // 80mm = 48 caracteres aproximadamente
    
    function center(text, w = width) {
        const padding = Math.max(0, w - text.length);
        return ' '.repeat(Math.floor(padding / 2)) + text + ' '.repeat(Math.ceil(padding / 2));
    }

    function line(char = '=') {
        return char.repeat(width);
    }

    function padRight(text, w = width) {
        return text.padEnd(w, ' ');
    }

    const lines = [];
    lines.push(center('*** CLINICA VET ***'));
    lines.push(line());
    lines.push(`TICKET #${sale.id || '---'}`);
    lines.push(`Fecha: ${sale.fecha || ''}`);
    lines.push(`Usuario: ${sale.usuario || ''}`);
    lines.push(line('-'));
    lines.push('PRODUCTOS:');
    lines.push('');

    if (Array.isArray(sale.productos) && sale.productos.length > 0) {
        sale.productos.forEach(p => {
            const nombre = p.nombre || 'Producto';
            const cantidad = p.cantidad || 0;
            const precio = p.precio_unitario ?? p.precio ?? 0;
            const subtotal = p.subtotal ?? (cantidad * precio);
            
            // Formato: Nombre (truncado)
            const nombreTrunc = nombre.length > 32 ? nombre.substring(0, 29) + '...' : nombre;
            lines.push(padRight(nombreTrunc));
            
            // Formato: Cantidad x Precio = Subtotal
            const qtyPrice = `${cantidad}x$${Number(precio).toFixed(2)}`;
            const subTotal = `$${Number(subtotal).toFixed(2)}`;
            const spacing = width - qtyPrice.length - subTotal.length;
            lines.push(qtyPrice + ' '.repeat(Math.max(1, spacing)) + subTotal);
            lines.push('');
        });
    } else {
        lines.push(padRight('No hay productos'));
    }

    lines.push(line('-'));
    const totalLabel = 'TOTAL:';
    const totalValue = `$${Number(sale.total ?? 0).toFixed(2)}`;
    const totalSpacing = width - totalLabel.length - totalValue.length;
    lines.push(totalLabel + ' '.repeat(Math.max(1, totalSpacing)) + totalValue);
    lines.push(line());
    lines.push(center('Gracias por su compra'));
    lines.push('');

    return lines.join('\n');
}

async function printTicket(sale) {
    console.log('\n=== PRINT TICKET ===');
    console.log('Datos de venta recibidos:', JSON.stringify(sale, null, 2));
    
    // Obtener configuración fresca (no cacheada)
    const printerConfig = getPrinterConfig();
    
    // Try to use node-thermal-printer if available
    const interfaceStr = printerConfig.interface || process.env.PRINTER_INTERFACE || null;
    const printerName = printerConfig.printerName || 'POS-80';
    console.log('Printer interface:', interfaceStr || 'not configured (will save ticket to file)');
    console.log('Printer name:', printerName);
    console.log('Platform:', process.platform);
    
    try {
        if (interfaceStr) {
            try {
                console.log('Intentando usar node-thermal-printer...');
                const { ThermalPrinter, PrinterTypes } = require('node-thermal-printer');
                const printer = new ThermalPrinter({ 
                    type: PrinterTypes.STAR, 
                    interface: interfaceStr,
                    options: { timeout: 5000 }
                });

                // Aumentar densidad de impresión
                printer.setCharacterSet('ARÁBIC');
                printer.setLineCharacterSpacing(0);
                printer.setLineSpacing(30);
                
                // Imprimir ticket con mejor formato
                const ticket = formatTicket(sale);
                const lines = ticket.split('\n');
                lines.forEach(line => {
                    printer.println(line);
                });
                
                printer.cut();
                const executeResult = await printer.execute();
                console.log('✅ Impresión completada exitosamente con node-thermal-printer');
                return { success: true, message: 'Enviado a impresora', result: executeResult };
            } catch (e) {
                // If thermal printer fails, try PowerShell on Windows
                console.warn('⚠️ Fallo con node-thermal-printer:', e.message);
                if (process.platform === 'win32') {
                    console.log('Intentando usar PowerShell en Windows...');
                    try {
                        const ticketText = formatTicket(sale);
                        const tempFile = path.join(printsDir, `ticket_${Date.now()}_temp.txt`);
                        console.log('Archivo temporal:', tempFile);
                        fs.writeFileSync(tempFile, ticketText, 'utf8');
                        
                        // Use PowerShell to print on Windows
                        const escapedFile = tempFile.replace(/\\/g, '\\\\');
                        const psCmd = `Get-Content '${escapedFile}' | Out-Printer -Name '${printerName}'`;
                        console.log('Ejecutando comando PowerShell...');
                        console.log('Comando:', psCmd);
                        execSync(`powershell -Command "${psCmd}"`, { stdio: 'pipe' });
                        
                        // Clean up temp file after printing
                        setTimeout(() => {
                            try { fs.unlinkSync(tempFile); } catch (e) {}
                        }, 500);
                        
                        console.log('✅ Impresión completada vía PowerShell');
                        return { success: true, message: 'Enviado a impresora (PowerShell)', result: null };
                    } catch (psError) {
                        console.warn('⚠️ Fallo con PowerShell:', psError.message);
                        console.error('Detalles del error:', psError);
                    }
                }
            }
        }

        // Fallback: write ticket text file to prints directory
        console.log('Guardando ticket en archivo como fallback...');
        const ticketText = formatTicket(sale);
        const filename = `ticket_${sale.id || Date.now()}.txt`;
        const filePath = path.join(printsDir, filename);
        fs.writeFileSync(filePath, ticketText, 'utf8');
        console.log('💾 Ticket guardado en:', filePath);
        return { success: true, message: 'Ticket guardado en archivo', path: filePath };
    } catch (error) {
        console.error('Error en printTicket:', error);
        return { success: false, message: error.message };
    }
}

module.exports = { formatTicket, printTicket };
