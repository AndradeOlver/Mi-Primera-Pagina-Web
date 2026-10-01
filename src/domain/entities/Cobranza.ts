// 3. Entidad Financiera
export class Cobranza {
    codigo?: number; // Generado por IDENTITY[cite: 3]
    codigoPedido: number;
    idUsuario: number;
    fecha?: Date; // Generado por DEFAULT GETDATE()[cite: 3]
    monto: number;
    tipoPago: string;

    constructor(codigoPedido: number, idUsuario: number, monto: number, tipoPago: string, codigo?: number, fecha?: Date) {
        this.codigoPedido = codigoPedido;
        this.idUsuario = idUsuario;
        this.monto = monto;
        this.tipoPago = tipoPago;
        this.codigo = codigo;
        this.fecha = fecha;
    }
}