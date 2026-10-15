import { DetallePedido } from './DetallePedido';

/**
 * CAPA DE DOMINIO: Entidad Pedido (Cabecera Transaccional - Encapsulamiento estricto)
 * Mapeo exacto de la tabla en JADE.sql:
 * CREATE TABLE Pedido (
 *     Codigo INT IDENTITY(5000,1) PRIMARY KEY,
 *     CodigoCliente INT NOT NULL,
 *     ID_Usuario INT NOT NULL,
 *     fecha DATETIME DEFAULT GETDATE(),
 *     Estado VARCHAR(20) DEFAULT 'Pendiente',
 *     FOREIGN KEY (CodigoCliente) REFERENCES Cliente(Codigo),
 *     FOREIGN KEY (ID_Usuario) REFERENCES Usuario(ID)
 * );
 */

export const ESTADOS_PEDIDO_PERMITIDOS = ['Pendiente', 'Pagado', 'Anulado'] as const;
export type EstadoPedido = (typeof ESTADOS_PEDIDO_PERMITIDOS)[number];

export class Pedido {
  private readonly _codigoCliente: number;
  private readonly _idUsuario: number;
  private _estado!: EstadoPedido;
  private readonly _fecha: Date;
  private readonly _detalles: DetallePedido[] = [];
  private readonly _codigo?: number;

  /**
   * @security
   * ⚠️ ADVERTENCIA DE SEGURIDAD (NOTA ACADÉMICA):
   * Los mensajes de error en esta entidad exponen explícitamente el nombre del script (JADE.sql),
   * tipos de datos (VARCHAR) y semillas de incremento (IDENTITY(2220,15), IDENTITY(1110,15), IDENTITY(5000,1)).
   * Se mantiene así de forma intencional con fines demostrativos y de trazabilidad para este proyecto
   * estudiantil en GitHub. En producción, debe separarse el log técnico del mensaje HTTP al cliente
   * para evitar Information Disclosure (OWASP).
   */
  constructor(
    codigoCliente: number,
    idUsuario: number,
    estado: EstadoPedido = 'Pendiente',
    fecha: Date = new Date(),
    detallesIniciales: DetallePedido[] = [],
    codigo?: number
  ) {
    this.validarCodigoCliente(codigoCliente);
    this.validarIdUsuario(idUsuario);
    this.cambiarEstado(estado);
    this.validarCodigo(codigo);

    this._codigoCliente = codigoCliente;
    this._idUsuario = idUsuario;
    this._fecha = fecha;
    this._codigo = codigo;

    // Cada detalle inicial pasa por agregarDetalle() para verificar que no viole la llave compuesta
    for (const detalle of detallesIniciales) {
      this.agregarDetalle(detalle);
    }
  }

  // =========================================================================
  // GETTERS PÚBLICOS (Solo lectura y copia defensiva para arreglos y fechas)
  // =========================================================================
  public get codigo(): number | undefined {
    return this._codigo;
  }

  public get codigoCliente(): number {
    return this._codigoCliente;
  }

  public get idUsuario(): number {
    return this._idUsuario;
  }

  public get estado(): EstadoPedido {
    return this._estado;
  }

  public get fecha(): Date {
    return new Date(this._fecha.getTime());
  }

  /**
   * Copia defensiva: Devuelve una copia superficial inmutable del arreglo `[...this._detalles]`.
   * Así evitamos que código externo haga `pedido.detalles.push(...)` saltándose la validación de llave compuesta.
   */
  public get detalles(): ReadonlyArray<DetallePedido> {
    return [...this._detalles];
  }

  // =========================================================================
  // MÉTODOS INTERNOS DE MUTACIÓN CONTROLADA Y REGLAS DE NEGOCIO
  // =========================================================================
  public cambiarEstado(nuevoEstado: EstadoPedido): void {
    if (!nuevoEstado || nuevoEstado.length > 20 || !ESTADOS_PEDIDO_PERMITIDOS.includes(nuevoEstado)) {
      throw new Error(
        `Error de Dominio: El Estado '${nuevoEstado}' es inválido o supera VARCHAR(20) en JADE.sql. Estados permitidos: ${ESTADOS_PEDIDO_PERMITIDOS.join(', ')}.`
      );
    }

    this._estado = nuevoEstado;
  }

  /**
   * Agrega un ítem al pedido evitando duplicar el mismo CodigoProducto
   * (respetando la llave compuesta PRIMARY KEY (CodigoPedido, CodigoProducto) de JADE.sql).
   */
  public agregarDetalle(nuevoDetalle: DetallePedido): void {
    if (this._estado === 'Anulado') {
      throw new Error('Error de Dominio: No se pueden agregar productos a un pedido en estado Anulado.');
    }

    const existeProducto = this._detalles.some(
      (item) => item.codigoProducto === nuevoDetalle.codigoProducto
    );

    if (existeProducto) {
      throw new Error(
        `Error de Dominio: El producto ${nuevoDetalle.codigoProducto} ya existe en este pedido. Violación de llave compuesta (CodigoPedido, CodigoProducto) en JADE.sql.`
      );
    }

    this._detalles.push(nuevoDetalle);
  }

  public calcularTotalPedido(): number {
    const suma = this._detalles.reduce((acumulador, item) => acumulador + item.calcularSubtotal(), 0);
    return Number(suma.toFixed(2));
  }

  private validarCodigoCliente(codigoCliente: number): void {
    if (!Number.isInteger(codigoCliente) || codigoCliente < 2220 || (codigoCliente - 2220) % 15 !== 0) {
      throw new Error(
        `Error de Dominio: CodigoCliente (${codigoCliente}) inválido. En JADE.sql los clientes inician en IDENTITY(2220,15) y deben ser múltiplos de 15 a partir de 2220.`
      );
    }
  }

  private validarIdUsuario(idUsuario: number): void {
    if (!Number.isInteger(idUsuario) || idUsuario < 1110 || (idUsuario - 1110) % 15 !== 0) {
      throw new Error(
        `Error de Dominio: ID_Usuario (${idUsuario}) inválido. En JADE.sql los usuarios inician en IDENTITY(1110,15) y deben ser múltiplos de 15 a partir de 1110.`
      );
    }
  }

  private validarCodigo(codigo?: number): void {
    if (codigo !== undefined && (!Number.isInteger(codigo) || codigo < 5000)) {
      throw new Error(
        `Error de Dominio: El Codigo de pedido (${codigo}) es inválido. En JADE.sql inicia en IDENTITY(5000,1).`
      );
    }
  }

  public toJSON() {
    return {
      codigo: this._codigo,
      codigoCliente: this._codigoCliente,
      idUsuario: this._idUsuario,
      fecha: this._fecha,
      estado: this._estado,
      detalles: this._detalles.map((detalle) => detalle.toJSON()),
      total: this.calcularTotalPedido()
    };
  }
}