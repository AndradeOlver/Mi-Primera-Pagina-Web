/**
 * CAPA DE DOMINIO: Entidad Usuario (Encapsulamiento estricto)
 * Mapeo exacto de la tabla en JADE.sql:
 * CREATE TABLE Usuario (
 *     ID INT IDENTITY(1110,15) PRIMARY KEY,
 *     Nombre VARCHAR(30) NOT NULL,
 *     Rol VARCHAR(20) NOT NULL -- Ej: 'Regular', 'Administrador'
 * );
 */

export const ROLES_PERMITIDOS = ['Regular', 'Administrador'] as const;
export type RolUsuario = (typeof ROLES_PERMITIDOS)[number];

export class Usuario {
  // Atributos privados: inaccesibles y ocultos para capas externas.
  // Se usa guion bajo (_) por convención para diferenciarlos de los getters públicos.
  private _nombre!: string;
  private _rol!: RolUsuario;
  
  // El ID es private readonly porque una PRIMARY KEY IDENTITY jamás cambia una vez asignada.
  private readonly _id?: number;

  /**
   * @security
   * ⚠️ ADVERTENCIA DE SEGURIDAD (NOTA ACADÉMICA):
   * Los mensajes de error en esta entidad exponen explícitamente el nombre del script (JADE.sql),
   * tipos de datos (VARCHAR) y semillas de incremento (IDENTITY). Se mantiene así de forma 
   * intencional con fines demostrativos y de trazabilidad para este proyecto estudiantil en GitHub.
   * En producción, debe separarse el log técnico del mensaje HTTP al cliente para evitar Information Disclosure (OWASP).
   */
  constructor(nombre: string, rol: RolUsuario, id?: number) {
    // El constructor delega la asignación a los métodos internos para no duplicar validaciones
    this.cambiarNombre(nombre);
    this.cambiarRol(rol);
    this.validarId(id);
    this._id = id;
  }

  // =========================================================================
  // GETTERS PÚBLICOS (Solo lectura desde capas externas)
  // Permiten leer `usuario.nombre`, pero lanzan error si intentan hacer `usuario.nombre = 'X'`
  // =========================================================================
  public get id(): number | undefined {
    return this._id;
  }

  public get nombre(): string {
    return this._nombre;
  }

  public get rol(): RolUsuario {
    return this._rol;
  }

  // =========================================================================
  // MÉTODOS INTERNOS DE MUTACIÓN CONTROLADA (Comportamiento del Dominio)
  // Única vía para modificar el estado del objeto garantizando las reglas de JADE.sql
  // =========================================================================
  public cambiarNombre(nuevoNombre: string): void {
    const nombreLimpio = typeof nuevoNombre === 'string' ? nuevoNombre.trim() : '';

    if (nombreLimpio.length === 0) {
      throw new Error('Error de Dominio: El Nombre del usuario es obligatorio (NOT NULL en JADE.sql).');
    }

    if (nombreLimpio.length > 30) {
      throw new Error(
        `Error de Dominio: El Nombre del usuario excede VARCHAR(30) en JADE.sql. Longitud: ${nombreLimpio.length}`
      );
    }

    const formatoNombreSeguro = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/;
    if (!formatoNombreSeguro.test(nombreLimpio)) {
      throw new Error(
        'Error de Dominio: El Nombre contiene caracteres no permitidos por seguridad (prevención XSS).'
      );
    }

    this._nombre = nombreLimpio;
  }

  public cambiarRol(nuevoRol: RolUsuario): void {
    if (!nuevoRol || nuevoRol.length > 20 || !ROLES_PERMITIDOS.includes(nuevoRol)) {
      throw new Error(
        `Error de Dominio: El Rol '${nuevoRol}' es inválido o excede VARCHAR(20) en JADE.sql. Roles permitidos: ${ROLES_PERMITIDOS.join(', ')}.`
      );
    }

    this._rol = nuevoRol;
  }

  private validarId(id?: number): void {
    if (id !== undefined) {
      if (!Number.isInteger(id) || id < 1110 || (id - 1110) % 15 !== 0) {
        throw new Error(
          `Error de Dominio: El ID de usuario (${id}) es inválido. En JADE.sql inicia en IDENTITY(1110,15) y debe ser múltiplo de 15 a partir de 1110.`
        );
      }
    }
  }

  /**
   * SERIALIZACIÓN PARA EXPRESS (res.json):
   * Cuando Express ejecuta res.status(200).json(usuario), invoca internamente JSON.stringify().
   * Por defecto, JavaScript ignora los `get` y serializa los atributos privados con guion bajo (`_nombre`).
   * Este método `toJSON()` intercepta la serialización y devuelve un JSON limpio sin guiones bajos.
   */
  public toJSON() {
    return {
      id: this._id,
      nombre: this._nombre,
      rol: this._rol
    };
  }
}