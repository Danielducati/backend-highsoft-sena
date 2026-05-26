// src/utils/errorMessages.js

const appointmentErrors = {
    // Errores de validación
    NOT_FOUND: "No se encontró la cita solicitada. Verifica que el ID sea correcto.",
    INVALID_ID: "El ID de la cita no es válido. Debe ser un número entero positivo.",
    REQUIRED_FIELDS: "Faltan campos obligatorios: fecha, hora y al menos un servicio son requeridos.",
    INVALID_DATE_FORMAT: "El formato de la fecha es incorrecto. Usa el formato YYYY-MM-DD (ejemplo: 2026-05-25).",
    INVALID_TIME_FORMAT: "El formato de la hora es incorrecto. Usa el formato HH:MM (ejemplo: 14:30).",
    
    // Errores de lógica de negocio
    PAST_DATE: "No se pueden crear citas en fechas pasadas. Selecciona una fecha futura.",
    TIME_ALREADY_BOOKED: "El empleado ya tiene una cita agendada en ese horario. Selecciona otra hora o empleado.",
    APPOINTMENT_OUTSIDE_SCHEDULE: "La cita está fuera del horario laboral del empleado. Verifica el horario disponible.",
    EMPLOYEE_NOT_AVAILABLE: "El empleado no está disponible en ese horario debido a una novedad registrada (permiso, incapacidad, etc.).",
    
    // Errores de eliminación
    COMPLETED_DELETE: "No se puede eliminar una cita completada porque ya fue facturada. Contacta al administrador si necesitas hacer cambios.",
    CANCELLED_DELETE: "No se puede eliminar una cita cancelada. Solo se pueden eliminar citas pendientes.",
    HAS_SALES: (ventas) => `No se puede eliminar esta cita porque tiene ${ventas} venta(s) asociada(s). Elimina primero las ventas relacionadas.`,
    
    // Errores de estado
    INVALID_STATUS: "El estado de la cita no es válido. Los estados permitidos son: pendiente, completada, cancelada.",
    
    // Errores de recursos
    SERVICE_NOT_FOUND: "Uno o más servicios seleccionados no existen en el sistema. Verifica los servicios disponibles.",
    EMPLOYEE_NOT_FOUND: "El empleado seleccionado no existe en el sistema. Verifica la lista de empleados disponibles.",
    CLIENT_NOT_FOUND: "El cliente seleccionado no existe en el sistema. Verifica que el cliente esté registrado.",
    
    // Error genérico
    SERVER_ERROR: "Ocurrió un error al procesar la cita. Por favor, intenta nuevamente o contacta al soporte técnico.",
};

const newsErrors = {
    // Errores de validación
    NEWS_REQUIRED_FIELDS: "Faltan campos obligatorios: empleado, tipo de novedad, fecha y descripción son requeridos.",
    NEWS_NOT_FOUND: "No se encontró la novedad solicitada. Verifica que el ID sea correcto.",
    NEWS_INVALID_STATUS: "El estado de la novedad no es válido. Los estados permitidos son: pendiente, aprobada, rechazada.",
    INVALID_DATE_RANGE: "La fecha de inicio debe ser anterior o igual a la fecha final. Verifica las fechas ingresadas.",
    INVALID_TYPE: "El tipo de novedad no es válido. Los tipos permitidos son: retraso, ausencia, permiso, incapacidad, otro.",
    
    // Errores de lógica de negocio
    NEWS_CONFLICT_APPOINTMENTS: "El empleado tiene citas asignadas en ese período. Debes reasignar o cancelar las citas antes de aprobar esta novedad.",
    NEWS_ALREADY_EXISTS: "Ya existe una novedad registrada para este empleado en ese período. Verifica las fechas.",
    EMPLOYEE_NOT_FOUND: "El empleado seleccionado no existe en el sistema. Verifica la lista de empleados disponibles.",
    NO_SCHEDULE_FOR_DATE: "El empleado no tiene horario registrado para la fecha seleccionada. Los tipos 'retraso' y 'ausencia' requieren horario previo.",
    HOURS_REQUIRED_FOR_TYPE: "El tipo de novedad seleccionado requiere especificar las horas de inicio y fin.",
    HOURS_OUTSIDE_SCHEDULE: "Las horas especificadas están fuera del horario laboral del empleado para ese día.",
    
    // Error genérico
    SERVER_ERROR: "Ocurrió un error al procesar la novedad. Por favor, intenta nuevamente o contacta al soporte técnico.",
};

