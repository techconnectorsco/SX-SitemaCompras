import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import PDFDocument from 'pdfkit';
import {
	AZURE_TENANT_ID,
	AZURE_CLIENT_ID,
	AZURE_CLIENT_SECRET,
	SENDER_EMAIL,
} from '$env/static/private';

// ── Types ────────────────────────────────────────────────────────────────────
interface Factura {
	documento:      string;
	fechaFactura:   string;
	fechaVence:     string;
	montoFactura:   number;
	saldoFactura:   number;
	moneda:         string;
	vencido?:       boolean;
}

interface ClienteCxC {
	id:        string;
	nombre:    string;
	telefono:  string;
	correo:    string;
	direccion: string;
	contacto:  string;
	facturas:  Factura[];
}

// ── Obtener token Azure ───────────────────────────────────────────────────────
async function getAzureToken(): Promise<string> {
	const url = `https://login.microsoftonline.com/${AZURE_TENANT_ID}/oauth2/v2.0/token`;
	const body = new URLSearchParams({
		grant_type:    'client_credentials',
		client_id:     AZURE_CLIENT_ID,
		client_secret: AZURE_CLIENT_SECRET,
		scope:         'https://graph.microsoft.com/.default',
	});

	const res = await fetch(url, {
		method:  'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body:    body.toString(),
	});

	if (!res.ok) {
		const txt = await res.text();
		throw new Error(`Azure token error: ${txt}`);
	}

	const data = await res.json();
	return data.access_token as string;
}

