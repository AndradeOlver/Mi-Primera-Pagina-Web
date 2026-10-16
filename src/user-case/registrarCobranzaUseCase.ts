import { Cobranza, type TipoPagoPermitido } from '../domain/entities/Cobranza.js';
import { Pedido } from '../domain/entities/Pedido.js';

/**
 * CAPA DE CASOS DE USO (APLICACIÓN): RegistrarCobranzaUseCase
 *
 * REGLA DE NEGOCIO (1 SOLA COBRANZA EN CAJA + LIQUIDACIÓN FIFO DE PEDIDOS):
 * 1. Cuando el cliente entrega S/ 50.00, en la tabla `Cobranza` se inserta UNA SOLA FILA
 *    por S/ 50.00 vinculada a `CodigoCliente` (y `CodigoPedido = NULL` si es abono general,
 *    o con el código del pedido si fue un pago directo al contado).
 * 2. Al mismo tiempo, esos S/ 50.00 recorren los pedidos 'Pendiente' del cliente del más
 *    antiguo al más reciente (FIFO) invocando `pedido.aplicarAbono()`:
 *    - Ej. 6 pedidos de S/ 11.00 (Deuda = S/ 66.00) y abona S/ 50.00:
 *      * Pedidos 1 al 4: `MontoPagado` sube a S/ 11.00 y `Estado` pasa a 'Pagado'.
 *      * Pedido 5: `MontoPagado` sube a S/ 6.00 y `Estado` sigue 'Pendiente' (Falta pagar S/ 5.00).
 *      * Pedido 6: No se toca (`MontoPagado = 0.00`, `Estado = 'Pendiente'`).
 */

export interface RegistrarCobranzaDTO {
  codigoCliente: number;
  idUsuario: number;
  montoAbonado: number;
  tipoPago: TipoPagoPermitido;
  codigoPedidoEspecifico?: number | null; // Opcional: solo si paga 1 pedido puntual al contado
}

/**
 * CONTRATO DEL REPOSITORIO (Inversión de Dependencias):
 * - Devuelve los pedidos pendientes del cliente (cada `Pedido` ya viene con su `montoPagado` actual).
 * - Guarda en una sola Transacción SQL la única fila de `Cobranza` y el `UPDATE` de los `Pedido` afectados.
 */
export interface ICobranzaRepository {
  obtenerPedidosPendientesPorCliente(codigoCliente: number): Promise<Pedido[]>;
  guardarCobranzaYActualizarPedidosTransaccional(
    cobranza: Cobranza,
    pedidosAfectados: Pedido[]
  ): Promise<Cobranza>;
}

export class RegistrarCobranzaUseCase {
  constructor(private readonly cobranzaRepository: ICobranzaRepository) {}

  public async ejecutar(datos: RegistrarCobranzaDTO): Promise<{
    cobranzaRegistrada: Cobranza;
    deudaTotalAnterior: number;
    montoAbonado: number;
    deudaTotalRestante: number;
    pedidosLiquidadosCompletamente: number[];
    pedidoPagadoParcialmente: {
      codigoPedido: number;
      abonadoAhora: number;
      montoPagadoAcumulado: number;
      faltaPagar: number;
    } | null;
    pedidosSinTocar: number[];
  }> {
    // PASO 1: Instanciar la única entidad Cobranza (Fail-Fast: valida cliente, usuario, monto > 0 y tipoPago en RAM).
    const nuevaCobranza = new Cobranza(
      datos.codigoCliente,
      datos.idUsuario,
      datos.montoAbonado,
      datos.tipoPago,
      datos.codigoPedidoEspecifico ?? null
    );

    // PASO 2: Consultar en SQL Server todos los pedidos 'Pendiente' del cliente (ordenados por fecha ASC).
    const pedidosPendientes = await this.cobranzaRepository.obtenerPedidosPendientesPorCliente(
      datos.codigoCliente
    );

    if (pedidosPendientes.length === 0) {
      throw new Error(
        `Error de Negocio: El cliente ${datos.codigoCliente} no tiene pedidos pendientes de pago.`
      );
    }

    // PASO 3: Calcular la deuda histórica total sumando el saldo pendiente de cada pedido.
    const deudaTotalAnterior = Number(
      pedidosPendientes
        .reduce((acumulador, pedido) => acumulador + pedido.calcularSaldoPendiente(), 0)
        .toFixed(2)
    );

    if (datos.montoAbonado > deudaTotalAnterior) {
      throw new Error(
        `Error de Negocio: El monto abonado (S/ ${datos.montoAbonado}) supera la deuda total acumulada del cliente (S/ ${deudaTotalAnterior}).`
      );
    }

    // PASO 4: Distribución FIFO sobre las entidades Pedido.
    let dineroDisponible = datos.montoAbonado;
    const pedidosAfectados: Pedido[] = [];
    const pedidosLiquidadosCompletamente: number[] = [];
    let pedidoPagadoParcialmente: {
      codigoPedido: number;
      abonadoAhora: number;
      montoPagadoAcumulado: number;
      faltaPagar: number;
    } | null = null;
    const pedidosSinTocar: number[] = [];

    for (const pedido of pedidosPendientes) {
      const codigoPedidoActual = pedido.codigo!;

      if (dineroDisponible === 0) {
        pedidosSinTocar.push(codigoPedidoActual);
        continue;
      }

      const saldoPendienteDeEstePedido = pedido.calcularSaldoPendiente();
      const montoAAplicar = Number(
        Math.min(dineroDisponible, saldoPendienteDeEstePedido).toFixed(2)
      );

      // La propia entidad Pedido suma a su _montoPagado y, si llega a 0 su saldo, pasa a 'Pagado'
      pedido.aplicarAbono(montoAAplicar);
      pedidosAfectados.push(pedido);

      dineroDisponible = Number((dineroDisponible - montoAAplicar).toFixed(2));

      if (pedido.estado === 'Pagado') {
        pedidosLiquidadosCompletamente.push(codigoPedidoActual);
      } else {
        pedidoPagadoParcialmente = {
          codigoPedido: codigoPedidoActual,
          abonadoAhora: montoAAplicar,
          montoPagadoAcumulado: pedido.montoPagado,
          faltaPagar: pedido.calcularSaldoPendiente()
        };
      }
    }

    // PASO 5: Guardar la única fila en Cobranza y actualizar MontoPagado/Estado en los Pedidos tocados.
    const cobranzaRegistrada =
      await this.cobranzaRepository.guardarCobranzaYActualizarPedidosTransaccional(
        nuevaCobranza,
        pedidosAfectados
      );

    const deudaTotalRestante = Number((deudaTotalAnterior - datos.montoAbonado).toFixed(2));

    return {
      cobranzaRegistrada,
      deudaTotalAnterior,
      montoAbonado: datos.montoAbonado,
      deudaTotalRestante,
      pedidosLiquidadosCompletamente,
      pedidoPagadoParcialmente,
      pedidosSinTocar
    };
  }
}