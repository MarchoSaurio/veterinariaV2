// ventas.js - Lógica del punto de venta

let carrito = [];
let total = 0;

// Elementos del DOM
const scannerInput = document.getElementById('scanner');
const busquedaInput = document.getElementById('busqueda');
const btnBuscar = document.getElementById('btn-buscar');
const btnLimpiarScanner = document.getElementById('btn-limpiar-scanner');
const resultadosBusqueda = document.getElementById('resultados-busqueda');
const carritoVacio = document.getElementById('carrito-vacio');
const carritoItems = document.getElementById('carrito-items');
const listaCarrito = document.getElementById('lista-carrito');
const totalCarrito = document.getElementById('total-carrito');
const btnFinalizarVenta = document.getElementById('btn-finalizar-venta');
const btnLimpiarCarrito = document.getElementById('btn-limpiar-carrito');

// Modales
const modalConfirmacion = document.getElementById('modal-confirmacion');
const modalBusqueda = document.getElementById('modal-busqueda');
const modalMetodoPago = document.getElementById('modal-metodo-pago');
const modalPagoEfectivo = document.getElementById('modal-pago-efectivo');
const modalConfirmacionPago = document.getElementById('modal-confirmacion-pago');
const modalImprimirTicket = document.getElementById('modal-imprimir-ticket');
const resumenVenta = document.getElementById('resumen-venta');
const infoPago = document.getElementById('info-pago');
const listaProductosBusqueda = document.getElementById('lista-productos-busqueda');
const btnConfirmarVenta = document.getElementById('btn-confirmar-venta');
const btnCancelarVenta = document.getElementById('btn-cancelar-venta');
const btnCerrarBusqueda = document.getElementById('btn-cerrar-busqueda');
const btnImprimirSi = document.getElementById('btn-imprimir-si');
const btnImprimirNo = document.getElementById('btn-imprimir-no');

// Elementos de selección de método de pago
const metodoPagoOptions = document.querySelectorAll('input[name="metodo_pago"]');
const btnSeleccionarMetodo = document.getElementById('btn-seleccionar-metodo');
const btnCancelarMetodo = document.getElementById('btn-cancelar-metodo');

// Elementos de pago en efectivo
const cantidadPagadaInput = document.getElementById('cantidad_pagada');
const totalPagarEfectivo = document.getElementById('total-pagar-efectivo');
const cambioCalculado = document.getElementById('cambio-calculado');
const btnProcesarEfectivo = document.getElementById('btn-procesar-efectivo');
const btnVolverMetodo = document.getElementById('btn-volver-metodo');

// Elementos de confirmación de pago (tarjeta/transferencia)
const tituloConfirmacionPago = document.getElementById('titulo-confirmacion-pago');
const metodoSeleccionadoText = document.getElementById('metodo-seleccionado-text');
const totalConfirmacion = document.getElementById('total-confirmacion');
const instruccionesPago = document.getElementById('instrucciones-pago');
const referenciaPagoInput = document.getElementById('referencia_pago');
const btnConfirmarPagoFinal = document.getElementById('btn-confirmar-pago-final');
const btnVolverMetodoConfirmacion = document.getElementById('btn-volver-metodo-confirmacion');

// Variables de pago
let metodoPagoSeleccionado = 'efectivo';
let cantidadPagada = 0;
let cambio = 0;
let referenciaPago = '';
let ventaIdActual = null;

// Inicialización
document.addEventListener('DOMContentLoaded', function() {
    verificarAutenticacion();
    inicializarEventos();
    actualizarVistaCarrito();
});

function verificarAutenticacion() {
    // Verificar si el usuario está autenticado haciendo una petición de prueba
    fetch('/api/productos?limit=1')
        .then(res => {
            if (res.status === 401) {
                // Usuario no autenticado, redirigir al login
                window.location.href = '/pages/login.html';
            }
        })
        .catch(error => {
            console.error('Error verificando autenticación:', error);
            // En caso de error, asumir que no está autenticado
            window.location.href = '/pages/login.html';
        });
}

