const express = require('express');
const session = require('express-session');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const printerConfig = require('./config/printer');

const app = express();
const PORT = 3000;

// ======================
// MIDDLEWARE
// ======================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
    secret: 'clinica_secret_pro',
    resave: false,
    saveUninitialized: true,
}));

app.use(express.static(path.join(__dirname, '../frontend')));

// ======================
// DB
// ======================
const db = new sqlite3.Database(
    path.join(__dirname, 'database/clinica.db'),
    (err) => {
        if (err) console.error('❌ DB:', err.message);
        else console.log('✅ SQLite conectado');
    }
);
    console.log('Configured printer interface:', printerConfig.interface || process.env.PRINTER_INTERFACE || 'not set');

// Helper timestamps - Zona horaria de Ciudad de México
function now() {
    // Obtener la fecha en zona horaria de México (Mexico City)
    const ahora = new Date();
    const formatter = new Intl.DateTimeFormat('es-MX', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
        timeZone: 'America/Mexico_City'
    });
    const partes = formatter.formatToParts(ahora);
    // Normalizar hora 24 -> 00 (algunas locales pueden devolver 24 para medianoche)
    let hour = partes.find(p => p.type === 'hour').value;
    if (hour === '24') hour = '00';
    const fecha = `${partes.find(p => p.type === 'year').value}-${partes.find(p => p.type === 'month').value}-${partes.find(p => p.type === 'day').value} ${hour}:${partes.find(p => p.type === 'minute').value}:${partes.find(p => p.type === 'second').value}`;
    return fecha;
}

// ======================
// AUTH
// ======================
app.post('/login', (req, res) => {
    const { username, password } = req.body;

    db.get(
        `SELECT * FROM usuarios WHERE username = ? AND password = ?`,
        [username, password],
        (err, user) => {
            if (err) return res.status(500).json(err);
            if (!user) return res.status(401).json({ message: 'Credenciales incorrectas' });

            req.session.user = user;
            res.json({ user });
        }
    );
});

function isAuth(req, res, next) {
    if (!req.session.user) {
        return res.status(401).json({ message: 'No autorizado' });
    }
    next();
}

// ======================
// PRODUCTOS
const createProductosController = require('./controllers/productosController');
const createProductosRoutes = require('./routes/productosRoutes');

const productosController = createProductosController(db, now);
app.use('/api/productos', createProductosRoutes({ controller: productosController, isAuth }));

// ======================
// VENTAS
const createVentasController = require('./controllers/ventasController');
const createVentasRoutes = require('./routes/ventasRoutes');

const ventasController = createVentasController(db, now);
app.use('/api/ventas', createVentasRoutes({ controller: ventasController, isAuth }));

// ======================
// SERVICIOS
// ======================
app.get('/api/servicios', isAuth, (req, res) => {
    db.all(`SELECT * FROM servicios WHERE activo = 1`, [], (err, rows) => {
        if (err) return res.status(500).json(err);
        res.json(rows);
    });
});

app.post('/api/servicios', isAuth, (req, res) => {
    const { nombre, precio } = req.body;

    db.run(
        `INSERT INTO servicios (nombre, precio, activo, created_at, updated_at)
         VALUES (?, ?, 1, ?, ?)`,
        [nombre, precio, now(), now()],
        function (err) {
            if (err) return res.status(500).json(err);
            res.json({ id: this.lastID });
        }
    );
});

// ======================
// CAJA
// ======================
app.get('/api/caja', isAuth, (req, res) => {
    db.all(
        `SELECT * FROM movimientos_caja ORDER BY fecha DESC`,
        [],
        (err, rows) => {
            if (err) return res.status(500).json(err);
            res.json(rows);
        }
    );
});



// ======================
function startServer(port) {
    const server = app.listen(port, () => {
        console.log(`http://localhost:${port}`);
    });

    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            const nextPort = Number(port) + 1;
            console.warn(`⚠️ Puerto ${port} ocupado. Intentando ${nextPort}...`);
            startServer(nextPort);
        } else {
            console.error('❌ Error al iniciar el servidor:', err);
            process.exit(1);
        }
    });
}

startServer(PORT);

