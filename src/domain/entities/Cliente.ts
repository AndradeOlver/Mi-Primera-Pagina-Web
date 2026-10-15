/**
 * CAPA DE DOMINIO: Entidad Cliente (Encapsulamiento estricto)
 * Mapeo exacto de la tabla en JADE.sql:
 * CREATE TABLE Cliente (
 *     Codigo INT IDENTITY(2220,15) PRIMARY KEY,
 *     Nombre VARCHAR(50) NOT NULL,
 *     Numero CHAR(9) UNIQUE
 * );
 */

export class Cliente {
  private _nombre!: string;
  private _numero!: string | null;
  private readonly _codigo?: number;

  /**
   * @security
   * ⚠️ ADVERTENCIA DE SEGURIDAD (NOTA ACADÉMICA):
   * Los mensajes de error en esta entidad exponen explícitamente el nombre del script (JADE.sql),
   * tipos de datos (VARCHAR, CHAR) y semillas de incremento (IDENTITY(2220,15)). Se mantiene así de
   * forma intencional con fines demostrativos y de trazabilidad para este proyecto estudiantil en GitHub.
   * En producción, debe separarse el log técnico del mensaje HTTP al cliente para evitar Information Disclosure (OWASP).
   */
  constructor(nombre: string, numero: string | null = null, codigo?: number) {
    this.cambiarNombre(nombre);
    this.cambiarNumero(numero);
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

  public get numero(): string | null {
    return this._numero;
  }

  // =========================================================================
  // MÉTODOS INTERNOS DE MUTACIÓN CONTROLADA (Comportamiento del Dominio)
  // =========================================================================
  public cambiarNombre(nuevoNombre: string): void {
    const nombreLimpio = typeof nuevoNombre === 'string' ? nuevoNombre.trim() : '';

    if (nombreLimpio.length === 0) {
      throw new Error('Error de Dominio: El Nombre del cliente es obligatorio (NOT NULL en JADE.sql).');
    }

    if (nombreLimpio.length > 50) {
      throw new Error(
        `Error de Dominio: El Nombre del cliente excede VARCHAR(50) en JADE.sql. Longitud: ${nombreLimpio.length}`
      );
    }

    const formatoNombreSeguro = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ0-9\s.,&-]+$/;
    if (!formatoNombreSeguro.test(nombreLimpio)) {
      throw new Error(
        'Error de Dominio: El Nombre del cliente contiene caracteres no permitidos por seguridad (prevención XSS).'
      );
    }

    this._nombre = nombreLimpio;
  }

  public cambiarNumero(nuevoNumero: string | null): void {
    if (nuevoNumero === null) {
      this._numero = null;
      return;
    }

    const numeroLimpio = typeof nuevoNumero === 'string' ? nuevoNumero.trim() : '';
    const soloNueveDigitos = /^\d{9}$/;

    if (!soloNueveDigitos.test(numeroLimpio)) {
      throw new Error(
        `Error de Dominio: El Numero de cliente debe tener exactamente 9 dígitos numéricos para cumplir con CHAR(9) UNIQUE en JADE.sql. Recibido: "${nuevoNumero}"`
      );
    }

    this._numero = numeroLimpio;
  }

  private validarCodigo(codigo?: number): void {
    if (codigo !== undefined) {
      if (!Number.isInteger(codigo) || codigo < 2220 || (codigo - 2220) % 15 !== 0) {
        throw new Error(
          `Error de Dominio: El Codigo de cliente (${codigo}) es inválido. En JADE.sql inicia en IDENTITY(2220,15) y debe ser múltiplo de 15 a partir de 2220.`
        );
      }
    }
  }

  public toJSON() {
    return {
      codigo: this._codigo,
      nombre: this._nombre,
      numero: this._numero
    };
  }
}