function inicializarEventos() {
    // Evitar crashes si algún elemento no existe en el DOM
    if (!scannerInput || !busquedaInput || !btnBuscar || !btnLimpiarScanner) {
        console.warn('Elementos DOM requeridos no encontrados en ventas.html');
        return;
    }

    // Escáner de código de barras
    scannerInput.addEventListener('keydown', manejarEscaneo);


    // Búsqueda manual
    btnBuscar.addEventListener('click', buscarProductos);
    busquedaInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            buscarProductos();
        }
    });

    // Botones del carrito
    btnLimpiarScanner.addEventListener('click', () => {
        scannerInput.value = '';
        scannerInput.focus();
    });

    if (!btnFinalizarVenta || !btnLimpiarCarrito) {
        console.warn('Botones principales no encontrados en ventas.html');
        return;
    }
    btnFinalizarVenta.addEventListener('click', mostrarConfirmacionVenta);
    btnLimpiarCarrito.addEventListener('click', limpiarCarrito);


    // Modal de selección de método de pago
    btnSeleccionarMetodo.addEventListener('click', procesarSeleccionMetodo);
    btnCancelarMetodo.addEventListener('click', cerrarModalMetodoPago);

    // Modal de pago en efectivo
    cantidadPagadaInput.addEventListener('input', calcularCambio);
    btnProcesarEfectivo.addEventListener('click', procesarPagoEfectivo);
    btnVolverMetodo.addEventListener('click', volverAMetodoPago);

    // Modal de confirmación de pago (tarjeta/transferencia)
    btnConfirmarPagoFinal.addEventListener('click', procesarPagoTarjetaTransferencia);
    btnVolverMetodoConfirmacion.addEventListener('click', volverAMetodoPago);

    // Modal de confirmación de venta
    btnConfirmarVenta.addEventListener('click', confirmarVenta);
    btnCancelarVenta.addEventListener('click', cerrarModalConfirmacion);
    btnCerrarBusqueda.addEventListener('click', cerrarModalBusqueda);

    // Modal de impresión de ticket
    btnImprimirSi.addEventListener('click', procesarImpresion);
    btnImprimirNo.addEventListener('click', cerrarModalImpresion);

    // Cerrar modales al hacer clic fuera
    window.addEventListener('click', function(e) {
        if (e.target === modalConfirmacion) {
            cerrarModalConfirmacion();
        }
        if (e.target === modalBusqueda) {
            cerrarModalBusqueda();
        }
        if (e.target === modalMetodoPago) {
            cerrarModalMetodoPago();
        }
        if (e.target === modalPagoEfectivo) {
            cerrarModalPagoEfectivo();
        }
        if (e.target === modalConfirmacionPago) {
            cerrarModalConfirmacionPago();
        }
        if (e.target === modalImprimirTicket) {
            cerrarModalImpresion();
        }
    });
}

// ESCÁNER DE CÓDIGO DE BARRAS
function manejarEscaneo(e) {
    if (e.key === 'Enter') {
        const codigo = scannerInput.value.trim();

        if (!codigo) return;

        buscarProductoPorCodigo(codigo);
        scannerInput.value = '';
    }
}

async function buscarProductoPorCodigo(codigo) {
    try {
        const response = await fetch(`/api/ventas/productos/${codigo}`);
        const producto = await response.json();

        if (response.ok) {
            agregarAlCarrito(producto);
            mostrarMensajeTemporal(`Producto agregado: ${producto.nombre}`, 'success');
        } else {
            mostrarMensajeTemporal(producto.message || 'Producto no encontrado', 'error');
        }
    } catch (error) {
        console.error('Error al buscar producto:', error);
        mostrarMensajeTemporal('Error al buscar producto', 'error');
    }
}

// BÚSQUEDA MANUAL
async function buscarProductos() {
    const query = busquedaInput.value.trim();

    if (!query) {
        mostrarMensajeTemporal('Ingrese un término de búsqueda', 'warning');
        return;
    }

    try {
        const response = await fetch(`/api/ventas/productos/buscar?q=${encodeURIComponent(query)}`);
        const productos = await response.json();

        if (response.ok && productos.length > 0) {
            mostrarResultadosBusqueda(productos);
        } else {
            mostrarMensajeTemporal('No se encontraron productos', 'warning');
        }
    } catch (error) {
        console.error('Error en búsqueda:', error);
        mostrarMensajeTemporal('Error en la búsqueda', 'error');
    }
}

function mostrarResultadosBusqueda(productos) {
    resultadosBusqueda.innerHTML = '';

    productos.forEach(producto => {
        const div = document.createElement('div');
        div.className = 'producto-resultado';
        div.innerHTML = `
            <div class="producto-info">
                <strong>${producto.nombre}</strong>
                <span>Código: ${producto.codigo_barras}</span>
                <span>Precio: $${producto.precio.toFixed(2)}</span>
                <span>Stock: ${producto.stock}</span>
            </div>
            <button class="btn-agregar" onclick="agregarProductoBusqueda(${producto.id})">
                Agregar
            </button>
        `;
        resultadosBusqueda.appendChild(div);
    });
}

