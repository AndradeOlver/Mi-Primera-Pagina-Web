export class Cliente {
    codigo?: number; 
    nombre: string;
    numero?: string; 

    constructor(nombre: string, numero?: string, codigo?: number) {
        this.nombre = nombre;
        this.numero = numero;
        this.codigo = codigo;
    }
}
