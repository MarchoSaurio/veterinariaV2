let editingProductId = null;

const tipoOptions = [
    { value: '', label: 'Todos los tipos' },
    { value: 'medicamento', label: 'Medicamento' },
    { value: 'alimento', label: 'Alimento' },
    { value: 'accesorio', label: 'Accesorio' },
    { value: 'higiene', label: 'Higiene' },
    { value: 'juguete', label: 'Juguete' },
    { value: 'suplemento', label: 'Suplemento' },
    { value: 'otro', label: 'Otro' }
];

function mostrarTab(tab, event) {
    const tabs = document.querySelectorAll('.tab-content');
    tabs.forEach(t => t.classList.remove('active'));
    document.getElementById(tab).classList.add('active');

    const btns = document.querySelectorAll('.tab-btn');
    btns.forEach(b => b.classList.remove('active'));
    if (event && event.target) {
        event.target.classList.add('active');
    }

    if (tab === 'inactivos') {
        cargarInactivos();
    }
}

function llenarTipoSelects() {
    const filtroTipo = document.getElementById('filtroTipo');
    const tipo = document.getElementById('tipo');

    if (filtroTipo) {
        filtroTipo.innerHTML = tipoOptions.map(o => `
            <option value="${o.value}">${o.label}</option>
        `).join('');
    }

    if (tipo) {
        tipo.innerHTML = tipoOptions
            .filter(o => o.value !== '')
            .map(o => `<option value="${o.value}">${o.label}</option>`)
            .join('');
        tipo.insertAdjacentHTML('afterbegin', '<option value="">Seleccionar tipo</option>');
    }
}

function mostrarMensaje(text, error = false) {
    const mensaje = document.getElementById('mensaje');
    mensaje.textContent = text;
    mensaje.style.color = error ? 'red' : 'green';
}

function limpiarFormulario() {
    editingProductId = null;
    document.getElementById('formTitle').textContent = 'Agregar producto';
    document.getElementById('guardarBtn').textContent = 'Agregar';
    document.getElementById('nombre').value = '';
    document.getElementById('codigo').value = '';
    document.getElementById('precio').value = '';
    document.getElementById('precioCosto').value = '';
    document.getElementById('stock').value = '';
    document.getElementById('stockMinimo').value = '';
    document.getElementById('tipo').value = '';
    mostrarMensaje('');
}

function construirQuery() {
    const q = document.getElementById('filtroBusqueda').value.trim();
    const tipo = document.getElementById('filtroTipo').value.trim();
    const stockBajo = document.getElementById('filtroStockBajo').checked;
    const params = new URLSearchParams();

    if (q) params.set('q', q);
    if (tipo) params.set('tipo', tipo);
    if (stockBajo) params.set('stock_bajo', '1');

    return params.toString() ? `?${params.toString()}` : '';
}