// CARRITO DE COMPRAS
function agregarAlCarrito(producto) {
    // Verificar stock disponible
    if (producto.stock <= 0) {
        mostrarMensajeTemporal('Producto sin stock disponible', 'error');
        return;
    }

    let itemExistente = carrito.find(item => item.id === producto.id);

    if (itemExistente) {
        // Si ya existe, aumentar cantidad (máximo el stock disponible)
        if (itemExistente.cantidad >= producto.stock) {
            mostrarMensajeTemporal(`Stock insuficiente. Máximo disponible: ${producto.stock}`, 'warning');
            return;
        }
        itemExistente.cantidad++;
    } else {
        // Agregar nuevo item
        carrito.push({
            id: producto.id,
            nombre: producto.nombre,
            precio: producto.precio,
            stock: producto.stock,
            cantidad: 1
        });
    }

    actualizarVistaCarrito();
}

function agregarProductoBusqueda(productoId) {
    console.log('Agregando producto con ID:', productoId);

    // Validar que el ID sea válido
    if (!productoId || isNaN(productoId)) {
        console.error('ID de producto inválido:', productoId);
        mostrarMensajeTemporal('ID de producto inválido', 'error');
        return;
    }

    // Buscar el producto completo por ID
    fetch(`/api/productos/id/${productoId}`)
        .then(res => {
            console.log('Respuesta de API - Status:', res.status);
            if (!res.ok) {
                throw new Error(`HTTP ${res.status}: ${res.statusText}`);
            }
            return res.json();
        })
        .then(producto => {
            console.log('Producto obtenido:', producto);
            if (producto && !producto.message) {
                agregarAlCarrito(producto);
                resultadosBusqueda.innerHTML = '';
                busquedaInput.value = '';
                mostrarMensajeTemporal(`Producto "${producto.nombre}" agregado al carrito`, 'success');
            } else {
                throw new Error(producto.message || 'Producto no encontrado');
            }
        })
        .catch(error => {
            console.error('Error al obtener producto:', error);
            mostrarMensajeTemporal(`Error al agregar producto: ${error.message}`, 'error');
        });
}

function aumentarCantidad(productoId) {
    const item = carrito.find(item => item.id === productoId);
    if (item && item.cantidad < item.stock) {
        item.cantidad++;
        actualizarVistaCarrito();
    } else {
        mostrarMensajeTemporal('Stock insuficiente', 'warning');
    }
}

function disminuirCantidad(productoId) {
    const item = carrito.find(item => item.id === productoId);
    if (item) {
        if (item.cantidad > 1) {
            item.cantidad--;
        } else {
            // Si es 1, eliminar el producto
            eliminarDelCarrito(productoId);
            return;
        }
        actualizarVistaCarrito();
    }
}

function eliminarDelCarrito(productoId) {
    carrito = carrito.filter(item => item.id !== productoId);
    actualizarVistaCarrito();
}

function actualizarVistaCarrito() {
    if (carrito.length === 0) {
        carritoVacio.style.display = 'block';
        carritoItems.style.display = 'none';
        return;
    }

    carritoVacio.style.display = 'none';
    carritoItems.style.display = 'block';

    listaCarrito.innerHTML = '';
    total = 0;

    carrito.forEach(item => {
        const subtotal = item.precio * item.cantidad;
        total += subtotal;

        const itemDiv = document.createElement('div');
        itemDiv.className = 'carrito-item';
        itemDiv.innerHTML = `
            <div class="item-nombre">${item.nombre}</div>
            <div class="item-precio">$${item.precio.toFixed(2)}</div>
            <div class="item-cantidad">
                <button onclick="disminuirCantidad(${item.id})">-</button>
                <span>${item.cantidad}</span>
                <button onclick="aumentarCantidad(${item.id})">+</button>
            </div>
            <div class="item-subtotal">$${subtotal.toFixed(2)}</div>
            <div class="item-acciones">
                <button onclick="eliminarDelCarrito(${item.id})" class="btn-eliminar">×</button>
            </div>
        `;
        listaCarrito.appendChild(itemDiv);
    });

    totalCarrito.textContent = total.toFixed(2);
}

function limpiarCarrito() {
    if (carrito.length > 0 && confirm('¿Está seguro de limpiar el carrito?')) {
        carrito = [];
        actualizarVistaCarrito();
        mostrarMensajeTemporal('Carrito limpiado', 'info');
    }
}