const scheduleErrors = {
    // Errores de validación
    REQUIRED_FIELDS: "Faltan campos obligatorios: empleado, fecha de inicio de semana y horarios diarios son requeridos.",
    INVALID_EMPLOYEE_ID: "El ID del empleado no es válido. Debe ser un número entero positivo.",
    INVALID_WEEK_DATE: "La fecha de inicio de semana no es válida. Debe ser un lunes en formato YYYY-MM-DD.",
    EMPTY_DAY_SCHEDULES: "Debes especificar al menos un horario diario. No se puede crear una semana sin horarios.",
    INVALID_TIME_RANGE: "La hora de inicio debe ser anterior a la hora de fin. Verifica los horarios ingresados.",
    SCHEDULE_NOT_FOUND: "No se encontraron horarios para la semana solicitada. Verifica la fecha o crea un nuevo horario.",
    
    // Errores de lógica de negocio
    OVERLAPPING_SCHEDULE: "Este horario se solapa con otro ya existente para el mismo empleado. Verifica los horarios registrados.",
    OUTSIDE_WORK_HOURS: "El horario está fuera del horario laboral del spa (generalmente 8:00 AM - 8:00 PM). Ajusta las horas.",
    BLOCKED_DAY: "No se pueden crear horarios en este día porque está bloqueado o es festivo.",
    TEMPLATE_ALREADY_EXISTS: "Ya existe una plantilla de horario activa para este período. Desactiva la anterior antes de crear una nueva.",
    
    // Error genérico
    SERVER_ERROR: "Ocurrió un error al procesar el horario. Por favor, intenta nuevamente o contacta al soporte técnico.",
};

const dashboardErrors = {
    INVALID_PERIOD: "El período seleccionado no es válido. Los períodos permitidos son: hoy, semana, mes, año.",
    ERROR_FETCHING_STATS: "No se pudieron obtener las estadísticas del dashboard. Verifica la conexión a la base de datos.",
    SALES_TABLE_MISSING: "La tabla de ventas no existe en la base de datos. Contacta al administrador del sistema.",
    NO_DATA_AVAILABLE: "No hay datos disponibles para el período seleccionado. Intenta con otro rango de fechas.",
};

const authErrors = {
    // Errores de autenticación
    INVALID_CREDENTIALS: "Correo o contraseña incorrectos. Verifica tus datos e intenta nuevamente.",
    USER_INACTIVE: "Tu cuenta está inactiva. Contacta al administrador para reactivarla.",
    USER_NOT_FOUND: "No existe un usuario registrado con ese correo electrónico.",
    INVALID_TOKEN: "Tu sesión ha expirado o el token es inválido. Por favor, inicia sesión nuevamente.",
    TOKEN_EXPIRED: "Tu sesión ha expirado. Por favor, inicia sesión nuevamente.",
    UNAUTHORIZED: "No tienes autorización para acceder a este recurso. Inicia sesión primero.",
    
    // Errores de registro
    EMAIL_ALREADY_EXISTS: "Ya existe un usuario registrado con ese correo electrónico. Usa otro correo o inicia sesión.",
    DOCUMENT_ALREADY_EXISTS: "Ya existe un usuario registrado con ese tipo y número de documento.",
    WEAK_PASSWORD: "La contraseña es muy débil. Debe tener al menos 8 caracteres, incluir mayúsculas, minúsculas y números.",
    REQUIRED_FIELDS: "Faltan campos obligatorios: correo, contraseña, nombre y apellido son requeridos.",
    INVALID_EMAIL: "El formato del correo electrónico no es válido. Ejemplo: usuario@ejemplo.com",
    
    // Errores de permisos
    FORBIDDEN: "No tienes permisos para realizar esta acción. Contacta al administrador si necesitas acceso.",
    ROLE_NOT_FOUND: "El rol especificado no existe en el sistema.",
};

