export class Usuario {
    id?: number; 
    nombre: string;
    password: string; 
    rol: string;

    constructor(nombre: string, password: string, rol: string, id?: number) {
        this.nombre = nombre;
        this.rol = rol;
        this.password = password;
        this.id = id;
    }
}