// VENTA FINAL
function mostrarConfirmacionVenta() {
    if (carrito.length === 0) {
        mostrarMensajeTemporal('El carrito está vacío', 'warning');
        return;
    }

    // Validar stock antes de mostrar confirmación
    validarStockAntesDeVenta().then(stockValido => {
        if (!stockValido) {
            mostrarMensajeTemporal('Algunos productos no tienen stock suficiente', 'error');
            return;
        }

        // Mostrar modal de método de pago
        mostrarModalMetodoPago();
    });
}

async function validarStockAntesDeVenta() {
    try {
        const productosParaValidar = carrito.map(item => ({
            id: item.id,
            cantidad: item.cantidad
        }));

        const response = await fetch('/api/ventas/validar-stock', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productos: productosParaValidar })
        });

        return response.ok;
    } catch (error) {
        console.error('Error validando stock:', error);
        return false;
    }
}

function mostrarModalMetodoPago() {
    // Resetear valores
    metodoPagoSeleccionado = 'efectivo';
    cantidadPagada = 0;
    cambio = 0;
    referenciaPago = '';

    // Actualizar UI
    document.querySelector('input[name="metodo_pago"][value="efectivo"]').checked = true;

    modalMetodoPago.style.display = 'block';
}

function procesarSeleccionMetodo() {
    const metodoSeleccionado = document.querySelector('input[name="metodo_pago"]:checked').value;
    metodoPagoSeleccionado = metodoSeleccionado;

    // Cerrar modal de selección
    cerrarModalMetodoPago();

    // Mostrar modal correspondiente
    if (metodoSeleccionado === 'efectivo') {
        mostrarModalPagoEfectivo();
    } else {
        mostrarModalConfirmacionPago(metodoSeleccionado);
    }
}

function mostrarModalPagoEfectivo() {
    // Resetear valores
    cantidadPagada = 0;
    cambio = 0;

    // Actualizar UI
    cantidadPagadaInput.value = '';
    totalPagarEfectivo.textContent = total.toFixed(2);
    cambioCalculado.textContent = '0.00';
    cambioCalculado.style.color = '#dc3545'; // Rojo inicialmente

    modalPagoEfectivo.style.display = 'block';
    cantidadPagadaInput.focus();
}

function calcularCambio() {
    const cantidadIngresada = parseFloat(cantidadPagadaInput.value) || 0;
    cantidadPagada = cantidadIngresada;

    if (cantidadPagada >= total) {
        cambio = cantidadPagada - total;
        cambioCalculado.textContent = cambio.toFixed(2);
        cambioCalculado.style.color = '#28a745'; // Verde para cambio positivo
    } else {
        cambio = 0;
        cambioCalculado.textContent = '0.00';
        cambioCalculado.style.color = '#dc3545'; // Rojo para cantidad insuficiente
    }
}

function procesarPagoEfectivo() {
    // Validar pago en efectivo
    if (cantidadPagada < total) {
        mostrarMensajeTemporal('La cantidad pagada es insuficiente', 'error');
        cantidadPagadaInput.focus();
        return;
    }

    // Cerrar modal de efectivo y mostrar confirmación
    cerrarModalPagoEfectivo();
    mostrarResumenVenta();
    modalConfirmacion.style.display = 'block';
}

function mostrarModalConfirmacionPago(metodo) {
    metodoSeleccionadoText.textContent = getNombreMetodoPago(metodo);
    totalConfirmacion.textContent = total.toFixed(2);
    referenciaPagoInput.value = '';

    // Configurar instrucciones específicas
    configurarInstruccionesPago(metodo);

    modalConfirmacionPago.style.display = 'block';
    referenciaPagoInput.focus();
}

function configurarInstruccionesPago(metodo) {
    let instrucciones = '';

    if (metodo === 'tarjeta') {
        tituloConfirmacionPago.textContent = 'Procesar Pago con Tarjeta';
        instrucciones = `
            <div class="instrucciones-tarjeta">
                <h4>Instrucciones para pago con tarjeta:</h4>
                <ul>
                    <li>Inserte o pase la tarjeta en el lector</li>
                    <li>Ingrese el PIN si es requerido</li>
                    <li>Confirme el monto de $${total.toFixed(2)}</li>
                </ul>
            </div>
        `;
    } else if (metodo === 'transferencia') {
        tituloConfirmacionPago.textContent = 'Procesar Transferencia';
        instrucciones = `
            <div class="instrucciones-transferencia">
                <h4>Instrucciones para transferencia:</h4>
                <ul>
                    <li>Cuenta: XXXX-XXXX-XXXX-XXXX</li>
                    <li>Monto: $${total.toFixed(2)}</li>
                    <li>Concepto: Pago venta veterinaria</li>
                </ul>
                <p><strong>Importante:</strong> El pago se confirmará una vez recibida la transferencia.</p>
            </div>
        `;
    }

    instruccionesPago.innerHTML = instrucciones;
}

