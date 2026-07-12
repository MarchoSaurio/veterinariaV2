// Configuración de impresora. Puedes editar la cadena aquí
// o establecer la variable de entorno PRINTER_INTERFACE.
// Ejemplos:
// - TCP: "tcp://192.168.1.100:9100"
// - Device Linux: "file:///dev/usb/lp0"
// - Windows printer name: "printer:NombreDeImpresoraWindows"

module.exports = {
    interface: process.env.PRINTER_INTERFACE || 'printer:POS-80',
    printerName: 'POS-80'
};