// ── Generar PDF en Buffer ────────────────────────────────────────────────────
function generarPDF(cliente: ClienteCxC, fecha: string): Promise<Buffer> {
	return new Promise((resolve, reject) => {
		const doc    = new PDFDocument({ margin: 50, size: 'A4' });
		const chunks: Buffer[] = [];

		doc.on('data',  (c: Buffer) => chunks.push(c));
		doc.on('end',   () => resolve(Buffer.concat(chunks)));
		doc.on('error', reject);

		const W = doc.page.width - 100; // ancho útil

		// ── Encabezado ────────────────────────────────────────────────────
		doc.fontSize(18).font('Helvetica-Bold').text('Estado de Cuenta Clientes', 50, 50, { align: 'center', width: W });
		doc.fontSize(9).font('Helvetica').text(`Fecha: ${fecha}`, { align: 'right' });
		doc.moveDown(0.5);

		// ── Datos del cliente ─────────────────────────────────────────────
		doc.moveTo(50, doc.y).lineTo(50 + W, doc.y).strokeColor('#cccccc').stroke();
		doc.moveDown(0.4);

		doc.fontSize(9).font('Helvetica-Bold').text('Datos del Cliente', 50);
		doc.moveDown(0.3);

		const campo = (label: string, valor: string) => {
			doc.font('Helvetica-Bold').fontSize(9).text(`${label}: `, { continued: true });
			doc.font('Helvetica').fontSize(9).text(valor);
		};

		campo('Cliente',    `${cliente.id} - ${cliente.nombre}`);
		campo('Teléfono',   cliente.telefono);
		campo('Correo',     cliente.correo);
		campo('Dirección',  cliente.direccion);
		campo('Contacto',   cliente.contacto);
		doc.moveDown(0.6);

		// ── Tabla de facturas ─────────────────────────────────────────────
		const colX   = [50, 135, 210, 285, 375, 460];
		const heads  = ['DOCUMENTO', 'F. FACTURA', 'F. VENCE', 'MONTO', 'SALDO', 'MONEDA'];
		const colW   = [85, 75, 75, 90, 85, 60];

		// Cabecera tabla
		doc.rect(50, doc.y, W, 16).fillColor('#1a3a5c').fill();
		heads.forEach((h, i) => {
			doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(7.5)
				.text(h, colX[i], doc.y - 13, { width: colW[i], align: i >= 3 ? 'right' : 'left' });
		});
		doc.fillColor('#000000');
		doc.moveDown(0.2);

		// Filas
		cliente.facturas.forEach((f, idx) => {
			const rowY = doc.y;
			const bg   = idx % 2 === 0 ? '#f7f9fc' : '#ffffff';
			doc.rect(50, rowY, W, 14).fillColor(bg).fill();

			const vencido = f.vencido && f.saldoFactura > 0;
			const color   = vencido ? '#c0392b' : '#000000';

			const vals = [
				f.documento,
				f.fechaFactura,
				f.fechaVence,
				`${f.montoFactura.toLocaleString('es-CR', { minimumFractionDigits: 2 })}`,
				`${f.saldoFactura.toLocaleString('es-CR', { minimumFractionDigits: 2 })}`,
				f.moneda,
			];

			vals.forEach((v, i) => {
				doc.fillColor(color).font('Helvetica').fontSize(8)
					.text(v, colX[i], rowY + 3, { width: colW[i], align: i >= 3 ? 'right' : 'left' });
			});

			doc.fillColor('#000000');
			doc.y = rowY + 16;
		});

		doc.moveDown(0.6);
		doc.moveTo(50, doc.y).lineTo(50 + W, doc.y).strokeColor('#cccccc').stroke();
		doc.moveDown(0.4);

		// ── Totales por moneda ─────────────────────────────────────────────
		const monedas = [...new Set(cliente.facturas.map(f => f.moneda))];
		monedas.forEach(m => {
			const total = cliente.facturas
				.filter(f => f.moneda === m)
				.reduce((s, f) => s + f.saldoFactura, 0);
			doc.font('Helvetica-Bold').fontSize(9)
				.text(`TOTAL SALDO EN ${m}:`, 50, doc.y, { continued: true, width: 350 });
			doc.font('Helvetica-Bold').fontSize(9)
				.text(`${total.toLocaleString('es-CR', { minimumFractionDigits: 2 })} ${m}`, { align: 'right', width: 150 });
			doc.moveDown(0.3);
		});

		// ── Control de atraso ──────────────────────────────────────────────
		doc.moveDown(0.5);
		doc.font('Helvetica-Bold').fontSize(10).text('Control de Atraso', { align: 'center' });
		doc.moveDown(0.3);

		const buckets    = ['NO VENCIDO', '1-15 días', '16-30 días', '31-60 días', '61-90 días', '91-180 días', '+180 días'];
		const bucketDays = [0, 15, 30, 60, 90, 180, Infinity];
		const today      = new Date();

		monedas.forEach(m => {
			const saldos = Array(7).fill(0);
			cliente.facturas
				.filter(f => f.moneda === m && f.saldoFactura > 0)
				.forEach(f => {
					const vence   = new Date(f.fechaVence);
					const diffMs  = today.getTime() - vence.getTime();
					const dias    = Math.floor(diffMs / 86400000);
					if (dias <= 0) saldos[0] += f.saldoFactura;
					else if (dias <= 15)  saldos[1] += f.saldoFactura;
					else if (dias <= 30)  saldos[2] += f.saldoFactura;
					else if (dias <= 60)  saldos[3] += f.saldoFactura;
					else if (dias <= 90)  saldos[4] += f.saldoFactura;
					else if (dias <= 180) saldos[5] += f.saldoFactura;
					else                  saldos[6] += f.saldoFactura;
				});

			const bw = W / 7;
			// Cabecera
			const hy = doc.y;
			doc.rect(50, hy, W, 14).fillColor('#1a3a5c').fill();
			buckets.forEach((b, i) => {
				doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(6.5)
					.text(b, 50 + i * bw, hy + 2, { width: bw, align: 'center' });
			});
			doc.fillColor('#000000');
			doc.y = hy + 16;

			// Fila valores
			const ry = doc.y;
			doc.rect(50, ry, W, 14).fillColor('#f0f4f8').fill();
			saldos.forEach((s, i) => {
				doc.fillColor('#000000').font('Helvetica').fontSize(7.5)
					.text(`${m} ${s.toLocaleString('es-CR', { minimumFractionDigits: 2 })}`, 50 + i * bw, ry + 3, { width: bw, align: 'center' });
			});
			doc.y = ry + 18;
			doc.moveDown(0.4);
		});

		// ── Pie de página ──────────────────────────────────────────────────
		doc.moveDown(1);
		doc.fontSize(8).fillColor('#888888')
			.text('Cuentas por Cobrar | Para consultas comunicarse al correo cxc@empresa.com', { align: 'center' });

		doc.end();
	});
}

