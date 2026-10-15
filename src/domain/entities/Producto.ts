/**
 * CAPA DE DOMINIO: Entidad Producto (Encapsulamiento estricto)
 * Mapeo exacto de la tabla en JADE.sql:
 * CREATE TABLE Producto (
 *     Codigo INT IDENTITY(3330,15) PRIMARY KEY,
 *     Nombre VARCHAR(50) NOT NULL,
 *     Tipo VARCHAR(30),
 *     Precio DECIMAL(10,2) NOT NULL -- Precio base establecido por el negocio
 * );
 */

export class Producto {
  private _nombre!: string;
  private _precio!: number;
  private _tipo!: string | null;
  private readonly _codigo?: number;

  /**
   * @security
   * ⚠️ ADVERTENCIA DE SEGURIDAD (NOTA ACADÉMICA):
   * Los mensajes de error en esta entidad exponen explícitamente el nombre del script (JADE.sql),
   * tipos de datos (VARCHAR, DECIMAL) y semillas de incremento (IDENTITY(3330,15)). Se mantiene así de
   * forma intencional con fines demostrativos y de trazabilidad para este proyecto estudiantil en GitHub.
   * En producción, debe separarse el log técnico del mensaje HTTP al cliente para evitar Information Disclosure (OWASP).
   */
  constructor(
    nombre: string,
    precio: number,
    tipo: string | null = null,
    codigo?: number
  ) {
    this.cambiarNombre(nombre);
    this.cambiarPrecio(precio);
    this.cambiarTipo(tipo);
    this.validarCodigo(codigo);
    this._codigo = codigo;
  }

  // =========================================================================
  // GETTERS PÚBLICOS (Solo lectura desde capas externas)
  // =========================================================================
  public get codigo(): number | undefined {
    return this._codigo;
  }

  public get nombre(): string {
    return this._nombre;
  }

  public get precio(): number {
    return this._precio;
  }

  public get tipo(): string | null {
    return this._tipo;
  }

  // =========================================================================
  // MÉTODOS INTERNOS DE MUTACIÓN CONTROLADA (Comportamiento del Dominio)
  // =========================================================================
  public cambiarNombre(nuevoNombre: string): void {
    const nombreLimpio = typeof nuevoNombre === 'string' ? nuevoNombre.trim() : '';

    if (nombreLimpio.length === 0) {
      throw new Error('Error de Dominio: El Nombre del producto es obligatorio (NOT NULL en JADE.sql).');
    }

    if (nombreLimpio.length > 50) {
      throw new Error(
        `Error de Dominio: El Nombre del producto supera el límite de VARCHAR(50) en JADE.sql (${nombreLimpio.length} caracteres).`
      );
    }

    const formatoSeguro = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ0-9\s.,()/-]+$/;
    if (!formatoSeguro.test(nombreLimpio)) {
      throw new Error(
        'Error de Dominio: El Nombre del producto contiene caracteres no permitidos por seguridad (prevención XSS).'
      );
    }

    this._nombre = nombreLimpio;
  }

  public cambiarPrecio(nuevoPrecio: number): void {
    if (typeof nuevoPrecio !== 'number' || Number.isNaN(nuevoPrecio) || nuevoPrecio <= 0) {
      throw new Error(
        `Error de Dominio: El Precio base del producto (${this._nombre || 'Nuevo'}) debe ser mayor a 0 según DECIMAL(10,2) en JADE.sql. Valor recibido: ${nuevoPrecio}`
      );
    }

    if (nuevoPrecio > 99999999.99) {
      throw new Error(
        'Error de Dominio: El Precio excede la capacidad máxima de DECIMAL(10,2) en JADE.sql.'
      );
    }

    this._precio = Number(nuevoPrecio.toFixed(2));
  }

  public cambiarTipo(nuevoTipo: string | null): void {
    if (nuevoTipo === null) {
      this._tipo = null;
      return;
    }

    const tipoLimpio = typeof nuevoTipo === 'string' ? nuevoTipo.trim() : '';
    if (tipoLimpio.length === 0) {
      this._tipo = null;
      return;
    }

    if (tipoLimpio.length > 30) {
      throw new Error(
        `Error de Dominio: El Tipo de producto supera el límite de VARCHAR(30) en JADE.sql (${tipoLimpio.length} caracteres).`
      );
    }

    const formatoSeguro = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ0-9\s.,/-]+$/;
    if (!formatoSeguro.test(tipoLimpio)) {
      throw new Error(
        'Error de Dominio: El Tipo de producto contiene caracteres no permitidos por seguridad (prevención XSS).'
      );
    }

    this._tipo = tipoLimpio;
  }

  private validarCodigo(codigo?: number): void {
    if (codigo !== undefined) {
      if (!Number.isInteger(codigo) || codigo < 3330 || (codigo - 3330) % 15 !== 0) {
        throw new Error(
          `Error de Dominio: El Codigo de producto (${codigo}) es inválido. En JADE.sql inicia en IDENTITY(3330,15) y debe ser múltiplo de 15 a partir de 3330.`
        );
      }
    }
  }

  public toJSON() {
    return {
      codigo: this._codigo,
      nombre: this._nombre,
      tipo: this._tipo,
      precio: this._precio
    };
  }
}