function cargarProductos() {
    fetch(`/api/productos${construirQuery()}`)
        .then(res => res.json())
        .then(data => {
            if (!Array.isArray(data)) {
                mostrarMensaje('Error al cargar productos', true);
                return;
            }
            const lista = document.getElementById('lista');
            lista.innerHTML = '';
            data.forEach(p => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${p.nombre}</td>
                    <td>${p.codigo_barras}</td>
                    <td>${p.precio}</td>
                    <td>${p.stock}</td>
                    <td>${p.stock_minimo ?? ''}</td>
                    <td>${p.tipo ?? ''}</td>
                    <td class="actions">
                        <button onclick="editarProducto(${p.id})">Editar</button>
                        <button onclick="darDeBaja(${p.id})" style="background:#ff9800;">Dar de Baja</button>
                        <button onclick="eliminarPermanente(${p.id})" style="background:#f44336;">Eliminar</button>
                    </td>
                `;
                lista.appendChild(row);
            });
        })
        .catch(() => mostrarMensaje('Error de conexión al cargar productos', true));
}

function cargarInactivos() {
    fetch('/api/productos/inactivos/')
        .then(res => res.json())
        .then(data => {
            if (!Array.isArray(data)) {
                return;
            }
            const lista = document.getElementById('listaInactivos');
            lista.innerHTML = '';
            if (data.length === 0) {
                lista.innerHTML = '<tr><td colspan="6" style="text-align:center;">No hay productos inactivos</td></tr>';
                return;
            }
            data.forEach(p => {
                const row = document.createElement('tr');
                row.classList.add('inactivo');
                row.innerHTML = `
                    <td>${p.nombre}</td>
                    <td>${p.codigo_barras}</td>
                    <td>${p.precio}</td>
                    <td>${p.stock}</td>
                    <td>${p.tipo ?? ''}</td>
                    <td class="actions">
                        <button onclick="restaurarProducto(${p.id})" style="background:#4CAF50;">Restaurar</button>
                        <button onclick="eliminarPermanente(${p.id})" style="background:#f44336;">Eliminar</button>
                    </td>
                `;
                lista.appendChild(row);
            });
        });
}

function buscarProductos() {
    cargarProductos();
}

function limpiarFiltros() {
    document.getElementById('filtroBusqueda').value = '';
    document.getElementById('filtroTipo').value = '';
    document.getElementById('filtroStockBajo').checked = false;
    cargarProductos();
}

function guardarProducto() {
    if (editingProductId) {
        actualizarProducto();
    } else {
        crearProducto();
    }
}

function crearProducto() {
    const body = {
        nombre: document.getElementById('nombre').value,
        codigo_barras: document.getElementById('codigo').value,
        precio: document.getElementById('precio').value,
        precio_costo: document.getElementById('precioCosto').value,
        stock: document.getElementById('stock').value,
        stock_minimo: document.getElementById('stockMinimo').value,
        tipo: document.getElementById('tipo').value
    };

    fetch('/api/productos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    })
    .then(res => res.json().then(data => ({ status: res.status, body: data })))
    .then(({ status, body }) => {
        if (status !== 200 && status !== 201) {
            mostrarMensaje(body.message || (body.errors && body.errors.join(', ')) || 'Error al crear producto', true);
            return;
        }
        mostrarMensaje('Producto agregado correctamente');
        limpiarFormulario();
        cargarProductos();
    })
    .catch(() => mostrarMensaje('Error de conexión al crear producto', true));
}

function editarProducto(id) {
    fetch(`/api/productos/id/${id}`)
        .then(res => res.json())
        .then(data => {
            if (data.message) {
                mostrarMensaje(data.message, true);
                return;
            }
            editingProductId = id;
            document.getElementById('formTitle').textContent = 'Editar producto';
            document.getElementById('guardarBtn').textContent = 'Actualizar';
            document.getElementById('nombre').value = data.nombre || '';
            document.getElementById('codigo').value = data.codigo_barras || '';
            document.getElementById('precio').value = data.precio ?? '';
            document.getElementById('precioCosto').value = data.precio_costo ?? '';
            document.getElementById('stock').value = data.stock ?? '';
            document.getElementById('stockMinimo').value = data.stock_minimo ?? '';
            document.getElementById('tipo').value = data.tipo || '';
            mostrarMensaje('Editando producto');
        })
        .catch(() => mostrarMensaje('Error de conexión al cargar producto', true));
}

function actualizarProducto() {
    const body = {
        nombre: document.getElementById('nombre').value,
        codigo_barras: document.getElementById('codigo').value,
        precio: document.getElementById('precio').value,
        precio_costo: document.getElementById('precioCosto').value,
        stock: document.getElementById('stock').value,
        stock_minimo: document.getElementById('stockMinimo').value,
        tipo: document.getElementById('tipo').value
    };

    fetch(`/api/productos/id/${editingProductId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    })
    .then(res => res.json().then(data => ({ status: res.status, body: data })))
    .then(({ status, body }) => {
        if (status !== 200) {
            mostrarMensaje(body.message || (body.errors && body.errors.join(', ')) || 'Error al actualizar producto', true);
            return;
        }
        mostrarMensaje('Producto actualizado correctamente');
        limpiarFormulario();
        cargarProductos();
    })
    .catch(() => mostrarMensaje('Error de conexión al actualizar producto', true));
}

function darDeBaja(id) {
    if (!confirm('¿Dar de baja este producto?')) return;
    fetch(`/api/productos/id/${id}`, { method: 'DELETE' })
        .then(res => res.json())
        .then(data => {
            mostrarMensaje(data.message || 'Producto dado de baja');
            cargarProductos();
            cargarInactivos();
        })
        .catch(() => mostrarMensaje('Error de conexión al dar de baja producto', true));
}

function restaurarProducto(id) {
    if (!confirm('¿Restaurar este producto?')) return;
    fetch(`/api/productos/id/${id}/restaurar`, { method: 'POST' })
        .then(res => res.json())
        .then(data => {
            mostrarMensaje(data.message || 'Producto restaurado');
            cargarInactivos();
            cargarProductos();
        })
        .catch(() => mostrarMensaje('Error de conexión al restaurar producto', true));
}

function eliminarPermanente(id) {
    if (!confirm('⚠️ ADVERTENCIA: Esto eliminará permanentemente el producto. ¿Continuar?')) return;
    if (!confirm('⚠️ Esta acción NO se puede deshacer. ¿CONFIRMAR ELIMINACIÓN?')) return;

    fetch(`/api/productos/id/${id}/permanente`, { method: 'DELETE' })
        .then(res => res.json())
        .then(data => {
            if (data.message && data.message.includes('tiene registros')) {
                mostrarMensaje(data.message, true);
            } else {
                mostrarMensaje(data.message || 'Producto eliminado permanentemente');
            }
            cargarProductos();
            cargarInactivos();
        })
        .catch(() => mostrarMensaje('Error de conexión al eliminar producto', true));
}

function cancelarEdicion() {
    limpiarFormulario();
}

document.addEventListener('DOMContentLoaded', () => {
    llenarTipoSelects();
    cargarProductos();
});