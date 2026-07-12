module.exports = ({ controller, isAuth }) => {
    const express = require('express');
    const router = express.Router();

    // Buscar productos para venta (por nombre o código)
    router.get('/productos/buscar', isAuth, controller.buscarProductos);

    // Obtener producto por código de barras
    router.get('/productos/:codigo', isAuth, controller.obtenerProductoPorCodigo);

    // Validar stock antes de venta
    router.post('/validar-stock', isAuth, controller.validarStock);

    // Crear nueva venta
    router.post('/', isAuth, controller.crearVenta);

    // Listar ventas
    router.get('/', isAuth, controller.listarVentas);

    // Nuevas rutas para historial
    router.get('/diarias', isAuth, controller.obtenerVentasDiarias);
    router.get('/total-diario', isAuth, controller.obtenerTotalDiario);

    // Imprimir ticket de venta
    router.post('/:id/print', isAuth, controller.printVenta);

    // Obtener venta específica (sin regex en la ruta para evitar incompatibilidades con la versión actual de Express)
    router.get('/:id', isAuth, controller.obtenerVenta);



    return router;
};