function procesarPagoTarjetaTransferencia() {
    referenciaPago = referenciaPagoInput.value.trim();

    if (!referenciaPago) {
        mostrarMensajeTemporal('Ingrese la referencia de la transacción', 'error');
        referenciaPagoInput.focus();
        return;
    }

    // Para tarjeta y transferencia, cantidad_pagada = total y cambio = 0
    cantidadPagada = total;
    cambio = 0;

    // Cerrar modal de confirmación y mostrar resumen final
    cerrarModalConfirmacionPago();
    mostrarResumenVenta();
    modalConfirmacion.style.display = 'block';
}

function volverAMetodoPago() {
    // Cerrar modal actual y volver al de selección de método
    cerrarModalPagoEfectivo();
    cerrarModalConfirmacionPago();
    mostrarModalMetodoPago();
}

function mostrarResumenVenta() {
    resumenVenta.innerHTML = `
        <div class="resumen-header">
            <h4>Resumen de Venta</h4>
        </div>
        <div class="resumen-items">
            ${carrito.map(item => `
                <div class="resumen-item">
                    <span>${item.nombre} x${item.cantidad}</span>
                    <span>$${(item.precio * item.cantidad).toFixed(2)}</span>
                </div>
            `).join('')}
        </div>
        <div class="resumen-total">
            <strong>Total: $${total.toFixed(2)}</strong>
        </div>
    `;

    // Mostrar información de pago
    mostrarInfoPago();
}

function mostrarInfoPago() {
    let infoPagoHTML = `<p><strong>Método de Pago:</strong> ${getNombreMetodoPago(metodoPagoSeleccionado)}</p>`;

    if (metodoPagoSeleccionado === 'efectivo') {
        infoPagoHTML += `
            <p><strong>Cantidad Pagada:</strong> $${cantidadPagada.toFixed(2)}</p>
            <p><strong>Cambio:</strong> $${cambio.toFixed(2)}</p>
        `;
    } else {
        infoPagoHTML += `
            <p><strong>Referencia:</strong> ${referenciaPago}</p>
        `;
    }

    infoPago.innerHTML = infoPagoHTML;
}

function getNombreMetodoPago(metodo) {
    const nombres = {
        'efectivo': 'Efectivo 💵',
        'tarjeta': 'Tarjeta 💳',
        'transferencia': 'Transferencia 🏦'
    };
    return nombres[metodo] || metodo;
}

async function confirmarVenta() {
    try {
        const productosVenta = carrito.map(item => ({
            id: item.id,
            cantidad: item.cantidad,
            precio: item.precio
        }));

        const datosVenta = {
            productos: productosVenta,
            total: total,
            metodo_pago: metodoPagoSeleccionado,
            cantidad_pagada: cantidadPagada,
            cambio: cambio
        };

        // Agregar referencia para tarjeta/transferencia
        if (metodoPagoSeleccionado !== 'efectivo') {
            datosVenta.referencia = referenciaPago;
        }

        console.log('=== CONFIRMAR VENTA ===');
        console.log('Datos enviados al servidor:');
        console.log(JSON.stringify(datosVenta, null, 2));

        const response = await fetch('/api/ventas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datosVenta)
        });

        const result = await response.json();
        console.log('Respuesta del servidor - Status:', response.status);
        console.log('Respuesta:', JSON.stringify(result, null, 2));

        if (response.ok) {
            mostrarMensajeTemporal(`Venta realizada exitosamente. ID: ${result.ventaId}`, 'success');
            carrito = [];
            actualizarVistaCarrito();
            cerrarModalConfirmacion();
            // Resetear estado
            metodoPagoSeleccionado = 'efectivo';
            cantidadPagada = 0;
            cambio = 0;
            referenciaPago = '';
            
            // Guardar ID de venta y mostrar modal de impresión
            ventaIdActual = result.ventaId;
            modalImprimirTicket.style.display = 'block';
        } else {
            const errorMsg = result.message || result.error || result.errors?.[0] || 'Error al procesar la venta';
            console.error('Error en respuesta:', errorMsg);
            mostrarMensajeTemporal(errorMsg, 'error');
        }
    } catch (error) {
        console.error('Error en confirmarVenta:', error);
        mostrarMensajeTemporal(`Error al procesar la venta: ${error.message}`, 'error');
    }
}

