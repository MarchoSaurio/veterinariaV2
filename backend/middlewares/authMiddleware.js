// ======================
// MIDDLEWARE DE AUTENTICACIÓN
// ======================

/**
 * Verificar si el usuario está autenticado
 */
function isAuth(req, res, next) {
    if (!req.session.user) {
        return res.status(401).json({ 
            error: 'No autorizado',
            message: 'Debe iniciar sesión' 
        });
    }
    next();
}

/**
 * Verificar si el usuario tiene un rol específico
 * Roles: admin, gerente, vendedor
 */
function hasRole(...requiredRoles) {
    return (req, res, next) => {
        if (!req.session.user) {
            return res.status(401).json({ 
                error: 'No autorizado',
                message: 'Debe iniciar sesión' 
            });
        }

        const userRole = req.session.user.rol;
        
        if (!requiredRoles.includes(userRole)) {
            return res.status(403).json({ 
                error: 'Acceso denegado',
                message: `Requiere rol: ${requiredRoles.join(' o ')}. Tu rol: ${userRole}` 
            });
        }

        next();
    };
}

/**
 * Middleware para registrar acciones
 */
function logAction(req, res, next) {
    const timestamp = new Date().toISOString();
    const user = req.session.user ? req.session.user.username : 'anónimo';
    const action = `${req.method} ${req.path}`;
    
    console.log(`[${timestamp}] ${user} → ${action}`);
    
    next();
}

module.exports = {
    isAuth,
    hasRole,
    logAction
};
