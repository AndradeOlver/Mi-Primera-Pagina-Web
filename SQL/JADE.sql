CREATE DATABASE JADE;
GO

USE JADE;
GO

-- =========================================================================
-- 1. TABLAS MAESTRAS
-- =========================================================================
CREATE TABLE Usuario (
    ID INT IDENTITY(1110,15) PRIMARY KEY,
    Nombre VARCHAR(30) NOT NULL,
    Rol VARCHAR(20) NOT NULL,
    CONSTRAINT CHK_Usuario_Rol CHECK (Rol IN ('Regular', 'Administrador'))
);

CREATE TABLE Cliente (
    Codigo INT IDENTITY(2220,15) PRIMARY KEY,
    Nombre VARCHAR(50) NOT NULL,
    Numero CHAR(9) NULL,
    -- En SQL Server creamos un índice único filtrado abajo para permitir múltiples NULLs
    CONSTRAINT CHK_Cliente_Numero_NueveDigitos CHECK (
        Numero IS NULL OR Numero LIKE '[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]'
    )
);

-- Índice único filtrado: obliga a que el celular sea irrepetible SI existe, pero permite varios clientes sin teléfono (NULL)
CREATE UNIQUE NONCLUSTERED INDEX UQ_Cliente_Numero_NoNulo
ON Cliente(Numero)
WHERE Numero IS NOT NULL;

CREATE TABLE Producto (
    Codigo INT IDENTITY(3330,15) PRIMARY KEY,
    Nombre VARCHAR(50) NOT NULL,
    Tipo VARCHAR(30) NULL,
    Precio DECIMAL(10,2) NOT NULL,
    CONSTRAINT CHK_Producto_PrecioPositivo CHECK (Precio > 0)
);

-- =========================================================================
-- 2. TABLAS TRANSACCIONALES (CABECERA Y DETALLE)
-- =========================================================================
CREATE TABLE Pedido (
    Codigo INT IDENTITY(5000,1) PRIMARY KEY,
    CodigoCliente INT NOT NULL,
    ID_Usuario INT NOT NULL,
    fecha DATETIME NOT NULL DEFAULT GETDATE(),
    MontoPagado DECIMAL(10,2) NOT NULL DEFAULT 0.00, -- Amortización acumulada por abonos FIFO
    Estado VARCHAR(20) NOT NULL DEFAULT 'Pendiente',
    CONSTRAINT FK_Pedido_Cliente FOREIGN KEY (CodigoCliente) REFERENCES Cliente(Codigo),
    CONSTRAINT FK_Pedido_Usuario FOREIGN KEY (ID_Usuario) REFERENCES Usuario(ID),
    CONSTRAINT CHK_Pedido_MontoPagado CHECK (MontoPagado >= 0),
    CONSTRAINT CHK_Pedido_Estado CHECK (Estado IN ('Pendiente', 'Pagado', 'Anulado'))
);

CREATE TABLE DetallePedido (
    CodigoPedido INT NOT NULL,
    CodigoProducto INT NOT NULL,
    Cantidad INT NOT NULL,
    Precio DECIMAL(10,2) NOT NULL, -- Precio variable pactado al momento de la venta
    CONSTRAINT PK_DetallePedido PRIMARY KEY (CodigoPedido, CodigoProducto),
    CONSTRAINT FK_DetallePedido_Pedido FOREIGN KEY (CodigoPedido) REFERENCES Pedido(Codigo),
    CONSTRAINT FK_DetallePedido_Producto FOREIGN KEY (CodigoProducto) REFERENCES Producto(Codigo),
    CONSTRAINT CHK_DetallePedido_Cantidad CHECK (Cantidad > 0),
    CONSTRAINT CHK_DetallePedido_Precio CHECK (Precio > 0)
);

-- =========================================================================
-- 3. FINANZAS (COBRANZAS POR CLIENTE O POR PEDIDO PUNTUAL)
-- =========================================================================
CREATE TABLE Cobranza (
    Codigo INT IDENTITY(1,1) PRIMARY KEY,
    CodigoCliente INT NOT NULL, -- Titular del pago (siempre obligatorio)
    CodigoPedido INT NULL,      -- NULL = Abono general a deuda acumulada; Con valor = Pago directo al contado
    ID_Usuario INT NOT NULL,
    Fecha DATETIME NOT NULL DEFAULT GETDATE(),
    Monto DECIMAL(10,2) NOT NULL,
    TipoPago VARCHAR(20) NOT NULL,
    CONSTRAINT FK_Cobranza_Cliente FOREIGN KEY (CodigoCliente) REFERENCES Cliente(Codigo),
    CONSTRAINT FK_Cobranza_Pedido FOREIGN KEY (CodigoPedido) REFERENCES Pedido(Codigo),
    CONSTRAINT FK_Cobranza_Usuario FOREIGN KEY (ID_Usuario) REFERENCES Usuario(ID),
    CONSTRAINT CHK_Cobranza_MontoPositivo CHECK (Monto > 0),
    CONSTRAINT CHK_Cobranza_TipoPago CHECK (TipoPago IN ('Efectivo', 'Transacción'))
);

