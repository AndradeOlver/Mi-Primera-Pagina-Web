import {DetallePedido} from './DetallePedido.js';

export class Pedido {
    codigo?: number; // Generado por IDENTITY[cite: 3]
    codigoCliente: number;
    idUsuario: number;
    fecha?: Date; // Generado por DEFAULT GETDATE()[cite: 3]
    estado: string; // DEFAULT 'Pendiente'[cite: 3]
    
    // Propiedad relacional para manejar la lógica de negocio en el backend
    detalles: DetallePedido[];

    constructor(codigoCliente: number, idUsuario: number, estado: string = 'Pendiente', detalles: DetallePedido[] = [], codigo?: number, fecha?: Date) {
        this.codigoCliente = codigoCliente;
        this.idUsuario = idUsuario;
        this.estado = estado;
        this.detalles = detalles;
        this.codigo = codigo;
        this.fecha = fecha;
    }
}