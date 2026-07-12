const express = require('express');

module.exports = ({ controller, isAuth }) => {
    const router = express.Router();

    router.get('/', isAuth, controller.listarProductos);
    router.get('/inactivos', isAuth, controller.listarInactivos);
    router.get('/codigo/:codigo', isAuth, controller.obtenerPorCodigo);
    router.post('/', isAuth, controller.crearProducto);
    router.post('/id/:id/restaurar', isAuth, controller.restaurarProducto);
    router.delete('/id/:id/permanente', isAuth, controller.eliminarPermanenteProducto);
    router.get('/id/:id', isAuth, controller.obtenerPorId);
    router.put('/id/:id', isAuth, controller.actualizarProducto);
    router.delete('/id/:id', isAuth, controller.darDeBajaProducto);

    return router;
};
