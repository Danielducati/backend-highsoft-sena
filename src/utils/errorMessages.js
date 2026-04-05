// src/utils/errorMessages.js

const appointmentErrors = {
    NOT_FOUND: "Cita no encontrada",
    INVALID_ID: "ID inválido",
    REQUIRED_FIELDS: "fecha, hora y servicios son requeridos",
    PAST_DATE: "No se pueden crear citas en fechas pasadas",
    COMPLETED_DELETE:"No se puede eliminar una cita completada. Ya fue facturada.",
    CANCELLED_DELETE:"No se puede eliminar una cita cancelada. Solo se pueden eliminar citas pendientes.",

    HAS_SALES: (ventas) =>
    `No se puede eliminar. La cita tiene ${ventas} venta(s) asociada(s)`,

    TIME_ALREADY_BOOKED:"El empleado ya tiene una cita agendada en esa hora",
    SERVER_ERROR: "Error interno del servidor",
    INVALID_STATUS: "Estado de cita inválido",
    SERVICE_NOT_FOUND: "Uno o más servicios no existen",
    EMPLOYEE_NOT_FOUND: "El empleado no existe",
    INVALID_DATE_FORMAT: "Formato de fecha inválido",
    INVALID_TIME_FORMAT: "Formato de hora inválido",
    APPOINTMENT_OUTSIDE_SCHEDULE:"La cita está fuera del horario del empleado",
    EMPLOYEE_NOT_AVAILABLE:"El empleado no está disponible en ese horario"
};

const newsErrors = {
    NEWS_REQUIRED_FIELDS: "El empleado, la fecha y la descripción son obligatorios",
    NEWS_CONFLICT_APPOINTMENTS: "El empleado tiene servicios asignados en ese período",
    NEWS_NOT_FOUND: "La novedad no existe",
    NEWS_INVALID_STATUS: "Estado de novedad inválido",
    INVALID_DATE_RANGE:"La fecha de inicio debe ser menor que la fecha final",
    EMPLOYEE_NOT_FOUND:"El empleado no existe",
    NEWS_ALREADY_EXISTS:"Ya existe una novedad en ese periodo"
};

const scheduleErrors = {

    REQUIRED_FIELDS:
    "employeeId, weekStartDate y daySchedules son requeridos",

    INVALID_EMPLOYEE_ID:"El ID del empleado es inválido",
    INVALID_WEEK_DATE:"La fecha de inicio de semana es inválida",
    EMPTY_DAY_SCHEDULES:"Debe enviar al menos un horario en daySchedules",
    INVALID_TIME_RANGE:"La hora de inicio debe ser menor que la hora final",
    SCHEDULE_NOT_FOUND:"No se encontraron horarios para esa semana",

    SERVER_ERROR:
    "Error interno del servidor",

    OVERLAPPING_SCHEDULE:"Este horario se solapa con otro ya existente",
    OUTSIDE_WORK_HOURS:"El horario está fuera del horario laboral del spa",
    BLOCKED_DAY:"No se pueden crear horarios en este día"
};

const dashboardErrors = {
    INVALID_PERIOD: "El periodo enviado no es válido.",
    ERROR_FETCHING_STATS: "Error al obtener las estadísticas del dashboard.",
    SALES_TABLE_MISSING: "La tabla de ventas no existe en la base de datos."
  }

  const generalErrors = {
    INTERNAL_ERROR: "Error interno del servidor",
    UNAUTHORIZED: "No autorizado",
    FORBIDDEN: "No tienes permisos para realizar esta acción",
    INVALID_BODY: "El cuerpo de la petición es inválido",
    INVALID_QUERY: "Los parámetros enviados no son válidos",
    RESOURCE_ALREADY_EXISTS: "El recurso ya existe",
    RESOURCE_NOT_FOUND: "Recurso no encontrado",
    INVALID_DATE: "La fecha enviada no es válida",
    INVALID_TIME: "La hora enviada no es válida",
    INVALID_FORMAT: "Formato de datos inválido"
};

module.exports = { appointmentErrors, newsErrors, scheduleErrors, generalErrors, dashboardErrors };  