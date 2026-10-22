import { Controller, Get, Post, Patch, Param, Body, UseGuards, Req, Res } from '@nestjs/common'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { OrdersService } from './orders.service'
import { PrismaService } from '../database/prisma.service'
import { CreateOrderDto } from './dto/create-order.dto'
import type { Response } from 'express'

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(
    private orders: OrdersService,
    private prisma: PrismaService,
  ) {}

  @Get()
  getAll(@Req() req: any) { return this.orders.getOrderHistory(req.user.id) }

  // ── User invoices (Must come before :id route) ────────────────────────────
  @Get('invoices/all')
  getUserInvoices(@Req() req: any) {
    if (req.user?.role === 'ADMIN' && req.query?.all === 'true') {
      return this.prisma.invoice.findMany({
        include: {
          user: { select: { firstName: true, lastName: true, email: true } },
          order: { select: { status: true, total: true } },
        },
        orderBy: { createdAt: 'desc' },
      })
    }
    return this.prisma.invoice.findMany({
      where:   { userId: req.user.id },
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
        order: { select: { status: true, total: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  // ── Stream / Download Invoice PDF directly ─────────────────────────────────
  @Get(':id/invoice')
  async getInvoicePdf(@Req() req: any, @Param('id') id: string, @Res() res: Response) {
    const { pdf, orderNumber } = await this.orders.getOrderInvoicePdf(req.user.id, req.user.role, id)
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `inline; filename="invoice-${orderNumber}.pdf"`)
    res.setHeader('Content-Length', pdf.length)
    res.end(pdf)
  }

  @Get(':id/invoice.pdf')
  async getInvoicePdfAlt(@Req() req: any, @Param('id') id: string, @Res() res: Response) {
    return this.getInvoicePdf(req, id, res)
  }

  @Get(':id')
  getOne(@Req() req: any, @Param('id') id: string) {
    return this.orders.getOrder(req.user.id, id)
  }

  @Post()
  create(@Req() req: any, @Body() dto: CreateOrderDto) {
    return this.orders.createOrder(req.user.id, dto)
  }

  @Patch(':id/cancel')
  cancel(@Req() req: any, @Param('id') id: string) {
    return this.orders.cancelOrder(req.user.id, id)
  }
}