// MODALES
function cerrarModalConfirmacion() {
    modalConfirmacion.style.display = 'none';
}

function cerrarModalBusqueda() {
    modalBusqueda.style.display = 'none';
}

function cerrarModalMetodoPago() {
    modalMetodoPago.style.display = 'none';
}

function cerrarModalPagoEfectivo() {
    modalPagoEfectivo.style.display = 'none';
}

function cerrarModalConfirmacionPago() {
    modalConfirmacionPago.style.display = 'none';
}

function cerrarModalImpresion() {
    modalImprimirTicket.style.display = 'none';
    ventaIdActual = null;
}

async function procesarImpresion() {
    if (!ventaIdActual) {
        mostrarMensajeTemporal('Error: No hay ID de venta', 'error');
        return;
    }

    try {
        console.log('🖨️ Solicitando impresión para venta:', ventaIdActual);
        const printRes = await fetch(`/api/ventas/${ventaIdActual}/print`, { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include' 
        });
        const printJson = await printRes.json().catch(() => ({}));
        
        console.log('Respuesta de impresión:', { status: printRes.status, data: printJson });
        
        cerrarModalImpresion();
        
        if (printRes.ok) {
            mostrarMensajeTemporal('🖨️ Ticket enviado a impresión', 'success');
        } else {
            mostrarMensajeTemporal(`Error al imprimir: ${printJson.message || printJson.error || 'Desconocido'}`, 'error');
        }
    } catch (e) {
        cerrarModalImpresion();
        console.error('Error solicitando impresión:', e);
        mostrarMensajeTemporal(`Error de conexión: ${e.message}`, 'error');
    }
}

// UTILIDADES
function mostrarMensajeTemporal(mensaje, tipo = 'info') {
    // Crear elemento de mensaje temporal
    const mensajeDiv = document.createElement('div');
    mensajeDiv.className = `mensaje-temporal ${tipo}`;
    mensajeDiv.textContent = mensaje;

    // Agregar al DOM
    document.body.appendChild(mensajeDiv);

    // Mostrar con animación
    setTimeout(() => mensajeDiv.classList.add('visible'), 10);

    // Ocultar y remover después de 3 segundos
    setTimeout(() => {
        mensajeDiv.classList.remove('visible');
        setTimeout(() => document.body.removeChild(mensajeDiv), 300);
    }, 3000);
}

// === HISTORIAL DE VENTAS ===
let ventasHistorial = [];
let fechaInicioFilter = '';
let fechaFinFilter = '';

// Elementos historial
const tabPosBtn = document.getElementById('tab-pos');
const tabHistorialBtn = document.getElementById('tab-historial');
const tabPosContent = document.getElementById('tab-pos-content');
const tabHistorialContent = document.getElementById('tab-historial-content');
const totalHoyEl = document.getElementById('total-hoy');
const ventasHoyEl = document.getElementById('ventas-hoy');
const promedioHoyEl = document.getElementById('promedio-hoy');
const fechaInicioEl = document.getElementById('fecha-inicio');
const fechaFinEl = document.getElementById('fecha-fin');
const btnFiltrar = document.getElementById('btn-filtrar');
const btnHoy = document.getElementById('btn-hoy');
const btnLimpiarFiltros = document.getElementById('btn-limpiar-filtros');
const ventasCountEl = document.getElementById('ventas-count');
const tablaVentasBody = document.querySelector('#tabla-ventas tbody');

// Inicializar historial
function inicializarHistorial() {
    // Configurar fechas por defecto (ayer al hoy)
    const hoy = new Date().toISOString().split('T')[0];
    const ayer = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    fechaInicioEl.value = ayer;
    fechaFinEl.value = hoy;
    fechaInicioEl.max = hoy;
    fechaFinEl.max = hoy;
    actualizarRangoFechas();
    
    // Event listeners
    tabPosBtn.addEventListener('click', () => switchTab('pos'));
    tabHistorialBtn.addEventListener('click', () => switchTab('historial'));
    btnFiltrar.addEventListener('click', filtrarVentas);
    btnHoy.addEventListener('click', mostrarVentasHoy);
    btnLimpiarFiltros.addEventListener('click', limpiarFiltros);
    fechaInicioEl.addEventListener('change', actualizarRangoFechas);
    fechaFinEl.addEventListener('change', validarFechaFin);
    
    // Cargar datos iniciales
    mostrarVentasHoy();
}

