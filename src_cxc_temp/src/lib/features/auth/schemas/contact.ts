import { z } from 'zod';

export const contactSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  email: z.string().email("Correo inválido"),
  phone: z.string().optional().or(z.literal('')),
  propertyInterest: z.enum(["compra", "venta", "alquiler", "inversion", "otro"]).optional(),
  subject: z.string().min(1, "El asunto es obligatorio"),
  message: z.string().min(1, "El mensaje es obligatorio").max(2000, "Máximo 2000 caracteres"),

  preferredContact: z.enum(["email", "telefono", "whatsapp"]).optional(),

  acceptTerms: z.boolean().refine(val => val === true, {
    message: "Debe aceptar los términos"
  })
});
