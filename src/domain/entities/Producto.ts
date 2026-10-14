/**
 * CAPA DE DOMINIO: Entidad Producto
 * Regla de Clean Architecture: Este archivo NO importa nada de Express, 
 * ni de SQL Server (mssql), ni de librerías externas. Es TypeScript puro.
 */

export class Producto {
  /**
   * En TypeScript, declarar los modificadores (public, readonly) directamente 
   * en los parámetros del constructor hace dos cosas automáticamente:
   * 1. Declara el atributo en la clase.
   * 2. Asigna el valor recibido (equivale a escribir this.codigo = codigo).
   * 
   * Usamos 'readonly' en 'codigo' porque el identificador de un producto 
   * no debe cambiar una vez instanciado en memoria.
   */
  constructor(
    public readonly codigo: string,
    public nombre: string,
    public precio: number,
    public stock: number = 0 // Parámetro con valor por defecto si no se envía
  ) {
    // Patrón "Always-Valid Entity": La entidad se valida a sí misma al nacer.
    // Si alguien intenta hacer: new Producto("P001", "Teclado", -50)
    // el programa se detiene inmediatamente aquí antes de ensuciar la base de datos.
    this.validarPrecio();
    this.validarDatosBasicos();
  }

  /**
   * Regla de Negocio 1: El precio jamás puede ser menor o igual a cero.
   * Tipo de retorno ': void' indica que este método no devuelve ningún valor,
   * solo verifica y, si algo falla, corta la ejecución lanzando una excepción.
   */
  public validarPrecio(): void {
    if (this.precio <= 0) {
      throw new Error(
        `Error de Dominio: El precio del producto (${this.nombre}) debe ser mayor a 0. Valor recibido: ${this.precio}`
      );
    }
  }

  /**
   * Regla de Negocio 2: Código y nombre no pueden ser textos vacíos o solo espacios.
   * El método .trim() elimina espacios en blanco al inicio y al final.
   */
  private validarDatosBasicos(): void {
    if (!this.codigo || this.codigo.trim().length === 0) {
      throw new Error('Error de Dominio: El código del producto es obligatorio.');
    }

    if (!this.nombre || this.nombre.trim().length === 0) {
      throw new Error('Error de Dominio: El nombre del producto es obligatorio.');
    }

    if (this.stock < 0) {
      throw new Error('Error de Dominio: El stock inicial no puede ser negativo.');
    }
  }
}