// ── Enviar email via Microsoft Graph ─────────────────────────────────────────
async function enviarEmail(
	token:        string,
	destinatario: string,
	nombreCliente: string,
	pdfBuffer:    Buffer,
	fechaStr:     string,
	correoExtra?: string | null,
): Promise<void> {
	const pdfB64 = pdfBuffer.toString('base64');

	const cuerpoHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family:'Segoe UI',Arial,sans-serif;font-size:15px;color:#000;line-height:1.5;padding:10px;">

  <p><strong>${nombreCliente}</strong></p>

  <p>Buenas tardes.<br>¡Un gusto saludarle!</p>

  <p>Adjunto estado de cuenta para su revisión y cancelación de lo vencido mayor al plazo establecido de 30 días.</p>

  <p style="color:#0b114b;font-weight:bold;margin-top:30px;">Favor tener presente estos puntos esenciales de nuestra política de crédito:</p>

  <ul style="margin-bottom:30px;">
    <li style="margin-bottom:12px;">El sistema de facturación tendrá una tolerancia adicional de <strong>1 semana</strong> después de vencidas las facturas antes de bloquear el despacho de mercancía.</li>
    <li style="margin-bottom:12px;">El sistema de facturación condicionará su cuenta si la misma se encuentra al tope del límite de crédito otorgado por la compañía.</li>
    <li style="margin-bottom:12px;">El sistema de facturación bloqueará su cuenta si la misma se encuentra con equipos en firme vencidos.</li>
    <li style="margin-bottom:12px;">Facturas de equipos de bodega o demostración tienen <strong>plazo de 15 días</strong> y de no pagar en ese plazo se cobra interés moratorio.</li>
    <li style="margin-bottom:12px;">Según indica la legislación y en la factura se girará documento de cobro de interés moratorio del <strong>2.5%</strong> sobre las facturas y saldos vencidos por medio de una Nota de Débito que se le efectuará con <strong>plazo de 8 días</strong> al momento de la cancelación de lo vencido. El interés se cobra desde el primer día de vencida.</li>
  </ul>

  <p>Si ya realizó el pago por favor enviar comprobante para su revisión y aplicación.</p>

  <p>Si tiene dudas con su estado de cuenta por favor indicarlo para realizar una conciliación, de lo contrario se tomará como aceptado y de acuerdo.</p>

  <p><strong>Correos para consultas:</strong><br>
  <a href="mailto:credito@empresa.com" style="color:#288fcc;text-decoration:none;">credito@empresa.com</a></p>

  <p style="margin-top:30px;margin-bottom:5px;">Gracias.</p>
  <p style="margin-top:0;margin-bottom:25px;">Atentamente,</p>

  <div>
    <p style="color:#0b114b;font-weight:bold;margin:0;font-size:14px;">DEPARTAMENTO CXC</p>
    <p style="color:#f47920;font-weight:bold;margin:0 0 10px 0;font-size:14px;">CUENTAS POR COBRAR</p>
  </div>

</body>
</html>`;

	const payload = {
		message: {
			subject: `Estado de Cuenta Actualizado - ${nombreCliente}`,
			body: {
				contentType: 'HTML',
				content:     cuerpoHtml,
			},
			toRecipients: [
				{ emailAddress: { address: destinatario } },
				...(correoExtra ? [{ emailAddress: { address: correoExtra } }] : []),
			],
			attachments: [
				{
					'@odata.type': '#microsoft.graph.fileAttachment',
					name:          `Estado_Cuenta_${nombreCliente.replace(/\s+/g, '_')}_${fechaStr}.pdf`,
					contentType:   'application/pdf',
					contentBytes:  pdfB64,
				},
			],
		},
		saveToSentItems: false,
	};

	const res = await fetch(
		`https://graph.microsoft.com/v1.0/users/${SENDER_EMAIL}/sendMail`,
		{
			method:  'POST',
			headers: {
				Authorization: `Bearer ${token}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(payload),
		},
	);

	if (!res.ok) {
		const txt = await res.text();
		throw new Error(`Graph sendMail error ${res.status}: ${txt}`);
	}
}

// ── Handler principal ─────────────────────────────────────────────────────────
export const POST: RequestHandler = async ({ request }) => {
	let body: { cliente: ClienteCxC; correoExtra?: string | null };

	try {
		body = await request.json();
	} catch {
		throw error(400, 'Body JSON inválido');
	}

	const { cliente, correoExtra } = body;
	if (!cliente?.correo || !cliente?.nombre) {
		throw error(400, 'Faltan datos del cliente');
	}

	try {
		// Fecha para nombre de archivo y encabezado
		const ahora    = new Date();
		const fechaStr = ahora.toLocaleDateString('es-CR', {
			day: '2-digit', month: '2-digit', year: 'numeric',
		});
		const fechaFile = ahora.toISOString().slice(0, 10);

		const [token, pdfBuffer] = await Promise.all([
			getAzureToken(),
			generarPDF(cliente, fechaStr),
		]);

		await enviarEmail(token, cliente.correo, cliente.nombre, pdfBuffer, fechaFile, correoExtra);

		const destinatarios = [cliente.correo, ...(correoExtra ? [correoExtra] : [])].join(' y ');
		return json({ ok: true, mensaje: `Correo enviado a ${destinatarios}` });
	} catch (err: unknown) {
		const msg = err instanceof Error ? err.message : 'Error desconocido';
		console.error('[CxC send-email]', msg);
		throw error(500, msg);
	}
};