function switchTab(tab) {
    // Remover active
    tabPosBtn.classList.remove('active');
    tabHistorialBtn.classList.remove('active');
    tabPosContent.classList.remove('active');
    tabHistorialContent.classList.remove('active');
    
    // Agregar active
    if (tab === 'pos') {
        tabPosBtn.classList.add('active');
        tabPosContent.classList.add('active');
    } else {
        tabHistorialBtn.classList.add('active');
        tabHistorialContent.classList.add('active');
        mostrarVentasHoy();
    }
}

function actualizarRangoFechas() {
    const hoy = new Date().toISOString().split('T')[0];
    const fechaInicio = fechaInicioEl.value;

    fechaInicioEl.max = hoy;
    fechaFinEl.max = hoy;

    if (!fechaInicio) {
        fechaFinEl.min = '';
        return;
    }

    fechaFinEl.min = fechaInicio;

    if (fechaFinEl.value && fechaFinEl.value < fechaInicio) {
        fechaFinEl.value = fechaInicio;
    }
}

function validarFechaFin() {
    const fechaInicio = fechaInicioEl.value;

    if (fechaInicio && fechaFinEl.value && fechaFinEl.value < fechaInicio) {
        fechaFinEl.value = fechaInicio;
        mostrarMensajeTemporal('La fecha final no puede ser anterior a la fecha inicial', 'warning');
    }
}

async function mostrarVentasHoy() {
    try {
        mostrarLoading();
        
        // Cargar total diario
        const hoy = new Date().toISOString().split('T')[0];
        const resTotal = await fetch(`/api/ventas/total-diario?fecha=${hoy}`);
        const resumen = await resTotal.json();
        
        totalHoyEl.textContent = `$${parseFloat(resumen.total_vendido || 0).toLocaleString('es-MX', {minimumFractionDigits: 2})}`;
        ventasHoyEl.textContent = resumen.num_ventas || 0;
        promedioHoyEl.textContent = `$${parseFloat(resumen.promedio_venta || 0).toLocaleString('es-MX', {minimumFractionDigits: 2})}`;
        
        // Cargar ventas del día
        const resVentas = await fetch('/api/ventas/diarias');
        let ventasData;
        try {
            ventasData = await resVentas.json();
        } catch (e) {
            ventasData = null;
        }

        if (!resVentas.ok) {
            mostrarMensajeTemporal(`Error cargando historial: ${ventasData?.message || ventasData?.error || resVentas.status}`, 'error');
            ocultarLoading();
            return;
        }

        // Normalizar a array
        if (Array.isArray(ventasData)) {
            ventasHistorial = ventasData;
        } else {
            ventasHistorial = [];
        }

        mostrarTablaVentas(ventasHistorial);

        
        fechaInicioFilter = hoy;
        fechaFinFilter = hoy;
        fechaInicioEl.value = hoy;
        fechaFinEl.value = hoy;
        
        ocultarLoading();
    } catch (error) {
        console.error('Error cargando ventas:', error);
        mostrarMensajeTemporal(`Error cargando historial: ${error?.message || error}`, 'error');
        ocultarLoading();
    }
}

async function filtrarVentas() {
    fechaInicioFilter = fechaInicioEl.value;
    fechaFinFilter = fechaFinEl.value;
    
    if (!fechaInicioFilter || !fechaFinFilter) {
        mostrarMensajeTemporal('Selecciona fechas válidas', 'warning');
        return;
    }
    
    if (new Date(fechaInicioFilter) > new Date(fechaFinFilter)) {
        mostrarMensajeTemporal('Fecha inicio no puede ser mayor a fecha fin', 'warning');
        return;
    }
    
    try {
        mostrarLoading();
        
        const res = await fetch(`/api/ventas?fecha_inicio=${fechaInicioFilter}&fecha_fin=${fechaFinFilter}`);
        ventasHistorial = await res.json();
        mostrarTablaVentas(ventasHistorial);
        
        // Actualizar resumen para todo el rango seleccionado
        const resTotal = await fetch(`/api/ventas/total-diario?fecha_inicio=${fechaInicioFilter}&fecha_fin=${fechaFinFilter}`);
        const resumen = await resTotal.json();
        totalHoyEl.textContent = `$${parseFloat(resumen.total_vendido || 0).toLocaleString('es-MX', {minimumFractionDigits: 2})}`;
        ventasHoyEl.textContent = resumen.num_ventas || 0;
        promedioHoyEl.textContent = `$${parseFloat(resumen.promedio_venta || 0).toLocaleString('es-MX', {minimumFractionDigits: 2})}`;
        
        ocultarLoading();
        mostrarMensajeTemporal(`Mostrando ${ventasHistorial.length} ventas`, 'success');
    } catch (error) {
        console.error('Error filtrando:', error);
        mostrarMensajeTemporal('Error al filtrar ventas', 'error');
        ocultarLoading();
    }
}

