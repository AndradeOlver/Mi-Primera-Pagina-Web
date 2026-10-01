export class DetallePedido {
    codigoPedido: number;
    codigoProducto: number;
    cantidad: number;
    precio: number;

    constructor(codigoPedido: number, codigoProducto: number, cantidad: number, precio: number) {
        this.codigoPedido = codigoPedido;
        this.codigoProducto = codigoProducto;
        this.cantidad = cantidad;
        this.precio = precio;
    }
}