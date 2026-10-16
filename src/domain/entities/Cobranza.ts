/**
 * CAPA DE DOMINIO: Entidad Cobranza (Encapsulamiento estricto)
 * Mapeo exacto de la tabla actualizada en JADE.sql:
 * CREATE TABLE Cobranza (
 *     Codigo INT IDENTITY(1,1) PRIMARY KEY,
 *     CodigoCliente INT NOT NULL, -- Cliente que realiza el abono o pago
 *     CodigoPedido INT NULL,      -- NULL si es abono general a cuenta; con valor si paga 1 pedido al contado
 *     ID_Usuario INT NOT NULL,
 *     Fecha DATETIME DEFAULT GETDATE(),
 *     Monto DECIMAL(10,2) NOT NULL,
 *     TipoPago VARCHAR(20) NOT NULL, -- Ej: 'Efectivo', 'Transacción'
 *     FOREIGN KEY (CodigoCliente) REFERENCES Cliente(Codigo),
 *     FOREIGN KEY (CodigoPedido) REFERENCES Pedido(Codigo),
 *     FOREIGN KEY (ID_Usuario) REFERENCES Usuario(ID)
 * );
 */

export const TIPOS_PAGO_PERMITIDOS = ['Efectivo', 'Transacción'] as const;
export type TipoPagoPermitido = (typeof TIPOS_PAGO_PERMITIDOS)[number];

export class Cobranza {
  private readonly _codigoCliente: number;
  private readonly _codigoPedido: number | null;
  private readonly _idUsuario: number;
  private _monto!: number;
  private _tipoPago!: TipoPagoPermitido;
  private readonly _fecha: Date;
  private readonly _codigo?: number;

  /**
   * @security
   * ⚠️ ADVERTENCIA DE SEGURIDAD (NOTA ACADÉMICA):
   * Los mensajes de error en esta entidad exponen explícitamente el nombre del script (JADE.sql),
   * tipos de datos (VARCHAR, DECIMAL) y semillas de incremento (IDENTITY(2220,15), IDENTITY(5000,1), IDENTITY(1110,15)).
   * Se mantiene así de forma intencional con fines demostrativos y de trazabilidad para este proyecto
   * estudiantil en GitHub. En producción, debe separarse el log técnico del mensaje HTTP al cliente
   * para evitar Information Disclosure (OWASP).
   */
  constructor(
    codigoCliente: number,
    idUsuario: number,
    monto: number,
    tipoPago: TipoPagoPermitido,
    codigoPedido: number | null = null,
    fecha: Date = new Date(),
    codigo?: number
  ) {
    this.validarCodigoCliente(codigoCliente);
    this.validarCodigoPedido(codigoPedido);
    this.validarIdUsuario(idUsuario);
    this.cambiarMonto(monto);
    this.cambiarTipoPago(tipoPago);
    this.validarCodigo(codigo);

    this._codigoCliente = codigoCliente;
    this._codigoPedido = codigoPedido;
    this._idUsuario = idUsuario;
    this._fecha = fecha;
    this._codigo = codigo;
  }

  // =========================================================================
  // GETTERS PÚBLICOS (Solo lectura desde capas externas)
  // =========================================================================
  public get codigo(): number | undefined {
    return this._codigo;
  }

  public get codigoCliente(): number {
    return this._codigoCliente;
  }

  public get codigoPedido(): number | null {
    return this._codigoPedido;
  }

  public get idUsuario(): number {
    return this._idUsuario;
  }

  public get monto(): number {
    return this._monto;
  }

  public get tipoPago(): TipoPagoPermitido {
    return this._tipoPago;
  }

  public get fecha(): Date {
    return new Date(this._fecha.getTime());
  }

  // =========================================================================
  // MÉTODOS INTERNOS DE MUTACIÓN CONTROLADA Y VALIDACIÓN DE INTEGRIDAD
  // =========================================================================
  public cambiarMonto(nuevoMonto: number): void {
    if (typeof nuevoMonto !== 'number' || Number.isNaN(nuevoMonto) || nuevoMonto <= 0) {
      throw new Error(
        `Error de Dominio: El Monto de la cobranza debe ser mayor a 0 según DECIMAL(10,2) en JADE.sql. Recibido: ${nuevoMonto}`
      );
    }

    if (nuevoMonto > 99999999.99) {
      throw new Error(
        'Error de Dominio: El Monto excede la capacidad máxima de DECIMAL(10,2) en JADE.sql.'
      );
    }

    this._monto = Number(nuevoMonto.toFixed(2));
  }

  public cambiarTipoPago(nuevoTipoPago: TipoPagoPermitido): void {
    if (!nuevoTipoPago || nuevoTipoPago.length > 20 || !TIPOS_PAGO_PERMITIDOS.includes(nuevoTipoPago)) {
      throw new Error(
        `Error de Dominio: El TipoPago '${nuevoTipoPago}' es inválido o supera VARCHAR(20) en JADE.sql. Permitidos: ${TIPOS_PAGO_PERMITIDOS.join(', ')}.`
      );
    }

    this._tipoPago = nuevoTipoPago;
  }

  private validarCodigoCliente(codigoCliente: number): void {
    if (!Number.isInteger(codigoCliente) || codigoCliente < 2220 || (codigoCliente - 2220) % 15 !== 0) {
      throw new Error(
        `Error de Dominio: CodigoCliente (${codigoCliente}) inválido en Cobranza. En JADE.sql los clientes inician en IDENTITY(2220,15) y deben ser múltiplos de 15 a partir de 2220.`
      );
    }
  }

  private validarCodigoPedido(codigoPedido: number | null): void {
    if (codigoPedido === null) {
      return; // Es válido cuando el cliente hace un abono general a su cuenta a crédito
    }

    if (!Number.isInteger(codigoPedido) || codigoPedido < 5000) {
      throw new Error(
        `Error de Dominio: CodigoPedido (${codigoPedido}) inválido. En JADE.sql los pedidos inician en IDENTITY(5000,1) o debe ser NULL para abonos generales.`
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
    if (codigo !== undefined && (!Number.isInteger(codigo) || codigo < 1)) {
      throw new Error(
        `Error de Dominio: El Codigo de cobranza (${codigo}) es inválido. En JADE.sql inicia en IDENTITY(1,1).`
      );
    }
  }

  public toJSON() {
    return {
      codigo: this._codigo,
      codigoCliente: this._codigoCliente,
      codigoPedido: this._codigoPedido,
      idUsuario: this._idUsuario,
      fecha: this._fecha,
      monto: this._monto,
      tipoPago: this._tipoPago
    };
  }
}