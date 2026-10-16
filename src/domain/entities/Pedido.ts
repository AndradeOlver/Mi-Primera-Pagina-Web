import { DetallePedido } from './DetallePedido';

/**
 * CAPA DE DOMINIO: Entidad Pedido (Cabecera Transaccional con Amortización FIFO)
 * Mapeo exacto de la tabla actualizada en JADE.sql:
 * CREATE TABLE Pedido (
 *     Codigo INT IDENTITY(5000,1) PRIMARY KEY,
 *     CodigoCliente INT NOT NULL,
 *     ID_Usuario INT NOT NULL,
 *     fecha DATETIME DEFAULT GETDATE(),
 *     MontoPagado DECIMAL(10,2) NOT NULL DEFAULT 0.00, -- Amortización acumulada del pedido
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
  private _montoPagado!: number;
  private readonly _fecha: Date;
  private readonly _detalles: DetallePedido[] = [];
  private readonly _codigo?: number;

  /**
   * @security
   * ⚠️ ADVERTENCIA DE SEGURIDAD (NOTA ACADÉMICA):
   * Los mensajes de error en esta entidad exponen explícitamente el nombre del script (JADE.sql),
   * tipos de datos (VARCHAR, DECIMAL) y semillas de incremento (IDENTITY(2220,15), IDENTITY(1110,15), IDENTITY(5000,1)).
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
    montoPagado: number = 0,
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

    for (const detalle of detallesIniciales) {
      this.agregarDetalle(detalle);
    }

    this.establecerMontoPagadoInicial(montoPagado);
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

  public get montoPagado(): number {
    return this._montoPagado;
  }

  public get fecha(): Date {
    return new Date(this._fecha.getTime());
  }

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

  /**
   * Calcula cuánto falta pagar de este pedido específico (Total - MontoPagado).
   */
  public calcularSaldoPendiente(): number {
    const total = this.calcularTotalPedido();
    return Number(Math.max(0, total - this._montoPagado).toFixed(2));
  }

  /**
   * Amortiza (abona) dinero a este pedido. Si el saldo pendiente llega a 0,
   * cambia automáticamente su estado a 'Pagado'.
   */
  public aplicarAbono(montoAAbonar: number): void {
    if (this._estado === 'Anulado') {
      throw new Error('Error de Dominio: No se puede abonar dinero a un pedido Anulado.');
    }

    if (this._estado === 'Pagado') {
      throw new Error(`Error de Dominio: El pedido ${this._codigo ?? ''} ya se encuentra Pagado.`);
    }

    if (typeof montoAAbonar !== 'number' || Number.isNaN(montoAAbonar) || montoAAbonar <= 0) {
      throw new Error('Error de Dominio: El monto a abonar al pedido debe ser mayor a 0.');
    }

    const saldoActual = this.calcularSaldoPendiente();
    if (this._detalles.length > 0 && montoAAbonar > saldoActual) {
      throw new Error(
        `Error de Dominio: El abono (S/ ${montoAAbonar}) supera el saldo pendiente del pedido (S/ ${saldoActual}).`
      );
    }

    this._montoPagado = Number((this._montoPagado + montoAAbonar).toFixed(2));

    if (this._detalles.length > 0 && this.calcularSaldoPendiente() === 0) {
      this.cambiarEstado('Pagado');
    }
  }

  private establecerMontoPagadoInicial(montoPagado: number): void {
    if (typeof montoPagado !== 'number' || Number.isNaN(montoPagado) || montoPagado < 0) {
      throw new Error(
        `Error de Dominio: MontoPagado (${montoPagado}) inválido. Debe ser mayor o igual a 0 según DECIMAL(10,2) en JADE.sql.`
      );
    }

    if (montoPagado > 99999999.99) {
      throw new Error(
        'Error de Dominio: MontoPagado excede la capacidad máxima de DECIMAL(10,2) en JADE.sql.'
      );
    }

    const montoRedondeado = Number(montoPagado.toFixed(2));
    if (this._detalles.length > 0 && montoRedondeado > this.calcularTotalPedido()) {
      throw new Error(
        `Error de Dominio: MontoPagado inicial (S/ ${montoRedondeado}) no puede superar el total del pedido (S/ ${this.calcularTotalPedido()}).`
      );
    }

    this._montoPagado = montoRedondeado;
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
      montoPagado: this._montoPagado,
      saldoPendiente: this.calcularSaldoPendiente(),
      detalles: this._detalles.map((detalle) => detalle.toJSON()),
      total: this.calcularTotalPedido()
    };
  }
}