function limpiarFiltros() {
    const hoy = new Date().toISOString().split('T')[0];
    fechaInicioEl.value = '';
    fechaFinEl.value = hoy;
    fechaInicioFilter = '';
    fechaFinFilter = hoy;
    mostrarVentasHoy();
}
function formatDate(dateTimeStr) {
    if (!dateTimeStr) return 'N/A';
    const datePart = String(dateTimeStr).split(' ')[0];
    if (!datePart) return dateTimeStr;
    const parts = datePart.split('-');
    if (parts.length !== 3) return dateTimeStr;
    const [year, month, day] = parts;
    return `${day}/${month}/${year}`;
}

function formatDateTime(dateTimeStr) {
    if (!dateTimeStr) return 'N/A';
    let stringValue = String(dateTimeStr);
    // Normalizar horas 24:xx a 00:xx para mostrar tiempo válido
    stringValue = stringValue.replace(/\b24:(\d{2}:\d{2})\b/, '00:$1');
    const [datePart, timePart] = stringValue.split(' ');
    const formattedDate = formatDate(stringValue);
    return timePart ? `${formattedDate} ${timePart}` : formattedDate;
}

function mostrarTablaVentas(ventas) {
    ventasCountEl.textContent = `(${ventas.length})`;

    if (ventas.length === 0) {
        tablaVentasBody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 2rem; color: #666;">No hay ventas en este período</td></tr>';
        return;
    }

    tablaVentasBody.innerHTML = ventas.map(venta => `
        <tr>
            <td>${venta.id}</td>
            <td>${formatDate(venta.fecha)}</td>
            <td class="total-col">$${parseFloat(venta.total).toLocaleString('es-MX', {minimumFractionDigits: 2})}</td>
            <td>${venta.usuario}</td>
            <td>${venta.num_productos || venta.productos_vendidos || 0}</td>
            <td><button class="btn-detalle" onclick="verDetalleVenta(${venta.id})">Detalle</button></td>
        </tr>
    `).join('');
}

async function verDetalleVenta(id) {
    try {
        const res = await fetch(`/api/ventas/${id}`);
        if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            throw new Error(errorData.message || 'Error cargando detalle');
        }

        const venta = await res.json();
        const totalVenta = Number(venta.total ?? 0);
        const usuarioVenta = venta.usuario || 'N/A';
        const fechaVenta = formatDateTime(venta.fecha);

        let detallesHTML = 'No hay detalles disponibles';
        if (Array.isArray(venta.productos) && venta.productos.length > 0) {
            detallesHTML = venta.productos.map(p => {
                const cantidad = Number(p.cantidad || 0);
                const precio = Number(p.precio_unitario ?? p.precio ?? 0);
                const subtotal = Number(p.subtotal ?? cantidad * precio);
                return `<div><strong>${p.nombre || 'Producto'}</strong>: ${cantidad} x $${precio.toLocaleString('es-MX', { minimumFractionDigits: 2 })} = $${subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</div>`;
            }).join('');
        }

        const mensaje = `
            <div style="max-height: 300px; overflow-y: auto;">
                <h4>Venta #${venta.id || id} - ${fechaVenta}</h4>
                <p><strong>Total:</strong> $${totalVenta.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
                <p><strong>Usuario:</strong> ${usuarioVenta}</p>
                <div style="margin-top: 1rem;">
                    <strong>Productos:</strong><br>
                    ${detallesHTML}
                </div>
            </div>
        `;

        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'flex';
        modal.innerHTML = `
            <div class="modal-content" style="width: 90%; max-width: 500px; max-height: 80vh;">
                <h3>Detalle Venta #${venta.id || id}</h3>
                <div>${mensaje}</div>
                <div class="modal-actions">
                    <button onclick="this.closest('.modal').remove()" class="btn-secondary">Cerrar</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

    } catch (error) {
        console.error('Error cargando detalle:', error);
        mostrarMensajeTemporal(error.message || 'Error cargando detalle', 'error');
    }
}

function mostrarLoading() {
    tablaVentasBody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 2rem;">Cargando...</td></tr>';
}

function ocultarLoading() {
    // Se maneja en cada función
}

// Inicializar historial en DOMContentLoaded
inicializarHistorial();


