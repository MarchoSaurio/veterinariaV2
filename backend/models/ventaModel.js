// Modelo para operaciones de ventas
// Este archivo mantiene consistencia con la estructura del proyecto
// pero la lógica principal está en el controlador

module.exports = (db) => {

    function crearVenta(ventaData) {
        return new Promise((resolve, reject) => {
            const { fecha, total, usuario_id } = ventaData;

            db.run(
                `INSERT INTO ventas (fecha, total, usuario_id, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?)`,
                [fecha, total, usuario_id, fecha, fecha],
                function (err) {
                    if (err) reject(err);
                    else resolve(this.lastID);
                }
            );
        });
    }

    function crearDetalleVenta(detalleData) {
        return new Promise((resolve, reject) => {
            const { venta_id, producto_id, cantidad, precio_unitario, subtotal, fecha } = detalleData;

            db.run(
                `INSERT INTO detalle_venta
                (venta_id, producto_id, cantidad, precio_unitario, subtotal, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [venta_id, producto_id, cantidad, precio_unitario, subtotal, fecha, fecha],
                function (err) {
                    if (err) reject(err);
                    else resolve(this.lastID);
                }
            );
        });
    }

    function actualizarStock(producto_id, cantidad, fecha) {
        return new Promise((resolve, reject) => {
            db.run(
                `UPDATE productos SET stock = stock - ?, updated_at = ? WHERE id = ?`,
                [cantidad, fecha, producto_id],
                function (err) {
                    if (err) reject(err);
                    else resolve(this.changes);
                }
            );
        });
    }

    function obtenerVentaPorId(id) {
        return new Promise((resolve, reject) => {
            db.get(
                `SELECT v.*, u.username
                 FROM ventas v
                 JOIN usuarios u ON v.usuario_id = u.id
                 WHERE v.id = ?`,
                [id],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                }
            );
        });
    }

    function obtenerDetallesVenta(venta_id) {
        return new Promise((resolve, reject) => {
            db.all(
                `SELECT dv.*, p.nombre, p.codigo_barras
                 FROM detalle_venta dv
                 JOIN productos p ON dv.producto_id = p.id
                 WHERE dv.venta_id = ?`,
                [venta_id],
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                }
            );
        });
    }

    function obtenerVentasPorRangoFechas(fechaInicio, fechaFin) {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT
                    v.id,
                    v.fecha,
                    v.total,
                    u.username as usuario,
                    COUNT(dv.id) as num_productos
                FROM ventas v
                JOIN usuarios u ON v.usuario_id = u.id
                LEFT JOIN detalle_venta dv ON v.id = dv.venta_id
                WHERE v.fecha >= ? AND v.fecha <= ?
                GROUP BY v.id, v.fecha, v.total, u.username
                ORDER BY v.fecha DESC
            `;
            db.all(sql, [fechaInicio, fechaFin], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    function obtenerResumenDiario(fecha) {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT 
                    DATE(v.fecha) as dia,
                    COUNT(DISTINCT v.id) as num_ventas,
                    SUM(v.total) as total_vendido,
                    AVG(v.total) as promedio_venta
                FROM ventas v
                WHERE DATE(v.fecha) = ?
                GROUP BY DATE(v.fecha)
            `;
            db.get(sql, [fecha], (err, row) => {
                if (err) reject(err);
                else resolve(row || { dia: fecha, num_ventas: 0, total_vendido: 0, promedio_venta: 0 });
            });
        });
    }

    function obtenerVentasDelDia() {
        return new Promise((resolve, reject) => {
            const hoy = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
            obtenerVentasPorRangoFechas(hoy, hoy).then(ventas => {
                resolve(ventas);
            }).catch(reject);
        });
    }

    return {
        crearVenta,
        crearDetalleVenta,
        actualizarStock,
        obtenerVentaPorId,
        obtenerDetallesVenta,
        obtenerVentasPorRangoFechas,
        obtenerResumenDiario,
        obtenerVentasDelDia
    };
};
