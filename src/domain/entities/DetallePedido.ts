/**
 * CAPA DE DOMINIO: Entidad DetallePedido (Encapsulamiento estricto)
 * Mapeo exacto de la tabla en JADE.sql:
 * CREATE TABLE DetallePedido (
 *     CodigoPedido INT NOT NULL,
 *     CodigoProducto INT NOT NULL,
 *     Cantidad INT NOT NULL,
 *     Precio DECIMAL(10,2) NOT NULL, -- Precio variable establecido por el usuario al vender
 *     PRIMARY KEY (CodigoPedido, CodigoProducto), -- Llave compuesta
 *     FOREIGN KEY (CodigoPedido) REFERENCES Pedido(Codigo),
 *     FOREIGN KEY (CodigoProducto) REFERENCES Producto(Codigo)
 * );
 */

export class DetallePedido {
  private readonly _codigoProducto: number;
  private _cantidad!: number;
  private _precio!: number;
  private readonly _codigoPedido?: number;

  /**
   * @security
   * ⚠️ ADVERTENCIA DE SEGURIDAD (NOTA ACADÉMICA):
   * Los mensajes de error en esta entidad exponen explícitamente el nombre del script (JADE.sql),
   * tipos de datos (DECIMAL, INT) y semillas de incremento (IDENTITY(3330,15), IDENTITY(5000,1)).
   * Se mantiene así de forma intencional con fines demostrativos y de trazabilidad para este proyecto
   * estudiantil en GitHub. En producción, debe separarse el log técnico del mensaje HTTP al cliente
   * para evitar Information Disclosure (OWASP).
   */
  constructor(
    codigoProducto: number,
    cantidad: number,
    precio: number,
    codigoPedido?: number
  ) {
    this.validarCodigoProducto(codigoProducto);
    this.cambiarCantidad(cantidad);
    this.cambiarPrecio(precio);
    this.validarCodigoPedido(codigoPedido);

    this._codigoProducto = codigoProducto;
    this._codigoPedido = codigoPedido;
  }

  // =========================================================================
  // GETTERS PÚBLICOS (Solo lectura desde capas externas)
  // =========================================================================
  public get codigoPedido(): number | undefined {
    return this._codigoPedido;
  }

  public get codigoProducto(): number {
    return this._codigoProducto;
  }

  public get cantidad(): number {
    return this._cantidad;
  }

  public get precio(): number {
    return this._precio;
  }

  // =========================================================================
  // MÉTODOS INTERNOS DE MUTACIÓN CONTROLADA Y LÓGICA DE NEGOCIO
  // =========================================================================
  public cambiarCantidad(nuevaCantidad: number): void {
    if (!Number.isInteger(nuevaCantidad) || nuevaCantidad <= 0) {
      throw new Error(
        `Error de Dominio: La Cantidad en DetallePedido debe ser un número entero mayor a 0 según JADE.sql. Recibido: ${nuevaCantidad}`
      );
    }

    this._cantidad = nuevaCantidad;
  }

  public cambiarPrecio(nuevoPrecio: number): void {
    if (typeof nuevoPrecio !== 'number' || Number.isNaN(nuevoPrecio) || nuevoPrecio <= 0) {
      throw new Error(
        `Error de Dominio: El Precio de venta en DetallePedido debe ser mayor a 0 según DECIMAL(10,2) en JADE.sql. Recibido: ${nuevoPrecio}`
      );
    }

    if (nuevoPrecio > 99999999.99) {
      throw new Error(
        'Error de Dominio: El Precio en DetallePedido excede la capacidad máxima de DECIMAL(10,2) en JADE.sql.'
      );
    }

    this._precio = Number(nuevoPrecio.toFixed(2));
  }

  public calcularSubtotal(): number {
    return Number((this._cantidad * this._precio).toFixed(2));
  }

  private validarCodigoProducto(codigoProducto: number): void {
    if (!Number.isInteger(codigoProducto) || codigoProducto < 3330 || (codigoProducto - 3330) % 15 !== 0) {
      throw new Error(
        `Error de Dominio: CodigoProducto (${codigoProducto}) inválido. En JADE.sql los productos inician en IDENTITY(3330,15) y deben ser múltiplos de 15 a partir de 3330.`
      );
    }
  }

  private validarCodigoPedido(codigoPedido?: number): void {
    if (codigoPedido !== undefined && (!Number.isInteger(codigoPedido) || codigoPedido < 5000)) {
      throw new Error(
        `Error de Dominio: CodigoPedido (${codigoPedido}) inválido. En JADE.sql inicia en IDENTITY(5000,1).`
      );
    }
  }

  public toJSON() {
    return {
      codigoPedido: this._codigoPedido,
      codigoProducto: this._codigoProducto,
      cantidad: this._cantidad,
      precio: this._precio,
      subtotal: this.calcularSubtotal()
    };
  }
}