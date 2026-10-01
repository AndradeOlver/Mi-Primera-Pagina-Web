CREATE DATABASE JADE
GO

USE JADE
GO

-- 1. Tablas Maestras
CREATE TABLE Usuario (
    ID INT IDENTITY(1110,15) PRIMARY KEY,
    Nombre VARCHAR(30) NOT NULL,
    Rol VARCHAR(20) NOT NULL -- Ej: 'Regular', 'Administrador'
);

CREATE TABLE Cliente (
    Codigo INT IDENTITY(2220,15) PRIMARY KEY,
    Nombre VARCHAR(50) NOT NULL,
    Numero CHAR(9) UNIQUE
);

CREATE TABLE Producto (
    Codigo INT IDENTITY(3330,15) PRIMARY KEY,
    Nombre VARCHAR(50) NOT NULL,
    Tipo VARCHAR(30),
    Precio DECIMAL(10,2) NOT NULL -- Precio base establecido por el negocio
);

-- 2. Tablas Transaccionales (Cabecera y Detalle)
CREATE TABLE Pedido (
    Codigo INT IDENTITY(5000,1) PRIMARY KEY,
    CodigoCliente INT NOT NULL,
    ID_Usuario INT NOT NULL,
    fecha DATETIME DEFAULT GETDATE(),
    Estado VARCHAR(20) DEFAULT 'Pendiente',
    FOREIGN KEY (CodigoCliente) REFERENCES Cliente(Codigo),
    FOREIGN KEY (ID_Usuario) REFERENCES Usuario(ID)
);

CREATE TABLE DetallePedido (
    CodigoPedido INT NOT NULL,
    CodigoProducto INT NOT NULL,
    Cantidad INT NOT NULL,
    Precio DECIMAL(10,2) NOT NULL, -- Precio variable establecido por el usuario al vender
    PRIMARY KEY (CodigoPedido, CodigoProducto), -- Llave compuesta
    FOREIGN KEY (CodigoPedido) REFERENCES Pedido(Codigo),
    FOREIGN KEY (CodigoProducto) REFERENCES Producto(Codigo)
);

-- 3. Finanzas (Cobranzas)
CREATE TABLE Cobranza (
    Codigo INT IDENTITY(1,1) PRIMARY KEY,
    CodigoPedido INT NOT NULL,
    ID_Usuario INT NOT NULL,
    Fecha DATETIME DEFAULT GETDATE(),
    Monto DECIMAL(10,2) NOT NULL,
    TipoPago VARCHAR(20) NOT NULL, -- Ej: 'Efectivo', 'Transacción'
    FOREIGN KEY (CodigoPedido) REFERENCES Pedido(Codigo),
    FOREIGN KEY (ID_Usuario) REFERENCES Usuario(ID)
);

-- 4. Sistema y Auditoría
CREATE TABLE Auditoria (
    Codigo INT IDENTITY(1,1) PRIMARY KEY,
    ID_Usuario INT NOT NULL,
    Fecha DATETIME DEFAULT GETDATE(),
    TablaAfectada VARCHAR(30) NOT NULL,
    idRegistro INT NOT NULL,
    accion VARCHAR(20) NOT NULL, -- Ej: 'CREAR', 'MODIFICAR'
    detalle VARCHAR(MAX),
    FOREIGN KEY (ID_Usuario) REFERENCES Usuario(ID)
);