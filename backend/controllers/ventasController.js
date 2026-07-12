module.exports = (db, now) => {

    function parseNumber(value) {
        if (value === undefined || value === null || value === '') return null;
        const number = Number(value);
        return Number.isFinite(number) ? number : NaN;
    }

    function validateSaleData(body) {
        console.log('\n=== VALIDAR DATOS VENTA ===');
        console.log('Body completo:', JSON.stringify(body, null, 2));

        const errors = [];
        const { productos = [], total, metodo_pago, cantidad_pagada, cambio, referencia } = body;

        console.log('metodo_pago recibido:', metodo_pago, '| tipo:', typeof metodo_pago);

        if (!Array.isArray(productos) || productos.length === 0) {
            errors.push('El carrito no puede estar vacío');
        }

        const parsedTotal = parseNumber(total);
        console.log('Total parseado:', parsedTotal);

        if (total === undefined || total === null || total === '' || Number.isNaN(parsedTotal) || parsedTotal <= 0) {
            errors.push('El total debe ser un número mayor a 0');
        }

        // Validar método de pago
        const metodosValidos = ['efectivo', 'tarjeta', 'transferencia'];
        if (!metodo_pago || !metodosValidos.includes(metodo_pago)) {
            errors.push('Método de pago inválido');
        }

        // Validar cantidad pagada y cambio para efectivo
        if (metodo_pago === 'efectivo') {
            const parsedCantidadPagada = parseNumber(cantidad_pagada);
            const parsedCambio = parseNumber(cambio);

            if (cantidad_pagada === undefined || cantidad_pagada === null || Number.isNaN(parsedCantidadPagada) || parsedCantidadPagada < parsedTotal) {
                errors.push('La cantidad pagada debe ser mayor o igual al total');
            }

            if (cambio === undefined || cambio === null || Number.isNaN(parsedCambio) || parsedCambio < 0) {
                errors.push('El cambio debe ser un número mayor o igual a 0');
            }

            // Verificar que cambio = cantidad_pagada - total
            const cambioCalculado = parsedCantidadPagada - parsedTotal;
            if (Math.abs(parsedCambio - cambioCalculado) > 0.01) { // Tolerancia de 1 centavo
                errors.push('El cambio calculado no coincide');
            }
        } else {
            // Para no efectivo, cantidad_pagada debe ser igual al total y cambio 0
            if (parseNumber(cantidad_pagada) !== parsedTotal) {
                errors.push('Para pagos no en efectivo, la cantidad pagada debe ser igual al total');
            }
            if (parseNumber(cambio) !== 0) {
                errors.push('Para pagos no en efectivo, el cambio debe ser 0');
            }

            // Validar referencia para tarjeta y transferencia
            if (!referencia || typeof referencia !== 'string' || referencia.trim().length === 0) {
                errors.push('La referencia de la transacción es requerida para pagos con tarjeta o transferencia');
            }
        }

        // Validar productos
        productos.forEach((p, index) => {
            console.log('Validando producto', index, ':', p);

            if (!p.id || !Number.isInteger(Number(p.id)) || Number(p.id) <= 0) {
                errors.push(`Producto ${index + 1}: ID inválido`);
            }
            if (!p.cantidad || !Number.isInteger(Number(p.cantidad)) || Number(p.cantidad) <= 0) {
                errors.push(`Producto ${index + 1}: Cantidad debe ser un entero mayor a 0`);
            }
            if (!p.precio || Number.isNaN(parseNumber(p.precio)) || parseNumber(p.precio) < 0) {
                errors.push(`Producto ${index + 1}: Precio inválido`);
            }
        });

        const result = {
            valid: errors.length === 0,
            errors,
            data: {
                productos: productos.map(p => ({
                    id: Number(p.id),
                    cantidad: Number(p.cantidad),
                    precio: parseNumber(p.precio)
                })),
                total: parsedTotal,
                metodo_pago,
                cantidad_pagada: metodo_pago === 'efectivo' ? parseNumber(cantidad_pagada) : parsedTotal,
                cambio: metodo_pago === 'efectivo' ? parseNumber(cambio) : 0,
                referencia: metodo_pago !== 'efectivo' ? referencia?.trim() : null
            }
        };

        console.log('Datos validados finales:', {
            metodo_pago: result.data.metodo_pago,
            cantidad_pagada: result.data.cantidad_pagada,
            cambio: result.data.cambio,
            referencia: result.data.referencia
        });

        console.log('Resultado validación:', result);
        return result;
    }

    function buscarProductos(req, res) {
        const { q } = req.query;

        if (!q || typeof q !== 'string' || !q.trim()) {
            return res.status(400).json({ message: 'Parámetro de búsqueda requerido' });
        }

        const search = `%${q.toLowerCase()}%`;
        const sql = `
            SELECT id, nombre, codigo_barras, precio, stock, tipo
            FROM productos
            WHERE activo = 1 AND stock > 0 AND
                  (LOWER(nombre) LIKE ? OR LOWER(codigo_barras) LIKE ?)
            ORDER BY nombre COLLATE NOCASE
            LIMIT 10
        `;

        db.all(sql, [search, search], (err, rows) => {
            if (err) return res.status(500).json(err);
            res.json(rows);
        });
    }

    function obtenerProductoPorCodigo(req, res) {
        const { codigo } = req.params;

        if (!codigo || typeof codigo !== 'string' || !codigo.trim()) {
            return res.status(400).json({ message: 'Código de barras requerido' });
        }

        db.get(
            `SELECT id, nombre, codigo_barras, precio, stock, tipo
             FROM productos
             WHERE codigo_barras = ? AND activo = 1 AND stock > 0`,
            [codigo.trim()],
            (err, row) => {
                if (err) return res.status(500).json(err);
                if (!row) {
                    return res.status(404).json({ message: 'Producto no encontrado o sin stock' });
                }
                res.json(row);
            }
        );
    }

    function validarStock(req, res) {
        const { productos } = req.body;

        if (!Array.isArray(productos) || productos.length === 0) {
            return res.status(400).json({ message: 'Lista de productos requerida' });
        }

        const placeholders = productos.map(() => '?').join(',');
        const ids = productos.map(p => p.id);

        const sql = `SELECT id, nombre, stock FROM productos WHERE id IN (${placeholders}) AND activo = 1`;

        db.all(sql, ids, (err, rows) => {
            if (err) return res.status(500).json(err);

            const stockMap = {};
            rows.forEach(row => {
                stockMap[row.id] = { nombre: row.nombre, stock: row.stock };
            });

            const insuficientes = [];
            productos.forEach(p => {
                const producto = stockMap[p.id];
                if (!producto) {
                    insuficientes.push({ id: p.id, mensaje: 'Producto no encontrado' });
                } else if (producto.stock < p.cantidad) {
                    insuficientes.push({
                        id: p.id,
                        nombre: producto.nombre,
                        stock_disponible: producto.stock,
                        solicitado: p.cantidad,
                        mensaje: `Stock insuficiente (${producto.stock} disponible)`
                    });
                }
            });

            if (insuficientes.length > 0) {
                return res.status(400).json({
                    message: 'Productos con stock insuficiente',
                    insuficientes
                });
            }

            res.json({ message: 'Stock disponible para todos los productos' });
        });
    }

    function crearVenta(req, res) {
        console.log('=== INICIO CREAR VENTA ===');
        console.log('Datos recibidos en crearVenta:', JSON.stringify(req.body, null, 2));

        const { valid, errors, data } = validateSaleData(req.body);
        console.log('Validación:', { valid, errors: errors.length, data });

        if (!valid) {
            console.log('Errores de validación:', errors);
            return res.status(400).json({ errors });
        }

        const usuario_id = req.session.user ? req.session.user.id : null;
        console.log('Usuario ID:', usuario_id);

        if (!usuario_id) {
            return res.status(401).json({ message: 'Usuario no autenticado' });
        }

        const fecha = now();
        const { productos, total, metodo_pago, cantidad_pagada, cambio, referencia } = data;

        console.log('\n=== EXTRAYENDO DEL DATA ===');
        console.log('metodo_pago:', metodo_pago);
        console.log('cantidad_pagada:', cantidad_pagada);
        console.log('cambio:', cambio);
        console.log('referencia:', referencia);
        console.log('usuario_id:', usuario_id);
        console.log('fecha:', fecha);

        // Primero validar stock
        const placeholders = productos.map(() => '?').join(',');
        const ids = productos.map(p => p.id);

        db.all(
            `SELECT id, nombre, stock FROM productos WHERE id IN (${placeholders}) AND activo = 1`,
            ids,
            (err, rows) => {
                if (err) return res.status(500).json(err);

                const stockMap = {};
                rows.forEach(row => {
                    stockMap[row.id] = { nombre: row.nombre, stock: row.stock };
                });

                // Verificar stock
                const insuficientes = [];
                productos.forEach(p => {
                    const producto = stockMap[p.id];
                    if (!producto) {
                        insuficientes.push({ id: p.id, mensaje: 'Producto no encontrado' });
                    } else if (producto.stock < p.cantidad) {
                        insuficientes.push({
                            id: p.id,
                            nombre: producto.nombre,
                            stock_disponible: producto.stock,
                            solicitado: p.cantidad,
                            mensaje: `Stock insuficiente (${producto.stock} disponible)`
                        });
                    }
                });

                if (insuficientes.length > 0) {
                    return res.status(400).json({
                        message: 'Productos con stock insuficiente',
                        insuficientes
                    });
                }

                // Proceder con la venta
                console.log('Procediendo con la venta...');

                // Crear venta con información de pago
                console.log('Insertando venta con datos:', {
                    fecha, total, metodo_pago, cantidad_pagada, cambio, referencia, usuario_id
                });

                db.run(
                    `INSERT INTO ventas
                    (fecha, total, metodo_pago, cantidad_pagada, cambio, referencia, usuario_id, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [fecha, total, metodo_pago, cantidad_pagada, cambio, referencia, usuario_id, fecha, fecha],
                    function (err) {
                        if (err) {
                            console.error('Error creando venta:', err);
                            return res.status(500).json({ message: 'Error creando venta', error: err.message });
                        }

                        const ventaId = this.lastID;
                        console.log('Venta creada exitosamente con ID:', ventaId);
                        console.log('Datos insertados - metodo_pago:', metodo_pago, 'referencia:', referencia);

                        // Insertar detalles y actualizar stock
                        let completed = 0;
                        const totalProducts = productos.length;
                        let hasError = false;

                        productos.forEach((p, index) => {
                            console.log('Procesando producto', index, ':', p);

                            // Insertar detalle
                            db.run(
                                `INSERT INTO detalle_venta
                                (venta_id, producto_id, tipo, cantidad, precio, created_at, updated_at)
                                VALUES (?, ?, 'producto', ?, ?, ?, ?)`,
                                [ventaId, p.id, p.cantidad, p.precio, fecha, fecha],
                                (err) => {
                                    if (err) {
                                        console.error('Error insertando detalle:', err);
                                        if (!hasError) {
                                            hasError = true;
                                            return res.status(500).json({ message: 'Error insertando detalle de venta', error: err.message });
                                        }
                                        return;
                                    }

                                    // Actualizar stock
                                    db.run(
                                        `UPDATE productos SET stock = stock - ?, updated_at = ? WHERE id = ?`,
                                        [p.cantidad, fecha, p.id],
                                        (err) => {
                                            if (err) {
                                                console.error('Error actualizando stock:', err);
                                                if (!hasError) {
                                                    hasError = true;
                                                    return res.status(500).json({ message: 'Error actualizando stock', error: err.message });
                                                }
                                                return;
                                            }

                                            completed++;
                                            console.log('Producto procesado:', completed, 'de', totalProducts);

                                            if (completed === totalProducts && !hasError) {
                                                console.log('Venta completada exitosamente');
                                                res.json({
                                                    message: 'Venta registrada exitosamente',
                                                    ventaId,
                                                    total,
                                                    metodo_pago,
                                                    cantidad_pagada,
                                                    cambio
                                                });
                                            }
                                        }
                                    );
                                }
                            );
                        });
                    }
                );
            }
        );
    }

    function listarVentas(req, res) {
        const { fecha_inicio, fecha_fin, limit = 50 } = req.query;

        let sql = `
            SELECT
                v.id,
                v.fecha,
                v.total,
                u.username as usuario,
                COALESCE(SUM(dv.cantidad), 0) as num_productos
            FROM ventas v
            JOIN usuarios u ON v.usuario_id = u.id
            LEFT JOIN detalle_venta dv ON v.id = dv.venta_id
            WHERE 1=1
        `;
        const params = [];

        if (fecha_inicio) {
            sql += ' AND v.fecha >= ?';
            params.push(fecha_inicio);
        }

        if (fecha_fin) {
            sql += ' AND v.fecha <= ?';
            params.push(fecha_fin);
        }

        sql += `
            GROUP BY v.id, v.fecha, v.total, u.username
            ORDER BY v.fecha DESC
            LIMIT ?
        `;
        params.push(Number(limit));

        db.all(sql, params, (err, rows) => {
            if (err) return res.status(500).json(err);
            res.json(rows);
        });
    }

    function obtenerVenta(req, res) {
        const id = Number(req.params.id);
        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({ message: 'ID de venta inválido' });
        }

        db.get(
            `SELECT
                v.id,
                v.fecha,
                v.total,
                u.username as usuario
             FROM ventas v
             JOIN usuarios u ON v.usuario_id = u.id
             WHERE v.id = ?`,
            [id],
            (err, venta) => {
                if (err) return res.status(500).json(err);
                if (!venta) return res.status(404).json({ message: 'Venta no encontrada' });

                // Obtener detalles
                db.all(
                    `SELECT
                        dv.cantidad,
                        dv.precio AS precio_unitario,
                        (dv.cantidad * dv.precio) AS subtotal,
                        p.nombre,
                        p.codigo_barras
                     FROM detalle_venta dv
                     JOIN productos p ON dv.producto_id = p.id
                     WHERE dv.venta_id = ?`,
                    [id],
                    (err, detalles) => {
                        if (err) return res.status(500).json(err);

                        res.json({
                            ...venta,
                            productos: detalles
                        });
                    }
                );
            }
        );
    }

    async function printVenta(req, res) {
        const id = Number(req.params.id);
        console.log('\n=== PRINT VENTA ===');
        console.log('ID de venta:', id);
        
        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({ message: 'ID de venta inválido' });
        }

        // Obtener venta principal
        db.get(
            `SELECT v.id, v.fecha, v.total, u.username as usuario
             FROM ventas v
             JOIN usuarios u ON v.usuario_id = u.id
             WHERE v.id = ?`,
            [id],
            (err, venta) => {
                if (err) {
                    console.error('Error obteniendo venta:', err);
                    return res.status(500).json(err);
                }
                if (!venta) {
                    console.warn('Venta no encontrada:', id);
                    return res.status(404).json({ message: 'Venta no encontrada' });
                }
                
                console.log('Venta encontrada:', venta);

                // Obtener detalles
                db.all(
                    `SELECT dv.cantidad, dv.precio AS precio_unitario, (dv.cantidad * dv.precio) AS subtotal, p.nombre, p.codigo_barras
                     FROM detalle_venta dv
                     JOIN productos p ON dv.producto_id = p.id
                     WHERE dv.venta_id = ?`,
                    [id],
                    async (err, detalles) => {
                        if (err) {
                            console.error('Error obteniendo detalles:', err);
                            return res.status(500).json(err);
                        }
                        
                        console.log('Detalles encontrados:', detalles);

                        const saleObject = { 
                            id: venta.id,
                            fecha: venta.fecha, 
                            total: venta.total, 
                            usuario: venta.usuario,
                            productos: detalles || [] 
                        };
                        
                        console.log('Objeto de venta para imprimir:', JSON.stringify(saleObject, null, 2));
                        
                        try {
                            const printer = require('../utils/printer');
                            const result = await printer.printTicket(saleObject);
                            console.log('Resultado de impresión:', result);
                            
                            if (result && result.success) {
                                return res.json({ message: 'Impresión iniciada', result });
                            } else {
                                console.error('Impresión sin éxito:', result);
                                return res.status(500).json({ message: 'Error imprimiendo', error: result });
                            }
                        } catch (e) {
                            console.error('Error llamando al módulo de impresión:', e);
                            return res.status(500).json({ message: 'Error imprimiendo', error: e.message });
                        }
                    }
                );
            }
        );
    }

    function obtenerVentasDiarias(req, res) {
        // Ojo: esta ruta no recibe parámetros. Solo devuelve las ventas del día.
        db.all(
            `SELECT
                 v.id,
                 v.fecha,
                 v.total,
                 u.username as usuario,
                 COALESCE(SUM(dv.cantidad), 0) as num_productos
             FROM ventas v
             JOIN usuarios u ON v.usuario_id = u.id
             LEFT JOIN detalle_venta dv ON v.id = dv.venta_id
             WHERE DATE(v.fecha) = date('now', 'localtime')
             GROUP BY v.id, v.fecha, v.total, u.username
             ORDER BY v.fecha DESC`,
            (err, ventas) => {
                if (err) {
                    console.error('Error obteniendo ventas diarias:', err);
                    return res.status(500).json({ error: err.message });
                }
                res.json(ventas || []);
            }
        );
    }


    function obtenerTotalDiario(req, res) {
        const { fecha, fecha_inicio, fecha_fin } = req.query;

        if (fecha_inicio && fecha_fin) {
            db.get(`SELECT 
                        COUNT(*) as num_ventas,
                        SUM(total) as total_vendido,
                        AVG(total) as promedio_venta
                    FROM ventas
                    WHERE DATE(fecha) >= ? AND DATE(fecha) <= ?`,
                [fecha_inicio, fecha_fin],
                (err, resumen) => {
                    if (err) {
                        console.error('Error obteniendo resumen por rango:', err);
                        return res.status(500).json({ error: err.message });
                    }
                    res.json(resumen || { num_ventas: 0, total_vendido: 0, promedio_venta: 0 });
                }
            );
            return;
        }

        const fechaQuery = fecha || new Date().toISOString().split('T')[0]; // Hoy por defecto

        db.get(`SELECT 
                    DATE(fecha) as dia,
                    COUNT(*) as num_ventas,
                    SUM(total) as total_vendido,
                    AVG(total) as promedio_venta
                FROM ventas WHERE DATE(fecha) = ?`, [fechaQuery], (err, resumen) => {
                    if (err) {
                        console.error('Error obteniendo resumen diario:', err);
                        return res.status(500).json({ error: err.message });
                    }
                    res.json(resumen || { dia: fechaQuery, num_ventas: 0, total_vendido: 0, promedio_venta: 0 });
                });
    }

    // Mejorar listarVentas usando modelo
    function listarVentas(req, res) {
        const { fecha_inicio, fecha_fin, limit = 50 } = req.query;
        
        if (fecha_inicio && fecha_fin) {
            db.all(`SELECT v.id, v.fecha, v.total, u.username as usuario, COALESCE(SUM(dv.cantidad), 0) as num_productos
                FROM ventas v JOIN usuarios u ON v.usuario_id = u.id
                LEFT JOIN detalle_venta dv ON v.id = dv.venta_id
                WHERE DATE(v.fecha) >= ? AND DATE(v.fecha) <= ?
                GROUP BY v.id, v.fecha, v.total, u.username ORDER BY v.fecha DESC`, [fecha_inicio, fecha_fin], (err, rows) => {
                    if (err) return res.status(500).json(err);
                    res.json(rows);
                });
        } else {
            // Mantener lógica original si no hay fechas
            let sql = `
                SELECT
                    v.id,
                    v.fecha,
                    v.total,
                    u.username as usuario,
                    COALESCE(SUM(dv.cantidad), 0) as num_productos
                FROM ventas v
                JOIN usuarios u ON v.usuario_id = u.id
                LEFT JOIN detalle_venta dv ON v.id = dv.venta_id
                WHERE 1=1
            `;
            const params = [];

            if (fecha_inicio) {
                sql += ' AND DATE(v.fecha) >= ?';
                params.push(fecha_inicio);
            }

            if (fecha_fin) {
                sql += ' AND DATE(v.fecha) <= ?';
                params.push(fecha_fin);
            }

            sql += `
                GROUP BY v.id, v.fecha, v.total, u.username
                ORDER BY v.fecha DESC
                LIMIT ?
            `;
            params.push(Number(limit));

            db.all(sql, params, (err, rows) => {
                if (err) return res.status(500).json(err);
                res.json(rows);
            });
        }
    }

    return {
        buscarProductos,
        obtenerProductoPorCodigo,
        validarStock,
        crearVenta,
        listarVentas,
        obtenerVenta,
        printVenta,
        obtenerVentasDiarias,
        obtenerTotalDiario
    };
};