const userErrors = {
    // Errores de validación
    USER_NOT_FOUND: "No se encontró el usuario solicitado. Verifica que el ID sea correcto.",
    INVALID_USER_ID: "El ID del usuario no es válido. Debe ser un número entero positivo.",
    REQUIRED_FIELDS: "Faltan campos obligatorios: nombre, apellido, correo y rol son requeridos.",
    INVALID_EMAIL: "El formato del correo electrónico no es válido. Ejemplo: usuario@ejemplo.com",
    INVALID_PHONE: "El formato del teléfono no es válido. Debe contener solo números y tener 10 dígitos.",
    INVALID_DOCUMENT: "El número de documento no es válido. Verifica el tipo y número de documento.",
    
    // Errores de lógica de negocio
    EMAIL_ALREADY_EXISTS: "Ya existe un usuario registrado con ese correo electrónico.",
    DOCUMENT_ALREADY_EXISTS: "Ya existe un usuario registrado con ese tipo y número de documento.",
    CANNOT_DELETE_ADMIN: "No se puede eliminar un usuario con rol de administrador por seguridad.",
    CANNOT_DEACTIVATE_SELF: "No puedes desactivar tu propia cuenta. Solicita a otro administrador que lo haga.",
    USER_HAS_APPOINTMENTS: "No se puede eliminar el usuario porque tiene citas asociadas. Cancela o reasigna las citas primero.",
    
    // Error genérico
    SERVER_ERROR: "Ocurrió un error al procesar el usuario. Por favor, intenta nuevamente o contacta al soporte técnico.",
};

const serviceErrors = {
    // Errores de validación
    SERVICE_NOT_FOUND: "No se encontró el servicio solicitado. Verifica que el ID sea correcto.",
    INVALID_SERVICE_ID: "El ID del servicio no es válido. Debe ser un número entero positivo.",
    REQUIRED_FIELDS: "Faltan campos obligatorios: nombre, categoría, duración y precio son requeridos.",
    INVALID_DURATION: "La duración del servicio no es válida. Debe ser un número positivo en minutos.",
    INVALID_PRICE: "El precio del servicio no es válido. Debe ser un número positivo.",
    
    // Errores de lógica de negocio
    SERVICE_NAME_EXISTS: "Ya existe un servicio con ese nombre. Usa un nombre diferente.",
    CATEGORY_NOT_FOUND: "La categoría seleccionada no existe en el sistema.",
    SERVICE_HAS_APPOINTMENTS: "No se puede eliminar el servicio porque tiene citas asociadas. Cancela las citas primero.",
    SERVICE_HAS_SALES: "No se puede eliminar el servicio porque tiene ventas asociadas.",
    
    // Error genérico
    SERVER_ERROR: "Ocurrió un error al procesar el servicio. Por favor, intenta nuevamente o contacta al soporte técnico.",
};

const generalErrors = {
    INTERNAL_ERROR: "Ocurrió un error interno en el servidor. Por favor, intenta nuevamente más tarde.",
    UNAUTHORIZED: "No estás autorizado para acceder a este recurso. Inicia sesión primero.",
    FORBIDDEN: "No tienes permisos suficientes para realizar esta acción.",
    INVALID_BODY: "Los datos enviados no son válidos. Verifica el formato de la información.",
    INVALID_QUERY: "Los parámetros de búsqueda no son válidos. Verifica los filtros aplicados.",
    RESOURCE_ALREADY_EXISTS: "El recurso que intentas crear ya existe en el sistema.",
    RESOURCE_NOT_FOUND: "No se encontró el recurso solicitado. Verifica que exista.",
    INVALID_DATE: "La fecha enviada no es válida. Usa el formato YYYY-MM-DD (ejemplo: 2026-05-25).",
    INVALID_TIME: "La hora enviada no es válida. Usa el formato HH:MM (ejemplo: 14:30).",
    INVALID_FORMAT: "El formato de los datos enviados no es correcto. Verifica la estructura de la información.",
    DATABASE_ERROR: "Error al conectar con la base de datos. Verifica la conexión o contacta al soporte técnico.",
    VALIDATION_ERROR: "Los datos no pasaron la validación. Revisa los campos marcados en rojo.",
};

module.exports = { 
    appointmentErrors, 
    newsErrors, 
    scheduleErrors, 
    dashboardErrors,
    authErrors,
    userErrors,
    serviceErrors,
    generalErrors 
};  