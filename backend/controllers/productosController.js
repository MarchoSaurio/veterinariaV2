module.exports = (db, now) => {
    const tipoOptions = ['medicamento', 'alimento', 'accesorio', 'higiene', 'juguete', 'suplemento', 'otro'];

    function parseNumber(value) {
        if (value === undefined || value === null || value === '') return null;
        const number = Number(value);
        return Number.isFinite(number) ? number : NaN;
    }

    function validateProductData(body, isUpdate = false) {
        const errors = [];
        const {
            nombre,
            codigo_barras,
            precio,
            precio_costo,
            stock,
            stock_minimo,
            tipo
        } = body;

        const parsedPrecio = parseNumber(precio);
        const parsedPrecioCosto = parseNumber(precio_costo);
        const parsedStock = parseNumber(stock);
        const parsedStockMinimo = parseNumber(stock_minimo);

        if (!isUpdate || nombre !== undefined) {
            if (!nombre || typeof nombre !== 'string' || !nombre.trim()) {
                errors.push('El nombre es obligatorio');
            }
        }

        if (!isUpdate || codigo_barras !== undefined) {
            if (!codigo_barras || typeof codigo_barras !== 'string' || !codigo_barras.trim()) {
                errors.push('El código de barras es obligatorio');
            }
        }

        if (!isUpdate || precio !== undefined) {
            if (precio === undefined || precio === null || precio === '' || Number.isNaN(parsedPrecio) || parsedPrecio < 0) {
                errors.push('El precio debe ser un numero mayor o igual a 0');
            }
        }

        if (!isUpdate || stock !== undefined) {
            if (stock === undefined || stock === null || stock === '' || !Number.isInteger(parsedStock) || parsedStock < 0) {
                errors.push('El stock debe ser un entero mayor o igual a 0');
            }
        }

        if (!isUpdate || stock_minimo !== undefined) {
            if (stock_minimo === undefined || stock_minimo === null || stock_minimo === '' || !Number.isInteger(parsedStockMinimo) || parsedStockMinimo < 0) {
                errors.push('El stock mínimo debe ser un entero mayor o igual a 0');
            }
        }

        if (precio_costo !== undefined && precio_costo !== null && precio_costo !== '' && Number.isNaN(parsedPrecioCosto)) {
            errors.push('El precio de costo debe ser un número válido');
        }

        if (!isUpdate || tipo !== undefined) {
            if (!tipo || typeof tipo !== 'string' || !tipo.trim()) {
                errors.push('El tipo es obligatorio');
            } else if (!tipoOptions.includes(tipo)) {
                errors.push('El tipo seleccionado no es válido');
            }
        }

        return {
            valid: errors.length === 0,
            errors,
            data: {
                nombre: nombre?.trim(),
                codigo_barras: codigo_barras?.trim(),
                precio: parsedPrecio,
                precio_costo: parsedPrecioCosto,
                stock: parsedStock,
                stock_minimo: parsedStockMinimo,
                tipo: tipo ? tipo.trim() : null
            }
        };
    }

    function getIdParam(req, res) {
        const id = Number(req.params.id);
        if (!Number.isInteger(id) || id <= 0) {
            res.status(400).json({ message: 'ID inválido' });
            return null;
        }
        return id;
    }

    function listarProductos(req, res) {
        const {
            q,
            tipo,
            min_stock,
            max_stock,
            min_precio,
            max_precio,
            stock_bajo
        } = req.query;

        const conditions = ['activo = 1'];
        const params = [];

        if (q) {
            const search = `%${q.toLowerCase()}%`;
            conditions.push('(LOWER(nombre) LIKE ? OR LOWER(codigo_barras) LIKE ?)');
            params.push(search, search);
        }

        if (tipo) {
            conditions.push('tipo = ?');
            params.push(tipo);
        }

        if (min_stock !== undefined) {
            const value = Number(min_stock);
            if (Number.isNaN(value)) {
                return res.status(400).json({ message: 'min_stock debe ser numerico' });
            }
            conditions.push('stock >= ?');
            params.push(value);
        }

        if (max_stock !== undefined) {
            const value = Number(max_stock);
            if (Number.isNaN(value)) {
                return res.status(400).json({ message: 'max_stock debe ser numerico' });
            }
            conditions.push('stock <= ?');
            params.push(value);
        }

        if (min_precio !== undefined) {
            const value = Number(min_precio);
            if (Number.isNaN(value)) {
                return res.status(400).json({ message: 'min_precio debe ser numerico' });
            }
            conditions.push('precio >= ?');
            params.push(value);
        }

        if (max_precio !== undefined) {
            const value = Number(max_precio);
            if (Number.isNaN(value)) {
                return res.status(400).json({ message: 'max_precio debe ser numerico' });
            }
            conditions.push('precio <= ?');
            params.push(value);
        }

        if (stock_bajo === '1' || stock_bajo === 'true') {
            conditions.push('stock <= stock_minimo');
        }

        const sql = `SELECT * FROM productos WHERE ${conditions.join(' AND ')} ORDER BY nombre COLLATE NOCASE`;
        db.all(sql, params, (err, rows) => {
            if (err) return res.status(500).json(err);
            res.json(rows);
        });
    }

    function crearProducto(req, res) {
        const { valid, errors, data } = validateProductData(req.body, false);
        if (!valid) {
            return res.status(400).json({ errors });
        }

        db.run(
            `INSERT INTO productos 
            (nombre, codigo_barras, precio, precio_costo, stock, stock_minimo, tipo, activo, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
            [
                data.nombre,
                data.codigo_barras,
                data.precio,
                data.precio_costo,
                data.stock,
                data.stock_minimo,
                data.tipo,
                now(),
                now()
            ],
            function (err) {
                if (err) {
                    if (err.message && err.message.includes('UNIQUE')) {
                        return res.status(400).json({ message: 'El código de barras ya existe' });
                    }
                    return res.status(500).json(err);
                }
                res.json({ id: this.lastID });
            }
        );
    }

    function obtenerPorCodigo(req, res) {
        db.get(
            `SELECT * FROM productos WHERE codigo_barras = ? AND activo = 1`,
            [req.params.codigo],
            (err, row) => {
                if (err) return res.status(500).json(err);
                if (!row) return res.status(404).json({ message: 'Producto no encontrado' });
                res.json(row);
            }
        );
    }

    function obtenerPorId(req, res) {
        const id = getIdParam(req, res);
        if (!id) return;

        db.get(
            `SELECT * FROM productos WHERE id = ? AND activo = 1`,
            [id],
            (err, row) => {
                if (err) return res.status(500).json(err);
                if (!row) return res.status(404).json({ message: 'Producto no encontrado' });
                res.json(row);
            }
        );
    }

    function actualizarProducto(req, res) {
        const id = getIdParam(req, res);
        if (!id) return;

        const { valid, errors, data } = validateProductData(req.body, true);
        if (!valid) {
            return res.status(400).json({ errors });
        }

        db.get(
            `SELECT * FROM productos WHERE id = ? AND activo = 1`,
            [id],
            (err, product) => {
                if (err) return res.status(500).json(err);
                if (!product) return res.status(404).json({ message: 'Producto no encontrado' });

                const updates = [];
                const params = [];

                if (req.body.nombre !== undefined) {
                    updates.push('nombre = ?');
                    params.push(data.nombre);
                }
                if (req.body.codigo_barras !== undefined) {
                    updates.push('codigo_barras = ?');
                    params.push(data.codigo_barras);
                }
                if (req.body.precio !== undefined) {
                    updates.push('precio = ?');
                    params.push(data.precio);
                }
                if (req.body.precio_costo !== undefined) {
                    updates.push('precio_costo = ?');
                    params.push(data.precio_costo);
                }
                if (req.body.stock !== undefined) {
                    updates.push('stock = ?');
                    params.push(data.stock);
                }
                if (req.body.stock_minimo !== undefined) {
                    updates.push('stock_minimo = ?');
                    params.push(data.stock_minimo);
                }
                if (req.body.tipo !== undefined) {
                    updates.push('tipo = ?');
                    params.push(data.tipo);
                }

                if (updates.length === 0) {
                    return res.status(400).json({ message: 'No se proporcionaron campos para actualizar' });
                }

                updates.push('updated_at = ?');
                params.push(now());
                params.push(id);

                db.run(
                    `UPDATE productos SET ${updates.join(', ')} WHERE id = ? AND activo = 1`,
                    params,
                    function (err) {
                        if (err) {
                            if (err.message && err.message.includes('UNIQUE')) {
                                return res.status(400).json({ message: 'El código de barras ya existe' });
                            }
                            return res.status(500).json(err);
                        }
                        if (this.changes === 0) {
                            return res.status(404).json({ message: 'Producto no encontrado o inactivo' });
                        }
                        res.json({ message: 'Producto actualizado' });
                    }
                );
            }
        );
    }

    function darDeBajaProducto(req, res) {
        const id = getIdParam(req, res);
        if (!id) return;

        db.run(
            `UPDATE productos SET activo = 0, updated_at = ? WHERE id = ?`,
            [now(), id],
            function (err) {
                if (err) return res.status(500).json(err);
                if (this.changes === 0) {
                    return res.status(404).json({ message: 'Producto no encontrado' });
                }
                res.json({ message: 'Producto dado de baja' });
            }
        );
    }

    function restaurarProducto(req, res) {
        const id = getIdParam(req, res);
        if (!id) return;

        db.run(
            `UPDATE productos SET activo = 1, updated_at = ? WHERE id = ?`,
            [now(), id],
            function (err) {
                if (err) return res.status(500).json(err);
                if (this.changes === 0) {
                    return res.status(404).json({ message: 'Producto no encontrado o ya activo' });
                }
                res.json({ message: 'Producto restaurado' });
            }
        );
    }

    function eliminarPermanenteProducto(req, res) {
        const id = getIdParam(req, res);
        if (!id) return;

        db.get(
            `SELECT COUNT(*) as count FROM detalle_venta WHERE producto_id = ?`,
            [id],
            (err, row) => {
                if (err) return res.status(500).json(err);
                if (row.count > 0) {
                    return res.status(400).json({
                        message: 'No se puede eliminar: el producto tiene registros en ventas'
                    });
                }

                db.run(
                    `DELETE FROM productos WHERE id = ?`,
                    [id],
                    function (err) {
                        if (err) return res.status(500).json(err);
                        if (this.changes === 0) {
                            return res.status(404).json({ message: 'Producto no encontrado' });
                        }
                        res.json({ message: 'Producto eliminado permanentemente' });
                    }
                );
            }
        );
    }

    function listarInactivos(req, res) {
        db.all(`SELECT * FROM productos WHERE activo = 0 ORDER BY nombre COLLATE NOCASE`, [], (err, rows) => {
            if (err) return res.status(500).json(err);
            res.json(rows);
        });
    }

    return {
        validateProductData,
        listarProductos,
        crearProducto,
        obtenerPorCodigo,
        obtenerPorId,
        actualizarProducto,
        darDeBajaProducto,
        restaurarProducto,
        eliminarPermanenteProducto,
        listarInactivos
    };
};
