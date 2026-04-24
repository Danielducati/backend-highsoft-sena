-- Migration to add HorarioHistorial table for schedule history tracking
-- Run this SQL script in your SQL Server database

CREATE TABLE [dbo].[Horario_Historial] (
    [PK_id_horario_historial] int IDENTITY(1,1) NOT NULL,
    [FK_id_empleado] int NOT NULL,
    [week_start_date] date NOT NULL,
    [version_number] int NOT NULL DEFAULT 1,
    [change_reason] varchar(500) NULL,
    [changed_by] int NULL,
    [created_at] datetime2 NOT NULL DEFAULT GETDATE(),
    [schedule_snapshot] text NOT NULL,
    
    CONSTRAINT [PK_Horario_Historial] PRIMARY KEY ([PK_id_horario_historial]),
    CONSTRAINT [FK_HorarioHistorial_Empleado] FOREIGN KEY ([FK_id_empleado]) REFERENCES [dbo].[Empleado] ([PK_id_empleado]),
    CONSTRAINT [FK_HorarioHistorial_Usuario] FOREIGN KEY ([changed_by]) REFERENCES [dbo].[Usuarios] ([PK_id_usuario]),
    CONSTRAINT [UQ_HorarioHistorial_Version] UNIQUE ([FK_id_empleado], [week_start_date], [version_number])
);

-- Create indexes for better performance
CREATE INDEX [IX_HorarioHistorial_Empleado_Week] ON [dbo].[Horario_Historial] ([FK_id_empleado], [week_start_date]);
CREATE INDEX [IX_HorarioHistorial_CreatedAt] ON [dbo].[Horario_Historial] ([created_at]);

-- Add some sample data for testing (optional)
-- INSERT INTO [dbo].[Horario_Historial] 
-- ([FK_id_empleado], [week_start_date], [version_number], [change_reason], [changed_by], [schedule_snapshot])
-- VALUES 
-- (1, '2024-01-15', 1, 'Horario inicial', 1, '{"employeeId":1,"weekStartDate":"2024-01-15","daySchedules":[{"dayIndex":0,"fecha":"2024-01-15","startTime":"08:00","endTime":"16:00","diaSemana":"Lunes"}],"savedAt":"2024-01-15T08:00:00.000Z"}');

PRINT 'HorarioHistorial table created successfully!';