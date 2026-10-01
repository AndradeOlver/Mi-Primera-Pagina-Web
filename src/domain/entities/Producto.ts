export class Producto {
    codigo?: number; // Generado por IDENTITY[cite: 3]
    nombre: string;
    tipo?: string;
    precio: number;

    constructor(nombre: string, precio: number, tipo?: string, codigo?: number) {
        this.nombre = nombre;
        this.precio = precio;
        this.tipo = tipo;
        this.codigo = codigo;
    }
}