-- =========================================================================
-- 4. SISTEMA Y AUDITORÍA
-- =========================================================================
CREATE TABLE Auditoria (
    Codigo INT IDENTITY(1,1) PRIMARY KEY,
    ID_Usuario INT NOT NULL,
    Fecha DATETIME NOT NULL DEFAULT GETDATE(),
    TablaAfectada VARCHAR(30) NOT NULL,
    idRegistro INT NOT NULL,
    accion VARCHAR(20) NOT NULL, -- 'CREAR', 'MODIFICAR'
    detalle VARCHAR(MAX) NULL,
    CONSTRAINT FK_Auditoria_Usuario FOREIGN KEY (ID_Usuario) REFERENCES Usuario(ID)
);
GO

-- =========================================================================
-- 5. TRIGGERS DE AUDITORÍA AUTOMÁTICA (MOTOR SQL SERVER)
-- =========================================================================

-- Trigger 1: Registra automáticamente en Auditoria cada vez que entra dinero a Cobranza
CREATE TRIGGER TR_Auditoria_Cobranza_Insert
ON Cobranza
AFTER INSERT
AS
BEGIN
    SET NOCOUNT ON;

    INSERT INTO Auditoria (ID_Usuario, Fecha, TablaAfectada, idRegistro, accion, detalle)
    SELECT 
        i.ID_Usuario,
        GETDATE(),
        'Cobranza',
        i.Codigo,
        'CREAR',
        CONCAT(
            'Cobro registrado por S/ ', CAST(i.Monto AS VARCHAR(20)),
            ' | TipoPago: ', i.TipoPago,
            ' | Cliente: ', CAST(i.CodigoCliente AS VARCHAR(15)),
            ' | Pedido: ', ISNULL(CAST(i.CodigoPedido AS VARCHAR(15)), 'ABONO_CUENTA_GENERAL')
        )
    FROM inserted i;
END;
GO

-- Trigger 2: Audita la creación de un Pedido o su amortización/cambio de Estado cuando se aplica FIFO
CREATE TRIGGER TR_Auditoria_Pedido_Insert_Update
ON Pedido
AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    -- Si la tabla virtual 'deleted' está vacía, fue un INSERT (nuevo pedido)
    IF NOT EXISTS (SELECT 1 FROM deleted)
    BEGIN
        INSERT INTO Auditoria (ID_Usuario, Fecha, TablaAfectada, idRegistro, accion, detalle)
        SELECT 
            i.ID_Usuario,
            GETDATE(),
            'Pedido',
            i.Codigo,
            'CREAR',
            CONCAT(
                'Pedido creado para Cliente ', CAST(i.CodigoCliente AS VARCHAR(15)),
                ' | Estado inicial: ', i.Estado,
                ' | MontoPagado inicial: S/ ', CAST(i.MontoPagado AS VARCHAR(20))
            )
        FROM inserted i;
    END
    ELSE
    BEGIN
        -- Si hay datos en 'deleted' e 'inserted', fue un UPDATE (ej. liquidación FIFO o anulación)
        INSERT INTO Auditoria (ID_Usuario, Fecha, TablaAfectada, idRegistro, accion, detalle)
        SELECT 
            i.ID_Usuario,
            GETDATE(),
            'Pedido',
            i.Codigo,
            'MODIFICAR',
            CONCAT(
                'MontoPagado: S/ ', CAST(d.MontoPagado AS VARCHAR(20)), ' -> S/ ', CAST(i.MontoPagado AS VARCHAR(20)),
                ' | Estado: ', d.Estado, ' -> ', i.Estado
            )
        FROM inserted i
        INNER JOIN deleted d ON i.Codigo = d.Codigo
        WHERE i.MontoPagado <> d.MontoPagado OR i.Estado <> d.Estado;
    END
END;
GO